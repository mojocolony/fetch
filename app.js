const CONFIG = window.FETCH_CONFIG || { demoMode: true };
const STORAGE_KEY = 'fetch-v1-items';
const PREF_KEY = 'fetch-v1-prefs';

const seedItems = [
  {id:'demo-1',title:'The New Tudor Pelagos FXD GMT',domain:'hodinkee.com',brand:'HODINKEE',category:'Watches',saved_at:'2026-08-20T09:10:00-04:00',page_date:'2026-08-20',capture_type:'Page',starred:true,url:'https://www.hodinkee.com/',note:'',screenshot_url:null,kicker:'Introducing',deck:'A purpose-built GMT with a familiar silhouette and a few details worth a closer look.',theme:['#f4f0e8','#121416','#c83b2f','#d2d6d7','#30363a']},
  {id:'demo-2',title:'A compact field watch with a surprisingly good dial',domain:'monochrome-watches.com',brand:'MONOCHROME',category:'Watches',saved_at:'2026-08-19T18:20:00-04:00',page_date:'2026-08-18',capture_type:'Page',starred:false,url:'https://monochrome-watches.com/',note:'',screenshot_url:null,kicker:'Hands-On',deck:'Smaller proportions, strong typography and a quietly effective approach to legibility.',theme:['#f8f8f6','#101010','#111111','#a9a49b','#25231f']},
  {id:'demo-3',title:'Why small independent bookstores are thriving again',domain:'theguardian.com',brand:'The Guardian',category:'Books',saved_at:'2026-08-18T07:30:00-04:00',page_date:'2026-07-09',capture_type:'Text',starred:false,url:'https://www.theguardian.com/',note:'Across cities and small towns, a new generation of shops is finding an audience.',screenshot_url:null,kicker:'Books',deck:'Across cities and small towns, a new generation of shops is finding an audience.',theme:['#ffffff','#172b4d','#052962','#c7a36a','#6d4f30']},
  {id:'demo-4',title:'A practical guide to local-first software',domain:'inkandswitch.com',brand:'Ink & Switch',category:'Technology',saved_at:'2026-08-17T14:12:00-04:00',page_date:'2026-05-02',capture_type:'Page',starred:true,url:'https://www.inkandswitch.com/',note:'',screenshot_url:null,kicker:'Research',deck:'Software that keeps your data close, works offline, and still collaborates across devices.',theme:['#fbfaf7','#1a2228','#d3543c','#9fb1b8','#354751']},
  {id:'demo-5',title:'The 12 tables worth booking in Hamilton right now',domain:'tourismhamilton.com',brand:'Hamilton',category:'Restaurants',saved_at:'2026-08-14T12:00:00-04:00',page_date:'2026-03-14',capture_type:'Page',starred:false,url:'https://tourismhamilton.com/',note:'',screenshot_url:null,kicker:'Eat + Drink',deck:'A short list of neighbourhood places worth keeping in mind for the next night out.',theme:['#fffdf8','#25221e','#c7623a','#d7a56f','#6a3c24']},
  {id:'demo-6',title:'Designing interfaces for recognition instead of recall',domain:'nngroup.com',brand:'NN/g',category:'Technology',saved_at:'2026-08-10T13:45:00-04:00',page_date:'2025-11-22',capture_type:'Text',starred:true,url:'https://www.nngroup.com/',note:'Recognition is easier than recall.',screenshot_url:null,kicker:'UX',deck:'Good interfaces reduce memory load by making choices, objects and actions visible.',theme:['#ffffff','#191919','#d94f26','#91a3aa','#2e3a40']},
  {id:'demo-7',title:'A modern take on the pilot watch',domain:'fratellowatches.com',brand:'FRATELLO',category:'Watches',saved_at:'2026-08-06T16:20:00-04:00',page_date:'2025-03-05',capture_type:'Image link',starred:false,url:'https://www.fratellowatches.com/',note:'',image_url:'https://www.fratellowatches.com/',screenshot_url:null,kicker:'Watches',deck:'A familiar instrument-watch idea, reconsidered through proportion, colour and case finishing.',theme:['#f8f7f3','#202020','#d24b39','#a6adb0','#273035']},
  {id:'demo-8',title:'Ten novels arriving this fall that deserve attention',domain:'nytimes.com',brand:'The New York Times',category:'Books',saved_at:'2026-08-02T08:04:00-04:00',page_date:'2024-10-16',capture_type:'Page',starred:false,url:'https://www.nytimes.com/books',note:'',screenshot_url:null,kicker:'Books',deck:'A season of ambitious fiction, returning authors and a handful of intriguing debuts.',theme:['#ffffff','#111111','#111111','#8e6d52','#372d28']},
  {id:'demo-9',title:'Making tiny screenshots useful: WebP and perceptual quality',domain:'web.dev',brand:'web.dev',category:'Technology',saved_at:'2026-07-29T19:10:00-04:00',page_date:'2024-02-12',capture_type:'Page',starred:false,url:'https://web.dev/',note:'',screenshot_url:null,kicker:'Performance',deck:'How modern image formats can preserve useful visual information at surprisingly small sizes.',theme:['#ffffff','#202124','#1a73e8','#8aa9c8','#2e4d68']},
  {id:'demo-10',title:'Simple neighborhood ramen, very well executed',domain:'instagram.com',brand:'Instagram',category:'Restaurants',saved_at:'2026-07-25T21:30:00-04:00',page_date:'2023-06-03',capture_type:'Image link',starred:true,url:'https://www.instagram.com/',note:'A place to remember for a casual dinner.',screenshot_url:null,kicker:'Saved post',deck:'A place to remember for a casual dinner: simple room, short menu, very good bowls.',theme:['#ffffff','#262626','#c13584','#d39b56','#6f3427']},
  {id:'demo-11',title:'Tool watches and the return of smaller cases',domain:'hodinkee.com',brand:'HODINKEE',category:'Watches',saved_at:'2026-07-18T10:00:00-04:00',page_date:'2021-09-28',capture_type:'Page',starred:false,url:'https://www.hodinkee.com/',note:'',screenshot_url:null,kicker:'In-Depth',deck:'Why the most interesting new sports watches are stepping away from oversized proportions.',theme:['#f4f0e8','#121416','#c83b2f','#b3bbc0','#39454d']},
  {id:'demo-12',title:'A quiet redesign of the reading list',domain:'daringfireball.net',brand:'Daring Fireball',category:'Technology',saved_at:'2026-07-12T09:00:00-04:00',page_date:null,capture_type:'Page',starred:false,url:'https://daringfireball.net/',note:'',screenshot_url:null,kicker:'Linked List',deck:'A small interface change that makes a familiar reading workflow faster and calmer.',theme:['#f3f2ed','#222222','#4a5560','#b4b0a5','#3f3c38']}
];

