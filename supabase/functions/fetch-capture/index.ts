import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-fetch-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:{...cors,'content-type':'application/json'}});

function secretKey() {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) {
    try { return JSON.parse(modern).default as string; } catch {}
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
async function sha256Hex(value:string) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers:cors});
  const token = req.headers.get('x-fetch-token') || '';
  if (!token || token.length < 24) return json({error:'Unauthorized.'},401);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = secretKey();
  if (!url || !key) return json({error:'Fetch capture function is not configured.'},500);
  const supabase = createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

  const tokenHash = await sha256Hex(token);
  const {data:device,error:deviceError} = await supabase
    .from('fetch_capture_devices')
    .select('id,user_id')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle();
  if (deviceError) return json({error:deviceError.message},500);
  if (!device) return json({error:'Unauthorized.'},401);

  // Last-used tracking is helpful but must never block capture.
  supabase.from('fetch_capture_devices').update({last_used_at:new Date().toISOString()}).eq('id',device.id).then(()=>{});

  if (req.method === 'GET') {
    const {data,error} = await supabase.from('fetch_items').select('category').eq('user_id', device.user_id).is('deleted_at', null);
    if (error) return json({error:error.message},500);
    const categories = [...new Set((data || []).map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    return json({categories});
  }
  if (req.method !== 'POST') return json({error:'Method not allowed.'},405);

  let body:any;
  try { body = await req.json(); } catch { return json({error:'Invalid JSON.'},400); }
  const title = String(body.title || '').trim();
  const pageUrl = String(body.url || '').trim();
  const domain = String(body.domain || '').trim();
  const category = String(body.category || '').trim();
  const captureType = String(body.capture_type || 'Page');
  if (!title || !pageUrl || !domain || !category) return json({error:'Title, URL, domain and category are required.'},400);
  if (!['Page','Text','Image link'].includes(captureType)) return json({error:'Invalid capture type.'},400);

  let screenshotPath:string|null = null;
  const dataUrl = typeof body.screenshot_data_url === 'string' ? body.screenshot_data_url : '';
  if (dataUrl.startsWith('data:image/')) {
    try {
      const match = dataUrl.match(/^data:(image\/(?:webp|jpeg|png));base64,(.+)$/s);
      if (match) {
        const mime = match[1];
        const binary = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        if (binary.byteLength <= 1_048_576) {
          const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
          screenshotPath = `${device.user_id}/${crypto.randomUUID()}.${ext}`;
          const {error:uploadError} = await supabase.storage.from('fetch-screenshots').upload(screenshotPath, binary, {contentType:mime, upsert:false});
          if (uploadError) throw uploadError;
        }
      }
    } catch (err) {
      console.error('Screenshot upload failed:', err);
      screenshotPath = null;
    }
  }

  const payload = {
    user_id: device.user_id,
    title,
    url: pageUrl,
    domain,
    category,
    capture_type: captureType,
    selected_text: body.selected_text ? String(body.selected_text).slice(0, 20000) : null,
    image_url: body.image_url ? String(body.image_url).slice(0, 4000) : null,
    page_date: body.page_date || null,
    screenshot_path: screenshotPath
  };
  const {data,error} = await supabase.from('fetch_items').insert(payload).select().single();
  if (error) return json({error:error.message},500);
  return json({item:data});
});
