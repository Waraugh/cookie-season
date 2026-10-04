const encoder = new TextEncoder();
const cookieName = '__Host-cookie-review';
const lifetime = 7 * 24 * 60 * 60;
const headers = {'content-type':'text/html; charset=utf-8','cache-control':'private, no-store','x-robots-tag':'noindex, nofollow','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
async function key(password) {
  return crypto.subtle.importKey('raw', encoder.encode(password), {name:'HMAC',hash:'SHA-256'}, false, ['sign','verify']);
}
function hex(bytes) { return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join(''); }
async function signature(password, payload) { return hex(await crypto.subtle.sign('HMAC',await key(password),encoder.encode(payload))); }
async function valid(password, token) {
  const [expires, sig, extra] = (token || '').split('.');
  const now = Math.floor(Date.now()/1000);
  if (extra || !/^\d+$/.test(expires || '') || !/^[a-f0-9]{64}$/.test(sig || '') || Number(expires) <= now || Number(expires) > now + lifetime) return false;
  const bytes = Uint8Array.from(sig.match(/../g), x => parseInt(x,16));
  return crypto.subtle.verify('HMAC',await key(password),bytes,encoder.encode('cookie-season-review:'+expires));
}
function page(message = '', status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cookie Season · Private kitchen</title><style>*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#f6f3eb;color:#243c32;font:16px system-ui;padding:24px}main{width:100%;max-width:420px;background:#fffdf7;border:1px solid #deded1;border-radius:24px;padding:38px;box-shadow:0 20px 70px #243c3210}.label{font-size:12px;letter-spacing:.16em;text-transform:uppercase}h1{font:38px Georgia;margin:18px 0}p{line-height:1.6;color:#657269}label{display:block;margin:26px 0 8px}input,button{width:100%;font:inherit;padding:14px;border-radius:10px}input{border:1px solid #bbc6bb;background:white}button{margin-top:14px;background:#254d3d;color:white;border:0;cursor:pointer}.error{color:#9c382e}</style><main><div class="label">Cookie Season</div><h1>A private kitchen.</h1><p>Enter the shared password to take a look around.</p>${message ? `<p role="alert" class="error">${message}</p>` : ''}<form method="post" action="/__review/login"><label for="password">Kitchen password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" autofocus><button>Open the kitchen</button></form></main></html>`,{status,headers});
}
export default async function access(request, context) {
  const password = Netlify.env.get('COOKIE_REVIEW_PASSWORD');
  if (!password || password.length < 16) return new Response('Private review is not configured yet.', {status:503,headers});
  const url = new URL(request.url);
  if (url.pathname === '/__review/login' && request.method === 'POST') {
    if (request.headers.get('origin') !== url.origin) return new Response('Invalid request.',{status:403,headers});
    if (Number(request.headers.get('content-length') || 0) > 4096) return new Response('Request too large.',{status:413,headers});
    let supplied;
    try { supplied = (await request.formData()).get('password'); } catch { return page('Please try again.',400); }
    if (typeof supplied !== 'string' || supplied.length > 256 || await signature(password, supplied) !== await signature(password,password)) return page('That password did not match. Please try again.',401);
    const expires = Math.floor(Date.now()/1000) + lifetime;
    const token = expires+'.'+await signature(password,'cookie-season-review:'+expires);
    return new Response(null,{status:303,headers:{location:'/', 'cache-control':'no-store','set-cookie':`${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${lifetime}`}});
  }
  if (await valid(password,context.cookies.get(cookieName))) {
    const response = await context.next();
    const result = new Response(response.body,response);
    result.headers.set('cache-control','private, no-store');
    result.headers.set('x-robots-tag','noindex, nofollow');
    return result;
  }
  return page('',request.method === 'GET' ? 200 : 401);
}
export const config = {path:'/*'};