let items = [];
let store = null;
let supabaseClient = null;
let currentUser = null;
const savedPrefs = safeJSON(localStorage.getItem(PREF_KEY), {});
let state = {
  category: null,
  domain: '',
  special: 'all',
  query: '',
  date: null,
  pageDate: null,
  type: null,
  sort: savedPrefs.sort || 'newest',
  view: savedPrefs.view || 'cards'
};

const $ = (id) => document.getElementById(id);
const itemsEl = $('items');
const hover = $('hoverPreview');
const now = () => new Date();

function safeJSON(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
function esc(v='') { return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function domainFrom(url) {
  try { return new URL(url).hostname.replace(/^www\./,''); } catch { return ''; }
}
function titleCaseDomain(domain) {
  const base = (domain || 'Saved page').split('.')[0].replace(/[-_]/g,' ');
  return base.replace(/\b\w/g, c => c.toUpperCase());
}
function dayDiff(date) { return (now() - new Date(date)) / 86400000; }
function formatSaved(date) { return new Date(date).toLocaleDateString(undefined, {month:'short', day:'numeric'}); }
function formatPageDate(date) { return date ? new Date(date+'T12:00:00').toLocaleDateString(undefined,{month:'short',year:'numeric'}) : 'Date unavailable'; }
function showNotice(message, ms=2500) {
  const el = $('notice'); el.textContent = message; el.classList.add('show');
  clearTimeout(showNotice.t); showNotice.t = setTimeout(()=>el.classList.remove('show'), ms);
}

class LocalStore {
  async init() {
    const existing = safeJSON(localStorage.getItem(STORAGE_KEY), null);
    if (!existing) localStorage.setItem(STORAGE_KEY, JSON.stringify(seedItems));
    return this.list();
  }
  async list() { return safeJSON(localStorage.getItem(STORAGE_KEY), seedItems); }
  async save(item) {
    const all = await this.list(); all.unshift(item); localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); return item;
  }
  async update(id, patch) {
    const all = (await this.list()).map(x => x.id === id ? {...x, ...patch} : x);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); return all.find(x=>x.id===id);
  }
}

