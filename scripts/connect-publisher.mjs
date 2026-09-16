// One-time local secret entry: provider token never appears in CLI arguments,
// output, the repo, or the Folio frontend. Requires `wrangler login` first.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const endpoint=new URL(process.argv[2]||'https://folio-publisher.example.workers.dev').origin;
if(!endpoint.startsWith('https://')||endpoint.includes('.example.'))throw new Error('Pass the deployed Worker HTTPS URL.');
const route='/'+randomBytes(24).toString('hex'),dir=join(homedir(),'.config','folio'),file=join(dir,'publisher.json');
await mkdir(dir,{recursive:true,mode:0o700});
let previous;try{previous=JSON.parse(await readFile(file,'utf8'))}catch{}
const adminKey=previous?.endpoint===endpoint?previous.key:randomBytes(32).toString('hex');
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Folio 게시 서버 연결</title><style>body{font:15px/1.8 system-ui;background:#f4f6f4;color:#293a30;max-width:620px;margin:70px auto;padding:28px}main{padding:36px;background:white;border-radius:16px}h1{font-size:25px;line-height:1.4}p,li{color:#607168}a{color:#315744}input,button{font:inherit;box-sizing:border-box;border:1px solid #ccd5cf;border-radius:6px;padding:12px;width:100%;margin-top:10px}button{background:#315744;color:white;cursor:pointer}small{color:#819087}code{font-size:12px}#message{color:#315744}</style><main><h1>Folio 게시 서버 연결</h1><p>이 설정은 관리자 한 번만 진행하면 돼요.<br/>방금 로그인은 Codex용이고, 아래 키는 Folio 서버가 게시할 때 사용해요.</p><ol><li><a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer">Cloudflare API 토큰 만들기 ↗</a>를 열고 <b>사용자 지정 토큰</b>을 선택하세요.</li><li>이름은 <b>Folio Publisher</b>, 권한은 <b>계정 → Cloudflare Pages → 편집(Edit)</b>으로 설정하세요.</li><li>계정 리소스는 <b>사용할 계정 하나</b>만 선택하세요.</li><li>토큰을 만든 뒤 아래에 붙여넣고 연결하세요.</li></ol><form id="form"><label>Cloudflare API 토큰<input id="token" name="token" type="password" autocomplete="off" required minlength="20" maxlength="256"></label><button>게시 서버에 연결</button></form><p id="message" role="status"></p><div id="done" hidden><p>Folio에서 <b>게시</b>를 누르고 관리 키를 붙여넣으면 돼요.</p><p>서버 주소<br/><code>${endpoint}</code></p><button id="copy">게시 관리 키 복사</button><a href="https://heyludy.github.io/folio/" target="_blank" rel="noreferrer">Folio 열기 ↗</a></div><small>토큰은 Cloudflare 서버의 비밀 설정에 저장돼요. 채팅이나 GitHub에는 올리지 않아요.</small></main><script>let key='';const form=document.getElementById('form'),message=document.getElementById('message');form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;message.textContent='Cloudflare 연결 중…';try{const response=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:document.getElementById('token').value})});const result=await response.json();if(!response.ok)throw new Error(result.error);key=result.key;document.getElementById('token').value='';form.hidden=true;document.getElementById('done').hidden=false;message.textContent='게시 서버 연결 완료!';}catch(error){message.textContent=error.message;button.disabled=false}});document.getElementById('copy').onclick=async()=>{await navigator.clipboard.writeText(key);message.textContent='관리 키를 복사했어요. Folio 게시 설정에 붙여넣으세요.'}</script></html>`;
let busy=false,completed=false;
function putSecrets(values){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url).pathname,'secret','bulk'],{cwd:new URL('..',import.meta.url),stdio:['pipe','ignore','ignore']});
 child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(values));child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error('Cloudflare 서버에 키를 저장하지 못했어요.')));
})}
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
 if(req.url!==route||req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(404);res.end();return}
 if(req.method==='GET'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return}
 if(req.method!=='POST'||req.headers.origin!==`http://127.0.0.1:${server.address().port}`){res.writeHead(403);res.end();return}
 res.setHeader('Content-Type','application/json');
 if(busy||completed){res.writeHead(409);res.end(JSON.stringify({error:'이미 연결을 처리했어요.'}));return}
 busy=true;
 try{
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048)throw new Error('입력값이 너무 길어요.')}
  const token=String(JSON.parse(raw).token||'').trim();if(!/^[A-Za-z0-9_-]{20,256}$/.test(token))throw new Error('API 토큰을 확인해 주세요.');
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.vars.CLOUDFLARE_ACCOUNT_ID}/pages/projects?per_page=1`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||!result.success)throw new Error('이 계정의 Pages 권한을 확인하지 못했어요. 계정과 토큰 권한을 확인해 주세요.');
  await putSecrets({ADMIN_KEY:adminKey,CLOUDFLARE_API_TOKEN:token});
  await writeFile(file,JSON.stringify({endpoint,key:adminKey},null,2)+'\n',{mode:0o600});
  completed=true;console.log('Publisher secrets configured. Private manager connection saved to '+file);
  res.end(JSON.stringify({key:adminKey}));
 }catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message==='fetch failed'?'인터넷 연결을 확인해 주세요.':error instanceof SyntaxError?'토큰을 다시 입력해 주세요.':error.message}));}finally{busy=false}
});
server.listen(0,'127.0.0.1',()=>console.log(`Local setup: http://127.0.0.1:${server.address().port}${route}`));
setTimeout(()=>server.close(),45*60*1000).unref();
