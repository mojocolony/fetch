const CONFIG = window.FETCH_CONFIG || { demoMode: true };
const STORAGE_KEY = 'fetch-v042-items';
const PREF_KEY = 'fetch-v042-prefs';
const $ = id => document.getElementById(id);
const esc = (v='') => String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const safeJSON=(v,f)=>{try{return v?JSON.parse(v):f}catch{return f}};
const now=()=>new Date();
const AREA_COLORS={Watches:'#7c8da7',Technology:'#718d75',Books:'#8a789f',Reading:'#8a789f',Restaurants:'#a97d68','Food & Drink':'#a97d68',Photography:'#9b8268',Travel:'#6f9295'};
const COLOR_POOL=['#7c8da7','#718d75','#8a789f','#a97d68','#9b8268','#6f9295','#8b7f72','#728696'];
let items=[],store=null,supabaseClient=null,currentUser=null,searchInput=null,hoverTimer=null;
const initialItemParam=new URLSearchParams(location.search).get('item');
function itemIdFromParam(value){if(!value)return null;const decoded=decodeURIComponent(value);const uuid=decoded.match(/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);return uuid?uuid[1]:decoded}
const initialItemId=itemIdFromParam(initialItemParam);
const prefs=safeJSON(localStorage.getItem(PREF_KEY),{});
const state={area:null,tag:null,domain:'',special:'all',query:'',date:null,pageDate:null,type:null,itemId:initialItemId||null,sort:prefs.sort||'newest',view:initialItemId?'cards':(prefs.view||'cards')};

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
 async updateItem(id,patch,tags){const all=(await this.list()).map(x=>x.id===id?{...x,...patch,tags:[...tags]}:x);localStorage.setItem(STORAGE_KEY,JSON.stringify(all));return all.find(x=>x.id===id)}
 async softDelete(id){const all=(await this.list()).filter(x=>x.id!==id);localStorage.setItem(STORAGE_KEY,JSON.stringify(all))}
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
  await this.replaceTags(data.id,tags,user.id);return {...data,tags};
 }
 async replaceTags(itemId,tags,userId){
  const {error:deleteErr}=await this.client.from('fetch_item_tags').delete().eq('item_id',itemId);if(deleteErr)throw deleteErr;
  for(const name of tags){const normalized_name=name.toLocaleLowerCase();const {data:tag,error}=await this.client.from('fetch_tags').upsert({user_id:userId,name,normalized_name},{onConflict:'user_id,normalized_name'}).select('id').single();if(error)throw error;const {error:linkErr}=await this.client.from('fetch_item_tags').upsert({user_id:userId,item_id:itemId,tag_id:tag.id},{onConflict:'item_id,tag_id'});if(linkErr)throw linkErr}
 }
 async update(id,patch){const {data,error}=await this.client.from('fetch_items').update(patch).eq('id',id).select().single();if(error)throw error;return data}
 async updateItem(id,patch,tags){const {data:{user}}=await this.client.auth.getUser();if(!user)throw new Error('Sign in to edit Fetch items.');const {data,error}=await this.client.from('fetch_items').update(patch).eq('id',id).select().single();if(error)throw error;await this.replaceTags(id,tags,user.id);return {...data,tags}
 }
 async softDelete(id){const {error}=await this.client.from('fetch_items').update({deleted_at:new Date().toISOString()}).eq('id',id);if(error)throw error}
}

async function initStore(){
 const configured=!CONFIG.demoMode&&CONFIG.supabaseUrl&&CONFIG.supabaseAnonKey;
 if(!configured){store=new LocalStore();await store.init();$('modeLabel').innerHTML='<span class="status-dot"></span>Local test mode';return}
 try{
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  supabaseClient=createClient(CONFIG.supabaseUrl,CONFIG.supabaseAnonKey,{auth:{persistSession:true,detectSessionInUrl:true,autoRefreshToken:true}});
  const {data:{session}}=await supabaseClient.auth.getSession();currentUser=session?.user||null;store=new SupabaseStore(supabaseClient);$('modeLabel').innerHTML='<span class="status-dot"></span>Supabase';
  supabaseClient.auth.onAuthStateChange((event,session)=>{
   const previousUserId=currentUser?.id||null;
   const nextUser=session?.user||null;
   const nextUserId=nextUser?.id||null;
   currentUser=nextUser;
   updateAccountUI();
   // Supabase may emit SIGNED_IN/TOKEN_REFRESHED again when a tab regains focus.
   // Do not rebuild the library unless the actual account changed.
   if(previousUserId!==nextUserId){setTimeout(()=>refresh(),0)}
  });
 }catch(err){console.error(err);store=new LocalStore();await store.init();$('modeLabel').textContent='Local fallback';showNotice('Could not connect to Supabase; using local test mode.',5000)}
}