class SupabaseStore {
  constructor(client) { this.client = client; }
  async list() {
    const {data, error} = await this.client.from('fetch_items').select('*').is('deleted_at', null).order('saved_at',{ascending:false});
    if (error) throw error;
    const enriched = await Promise.all((data || []).map(async item => {
      if (!item.screenshot_path) return item;
      const {data:signed} = await this.client.storage.from('fetch-screenshots').createSignedUrl(item.screenshot_path, 3600);
      return {...item, screenshot_url:signed?.signedUrl || null};
    }));
    return enriched;
  }
  async save(item) {
    const {data:{user}} = await this.client.auth.getUser();
    if (!user) throw new Error('Sign in to Fetch before adding links from the web app.');
    const payload = {...item, id:undefined, user_id:user.id};
    delete payload.screenshot_url; delete payload.brand; delete payload.kicker; delete payload.deck; delete payload.theme;
    const {data,error} = await this.client.from('fetch_items').insert(payload).select().single();
    if(error) throw error; return data;
  }
  async update(id, patch) {
    const {data,error} = await this.client.from('fetch_items').update(patch).eq('id',id).select().single();
    if(error) throw error; return data;
  }
}

async function initStore() {
  const configured = !CONFIG.demoMode && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey;
  if (!configured) {
    store = new LocalStore();
    $('modeLabel').innerHTML = '<span class="status-dot"></span>Local test mode';
    return;
  }
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseClient = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {auth:{persistSession:true, detectSessionInUrl:true}});
    store = new SupabaseStore(supabaseClient);
    const {data:{session}} = await supabaseClient.auth.getSession();
    currentUser = session?.user || null;
    $('modeLabel').innerHTML = '<span class="status-dot connected"></span>Supabase';
    supabaseClient.auth.onAuthStateChange(async (_event, sessionNow) => {
      currentUser = sessionNow?.user || null;
      updateAccountUI();
      try { await refresh(); } catch (err) { console.error(err); }
    });
  } catch (err) {
    console.error(err);
    store = new LocalStore();
    showNotice('Supabase could not load, so Fetch opened in local test mode.', 5000);
  }
}

