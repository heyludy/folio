const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export class DraftConflictError extends Error{
 constructor(){super('다른 탭에서 같은 내용을 수정했어요.');this.name='DraftConflictError';}
}

// Compare each tab's edits with the snapshot it actually opened. Disjoint fields
// merge; competing edits and delete/edit conflicts never overwrite saved work.
export function mergeDrafts(base,local,remote){
 if(equal(local,base))return remote;
 if(equal(remote,base)||equal(local,remote))return local;
 if((base===undefined||record(base))&&record(local)&&record(remote)){
  const result={};
  for(const key of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){
   const value=mergeDrafts(base?.[key],local[key],remote[key]);
   if(value!==undefined)result[key]=value;
  }
  return result;
 }
 if([base,local,remote].every(value=>Array.isArray(value)&&value.every(item=>record(item)&&typeof item.id==='string'))){
  const ids=items=>items.map(item=>item.id),order=mergeDrafts(ids(base),ids(local),ids(remote));
  const maps=[base,local,remote].map(items=>new Map(items.map(item=>[item.id,item]))),merged=new Map();
  for(const id of new Set(maps.flatMap(map=>[...map.keys()]))){
   const value=mergeDrafts(...maps.map(map=>map.get(id)));
   if(value!==undefined)merged.set(id,value);
  }
  return order.filter(id=>merged.has(id)).map(id=>merged.get(id));
 }
 throw new DraftConflictError();
}
