import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile,cp} from 'node:fs/promises';
await mkdir('public',{recursive:true});
await cp('dist','public',{recursive:true});
const url=process.env.SUPABASE_URL||'',key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
if(url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw Error('SUPABASE_URL must be your project HTTPS URL.');
if(/service_role|sb_secret_/.test(key))throw Error('Use a publishable key, never a secret/service-role key.');
if(key.startsWith('eyJ')){try{const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));if(payload.role!=='anon')throw Error('Not an anonymous public key');}catch{throw Error('SUPABASE_PUBLISHABLE_KEY must be publishable/anon.');}}
await writeFile('public/config.js','window.COOKIE_CONFIG='+JSON.stringify({url,key})+';');
await build({entryPoints:['scripts/sync.js'],bundle:true,format:'iife',outfile:'public/sync.js',minify:true,target:['es2022']});
const html=await readFile('public/index.html','utf8');
await writeFile('public/index.html',html.replace('<script src="source-data.js">','<script src="config.js"></script><script src="source-data.js">').replace('</body>','<script src="sync.js"></script></body>'));