function countsBy(key) { return items.reduce((m,x)=>(m[x[key]]=(m[x[key]]||0)+1,m),{}); }
function categories() { return Object.keys(countsBy('category')).filter(Boolean).sort((a,b)=>a.localeCompare(b)); }
function buildNav() {
  $('count-all').textContent = items.length;
  $('count-starred').textContent = items.filter(x=>x.starred).length;
  $('count-recent').textContent = items.filter(x=>dayDiff(x.saved_at)<=7).length;
  const cats = countsBy('category');
  $('categoryNav').innerHTML = categories().map(c=>`<button class="nav-item" data-category="${esc(c)}"><span class="left"><span class="category-dot"></span><span class="label">${esc(c)}</span></span><span class="count">${cats[c]}</span></button>`).join('');
  $('filterCategory').innerHTML = '<option value="">Any category</option>' + categories().map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('categoryOptions').innerHTML = categories().map(c=>`<option value="${esc(c)}"></option>`).join('');
  $('domainOptions').innerHTML = Object.keys(countsBy('domain')).filter(Boolean).sort().map(d=>`<option value="${esc(d)}"></option>`).join('');
  document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;state.special='all';syncControls();render();}));
}
function syncNav() {
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
  if(state.category) document.querySelector(`[data-category="${CSS.escape(state.category)}"]`)?.classList.add('active');
  else document.querySelector(`[data-filter="${state.special}"]`)?.classList.add('active');
}
function syncControls() {
  syncNav();
  $('filterCategory').value=state.category||''; $('filterDomain').value=state.domain||''; $('filterDate').value=state.date||''; $('filterPageDate').value=state.pageDate||''; $('filterType').value=state.type||''; $('sortSelect').value=state.sort;
  document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===state.view));
  renderFilterSummary();
}
function renderFilterSummary() {
  const parts=[];
  if(state.special==='recent') parts.push(['special','Recent']);
  if(state.special==='starred') parts.push(['special','Starred']);
  if(state.category) parts.push(['category',state.category]);
  if(state.domain) parts.push(['domain',`Domain: ${state.domain}`]);
  if(state.date) parts.push(['date',`Saved: ${{today:'Today',week:'Last 7 days',month:'Last 30 days',quarter:'Last 90 days'}[state.date]}`]);
  if(state.pageDate) parts.push(['pageDate',`Page: ${{'page-week':'Last 7 days','page-month':'Last 30 days','page-quarter':'Last 90 days','page-halfyear':'Last 6 months','page-year':'Last year','page-1-2':'1–2 years ago','page-2-5':'2–5 years ago','page-older':'More than 5 years ago','page-unknown':'Unknown date'}[state.pageDate]}`]);
  if(state.type) parts.push(['type',state.type==='Text'?'Selected text':state.type]);
  const panelCount=[state.category,state.domain,state.date,state.pageDate,state.type].filter(Boolean).length;
  $('filterBadge').textContent=panelCount; $('filterBadge').classList.toggle('show',panelCount>0); $('filterBtn').classList.toggle('active',panelCount>0);
  $('activeFilters').classList.toggle('show',parts.length>0);
  $('activeFilters').innerHTML=parts.map(([key,label])=>`<span class="filter-chip">${esc(label)}<button data-clear-filter="${key}" aria-label="Remove ${esc(label)}">×</button></span>`).join('');
  document.querySelectorAll('[data-clear-filter]').forEach(b=>b.addEventListener('click',()=>clearOneFilter(b.dataset.clearFilter)));
}
function clearOneFilter(key) {
  if(key==='special') state.special='all'; else if(key==='domain') state.domain=''; else if(key==='category') state.category=null; else if(key==='date') state.date=null; else if(key==='pageDate') state.pageDate=null; else if(key==='type') state.type=null;
  syncControls(); render();
}
function matchesPageRange(x) {
  if(!state.pageDate) return true;
  if(state.pageDate==='page-unknown') return !x.page_date;
  if(!x.page_date) return false;
  const age=dayDiff(x.page_date+'T12:00:00');
  if(state.pageDate==='page-week') return age>=0 && age<=7;
  if(state.pageDate==='page-month') return age>=0 && age<=30;
  if(state.pageDate==='page-quarter') return age>=0 && age<=90;
  if(state.pageDate==='page-halfyear') return age>=0 && age<=183;
  if(state.pageDate==='page-year') return age>=0 && age<=365;
  if(state.pageDate==='page-1-2') return age>365 && age<=730;
  if(state.pageDate==='page-2-5') return age>730 && age<=1826;
  if(state.pageDate==='page-older') return age>1826;
  return true;
}
function filtered() {
  let out=[...items];
  if(state.category) out=out.filter(x=>x.category===state.category);
  if(state.domain) out=out.filter(x=>(x.domain||'').toLowerCase().includes(state.domain.toLowerCase()));
  if(state.special==='starred') out=out.filter(x=>x.starred);
  if(state.special==='recent') out=out.filter(x=>dayDiff(x.saved_at)<=7);
  if(state.query){ const q=state.query.toLowerCase(); out=out.filter(x=>`${x.title} ${x.domain} ${x.category} ${x.note||''} ${x.selected_text||''}`.toLowerCase().includes(q)); }
  if(state.date){ const days={today:1,week:7,month:30,quarter:90}[state.date]; out=out.filter(x=>dayDiff(x.saved_at)<=days); }
  out=out.filter(matchesPageRange);
  if(state.type) out=out.filter(x=>x.capture_type===state.type);
  if(state.sort==='newest') out.sort((a,b)=>new Date(b.saved_at)-new Date(a.saved_at));
  if(state.sort==='oldest') out.sort((a,b)=>new Date(a.saved_at)-new Date(b.saved_at));
  if(state.sort==='page-newest') out.sort((a,b)=>(b.page_date||'').localeCompare(a.page_date||''));
  if(state.sort==='page-oldest') out.sort((a,b)=>{if(!a.page_date)return 1;if(!b.page_date)return -1;return a.page_date.localeCompare(b.page_date);});
  if(state.sort==='domain') out.sort((a,b)=>(a.domain||'').localeCompare(b.domain||''));
  if(state.sort==='category') out.sort((a,b)=>(a.category||'').localeCompare(b.category||'') || new Date(b.saved_at)-new Date(a.saved_at));
  if(state.sort==='title') out.sort((a,b)=>(a.title||'').localeCompare(b.title||''));
  return out;
}
function pageKind(x){ return x.category==='Watches'?'watch':x.category==='Books'?'book':x.category==='Restaurants'?'food':'tech'; }
function pageShot(x) {
  if (x.screenshot_url) return `<img class="real-shot" src="${esc(x.screenshot_url)}" alt="Saved viewport screenshot for ${esc(x.title)}" loading="lazy">`;
  const theme=x.theme || ['#f6f5f1','#1d252a','#5e7f9c','#b8c2c8','#3b4850']; const [bg,text,accent,a,b]=theme;
  const brand=x.brand || titleCaseDomain(x.domain); const kicker=x.kicker || x.capture_type || 'Saved page'; const deck=x.deck || x.note || x.selected_text || 'Saved to Fetch for quick visual retrieval.';
  const nav = x.category==='Watches'?'Stories &nbsp; Watches &nbsp; Magazine':x.category==='Books'?'Culture &nbsp; Reviews &nbsp; Features':x.category==='Restaurants'?'Explore &nbsp; Food &nbsp; Neighbourhoods':'Ideas &nbsp; Guides &nbsp; Research';
  return `<div class="page-shot ${pageKind(x)}" style="--site-bg:${bg};--site-text:${text};--site-accent:${accent};--site-mast:${bg};--site-mast-text:${text};--image-a:${a};--image-b:${b}"><div class="site-topline"></div><div class="site-mast"><div class="site-logo">${esc(brand)}</div><div class="site-nav">${nav}</div></div><div class="site-body"><div class="site-copy"><div class="site-kicker">${esc(kicker)}</div><div class="site-headline">${esc(x.title)}</div><div class="site-deck">${esc(deck)}</div><div class="site-byline">${esc(x.domain)} · ${formatPageDate(x.page_date)}</div></div><div class="site-image"></div></div></div>`;
}
function card(x) {
  const type = x.capture_type || 'Page';
  return `<article class="bookmark" data-id="${esc(x.id)}" tabindex="0" aria-label="Open ${esc(x.title)}"><div class="thumb-wrap">${pageShot(x)}<span class="type-badge">${esc(type)}</span><div class="item-actions"><button class="icon-btn ${x.starred?'starred':''}" data-star="${esc(x.id)}" title="${x.starred?'Unstar':'Star'}" aria-label="${x.starred?'Unstar':'Star'}">${x.starred?'★':'☆'}</button></div></div><div class="card-body"><h3 class="title">${esc(x.title)}</h3><div class="meta"><span class="domain"><span class="category-dot"></span>${esc(x.domain)}</span><span>${formatSaved(x.saved_at)}</span></div></div></article>`;
}
function render() {
  const out=filtered(); itemsEl.className=`items ${state.view}`; itemsEl.innerHTML=out.map(card).join(''); $('empty').style.display=out.length?'none':'block';
  $('viewTitle').textContent=state.category||(state.special==='starred'?'Starred':state.special==='recent'?'Recent':'Everything');
  const mode=state.view==='gallery'?'visual scan':state.view==='list'?'compact list':'visual bookmarks'; $('resultText').textContent=`${out.length} item${out.length===1?'':'s'} · ${mode}`;
  renderFilterSummary(); bindCards();
}
function bindCards() {
  document.querySelectorAll('.bookmark').forEach(el=>{
    const x=items.find(i=>String(i.id)===String(el.dataset.id)); if(!x) return;
    const open=()=>window.open(x.url,'_blank','noopener');
    el.addEventListener('click',e=>{if(e.target.closest('button'))return;open();});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.target.closest('button'))open();});
    el.addEventListener('mouseenter',e=>{if(window.innerWidth<900)return;hover.innerHTML=pageShot(x);hover.classList.add('show');movePreview(e);});
    el.addEventListener('mousemove',movePreview); el.addEventListener('mouseleave',()=>hover.classList.remove('show'));
  });
  document.querySelectorAll('[data-star]').forEach(btn=>btn.addEventListener('click',async e=>{
    e.stopPropagation(); const id=btn.dataset.star; const item=items.find(x=>String(x.id)===String(id)); if(!item)return;
    const next=!item.starred; try{await store.update(item.id,{starred:next});item.starred=next;buildNav();syncControls();render();}catch(err){showNotice(err.message,5000);}
  }));
}
function movePreview(e) {
  const pad=18,w=Math.min(680,window.innerWidth*.48),h=w/1.6; let x=e.clientX+20;if(x+w>window.innerWidth-pad)x=e.clientX-w-20;let y=e.clientY-h*.35;y=Math.max(pad,Math.min(y,window.innerHeight-h-pad));hover.style.left=x+'px';hover.style.top=y+'px';
}
async function refresh() { items = await store.list(); buildNav(); syncControls(); render(); }

