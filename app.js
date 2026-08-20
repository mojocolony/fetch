const CONFIG = window.FETCH_CONFIG || { demoMode: true };
const STORAGE_KEY = 'fetch-v042-items';
const PREF_KEY = 'fetch-v042-prefs';
const $ = id => document.getElementById(id);
const esc = (v='') => String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const safeJSON=(v,f)=>{try{return v?JSON.parse(v):f}catch{return f}};
const now=()=>new Date();
const AREA_COLORS={Watches:'#5b82a4',Technology:'#5a9163',Books:'#8a6bb0',Reading:'#8a6bb0',Restaurants:'#b77554','Food & Drink':'#b77554',Photography:'#b18454',Travel:'#568f94'};
const COLOR_POOL=['#5b82a4','#5a9163','#8a6bb0','#b77554','#b18454','#568f94','#8b7a68','#6b879b'];
let items=[],store=null,supabaseClient=null,currentUser=null,searchInput=null;
const prefs=safeJSON(localStorage.getItem(PREF_KEY),{});
const state={area:null,tag:null,domain:'',special:'all',query:'',date:null,pageDate:null,type:null,sort:prefs.sort||'newest',view:prefs.view||'cards'};

const seedItems=[];
function domainFrom(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}}
function dayDiff(date){return (now()-new Date(date))/86400000}
function fmtSaved(date){return new Date(date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
function fmtPage(date){return date?new Date(date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Date unknown'}
function hash(s){let h=0;for(const c of String(s))h=((h<<5)-h)+c.charCodeAt(0),h|=0;return Math.abs(h)}
function areaColor(area){return AREA_COLORS[area]||COLOR_POOL[hash(area)%COLOR_POOL.length]}
function hexToRgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
function showNotice(msg,ms=2600){const el=$('notice');el.textContent=msg;el.classList.add('show');clearTimeout(showNotice.t);showNotice.t=setTimeout(()=>el.classList.remove('show'),ms)}
function normalizeTags(value){return [...new Set(String(value||'').split(',').map(x=>x.trim().replace(/\s+/g,' ')).filter(Boolean))].slice(0,12)}

class LocalStore{
 async init(){if(!localStorage.getItem(STORAGE_KEY))localStorage.setItem(STORAGE_KEY,JSON.stringify(seedItems));return this.list()}
 async list(){return safeJSON(localStorage.getItem(STORAGE_KEY),[])}
 async save(item,tags=[]){const all=await this.list();const saved={...item,tags};all.unshift(saved);localStorage.setItem(STORAGE_KEY,JSON.stringify(all));return saved}
 async update(id,patch){const all=(await this.list()).map(x=>x.id===id?{...x,...patch}:x);localStorage.setItem(STORAGE_KEY,JSON.stringify(all));return all.find(x=>x.id===id)}
}
class SupabaseStore{
 constructor(client){this.client=client}
 async list(){
  const [{data:itemRows,error:itemErr},{data:tagRows,error:tagErr},{data:linkRows,error:linkErr}]=await Promise.all([
    this.client.from('fetch_items').select('*').is('deleted_at',null).order('saved_at',{ascending:false}),
    this.client.from('fetch_tags').select('id,name'),
    this.client.from('fetch_item_tags').select('item_id,tag_id')
  ]);
  if(itemErr||tagErr||linkErr)throw(itemErr||tagErr||linkErr);
  const tagById=new Map((tagRows||[]).map(t=>[t.id,t.name])); const links=new Map();
  for(const l of linkRows||[]){if(!links.has(l.item_id))links.set(l.item_id,[]);const name=tagById.get(l.tag_id);if(name)links.get(l.item_id).push(name)}
  return Promise.all((itemRows||[]).map(async item=>{let screenshot_url=null;if(item.screenshot_path){const {data:signed}=await this.client.storage.from('fetch-screenshots').createSignedUrl(item.screenshot_path,3600);screenshot_url=signed?.signedUrl||null}return {...item,tags:(links.get(item.id)||[]).sort((a,b)=>a.localeCompare(b)),screenshot_url}}));
 }
 async save(item,tags=[]){
  const {data:{user}}=await this.client.auth.getUser();if(!user)throw new Error('Sign in to Fetch before adding links.');
  const payload={...item,id:undefined,user_id:user.id};delete payload.screenshot_url;delete payload.tags;
  const {data,error}=await this.client.from('fetch_items').insert(payload).select().single();if(error)throw error;
  await this.setTags(data.id,tags,user.id);return {...data,tags};
 }
 async setTags(itemId,tags,userId){
  if(!tags.length)return;
  for(const name of tags){const normalized_name=name.toLocaleLowerCase();const {data:tag,error}=await this.client.from('fetch_tags').upsert({user_id:userId,name,normalized_name},{onConflict:'user_id,normalized_name'}).select('id').single();if(error)throw error;const {error:linkErr}=await this.client.from('fetch_item_tags').upsert({user_id:userId,item_id:itemId,tag_id:tag.id},{onConflict:'item_id,tag_id'});if(linkErr)throw linkErr}
 }
 async update(id,patch){const {data,error}=await this.client.from('fetch_items').update(patch).eq('id',id).select().single();if(error)throw error;return data}
}

async function initStore(){
 const configured=!CONFIG.demoMode&&CONFIG.supabaseUrl&&CONFIG.supabaseAnonKey;
 if(!configured){store=new LocalStore();await store.init();$('modeLabel').innerHTML='<span class="status-dot"></span>Local test mode';return}
 try{
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  supabaseClient=createClient(CONFIG.supabaseUrl,CONFIG.supabaseAnonKey,{auth:{persistSession:true,detectSessionInUrl:true,autoRefreshToken:true}});
  const {data:{session}}=await supabaseClient.auth.getSession();currentUser=session?.user||null;store=new SupabaseStore(supabaseClient);$('modeLabel').innerHTML='<span class="status-dot"></span>Supabase';
  supabaseClient.auth.onAuthStateChange(async(_event,session)=>{currentUser=session?.user||null;updateAccountUI();await refresh()});
 }catch(err){console.error(err);store=new LocalStore();await store.init();$('modeLabel').textContent='Local fallback';showNotice('Could not connect to Supabase; using local test mode.',5000)}
}

function makeSearch(){
 const host=$('searchHost'); searchInput=document.createElement('input');searchInput.type='text';searchInput.placeholder='Search your library…';searchInput.setAttribute('aria-label','Search your Fetch library');searchInput.setAttribute('autocomplete','off');searchInput.setAttribute('autocorrect','off');searchInput.setAttribute('spellcheck','false');searchInput.value='';host.appendChild(searchInput);
 searchInput.addEventListener('input',()=>{const v=searchInput.value.trim();if(CONFIG.supabaseUrl&&v.includes('supabase.co')){searchInput.value='';state.query='';return render()}state.query=searchInput.value;render()});
}
function allAreas(){return [...new Set(items.map(i=>i.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function allTags(area=null){const pool=area?items.filter(i=>i.category===area):items;return [...new Set(pool.flatMap(i=>i.tags||[]))].sort((a,b)=>a.localeCompare(b))}
function allDomains(){return [...new Set(items.map(i=>i.domain).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function buildNav(){
 const areas=allAreas();$('countAll').textContent=items.length;$('countRecent').textContent=items.filter(i=>dayDiff(i.saved_at)<=7).length;$('countStarred').textContent=items.filter(i=>i.starred).length;
 $('areaNav').innerHTML=areas.map(area=>{const c=areaColor(area);const count=items.filter(i=>i.category===area).length;return `<button class="nav-item area-nav ${state.area===area?'active':''}" data-area="${esc(area)}" style="--area-tint:${hexToRgba(c,.12)}"><span class="nav-left"><span class="area-dot" style="background:${c}"></span><span>${esc(area)}</span></span><span class="nav-count">${count}</span></button>`}).join('');
 document.querySelectorAll('[data-area]').forEach(b=>b.addEventListener('click',()=>{state.area=b.dataset.area;state.special='all';state.tag=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;syncControls();render()}));
 document.querySelectorAll('[data-special]').forEach(b=>b.classList.toggle('active',state.special===b.dataset.special&&!state.area));
}
function syncControls(){
 const areas=allAreas();$('filterArea').innerHTML='<option value="">Any area</option>'+areas.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');$('filterArea').value=state.area||'';
 const tags=allTags(state.area);$('filterTag').innerHTML='<option value="">Any tag</option>'+tags.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');if(state.tag&&!tags.includes(state.tag))state.tag=null;$('filterTag').value=state.tag||'';
 $('domainOptions').innerHTML=allDomains().map(d=>`<option value="${esc(d)}"></option>`).join('');$('filterDomain').value=state.domain||'';$('filterDate').value=state.date||'';$('filterPageDate').value=state.pageDate||'';$('filterType').value=state.type||'';$('sortSelect').value=state.sort;
 $('areaOptions').innerHTML=areas.map(a=>`<option value="${esc(a)}"></option>`).join('');$('tagOptions').innerHTML=allTags($('areaInput')?.value||state.area).map(t=>`<option value="${esc(t)}"></option>`).join('');
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));$('items').className=`items ${state.view}`;
 const count=[state.area,state.tag,state.domain,state.date,state.pageDate,state.type].filter(Boolean).length;$('filterBadge').textContent=count;$('filterBadge').classList.toggle('show',count>0);renderFilterChips();buildNav();
}
function renderFilterChips(){const chips=[];if(state.area)chips.push(['Area',state.area,'area']);if(state.tag)chips.push(['Tag',state.tag,'tag']);if(state.domain)chips.push(['Domain',state.domain,'domain']);if(state.date)chips.push(['Saved',labelDate(state.date),'date']);if(state.pageDate)chips.push(['Page',labelPageDate(state.pageDate),'pageDate']);if(state.type)chips.push(['Type',state.type,'type']);$('activeFilters').innerHTML=chips.map(([k,v,key])=>`<button class="filter-chip" data-clear="${key}"><b>${esc(k)}:</b> ${esc(v)} <span>×</span></button>`).join('');document.querySelectorAll('[data-clear]').forEach(b=>b.addEventListener('click',()=>{state[b.dataset.clear]=b.dataset.clear==='domain'?'':null;syncControls();render()}))}
function labelDate(v){return({today:'Today',week:'Last 7 days',month:'Last 30 days',quarter:'Last 90 days'})[v]||v}
function labelPageDate(v){return({'page-week':'Last 7 days','page-month':'Last 30 days','page-quarter':'Last 90 days','page-halfyear':'Last 6 months','page-year':'Last year','page-1-2':'1–2 years ago','page-2-5':'2–5 years ago','page-older':'More than 5 years ago','page-unknown':'Unknown'})[v]||v}
function pageDateMatches(date,filter){if(!filter)return true;if(filter==='page-unknown')return !date;if(!date)return false;const diff=dayDiff(date+'T12:00:00');return filter==='page-week'?diff<=7:filter==='page-month'?diff<=30:filter==='page-quarter'?diff<=90:filter==='page-halfyear'?diff<=183:filter==='page-year'?diff<=365:filter==='page-1-2'?diff>365&&diff<=730:filter==='page-2-5'?diff>730&&diff<=1826:filter==='page-older'?diff>1826:true}
function getFiltered(){
 let rows=[...items];if(state.special==='recent')rows=rows.filter(i=>dayDiff(i.saved_at)<=7);if(state.special==='starred')rows=rows.filter(i=>i.starred);if(state.area)rows=rows.filter(i=>i.category===state.area);if(state.tag)rows=rows.filter(i=>(i.tags||[]).includes(state.tag));if(state.domain)rows=rows.filter(i=>i.domain===state.domain);if(state.date)rows=rows.filter(i=>{const d=dayDiff(i.saved_at);return state.date==='today'?d<=1:state.date==='week'?d<=7:state.date==='month'?d<=30:d<=90});if(state.pageDate)rows=rows.filter(i=>pageDateMatches(i.page_date,state.pageDate));if(state.type)rows=rows.filter(i=>i.capture_type===state.type);
 const q=state.query.trim().toLocaleLowerCase();if(q)rows=rows.filter(i=>[i.title,i.domain,i.category,i.note,i.selected_text,...(i.tags||[])].filter(Boolean).join(' ').toLocaleLowerCase().includes(q));
 const cmp={newest:(a,b)=>new Date(b.saved_at)-new Date(a.saved_at),oldest:(a,b)=>new Date(a.saved_at)-new Date(b.saved_at),'page-newest':(a,b)=>(b.page_date||'').localeCompare(a.page_date||''),'page-oldest':(a,b)=>(a.page_date||'9999').localeCompare(b.page_date||'9999'),domain:(a,b)=>a.domain.localeCompare(b.domain),area:(a,b)=>a.category.localeCompare(b.category),title:(a,b)=>a.title.localeCompare(b.title)}[state.sort];return rows.sort(cmp||(()=>0));
}
function titleForView(){if(state.area)return state.area;if(state.special==='recent')return'Recent';if(state.special==='starred')return'Starred';return'Everything'}
function cardHTML(item){const color=areaColor(item.category);const tint=hexToRgba(color,.12);const tags=(item.tags||[]).map(t=>`<button class="tag-chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('');const shot=item.screenshot_url?`<img src="${esc(item.screenshot_url)}" alt="Saved viewport of ${esc(item.title)}" loading="lazy">`:`<div class="shot-fallback">${esc(item.domain||'Saved page')}</div>`;return `<article class="item-card" data-open="${esc(item.url)}" tabindex="0" aria-label="Open ${esc(item.title)}"><div class="shot-wrap">${shot}<span class="type-pill">${esc(item.capture_type||'Page')}</span><button class="star-button ${item.starred?'is-starred':''}" data-star="${item.id}" aria-label="${item.starred?'Unstar':'Star'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg></button></div><div class="card-body"><h3 class="item-title">${esc(item.title)}</h3><div class="item-meta"><div class="domain-line"><span class="area-dot" style="background:${color}"></span><span>${esc(item.domain)}</span></div><span class="page-date">${item.page_date?fmtPage(item.page_date):fmtSaved(item.saved_at)}</span></div><div class="tags-row"><span class="area-chip" style="--area-tint:${tint}"><span class="area-dot" style="background:${color}"></span>${esc(item.category)}</span>${tags}</div></div></article>`}
function render(){
 const rows=getFiltered();$('viewTitle').textContent=titleForView();$('resultText').textContent=`${rows.length} item${rows.length===1?'':'s'} · ${state.view==='list'?'compact list':state.view==='gallery'?'visual gallery':'visual bookmarks'}`;$('items').innerHTML=rows.map(cardHTML).join('');$('empty').classList.toggle('show',!rows.length);$('items').style.display=rows.length?'':'none';
 document.querySelectorAll('[data-open]').forEach(card=>{const open=()=>window.open(card.dataset.open,'_blank','noopener');card.addEventListener('click',e=>{if(e.target.closest('button'))return;open()});card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();open()}})});
 document.querySelectorAll('[data-star]').forEach(btn=>btn.addEventListener('click',async e=>{e.stopPropagation();const item=items.find(i=>i.id===btn.dataset.star);if(!item)return;await store.update(item.id,{starred:!item.starred});await refresh()}));
 document.querySelectorAll('[data-tag]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();state.tag=btn.dataset.tag;state.special='all';syncControls();render()}));buildNav();
}
async function refresh(){try{items=await store.list()}catch(err){console.error(err);items=[];showNotice(err.message||'Could not load Fetch.',5000)}syncControls();render()}

function openCapture(){$('captureUrl').value='';$('captureTitle').value='';$('areaInput').value=state.area||'';$('tagInput').value='';$('captureType').value='Page';$('captureNote').value='';syncControls();$('captureBackdrop').classList.add('show');setTimeout(()=>$('captureUrl').focus(),0)}
async function saveManualCapture(){const url=$('captureUrl').value.trim(),title=$('captureTitle').value.trim(),area=$('areaInput').value.trim(),tags=normalizeTags($('tagInput').value);if(!url||!title||!area){showNotice('URL, title and area are required.');return}const domain=domainFrom(url);if(!domain){showNotice('That URL does not look valid.');return}const type=$('captureType').value;const item={id:crypto.randomUUID(),title,url,domain,category:area,saved_at:new Date().toISOString(),page_date:null,capture_type:type,starred:false,note:$('captureNote').value.trim(),selected_text:type==='Text'?$('captureNote').value.trim()||null:null,image_url:null,screenshot_path:null};try{await store.save(item,tags);$('captureBackdrop').classList.remove('show');await refresh();showNotice('Saved to Fetch.')}catch(err){console.error(err);showNotice(err.message||'Could not save this item.',5000)}}

async function sha256Hex(value){const d=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return[...d].map(b=>b.toString(16).padStart(2,'0')).join('')}
function makeDeviceToken(){const b=crypto.getRandomValues(new Uint8Array(32));let s='';b.forEach(x=>s+=String.fromCharCode(x));return'fetch_'+btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function updateAccountUI(){const signed=!!currentUser;$('accountLabel').textContent=supabaseClient?(signed?'Signed in':'Sign in'):'Local test mode';$('signedOutBox').hidden=signed;$('signedInBox').hidden=!signed;$('signedInAs').textContent=signed?`Signed in as ${currentUser.email||'your account'}.`:'';$('deviceSignedOut').hidden=signed;$('deviceSignedIn').hidden=!signed}
async function signInWithPassword(){const email=$('authEmail').value.trim(),password=$('authPassword').value;if(!email||!password)return showNotice('Enter your email and password.');const{error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)return showNotice(error.message,5000);$('accountBackdrop').classList.remove('show')}
async function sendMagicLink(){const email=$('authEmail').value.trim();if(!email)return showNotice('Enter your email first.');const redirectTo=`${location.origin}${location.pathname}`;const{error}=await supabaseClient.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});if(error)return showNotice(error.message,5000);showNotice('Sign-in link sent.')}
async function refreshDevices(){if(!supabaseClient||!currentUser)return $('deviceList').innerHTML='';const{data,error}=await supabaseClient.from('fetch_capture_devices').select('id,name,created_at,last_used_at,revoked_at').order('created_at',{ascending:false});if(error)return $('deviceList').innerHTML=`<div class="empty show">${esc(error.message)}</div>`;const active=(data||[]).filter(x=>!x.revoked_at);$('deviceList').innerHTML=active.length?active.map(d=>`<div class="device-row"><div><strong>${esc(d.name)}</strong><span>${d.last_used_at?'Last used '+new Date(d.last_used_at).toLocaleDateString():'Not used yet'}</span></div><button data-revoke="${d.id}">Revoke</button></div>`).join(''):'<div class="empty show">No browser tokens yet.</div>';document.querySelectorAll('[data-revoke]').forEach(btn=>btn.addEventListener('click',async()=>{const{error}=await supabaseClient.from('fetch_capture_devices').update({revoked_at:new Date().toISOString()}).eq('id',btn.dataset.revoke);if(error)showNotice(error.message,5000);else{showNotice('Browser token revoked.');refreshDevices()}}))}
async function generateDeviceToken(){if(!currentUser)return showNotice('Sign in first.');const name=$('deviceName').value.trim()||'Browser',token=makeDeviceToken(),token_hash=await sha256Hex(token);const{error}=await supabaseClient.from('fetch_capture_devices').insert({user_id:currentUser.id,name,token_hash});if(error)return showNotice(error.message,5000);$('deviceToken').value=token;$('tokenResult').hidden=false;await refreshDevices()}

function wireUI(){
 document.querySelectorAll('[data-special]').forEach(b=>b.addEventListener('click',()=>{state.area=null;state.tag=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;state.special=b.dataset.special;syncControls();render()}));
 $('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;savePrefs();render()});document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;savePrefs();syncControls();render()}));
 const panel=$('filterPanel');$('filterBtn').addEventListener('click',e=>{e.stopPropagation();const s=!panel.classList.contains('show');panel.classList.toggle('show',s);$('filterBtn').setAttribute('aria-expanded',String(s))});panel.addEventListener('click',e=>e.stopPropagation());document.addEventListener('click',()=>panel.classList.remove('show'));
 $('filterArea').addEventListener('change',e=>{state.area=e.target.value||null;state.special='all';state.tag=null;syncControls();render()});$('filterTag').addEventListener('change',e=>{state.tag=e.target.value||null;render()});$('filterDomain').addEventListener('input',e=>{state.domain=e.target.value.trim();render()});$('filterDate').addEventListener('change',e=>{state.date=e.target.value||null;render()});$('filterPageDate').addEventListener('change',e=>{state.pageDate=e.target.value||null;render()});$('filterType').addEventListener('change',e=>{state.type=e.target.value||null;render()});$('clearFilters').addEventListener('click',()=>{state.area=null;state.tag=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;state.special='all';syncControls();render()});$('doneFilters').addEventListener('click',()=>panel.classList.remove('show'));
 $('areaInput').addEventListener('input',()=>syncControls());$('captureBtn').addEventListener('click',openCapture);$('cancelCapture').addEventListener('click',()=>close('captureBackdrop'));$('saveCapture').addEventListener('click',saveManualCapture);
 $('accountBtn').addEventListener('click',()=>{updateAccountUI();$('accountBackdrop').classList.add('show')});$('cancelAccount').addEventListener('click',()=>close('accountBackdrop'));$('closeAccount').addEventListener('click',()=>close('accountBackdrop'));$('signInBtn').addEventListener('click',signInWithPassword);$('sendMagicLink').addEventListener('click',sendMagicLink);$('signOutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();close('accountBackdrop')});
 $('deviceBtn').addEventListener('click',async()=>{updateAccountUI();$('deviceBackdrop').classList.add('show');await refreshDevices()});$('closeDevice').addEventListener('click',()=>close('deviceBackdrop'));$('generateDeviceToken').addEventListener('click',generateDeviceToken);$('copyDeviceToken').addEventListener('click',async()=>{await navigator.clipboard.writeText($('deviceToken').value);showNotice('Token copied.')});
 ['captureBackdrop','accountBackdrop','deviceBackdrop'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target===$(id))close(id)}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){close('captureBackdrop');close('accountBackdrop');close('deviceBackdrop');panel.classList.remove('show')}})
}
function close(id){$(id).classList.remove('show')}
function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify({view:state.view,sort:state.sort}))}

(async function start(){makeSearch();wireUI();await initStore();updateAccountUI();await refresh();if(searchInput){searchInput.value='';state.query=''}if(supabaseClient&&!currentUser)showNotice('Fetch is connected. Sign in to see your library.',4500)})();
