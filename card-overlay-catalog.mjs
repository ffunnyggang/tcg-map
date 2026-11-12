const languages={ko:'한글판',en:'영문판',ja:'일본판'};
export const isDogamAdminCard=row=>row.id?.startsWith('dogam-ko-');
export function catalogLanguage(row){return (isDogamAdminCard(row)||row.id?.startsWith('m6a-ko-'))?'ko':row.id?.startsWith('m6a-ja-')?'ja':'en';}
export function catalogLabel(row){const language=catalogLanguage(row);if(isDogamAdminCard(row))return [languages[language],row.set_name||row.set_code].filter(Boolean).join(' · ');return languages[language]+(row.id?.startsWith('me55cc-')?' · Classic Collection':' · 30th');}
const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
export function catalogPage(rows,{language='all',search='',page=0,pageSize=24}={}){
 const query=normalize(search),number=/^\d+(?:\/\d+)?$/.test(query)?Number(query.split('/')[0]):null;
 const matches=rows.filter(row=>{
  if(language!=='all'&&catalogLanguage(row)!==language)return false;
  if(!query)return true;
  const printed=normalize(row.card_number).replace(/^no\.?/,'');
  return number!==null?Number(printed.split('/')[0])===number:[row.display_name+' '+row.card_number,row.set_name,row.set_code,row.illustrator].some(value=>normalize(value).includes(query));
 }).sort((a,b)=>{const order={ko:0,en:1,ja:2};return order[catalogLanguage(a)]-order[catalogLanguage(b)]||String(a.card_number).localeCompare(String(b.card_number),'ko',{numeric:true})||String(a.id).localeCompare(String(b.id));});
 const pages=Math.max(1,Math.ceil(matches.length/pageSize)),current=Math.min(Math.max(0,page),pages-1);
 return {rows:matches.slice(current*pageSize,(current+1)*pageSize),total:matches.length,page:current,pages};
}
export function catalogPortrait(row,image){
 const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
 return row.id!=='m6a-ja-151152'&&Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0&&Math.abs(w/h-63/88)<=.025;
}