function openCapture() {
  $('captureUrl').value=''; $('captureTitle').value=''; $('categoryInput').value=state.category||''; $('captureType').value='Page'; $('capturePageDate').value=''; $('captureImageUrl').value=''; $('captureNote').value=''; $('captureBackdrop').classList.add('show'); setTimeout(()=>$('captureUrl').focus(),0);
}
async function saveManualCapture() {
  const url=$('captureUrl').value.trim(); const title=$('captureTitle').value.trim(); const category=$('categoryInput').value.trim();
  if(!url || !title || !category){showNotice('URL, title and category are required.');return;}
  const domain=domainFrom(url); if(!domain){showNotice('That URL does not look valid.');return;}
  const item={id:crypto.randomUUID(),title,url,domain,category,saved_at:new Date().toISOString(),page_date:$('capturePageDate').value||null,capture_type:$('captureType').value,starred:false,note:$('captureNote').value.trim(),selected_text:$('captureType').value==='Text'?$('captureNote').value.trim():null,image_url:$('captureImageUrl').value.trim()||null,screenshot_url:null};
  try { await store.save(item); $('captureBackdrop').classList.remove('show'); await refresh(); showNotice('Saved to Fetch.'); }
  catch(err){console.error(err);showNotice(err.message||'Could not save this item.',5000);}
}


