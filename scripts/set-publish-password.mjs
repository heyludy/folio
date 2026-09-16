// Reads the new password without echoing it; only a salted, server-bound
// verifier is sent to Wrangler. Neither value is written into the repository.
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {passwordHash} from '../server/auth.js';

const saved=JSON.parse(await readFile(join(homedir(),'.config/folio/publisher.json'),'utf8'));
if(!saved.key||!saved.endpoint)throw new Error('게시 서버 초기 연결이 필요해요.');
const password=await new Promise((resolve,reject)=>{
 let value='';const input=process.stdin;
 console.log('새 게시 암호를 입력하고 Enter를 누르세요. 입력 내용은 표시되지 않아요.');
 if(input.isTTY)input.setRawMode(true);input.setEncoding('utf8');input.resume();
 const finish=()=>{input.off('data',read);if(input.isTTY)input.setRawMode(false);input.pause()};
 const read=chunk=>{for(const char of chunk){
  if(char==='\u0003'){finish();reject(new Error('취소했어요.'));return}
  if(char==='\n'||char==='\r'){finish();resolve(value);return}
  if(char==='\u007f'||char==='\b'){value=value.slice(0,-1);continue}
  value+=char;if(value.length>128){finish();reject(new Error('암호는 128자 이하여야 해요.'));return}
 }};input.on('data',read);input.once('end',()=>{finish();resolve(value)});
});
const verifier=await passwordHash(password,saved.key);
await new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url).pathname,'secret','put','PUBLISH_PASSWORD_HASH'],{cwd:new URL('..',import.meta.url),stdio:['pipe','ignore','ignore']});
 child.stdin.on('error',()=>{});child.stdin.end(verifier+'\n');child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error('게시 암호를 저장하지 못했어요. Wrangler 연결을 확인해 주세요.')));
});
console.log('게시 암호를 서버에 설정했어요. 기존 암호 세션은 새 암호로 다시 연결해야 해요.');
