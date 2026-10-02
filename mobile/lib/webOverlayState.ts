type Listener=(open:boolean)=>void;

let open=false;
const listeners=new Set<Listener>();

export const getWebOverlayOpen=()=>open;

export const setWebOverlayOpen=(next:boolean)=>{
  if(open===next)return;
  open=next;
  listeners.forEach(listener=>{try{listener(open);}catch{}});
};

export const subscribeWebOverlay=(listener:Listener)=>{
  listeners.add(listener);
  listener(open);
  return()=>listeners.delete(listener);
};