async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function makeDeviceToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary=''; bytes.forEach(b=>binary+=String.fromCharCode(b));
  return 'fetch_' + btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function updateAccountUI() {
  const label=$('accountLabel');
  if (!supabaseClient) { label.textContent='Local test mode'; return; }
  label.textContent=currentUser ? 'Signed in' : 'Sign in';
  $('signedOutBox').style.display=currentUser?'none':'block';
  $('signedInBox').style.display=currentUser?'block':'none';
  $('signedInAs').textContent=currentUser ? `Signed in as ${currentUser.email || 'your account'}.` : '';
  $('deviceSignedOut').style.display=currentUser?'none':'block';
  $('deviceSignedIn').style.display=currentUser?'block':'none';
}
async function signInWithPassword() {
  if(!supabaseClient){showNotice('Supabase is not connected.');return;}
  const email=$('authEmail').value.trim(), password=$('authPassword').value;
  if(!email||!password){showNotice('Enter your email and password.');return;}
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){showNotice(error.message,5000);return;}
  $('accountBackdrop').classList.remove('show'); showNotice('Signed in to Fetch.');
}
async function sendMagicLink() {
  if(!supabaseClient){showNotice('Supabase is not connected.');return;}
  const email=$('authEmail').value.trim(); if(!email){showNotice('Enter your email first.');return;}
  const redirectTo = location.protocol.startsWith('http') ? `${location.origin}${location.pathname}` : undefined;
  const {error}=await supabaseClient.auth.signInWithOtp({email, options: redirectTo ? {emailRedirectTo:redirectTo} : {}});
  if(error){showNotice(error.message,5000);return;}
  showNotice('Sign-in link sent.');
}
async function refreshDevices() {
  if(!supabaseClient||!currentUser){$('deviceList').innerHTML='';return;}
  const {data,error}=await supabaseClient.from('fetch_capture_devices').select('id,name,created_at,last_used_at,revoked_at').order('created_at',{ascending:false});
  if(error){$('deviceList').innerHTML=`<div class="empty">${esc(error.message)}</div>`;return;}
  const active=(data||[]).filter(x=>!x.revoked_at);
  $('deviceList').innerHTML=active.length ? active.map(d=>`<div class="device-row"><div><strong>${esc(d.name)}</strong><span>${d.last_used_at?'Last used '+new Date(d.last_used_at).toLocaleDateString():'Not used yet'}</span></div><button data-revoke-device="${d.id}">Revoke</button></div>`).join('') : '<div class="empty">No browser tokens yet.</div>';
  document.querySelectorAll('[data-revoke-device]').forEach(btn=>btn.addEventListener('click',async()=>{
    const {error:revokeError}=await supabaseClient.from('fetch_capture_devices').update({revoked_at:new Date().toISOString()}).eq('id',btn.dataset.revokeDevice);
    if(revokeError) showNotice(revokeError.message,5000); else {showNotice('Browser token revoked.');refreshDevices();}
  }));
}
async function generateDeviceToken() {
  if(!supabaseClient||!currentUser){showNotice('Sign in first.');return;}
  const name=$('deviceName').value.trim()||'Browser';
  const token=makeDeviceToken(), token_hash=await sha256Hex(token);
  const {error}=await supabaseClient.from('fetch_capture_devices').insert({user_id:currentUser.id,name,token_hash});
  if(error){showNotice(error.message,5000);return;}
  $('deviceToken').value=token; $('tokenResult').style.display='block'; await refreshDevices();
}

