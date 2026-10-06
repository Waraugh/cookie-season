import {createClient} from '@supabase/supabase-js';
const config=window.COOKIE_CONFIG||{};
const app=document.querySelector('.app');
let db,revision=0,dirty=false,saving=false,blocked=false,signedIn=false,currentUserId=null;
const status=document.querySelector('#save-status');
const localKey='cookie-season-unsaved';
function stamp(text){status.textContent=text;}
function gate(message=''){app.hidden=true;document.querySelector('#auth')?.remove();const shell=document.createElement('div');shell.id='auth';shell.className='auth-shell';shell.innerHTML=`<form class="auth-card" id="login"><h1>Cookie Season</h1><p>Your kitchen workspace</p><label class="field">Email<input name="email" type="email" autocomplete="username" required></label><label class="field">Password<input name="password" type="password" autocomplete="current-password" required></label><p id="auth-error" role="alert"></p><button class="btn">Sign in</button></form>`;document.body.append(shell);document.querySelector('#auth-error').textContent=message;document.querySelector('#login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),button=e.target.querySelector('button');button.disabled=true;const {data,error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});button.disabled=false;if(error)document.querySelector('#auth-error').textContent='Sign-in failed. Check your email and password.';else await load(data.user);};}
function problem(message){blocked=true;stamp('Changes need attention');document.querySelector('#sync-error')?.remove();const box=document.createElement('div');box.id='sync-error';box.className='sync-error';const text=document.createElement('p');text.textContent=message;box.append(text);const download=document.createElement('button');download.className='btn quiet';download.textContent='Download my changes';download.onclick=()=>downloadJSON(state,'Cookie-Season-Unsaved-Changes.json');const retry=document.createElement('button');retry.className='btn quiet';retry.textContent='Retry save';retry.onclick=()=>{blocked=false;box.remove();flush();};const reload=document.createElement('button');reload.className='btn';reload.textContent='Load saved kitchen';reload.onclick=()=>{if(confirm('Replace unsaved edits with the saved kitchen? Download your changes first.'))location.reload();};box.append(download,retry,reload);document.body.append(box);}
async function load(user){
 try{
  const {data:allowed,error:accessError}=await db.from('bakers').select('user_id').eq('user_id',user.id).maybeSingle();if(accessError||!allowed){await db.auth.signOut();gate('This account does not have baker access.');return;}
  const {data,error}=await db.from('kitchens').select('data,revision').eq('owner_id',user.id).maybeSingle();if(error)throw error;
  if(data){state=validateBackup(data.data);LocationEngine.upgrade(state);revision=data.revision;}
  else{state=seed();CookieEngine.upgradeState(state,window.SOURCE_DATA);LocationEngine.upgrade(state);revision=0;dirty=true;}
  signedIn=true;currentUserId=user.id;document.querySelector('#auth')?.remove();app.hidden=false;document.querySelector('#sign-out').hidden=false;render();stamp('Saved');
  const pending=localStorage.getItem(localKey);
  if(dirty)await flush();if(pending){const record=JSON.parse(pending);if(record.userId===user.id&&JSON.stringify(record.data)!==JSON.stringify(state)){
   modal(modalHead('Unsaved changes found','Review before restoring.')+`<div class="modal-body"><p class="list-note">This browser has edits from an interrupted save. Download them before loading or replacing records.</p><div class="modal-actions"><button class="btn quiet" id="recover-download">Download changes</button><button class="btn quiet" id="recover-discard">Keep saved kitchen</button><button class="btn" id="recover-use">Use my changes</button></div></div>`);
   document.querySelector('#recover-download').onclick=()=>downloadJSON(record.data,'Cookie-Season-Recovered.json');document.querySelector('#recover-discard').onclick=()=>{localStorage.removeItem(localKey);document.querySelector('#modal').close();};document.querySelector('#recover-use').onclick=()=>{state=validateBackup(record.data);LocationEngine.upgrade(state);persist();render();document.querySelector('#modal').close();};
  }}
 }catch{gate('Unable to load the kitchen. Try signing in again.');}
}
async function flush(){
 if(!signedIn||saving||blocked||!dirty)return;saving=true;dirty=false;stamp('Saving…');
 const snapshot=structuredClone(state);
 try{const {data,error}=await db.rpc('save_kitchen',{expected_revision:revision,kitchen_data:snapshot});if(error){if(error.code==='40001')throw new Error('Another device saved newer changes. Download your edits, then load the saved kitchen to avoid overwriting it.');throw new Error('Changes could not be saved. Your edits are still here. Check your connection and retry.');}revision=data.revision;if(!dirty){localStorage.removeItem(localKey);stamp('Saved');}}
 catch(error){dirty=true;problem(error.message);}
 finally{saving=false;if(dirty&&!blocked)flush();}
}
if(!config.url||!config.key){
 app.hidden=true;const shell=document.createElement('div');shell.className='auth-shell';shell.innerHTML='<div class="auth-card"><h1>Cookie Season</h1><p>The shared kitchen is not connected yet. Complete the hosting setup to enable baker access.</p></div>';document.body.append(shell);
}else{
 db=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const localPersist=persist;
 persist=function(){localPersist();if(!signedIn)return;dirty=true;stamp('Unsaved changes');try{localStorage.setItem(localKey,JSON.stringify({userId:currentUserId,data:state}));}catch{problem('This browser cannot preserve unsaved edits. Keep this page open until Saved appears.');}clearTimeout(persist.timer);persist.timer=setTimeout(flush,500);};
 document.querySelector('#sign-out').onclick=async()=>{if(dirty||saving){await flush();if(dirty||saving){problem('Save or download your changes before signing out.');return;}}signedIn=false;await db.auth.signOut();state=seed();localStorage.removeItem(KEY);gate();};
 window.addEventListener('beforeunload',e=>{if(dirty||saving){e.preventDefault();e.returnValue='';}});
 db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){signedIn=false;gate();}});
 db.auth.getSession().then(({data})=>data.session?load(data.session.user):gate());
 setInterval(async()=>{if(!signedIn||dirty||saving||blocked)return;const {data,error}=await db.from('kitchens').select('data,revision').maybeSingle();if(!error&&data&&!dirty&&!saving&&!blocked&&data.revision!==revision){state=validateBackup(data.data);LocationEngine.upgrade(state);revision=data.revision;render();stamp('Saved');}},30000);
}
