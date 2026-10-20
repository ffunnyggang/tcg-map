type TabReselectKey='map'|'my';
type Listener=()=>void;

const listeners:Record<TabReselectKey,Set<Listener>>={
  map:new Set(),
  my:new Set(),
};

export function emitTabReselect(key:TabReselectKey){
  listeners[key].forEach(listener=>{try{listener()}catch{}});
}

export function subscribeTabReselect(key:TabReselectKey,listener:Listener){
  listeners[key].add(listener);
  return()=>listeners[key].delete(listener);
}
