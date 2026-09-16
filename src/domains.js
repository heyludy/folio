import {parse} from 'tldts';
import {domainName,fail} from './publishing.js';

// Use the public suffix list: professor.ac.kr is an apex, lab.professor.ac.kr isn't.
export function domainDetails(value){
 const name=domainName(value),parsed=parse(name,{allowPrivateDomains:true});
 if(!parsed.domain||!parsed.isIcann||parsed.isPrivate)fail('직접 구매한 도메인 또는 그 하위 주소를 입력해 주세요.');
 return {name,root:parsed.domain,mode:name===parsed.domain?'apex':'subdomain',host:parsed.subdomain||'@'};
}

export function registrarInstructions(domain,target){
 if(domain.mode==='apex'){
  if(!domain.zone?.nameservers?.length)return '';
  return [`${domain.name} 도메인의 네임서버를 아래 Cloudflare 네임서버로 변경해 주세요.`,...domain.zone.nameservers.map((name,index)=>`${index+1}차 네임서버: ${name}`),'도메인 관리의 “네임서버 변경” 메뉴에서 기존 네임서버를 위 목록으로 교체해 주세요.','기존 이메일이나 다른 서비스를 사용 중이라면, 필요한 DNS 기록을 Cloudflare로 옮긴 뒤 변경해 주세요.'].join('\n');
 }
 return [`${domain.name} 연결을 위해 DNS 레코드를 설정해 주세요.`,`종류: CNAME`,`호스트: ${domainDetails(domain.name).host}`,`전체 이름: ${domain.name}`,`대상: ${target}`,'TTL: 자동 또는 기본값',...(domain.txtName&&domain.txtValue?[`TXT 이름: ${domain.txtName}`,`TXT 값: ${domain.txtValue}`]:[])].join('\n');
}
