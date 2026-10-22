type TabReselectKey='map'|'my'|'talk';
type Listener=()=>void;
const listeners:Record<TabReselectKey,Set<Listener>>={map:new Set(),my:new Set(),talk:new Set()};
export function emitTabReselect(key:TabReselectKey){
  for(const listener of Array.from(listeners[key])){try{listener()}catch{}}
}
export function subscribeTabReselect(key:TabReselectKey,listener:Listener){
  listeners[key].add(listener);
  return()=>{listeners[key].delete(listener)};
}
