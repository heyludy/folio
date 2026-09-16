// A one-time, loopback-only entry form. DNS token stays off disk and out of logs.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const route='/'+randomBytes(24).toString('hex');
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Folio 도메인 자동 설정 연결</title><style>*{box-sizing:border-box}body{font:15px/1.8 system-ui;background:#f4f6f4;color:#293a30;max-width:680px;margin:60px auto;padding:24px}main{padding:36px;background:white;border-radius:16px}h1{font-size:25px;line-height:1.4}p,li{color:#607168}li{margin:12px 0}a{color:#315744}input,button{font:inherit;border:1px solid #ccd5cf;border-radius:6px;padding:12px;width:100%;margin-top:10px}button{background:#315744;color:white;cursor:pointer}small{color:#819087}#message{white-space:pre-line}</style><main><h1>도메인 자동 설정 연결</h1><p>Folio에서 도메인을 등록하고 네임서버를 안내할 수 있도록, 관리자가 한 번 연결하는 화면이에요.</p><ol><li><a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer">Cloudflare API 토큰 만들기 ↗</a>에서 <b>사용자 지정 토큰</b>을 선택하세요.</li><li>이름: <b>Folio Domains</b><br/>권한: <b>영역(Zone) → 영역(Zone) → 편집(Edit)</b><br/>권한 추가: <b>영역(Zone) → DNS → 편집(Edit)</b></li><li>새로 추가하는 도메인에도 적용되도록 영역 리소스를 <b>모든 영역</b>으로 선택하세요. 계정 제한이 제공되면 Folio 게시 계정만 선택하세요.</li><li>토큰을 만든 뒤 아래에 붙여넣으세요.</li></ol><form id="form"><label>Cloudflare 도메인 API 토큰<input id="token" type="password" autocomplete="off" required minlength="20" maxlength="256"></label><button>도메인 기능 연결</button></form><p id="message" role="status"></p><a id="done" hidden href="https://heyludy.github.io/folio/" target="_blank" rel="noreferrer">Folio로 돌아가기 ↗</a><small>토큰은 게시 서버의 비밀 설정으로만 저장돼요. 채팅에 보내지 않아도 돼요. 이 설정으로 기존 게시 암호는 바뀌지 않아요.</small></main><script>const form=document.getElementById('form'),message=document.getElementById('message');form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;message.textContent='권한 확인 및 연결 중…';try{const response=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:document.getElementById('token').value})});const result=await response.json();if(!response.ok)throw new Error(result.error);document.getElementById('token').value='';form.hidden=true;document.getElementById('done').hidden=false;message.textContent='도메인 기능 연결 완료! Folio에서 도메인 연결을 다시 시도하세요.'}catch(error){message.textContent=error.message;button.disabled=false}});</script></html>`;
let busy=false,completed=false;
function putToken(token){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url).pathname,'secret','put','CLOUDFLARE_DNS_TOKEN'],{cwd:new URL('..',import.meta.url),stdio:['pipe','ignore','ignore']});
 child.stdin.on('error',()=>{});child.stdin.end(token+'\n');child.once('error',()=>reject(new Error('서버 연결 도구를 실행하지 못했어요.')));child.once('close',code=>code===0?resolve():reject(new Error('서버에 권한을 저장하지 못했어요. Wrangler 로그인을 확인해 주세요.')));
})}
const server=createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
 const origin=`http://127.0.0.1:${server.address().port}`;
 if(req.url!==route||req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(404);res.end();return}
 if(req.method==='GET'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return}
 if(req.method!=='POST'||req.headers.origin!==origin||!req.headers['content-type']?.startsWith('application/json')){res.writeHead(403);res.end();return}
 res.setHeader('Content-Type','application/json');
 if(busy||completed){res.writeHead(409);res.end(JSON.stringify({error:'이미 연결을 처리했어요.'}));return}
 busy=true;
 try{
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2048)throw new Error('입력값이 너무 길어요.');chunks.push(chunk)}
  const token=String(JSON.parse(Buffer.concat(chunks).toString()).token||'').trim();if(!/^[A-Za-z0-9_-]{20,256}$/.test(token))throw new Error('API 토큰을 확인해 주세요.');
  const response=await fetch('https://api.cloudflare.com/client/v4/zones?'+new URLSearchParams({'account.id':config.vars.CLOUDFLARE_ACCOUNT_ID,per_page:'1'}),{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok||!result.success)throw new Error('도메인 조회 권한을 확인하지 못했어요. 토큰의 Zone 편집·DNS 편집 권한과 계정 범위를 확인해 주세요.');
  await putToken(token);completed=true;console.log('Cloudflare DNS connection configured. No token saved locally.');res.end(JSON.stringify({ok:true}));
 }catch(error){res.writeHead(400);res.end(JSON.stringify({error:error instanceof SyntaxError?'토큰을 다시 입력해 주세요.':error.message==='fetch failed'?'인터넷 연결을 확인해 주세요.':error.message}))}finally{busy=false}
});
server.listen(0,'127.0.0.1',()=>console.log(`Local DNS setup: http://127.0.0.1:${server.address().port}${route}`));
setTimeout(()=>server.close(),45*60*1000).unref();
