// Shared symbol is composited locally after generation, never included in the AI prompt.
export function compositeSharedSymbol(result,image,placement){
 const p=placement;if(!p||['x','y','w','h'].some(k=>!Number.isFinite(p[k]))||p.x<0||p.y<0||p.w<=0||p.h<=0||p.x+p.w>1||p.y+p.h>1)throw Error('심볼 위치 정보가 올바르지 않습니다.');
 result.getContext('2d').drawImage(image,Math.round(p.x*result.width),Math.round(p.y*result.height),Math.round(p.w*result.width),Math.round(p.h*result.height));return result;
}

// The 30th stamp has a yellow face, two red numerals and dark ear tips.
function stampColor(r,g,b){
 if(r>145&&g>115&&r>b+75&&g>b+65&&r>g*.9)return 1;
 if(r>120&&r>g*1.65&&r>b*1.45)return 2;
 if(Math.max(r,g,b)<95)return 3;
 return 0;
}

export function usesCenteredAnniversarySymbol(card){
 if(!card||!/^\d{3}$/.test(card.card_number))return false;
 const number=Number(card.card_number);
 if(card.source_language==='en')return card.id.startsWith('30th-en-')&&card.display_name==='Pikachu'&&number>=23&&number<=52;
 const name=card.source_language==='ko'?'피카츄':card.source_language==='ja'?'ピカチュウ':null;
 return !!name&&card.id.startsWith('m6a-'+card.source_language+'-')&&card.display_name===name&&number>=17&&number<=46;
}

export function findAnniversarySymbolCenter(source,asset,canvas,{centerOnly=false}={}){
 const width=252,height=352,templateWidth=32,templateHeight=25;
 const readPixels=(image,w,h)=>{
  const ctx=canvas(w,h).getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0,w,h);
  return ctx.getImageData(0,0,w,h).data;
 };
 const template=readPixels(asset.image,templateWidth,templateHeight);
 const groups=[[],[],[],[]];
 let top=templateHeight,bottom=-1;
 for(let y=0;y<templateHeight;y++)for(let x=0;x<templateWidth;x++){
  const i=(y*templateWidth+x)*4;
  if(template[i+3]<240)continue;
  top=Math.min(top,y);
  bottom=Math.max(bottom,y);
  const color=stampColor(template[i],template[i+1],template[i+2]);
  if(color===2)groups[x<templateWidth/2?1:2].push([x,y]);
  if(color===3)groups[3].push([x,y]);
  if(color===1&&x%2===0&&y%2===0)groups[0].push([x,y]);
 }
 if(groups.some(group=>!group.length))return null;
 const visibleCenter=(top+bottom+1)/(2*templateHeight);
 const pixels=readPixels(source,width,height),colors=new Uint8Array(width*height);
 for(let i=0;i<colors.length;i++)colors[i]=stampColor(pixels[i*4],pixels[i*4+1],pixels[i*4+2]);
 const matches=[];
 const centerScales=[1.85,2,2.15,2.3,2.45];
 const scales=centerOnly?centerScales:[.82,.88,.94,1,1.06,1.12,...centerScales];
 for(const scale of scales){
  const w=Math.round(asset.placement.w*width*scale),h=Math.round(asset.placement.h*height*scale);
  const points=groups.map(group=>group.map(([x,y])=>Math.floor((y+.5)*h/templateHeight)*width+Math.floor((x+.5)*w/templateWidth)));
  const wide=scale>1.12,columns=[];
  const minimumNumeral=wide ? .30 : .45,minimumYellow=wide ? .65 : .79;
  const minimumDark=wide ? .42 : .56,minimumScore=wide ? .64 : .77;
  const hit=(start,group,color)=>{
   let count=0;
   for(const offset of points[group])if(colors[start+offset]===color)count++;
   return count/points[group].length;
  };
  if(wide){
   const middle=Math.round((width-w)/2);
   for(let x=middle-15;x<=middle+15;x++)columns.push(x);
  }else{
   for(let offset=0;offset<=Math.round(width*.29)-w;offset++)columns.push(offset,width-w-offset);
  }
  for(let y=Math.round(height*.28);y<=Math.round(height*.57);y++){
   for(const x of columns){
    const start=y*width+x;
    const left=hit(start,1,2),right=hit(start,2,2);
    if(left<minimumNumeral||right<minimumNumeral)continue;
    const yellow=hit(start,0,1),dark=hit(start,3,3);
    if(yellow<minimumYellow||dark<minimumDark)continue;
    const score=yellow*.4+(left+right)*.22+dark*.16;
    if(score>=minimumScore)matches.push({score,center:(y+h*visibleCenter)/height,x,y,w,h});
   }
  }
 }
 matches.sort((a,b)=>b.score-a.score);
 const best=matches[0];
 if(!best||matches.some(m=>Math.abs(m.center-best.center)>.025&&m.score>best.score-.04))return null;
 if(centerOnly)return {x:best.x/width,y:best.y/height,w:best.w/width,h:best.h/height};
 return {y:best.center,anchor:visibleCenter};
}

export function anniversarySymbolPlacement(asset,detected){
 if(!detected)return asset.placement;
 const {h}=asset.placement;
 return {...asset.placement,y:Math.min(1-h,Math.max(0,detected.y-detected.anchor*h))};
}

// The fallback follows the large badge on the Pikachu layout below the illustration.
export const PIKACHU_ANNIVERSARY_PLACEMENT=Object.freeze({x:.22,y:.53,w:.56,h:.31});
