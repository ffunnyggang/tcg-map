export const TAB_BAR_HEIGHT=58;
export const ANDROID_MIN_SAFE_BOTTOM=16;
export const IOS_MIN_SAFE_BOTTOM=12;
export const FLOATING_ACTION_GAP=18;

export const resolveFloatingActionBottom=(
  safeBottom:number,
  isAndroid:boolean,
  withNav=true,
  extra=0,
)=>{
  const safe=Math.max(safeBottom,isAndroid?ANDROID_MIN_SAFE_BOTTOM:IOS_MIN_SAFE_BOTTOM);
  return safe+(withNav?TAB_BAR_HEIGHT+FLOATING_ACTION_GAP:20)+extra;
};