function wireUI() {
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.filter==='all'){state.category=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;state.special='all';}else{state.category=null;state.special=b.dataset.filter;}syncControls();render();}));
  $('searchInput').addEventListener('input',e=>{state.query=e.target.value;render();});
  $('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;localStorage.setItem(PREF_KEY,JSON.stringify({view:state.view,sort:state.sort}));render();});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;localStorage.setItem(PREF_KEY,JSON.stringify({view:state.view,sort:state.sort}));syncControls();render();}));
  const filterPanel=$('filterPanel');
  $('filterBtn').addEventListener('click',e=>{e.stopPropagation();const show=!filterPanel.classList.contains('show');filterPanel.classList.toggle('show',show);$('filterBtn').setAttribute('aria-expanded',String(show));});
  filterPanel.addEventListener('click',e=>e.stopPropagation());
  $('filterCategory').addEventListener('change',e=>{state.category=e.target.value||null;state.special='all';syncControls();render();});
  $('filterDomain').addEventListener('input',e=>{state.domain=e.target.value.trim();syncControls();render();});
  $('filterDate').addEventListener('change',e=>{state.date=e.target.value||null;syncControls();render();});
  $('filterPageDate').addEventListener('change',e=>{state.pageDate=e.target.value||null;syncControls();render();});
  $('filterType').addEventListener('change',e=>{state.type=e.target.value||null;syncControls();render();});
  $('clearFilters').addEventListener('click',()=>{state.category=null;state.domain='';state.date=null;state.pageDate=null;state.type=null;state.special='all';syncControls();render();});
  $('doneFilters').addEventListener('click',()=>{filterPanel.classList.remove('show');$('filterBtn').setAttribute('aria-expanded','false');});
  document.addEventListener('click',()=>{filterPanel.classList.remove('show');$('filterBtn').setAttribute('aria-expanded','false');});
  $('captureBtn').addEventListener('click',openCapture); $('cancelCapture').addEventListener('click',()=>$('captureBackdrop').classList.remove('show')); $('saveCapture').addEventListener('click',saveManualCapture);
  $('accountBtn').addEventListener('click',()=>{updateAccountUI();$('accountBackdrop').classList.add('show');});
  $('cancelAccount').addEventListener('click',()=>$('accountBackdrop').classList.remove('show')); $('closeAccount').addEventListener('click',()=>$('accountBackdrop').classList.remove('show'));
  $('signInBtn').addEventListener('click',signInWithPassword); $('sendMagicLink').addEventListener('click',sendMagicLink);
  $('signOutBtn').addEventListener('click',async()=>{if(supabaseClient)await supabaseClient.auth.signOut();$('accountBackdrop').classList.remove('show');showNotice('Signed out.');});
  $('deviceBtn').addEventListener('click',async()=>{updateAccountUI();$('deviceBackdrop').classList.add('show');await refreshDevices();});
  $('closeDevice').addEventListener('click',()=>$('deviceBackdrop').classList.remove('show')); $('generateDeviceToken').addEventListener('click',generateDeviceToken);
  $('copyDeviceToken').addEventListener('click',async()=>{await navigator.clipboard.writeText($('deviceToken').value);showNotice('Token copied.');});
  $('captureBackdrop').addEventListener('click',e=>{if(e.target===$('captureBackdrop'))$('captureBackdrop').classList.remove('show');});
  $('accountBackdrop').addEventListener('click',e=>{if(e.target===$('accountBackdrop'))$('accountBackdrop').classList.remove('show');});
  $('deviceBackdrop').addEventListener('click',e=>{if(e.target===$('deviceBackdrop'))$('deviceBackdrop').classList.remove('show');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('captureBackdrop').classList.remove('show');$('accountBackdrop').classList.remove('show');$('deviceBackdrop').classList.remove('show');filterPanel.classList.remove('show');}});
}

(async function start(){
  wireUI(); await initStore(); updateAccountUI(); await refresh();
  if(supabaseClient && !currentUser) showNotice('Fetch is connected. Sign in to see your library.', 5000);
})();
