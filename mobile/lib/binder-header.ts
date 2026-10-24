export type BinderDetailRoute={id:string;url:string};
export type BinderHeaderContext=BinderDetailRoute&{mine:boolean;preview:boolean};

/** Resolve the actual binder page, including the same-origin CMS page wrapper. */
export function binderDetailRoute(target:string,allowLocal=false):BinderDetailRoute|null{
 try{
  let u=new URL(target);
  for(let depth=0;depth<2;depth++){
   const allowed=u.hostname==='funypin.kr'||u.hostname==='www.funypin.kr'||(allowLocal&&(u.hostname==='127.0.0.1'||u.hostname==='localhost'));
   if(!allowed||!/^https?:$/.test(u.protocol))return null;
   if(u.pathname==='/cms-inapp-page.html'){
    const nested=u.searchParams.get('target');if(!nested)return null;
    const next=new URL(nested,u.origin);if(next.origin!==u.origin)return null;u=next;continue;
   }
   const id=u.searchParams.get('id')?.trim();
   return u.pathname==='/binder.html'&&u.searchParams.get('view')==='detail'&&id?{id,url:u.toString()}:null;
  }
 }catch{}
 return null;
}
export function binderHeaderContext(data:{url?:unknown;mine?:unknown;preview?:unknown},fallback:string,allowLocal=false):BinderHeaderContext|null{
 if(typeof data.mine!=='boolean'||typeof data.preview!=='boolean')return null;
 const route=binderDetailRoute(typeof data.url==='string'?data.url:fallback,allowLocal);
 return route?{...route,mine:data.mine,preview:data.preview}:null;
}
export function canShowBinderHeader(showBackHeader:boolean,target:string,context:BinderHeaderContext|null,allowLocal=false):boolean{
 const route=binderDetailRoute(target,allowLocal);
 return !!(showBackHeader&&route&&context&&route.id===context.id&&!context.preview);
}