function updateSearchClear(){
 const clear=$('searchClear');
 if(clear)clear.hidden=!((searchInput?.textContent||'').trim());
}
function makeSearch(){
 const host=$('searchHost');
 searchInput=document.createElement('div');
 searchInput.className='search-box';
 searchInput.setAttribute('contenteditable','true');
 searchInput.setAttribute('role','searchbox');
 searchInput.setAttribute('aria-label','Search your Fetch library');
 searchInput.setAttribute('data-placeholder','Search your library…');
 searchInput.setAttribute('spellcheck','false');
 host.appendChild(searchInput);
 const clear=document.createElement('button');
 clear.id='searchClear';
 clear.className='search-clear';
 clear.type='button';
 clear.hidden=true;
 clear.setAttribute('aria-label','Clear search');
 clear.title='Clear search';
 clear.innerHTML='<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M18 6 6 18M6 6l12 12\"/></svg>';
 host.appendChild(clear);
 searchInput.addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault()});
 searchInput.addEventListener('paste',e=>{e.preventDefault();const text=(e.clipboardData||window.clipboardData).getData('text/plain').replace(/[\r\n]+/g,' ');document.execCommand('insertText',false,text)});
 searchInput.addEventListener('input',()=>{if(state.itemId)exitItemView();state.query=(searchInput.textContent||'').replace(/[\r\n]+/g,' ');updateSearchClear();render()});
 clear.addEventListener('click',()=>{searchInput.textContent='';state.query='';updateSearchClear();searchInput.focus();render()});
}
function allAreas(){return [...new Set(items.map(i=>i.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function allTags(area=null){const pool=area?items.filter(i=>i.category===area):items;return [...new Set(pool.flatMap(i=>i.tags||[]))].sort((a,b)=>a.localeCompare(b))}
function allDomains(){return [...new Set(items.map(i=>i.domain).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function exitItemView(replaceUrl=true){
 state.itemId=null;
 if(replaceUrl){const url=new URL(location.href);url.searchParams.delete('item');history.replaceState({},'',url.pathname+url.search+url.hash)}
 $('backToLibrary').hidden=true;
 document.body.classList.remove('single-item-mode');
}
function enterItemView(itemId,replaceUrl=false){
 state.itemId=itemId||null;
 state.area=null;state.tag=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;state.special='all';state.query='';
 if(searchInput)searchInput.textContent='';
 updateSearchClear();
 if(replaceUrl&&itemId){const url=new URL(location.href);url.searchParams.set('item',itemId);history.replaceState({},'',url.pathname+url.search+url.hash)}
}
function buildNav(){
 const areas=allAreas();$('countAll').textContent=items.length;$('countRecent').textContent=items.filter(i=>dayDiff(i.saved_at)<=7).length;$('countStarred').textContent=items.filter(i=>i.starred).length;
 $('areaNav').innerHTML=areas.map(area=>{const c=areaColor(area);const count=items.filter(i=>i.category===area).length;return `<button class="nav-item area-nav ${state.area===area?'active':''}" data-area="${esc(area)}" style="--area-tint:${hexToRgba(c,.12)}"><span class="nav-left"><span class="area-dot" style="background:${c}"></span><span>${esc(area)}</span></span><span class="nav-count">${count}</span></button>`}).join('');
 document.querySelectorAll('[data-area]').forEach(b=>b.addEventListener('click',()=>{exitItemView();state.area=b.dataset.area;state.special='all';state.tag=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;syncControls();render()}));
 document.querySelectorAll('[data-special]').forEach(b=>b.classList.toggle('active',state.special===b.dataset.special&&!state.area));
}
function syncControls(){
 const areas=allAreas();$('filterArea').innerHTML='<option value="">Any area</option>'+areas.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');$('filterArea').value=state.area||'';
 const tags=allTags(state.area);$('filterTag').innerHTML='<option value="">Any tag</option>'+tags.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');if(state.tag&&!tags.includes(state.tag))state.tag=null;$('filterTag').value=state.tag||'';
 $('domainOptions').innerHTML=allDomains().map(d=>`<option value="${esc(d)}"></option>`).join('');$('filterDomain').value=state.domain||'';$('filterDate').value=state.date||'';$('filterPageDate').value=state.pageDate||'';$('filterType').value=state.type||'';$('sortSelect').value=state.sort;
 $('areaOptions').innerHTML=areas.map(a=>`<option value="${esc(a)}"></option>`).join('');$('tagOptions').innerHTML=allTags($('areaInput')?.value||state.area).map(t=>`<option value="${esc(t)}"></option>`).join('');
 if($('editAreaOptions'))$('editAreaOptions').innerHTML=areas.map(a=>`<option value="${esc(a)}"></option>`).join('');if($('editTagOptions'))$('editTagOptions').innerHTML=allTags($('editArea')?.value||state.area).map(t=>`<option value="${esc(t)}"></option>`).join('');
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));$('items').className=`items ${state.view}`;
 const count=[state.area,state.tag,state.domain,state.date,state.pageDate,state.type].filter(Boolean).length;$('filterBadge').textContent=count;$('filterBadge').classList.toggle('show',count>0);renderFilterChips();buildNav();
}
function renderFilterChips(){const chips=[];if(state.area)chips.push(['Area',state.area,'area']);if(state.tag)chips.push(['Tag',state.tag,'tag']);if(state.domain)chips.push(['Domain',state.domain,'domain']);if(state.date)chips.push(['Saved',labelDate(state.date),'date']);if(state.pageDate)chips.push(['Page',labelPageDate(state.pageDate),'pageDate']);if(state.type)chips.push(['Type',state.type,'type']);$('activeFilters').innerHTML=chips.map(([k,v,key])=>`<button class="filter-chip" data-clear="${key}"><b>${esc(k)}:</b> ${esc(v)} <span>×</span></button>`).join('');document.querySelectorAll('[data-clear]').forEach(b=>b.addEventListener('click',()=>{state[b.dataset.clear]=b.dataset.clear==='domain'?'':null;syncControls();render()}))}
function labelDate(v){return({today:'Today',week:'Last 7 days',month:'Last 30 days',quarter:'Last 90 days'})[v]||v}
function labelPageDate(v){return({'page-week':'Last 7 days','page-month':'Last 30 days','page-quarter':'Last 90 days','page-halfyear':'Last 6 months','page-year':'Last year','page-1-2':'1–2 years ago','page-2-5':'2–5 years ago','page-older':'More than 5 years ago','page-unknown':'Unknown'})[v]||v}
function pageDateMatches(date,filter){if(!filter)return true;if(filter==='page-unknown')return !date;if(!date)return false;const diff=dayDiff(date+'T12:00:00');return filter==='page-week'?diff<=7:filter==='page-month'?diff<=30:filter==='page-quarter'?diff<=90:filter==='page-halfyear'?diff<=183:filter==='page-year'?diff<=365:filter==='page-1-2'?diff>365&&diff<=730:filter==='page-2-5'?diff>730&&diff<=1826:filter==='page-older'?diff>1826:true}
function getFiltered(){
 let rows=[...items];if(state.itemId)return rows.filter(i=>String(i.id)===String(state.itemId));if(state.special==='recent')rows=rows.filter(i=>dayDiff(i.saved_at)<=7);if(state.special==='starred')rows=rows.filter(i=>i.starred);if(state.area)rows=rows.filter(i=>i.category===state.area);if(state.tag)rows=rows.filter(i=>(i.tags||[]).includes(state.tag));if(state.domain)rows=rows.filter(i=>i.domain===state.domain);if(state.date)rows=rows.filter(i=>{const d=dayDiff(i.saved_at);return state.date==='today'?d<=1:state.date==='week'?d<=7:state.date==='month'?d<=30:d<=90});if(state.pageDate)rows=rows.filter(i=>pageDateMatches(i.page_date,state.pageDate));if(state.type)rows=rows.filter(i=>i.capture_type===state.type);
 const q=state.query.trim().toLocaleLowerCase();if(q)rows=rows.filter(i=>[i.title,i.domain,i.category,i.note,i.selected_text,...(i.tags||[])].filter(Boolean).join(' ').toLocaleLowerCase().includes(q));
 const cmp={newest:(a,b)=>new Date(b.saved_at)-new Date(a.saved_at),oldest:(a,b)=>new Date(a.saved_at)-new Date(b.saved_at),'page-newest':(a,b)=>(b.page_date||'').localeCompare(a.page_date||''),'page-oldest':(a,b)=>(a.page_date||'9999').localeCompare(b.page_date||'9999'),domain:(a,b)=>a.domain.localeCompare(b.domain),area:(a,b)=>a.category.localeCompare(b.category),title:(a,b)=>a.title.localeCompare(b.title)}[state.sort];return rows.sort(cmp||(()=>0));
}
function titleForView(){if(state.itemId)return'Saved item';if(state.area)return state.area;if(state.special==='recent')return'Recent';if(state.special==='starred')return'Starred';return'Everything'}
function cardHTML(item){const color=areaColor(item.category);const tint=hexToRgba(color,.12);const tags=(item.tags||[]).map(t=>`<button class="tag-chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('');const shot=item.screenshot_url?`<img src="${esc(item.screenshot_url)}" alt="Saved viewport of ${esc(item.title)}" loading="lazy">`:`<div class="shot-fallback">${esc(item.domain||'Saved page')}</div>`;return `<article class="item-card" data-id="${esc(item.id)}" data-open="${esc(item.url)}" tabindex="0" aria-label="Open ${esc(item.title)}"><div class="shot-wrap" data-preview="${esc(item.id)}">${shot}<span class="type-pill">${esc(item.capture_type||'Page')}</span><div class="card-actions"><button class="more-button" data-more="${esc(item.id)}" aria-label="Bookmark actions" title="Bookmark actions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg></button><button class="star-button ${item.starred?'is-starred':''}" data-star="${esc(item.id)}" aria-label="${item.starred?'Unstar':'Star'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg></button></div></div><div class="item-menu" data-menu="${esc(item.id)}"><button data-action="edit" data-item="${esc(item.id)}">Edit bookmark</button><button data-action="copy" data-item="${esc(item.id)}">Copy Fetch link</button><button data-action="share" data-item="${esc(item.id)}">Share…</button><button class="danger" data-action="delete" data-item="${esc(item.id)}">Delete</button></div><div class="card-body"><h3 class="item-title">${esc(item.title)}</h3><div class="item-meta"><div class="domain-line"><span class="area-dot" style="background:${color}"></span><span>${esc(item.domain)}</span></div><span class="page-date">${item.page_date?fmtPage(item.page_date):fmtSaved(item.saved_at)}</span></div><div class="tags-row"><span class="area-chip" style="--area-tint:${tint}"><span class="area-dot" style="background:${color}"></span>${esc(item.category)}</span>${tags}</div></div></article>`}
function render(){
 const rows=getFiltered();const single=!!state.itemId;document.body.classList.toggle('single-item-mode',single);$('backToLibrary').hidden=!single;$('viewTitle').textContent=titleForView();$('resultText').textContent=single?(rows.length?'Direct Fetch link · 1 saved item':'Direct Fetch link'):`${rows.length} item${rows.length===1?'':'s'} · ${state.view==='list'?'compact list':state.view==='gallery'?'visual gallery':'visual bookmarks'}`;$('items').classList.toggle('single-item-view',single);$('items').innerHTML=rows.map(cardHTML).join('');$('empty').textContent=single?'This Fetch item could not be found.':'Nothing matches those filters.';$('empty').classList.toggle('show',!rows.length);$('items').style.display=rows.length?'':'none';
 document.querySelectorAll('[data-open]').forEach(card=>{
  const item=items.find(i=>String(i.id)===String(card.dataset.id));
  const open=()=>window.open(card.dataset.open,'_blank','noopener');
  card.addEventListener('click',e=>{if(e.target.closest('button,.item-menu'))return;open()});
  card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,.item-menu')){e.preventDefault();open()}});
  const shot=card.querySelector('.shot-wrap');if(shot){shot.addEventListener('mouseenter',()=>showHoverPreview(item,shot));shot.addEventListener('mouseleave',hideHoverPreview)}
 });
 document.querySelectorAll('[data-star]').forEach(btn=>btn.addEventListener('click',async e=>{e.stopPropagation();closeItemMenus();const item=items.find(i=>String(i.id)===String(btn.dataset.star));if(!item)return;await store.update(item.id,{starred:!item.starred});await refresh()}));
 document.querySelectorAll('[data-more]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();hideHoverPreview();const menu=document.querySelector(`[data-menu="${CSS.escape(btn.dataset.more)}"]`);const wasOpen=menu?.classList.contains('show');closeItemMenus();if(menu&&!wasOpen)menu.classList.add('show')}));
 document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();handleItemAction(btn.dataset.action,btn.dataset.item)}));
 document.querySelectorAll('[data-tag]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();exitItemView();state.tag=btn.dataset.tag;state.special='all';syncControls();render()}));buildNav();
}
function closeItemMenus(){document.querySelectorAll('.item-menu.show').forEach(m=>m.classList.remove('show'))}
function showHoverPreview(item,anchor){
 if(window.innerWidth<900||!item||!anchor)return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{const hover=$('hoverPreview');if(!hover)return;hover.innerHTML=item.screenshot_url?`<img src="${esc(item.screenshot_url)}" alt="Enlarged saved viewport of ${esc(item.title)}">`:`<div class="shot-fallback">${esc(item.domain||'Saved page')}</div>`;positionHoverPreview(anchor);hover.classList.add('show')},160)
}
function positionHoverPreview(anchor){const hover=$('hoverPreview');if(!hover)return;hover.classList.remove('side-left','side-right');const rect=anchor.getBoundingClientRect();const pad=18;const width=Math.min(620,window.innerWidth*.43);const height=Math.min(430,window.innerHeight-pad*2);let left=rect.right+14;let side='right';if(left+width>window.innerWidth-pad){left=rect.left-width-14;side='left'}left=Math.max(pad,Math.min(left,window.innerWidth-width-pad));let top=Math.max(pad,Math.min(rect.top,window.innerHeight-height-pad));hover.style.width=width+'px';hover.style.height=height+'px';hover.style.left=left+'px';hover.style.top=top+'px';hover.classList.add(side==='right'?'side-right':'side-left')}
function hideHoverPreview(){clearTimeout(hoverTimer);const hover=$('hoverPreview');if(hover)hover.classList.remove('show')}
function titleSlug(title){return String(title||'item').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72)||'item'}
function fetchItemLink(item){return `${location.origin}${location.pathname}?item=${encodeURIComponent(`${titleSlug(item.title)}--${item.id}`)}`}
async function copyFetchReference(item){const url=fetchItemLink(item);const plain=`${item.title}\n${url}`;try{if(window.ClipboardItem&&navigator.clipboard?.write){const html=`<a href="${esc(url)}">${esc(item.title)}</a>`;await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([plain],{type:'text/plain'}),'text/html':new Blob([html],{type:'text/html'})})]);return}}catch(err){console.warn('Rich clipboard unavailable',err)}await navigator.clipboard.writeText(plain)}
function openEdit(itemId){const item=items.find(i=>String(i.id)===String(itemId));if(!item)return;$('editItemId').value=item.id;$('editTitle').value=item.title||'';$('editUrl').value=item.url||'';$('editArea').value=item.category||'';$('editTags').value=(item.tags||[]).join(', ');$('editPageDate').value=item.page_date||'';$('editNote').value=item.note||'';syncControls();$('editBackdrop').classList.add('show');setTimeout(()=>$('editTitle').focus(),0)}
async function saveEditItem(){const id=$('editItemId').value;const title=$('editTitle').value.trim(),url=$('editUrl').value.trim(),area=$('editArea').value.trim(),tags=normalizeTags($('editTags').value);if(!title||!url||!area)return showNotice('Title, URL and Area are required.');const domain=domainFrom(url);if(!domain)return showNotice('That URL does not look valid.');const patch={title,url,domain,category:area,page_date:$('editPageDate').value||null,note:$('editNote').value.trim()||null};try{await store.updateItem(id,patch,tags);close('editBackdrop');await refresh();showNotice('Bookmark updated.')}catch(err){console.error(err);showNotice(err.message||'Could not update this bookmark.',5000)}}
async function handleItemAction(action,itemId){closeItemMenus();const item=items.find(i=>String(i.id)===String(itemId));if(!item)return;if(action==='edit')return openEdit(itemId);if(action==='copy'){await copyFetchReference(item);return showNotice('Fetch title and link copied.')}if(action==='share'){const url=fetchItemLink(item);if(navigator.share){try{await navigator.share({title:item.title,text:item.title,url});return}catch(err){if(err?.name==='AbortError')return}}await copyFetchReference(item);return showNotice('Fetch title and link copied.')}if(action==='delete'){if(!confirm(`Delete “${item.title}”?`))return;try{await store.softDelete(item.id);await refresh();showNotice('Bookmark deleted.')}catch(err){console.error(err);showNotice(err.message||'Could not delete this bookmark.',5000)}}}

const APP_VERSION='0.5.0';
function exportDateStamp(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function cleanExportItem(item,screenshotFile=null){return {id:item.id,title:item.title,url:item.url,fetch_link:fetchItemLink(item),domain:item.domain,area:item.category,tags:[...(item.tags||[])],saved_as:item.capture_type||'Page',date_saved:item.saved_at||null,page_date:item.page_date||null,starred:!!item.starred,note:item.note||null,selected_text:item.selected_text||null,image_url:item.image_url||null,screenshot_path:item.screenshot_path||null,screenshot_file:screenshotFile}}
function exportPayload(screenshotFiles={}){return {format:'Fetch library export',schema_version:1,app_version:APP_VERSION,exported_at:new Date().toISOString(),item_count:items.length,items:items.map(item=>cleanExportItem(item,screenshotFiles[item.id]||null))}}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function csvCell(v){const s=Array.isArray(v)?v.join('; '):String(v??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function buildCsv(screenshotFiles={}){const cols=['id','title','url','fetch_link','area','tags','domain','date_saved','page_date','saved_as','starred','note','selected_text','image_url','screenshot_path','screenshot_file'];const rows=items.map(item=>{const x=cleanExportItem(item,screenshotFiles[item.id]||null);return cols.map(c=>csvCell(x[c])).join(',')});return [cols.join(','),...rows].join('\r\n')}
function buildHtml(screenshotFiles={}){const groups=new Map();for(const item of items){const area=item.category||'Unfiled';if(!groups.has(area))groups.set(area,[]);groups.get(area).push(item)}const body=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([area,list])=>`<section><h2>${esc(area)}</h2>${list.map(item=>{const shot=screenshotFiles[item.id]?`<img src="${esc(screenshotFiles[item.id])}" alt="">`:'';const tags=(item.tags||[]).map(t=>`<span>${esc(t)}</span>`).join('');return `<article>${shot}<div><h3><a href="${esc(item.url)}">${esc(item.title)}</a></h3><p><a class="fetch" href="${esc(fetchItemLink(item))}">Open in Fetch</a> · ${esc(item.domain||'')} · saved ${esc(item.saved_at?new Date(item.saved_at).toLocaleDateString():'')}</p>${tags?`<div class="tags">${tags}</div>`:''}${item.note?`<p class="note">${esc(item.note)}</p>`:''}</div></article>`}).join('')}</section>`).join('');return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Fetch export</title><style>body{max-width:980px;margin:48px auto;padding:0 24px;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20262a;background:#faf9f6}h1,h2,h3{line-height:1.15}h1{font-size:38px}h2{margin-top:42px;border-bottom:1px solid #ddd9d1;padding-bottom:8px}article{display:grid;grid-template-columns:minmax(0,220px) 1fr;gap:20px;padding:18px 0;border-bottom:1px solid #e5e1da}article img{width:220px;height:145px;object-fit:cover;object-position:top;border-radius:10px;border:1px solid #ddd9d1}a{color:#526985}.fetch{font-weight:600}.tags{display:flex;flex-wrap:wrap;gap:6px}.tags span{background:#edf0f4;border-radius:999px;padding:4px 9px;font-size:13px}.note{color:#5f6c74}@media(max-width:650px){article{grid-template-columns:1fr}article img{width:100%;height:auto}}</style></head><body><h1>Fetch library</h1><p>Exported ${esc(new Date().toLocaleString())} · ${items.length} item${items.length===1?'':'s'}</p>${body}</body></html>`}
async function exportJson(){const name=`Fetch-Export-${exportDateStamp()}.json`;downloadBlob(new Blob([JSON.stringify(exportPayload(),null,2)],{type:'application/json'}),name);showNotice('JSON export downloaded.')}
async function exportCsv(){const name=`Fetch-Export-${exportDateStamp()}.csv`;downloadBlob(new Blob(['\ufeff'+buildCsv()],{type:'text/csv;charset=utf-8'}),name);showNotice('CSV export downloaded.')}
async function exportHtml(){const name=`Fetch-Bookmarks-${exportDateStamp()}.html`;downloadBlob(new Blob([buildHtml()],{type:'text/html;charset=utf-8'}),name);showNotice('HTML export downloaded.')}
function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}
function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
function concatBytes(parts){const total=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(total);let off=0;for(const p of parts){out.set(p,off);off+=p.length}return out}
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function dosDateTime(date=new Date()){let y=Math.max(1980,date.getFullYear());const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);const day=((y-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();return {time,day}}
function buildZip(files){const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;const dt=dosDateTime();for(const file of files){const name=enc.encode(file.name),data=file.data instanceof Uint8Array?file.data:new Uint8Array(file.data),crc=crc32(data),flags=0x0800;const local=concatBytes([u32(0x04034b50),u16(20),u16(flags),u16(0),u16(dt.time),u16(dt.day),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);locals.push(local);const central=concatBytes([u32(0x02014b50),u16(20),u16(20),u16(flags),u16(0),u16(dt.time),u16(dt.day),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centrals.push(central);offset+=local.length}const centralStart=offset,centralSize=centrals.reduce((n,p)=>n+p.length,0);const end=concatBytes([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralSize),u32(centralStart),u16(0)]);return concatBytes([...locals,...centrals,end])}
async function exportFullArchive(){const btn=$('exportArchive'),status=$('exportStatus');btn.disabled=true;status.textContent='Preparing archive and collecting screenshots…';try{const files=[],screenshotFiles={};let captured=0;for(const item of items){if(!item.screenshot_url)continue;try{const res=await fetch(item.screenshot_url);if(!res.ok)throw new Error(String(res.status));const type=res.headers.get('content-type')||'';let ext=(item.screenshot_path||'').split('.').pop()?.toLowerCase();if(!['webp','jpg','jpeg','png'].includes(ext))ext=type.includes('png')?'png':type.includes('jpeg')?'jpg':'webp';const path=`screenshots/${item.id}.${ext}`;files.push({name:path,data:new Uint8Array(await res.arrayBuffer())});screenshotFiles[item.id]=path;captured++}catch(err){console.warn('Could not export screenshot',item.id,err)}}const enc=new TextEncoder();files.unshift({name:'bookmarks.html',data:enc.encode(buildHtml(screenshotFiles))});files.unshift({name:'fetch-export.csv',data:enc.encode('\ufeff'+buildCsv(screenshotFiles))});files.unshift({name:'fetch-export.json',data:enc.encode(JSON.stringify(exportPayload(screenshotFiles),null,2))});files.unshift({name:'README.txt',data:enc.encode(`Fetch full archive\nCreated: ${new Date().toISOString()}\nItems: ${items.length}\nScreenshots included: ${captured}\n\nOpen bookmarks.html for a human-readable index. fetch-export.json is the canonical structured backup.`)});const zip=buildZip(files);downloadBlob(new Blob([zip],{type:'application/zip'}),`Fetch-Full-Archive-${exportDateStamp()}.zip`);status.textContent=`Archive downloaded: ${items.length} items, ${captured} screenshots.`;showNotice('Full Fetch archive downloaded.')}catch(err){console.error(err);status.textContent='Could not create the full archive.';showNotice(err.message||'Could not export archive.',5000)}finally{btn.disabled=false}}

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
 document.querySelectorAll('[data-special]').forEach(b=>b.addEventListener('click',()=>{exitItemView();state.area=null;state.tag=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;state.special=b.dataset.special;syncControls();render()}));
 $('backToLibrary').addEventListener('click',()=>{exitItemView();state.area=null;state.tag=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;state.special='all';syncControls();render()});
 $('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;savePrefs();render()});document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;savePrefs();syncControls();render()}));
 const panel=$('filterPanel');$('filterBtn').addEventListener('click',e=>{e.stopPropagation();const s=!panel.classList.contains('show');panel.classList.toggle('show',s);$('filterBtn').setAttribute('aria-expanded',String(s))});panel.addEventListener('click',e=>e.stopPropagation());document.addEventListener('click',e=>{panel.classList.remove('show');if(!e.target.closest('.item-menu,[data-more]'))closeItemMenus()});
 $('filterArea').addEventListener('change',e=>{exitItemView();state.area=e.target.value||null;state.special='all';state.tag=null;syncControls();render()});$('filterTag').addEventListener('change',e=>{exitItemView();state.tag=e.target.value||null;render()});$('filterDomain').addEventListener('input',e=>{exitItemView();state.domain=e.target.value.trim();render()});$('filterDate').addEventListener('change',e=>{exitItemView();state.date=e.target.value||null;render()});$('filterPageDate').addEventListener('change',e=>{exitItemView();state.pageDate=e.target.value||null;render()});$('filterType').addEventListener('change',e=>{exitItemView();state.type=e.target.value||null;render()});$('clearFilters').addEventListener('click',()=>{exitItemView();state.area=null;state.tag=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;state.special='all';syncControls();render()});$('doneFilters').addEventListener('click',()=>panel.classList.remove('show'));
 $('areaInput').addEventListener('input',()=>syncControls());$('editArea').addEventListener('input',()=>syncControls());$('captureBtn').addEventListener('click',openCapture);$('cancelCapture').addEventListener('click',()=>close('captureBackdrop'));$('saveCapture').addEventListener('click',saveManualCapture);$('cancelEdit').addEventListener('click',()=>close('editBackdrop'));$('saveEdit').addEventListener('click',saveEditItem);
 $('accountBtn').addEventListener('click',()=>{updateAccountUI();$('accountBackdrop').classList.add('show')});$('cancelAccount').addEventListener('click',()=>close('accountBackdrop'));$('closeAccount').addEventListener('click',()=>close('accountBackdrop'));$('signInBtn').addEventListener('click',signInWithPassword);$('sendMagicLink').addEventListener('click',sendMagicLink);$('signOutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();close('accountBackdrop')});
 $('deviceBtn').addEventListener('click',async()=>{updateAccountUI();$('deviceBackdrop').classList.add('show');await refreshDevices()});$('closeDevice').addEventListener('click',()=>close('deviceBackdrop'));$('generateDeviceToken').addEventListener('click',generateDeviceToken);$('copyDeviceToken').addEventListener('click',async()=>{await navigator.clipboard.writeText($('deviceToken').value);showNotice('Token copied.')});
 $('settingsBtn').addEventListener('click',()=>{$('exportStatus').textContent='';$('settingsBackdrop').classList.add('show')});$('closeSettings').addEventListener('click',()=>close('settingsBackdrop'));$('exportJson').addEventListener('click',exportJson);$('exportCsv').addEventListener('click',exportCsv);$('exportHtml').addEventListener('click',exportHtml);$('exportArchive').addEventListener('click',exportFullArchive);
 ['captureBackdrop','editBackdrop','accountBackdrop','deviceBackdrop','settingsBackdrop'].forEach(id=>$(id).addEventListener('click',e=>{if(e.target===$(id))close(id)}));document.addEventListener('keydown',e=>{if(e.key==='Escape'){close('captureBackdrop');close('editBackdrop');close('accountBackdrop');close('deviceBackdrop');close('settingsBackdrop');panel.classList.remove('show');closeItemMenus();hideHoverPreview()}})
}
function close(id){$(id).classList.remove('show')}
function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify({view:state.view,sort:state.sort}))}

(async function start(){makeSearch();wireUI();await initStore();updateAccountUI();await refresh();if(searchInput){searchInput.textContent='';state.query='';updateSearchClear()}if(supabaseClient&&!currentUser)showNotice('Fetch is connected. Sign in to see your library.',4500)})();
