type Listener=(open:boolean)=>void;

type DimListener=(dimmed:boolean)=>void;

let open=false;
let dimmed=false;
const listeners=new Set<Listener>();
const dimListeners=new Set<DimListener>();

export const getWebOverlayOpen=()=>open;
export const getWebNavigationDimmed=()=>dimmed;

export const setWebOverlayOpen=(next:boolean)=>{
  if(open===next)return;
  open=next;
  listeners.forEach(listener=>{try{listener(open);}catch{}});
};

export const setWebNavigationDimmed=(next:boolean)=>{
  if(dimmed===next)return;
  dimmed=next;
  dimListeners.forEach(listener=>{try{listener(dimmed);}catch{}});
};

export const subscribeWebOverlay=(listener:Listener)=>{
  listeners.add(listener);
  listener(open);
  return()=>{listeners.delete(listener);};
};

export const subscribeWebNavigationDimmed=(listener:DimListener)=>{
  dimListeners.add(listener);
  listener(dimmed);
  return()=>{dimListeners.delete(listener);};
};
