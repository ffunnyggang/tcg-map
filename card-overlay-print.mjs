export const PRINT={scale:12,bleed:2,width:63,height:88,sheetWidth:83,sheetHeight:118,cornerRadius:3,innerBleed:.5};
// Extend edge pixels into the 2mm sacrificial bleed; never scale the card artwork.
export function withCardBleed(image,createCanvas=document.createElement.bind(document,'canvas')){
 const c=createCanvas();c.width=1072;c.height=1472;const g=c.getContext('2d'),b=32,w=1008,h=1408;
 g.drawImage(image,0,0,image.width,image.height,b,b,w,h);
 g.drawImage(image,0,0,image.width,1,b,0,w,b);g.drawImage(image,0,image.height-1,image.width,1,b,b+h,w,b);
 g.drawImage(image,0,0,1,image.height,0,b,b,h);g.drawImage(image,image.width-1,0,1,image.height,b+w,b,b,h);
 for(const [sx,sy,dx,dy]of[[0,0,0,0],[image.width-1,0,b+w,0],[0,image.height-1,0,b+h],[image.width-1,image.height-1,b+w,b+h]])g.drawImage(image,sx,sy,1,1,dx,dy,b,b);
 return c;
}
export function artPlacement(rect,bleed=2,width=1024,height=1536){return{x:(rect.x+bleed)/(63+2*bleed)*width,y:(rect.y+bleed)/(88+2*bleed)*height,w:rect.w/(63+2*bleed)*width,h:rect.h/(88+2*bleed)*height};}
export function drawArt(g,art,x,y,s,bleed=2,crop=false){if(crop)g.drawImage(art,bleed/(63+2*bleed)*art.width,bleed/(88+2*bleed)*art.height,63/(63+2*bleed)*art.width,88/(88+2*bleed)*art.height,x,y,63*s,88*s);else g.drawImage(art,x-bleed*s,y-bleed*s,(63+bleed*2)*s,(88+bleed*2)*s);}
// Position on the original card footprint so preview and PDF share the same baseline.
export function drawArtWatermark(g,x,y,width,height){
 const scale=width/PRINT.width;
 const right=x+width-3.5*scale;
 const baseline=y+height-1.3*height/PRINT.height;
 g.save();
 g.font=`600 ${1.15*scale}px sans-serif`;
 g.textAlign='right';
 g.textBaseline='alphabetic';
 g.lineJoin='round';
 g.lineWidth=.12*scale;
 g.strokeStyle='#fff';
 g.fillStyle='#242424';
 g.strokeText('funypin.kr',right,baseline);
 g.fillText('funypin.kr',right,baseline);
 g.restore();
}
function drawCutoutCard(g, card, x, y, width, height, scale) {
 const fontUnit = Math.min(scale, height / 30);
 const maxWidth = width - 2 * Math.min(2 * scale, width / 10);
 const rows = [
  { position: .275, size: 3.2, color: '#1c2128', parts: [['카드샵과 수집의 즐거움을', 400]] },
  { position: .435, size: 3.2, color: '#1c2128', parts: [['연결하는 ', 400], ['퍼니핀', 700]] },
  { position: .68, size: 1.65, color: '#555', parts: [[`30th CELEBRATION · ${card.display_name} · ${card.card_number}`, 400]] },
  { position: .807, size: 1.95, color: '#555', parts: [['안쪽을 잘라주세요 · CUT OUT INSIDE', 400]] },
 ];
 g.save();
 g.textAlign = 'left';
 g.textBaseline = 'middle';
 for (const {position, size, color, parts} of rows) {
  const runs = parts.map(([text, weight]) => {
   const font = `${weight} ${size * fontUnit}px sans-serif`;
   g.font = font;
   return {text, font, width: g.measureText(text).width};
  });
  const lineWidth = runs.reduce((total, run) => total + run.width, 0);
  const fit = Math.min(1, maxWidth / lineWidth);
  g.save();
  g.translate(x + width / 2, y + height * position);
  g.scale(fit, fit);
  g.fillStyle = color;
  let left = -lineWidth / 2;
  for (const run of runs) {
   g.font = run.font;
   g.fillText(run.text, left, 0);
   left += run.width;
  }
  g.restore();
 }
 g.restore();
}

export function makePrintSheet(art,r,{shape='square',tolerance=0,bleed=2,sample=false,windowGuideInset=.07,trimMargin=0,watermark=false,cutoutCard=null}={}){
 const S=PRINT.scale,c=document.createElement('canvas');c.width=83*S;c.height=118*S;const g=c.getContext('2d'),x=10*S,y=10*S,t=Number(tolerance);if(!Number.isFinite(t)||t<0||t>.5)throw Error('창 여유는 0~0.5mm로 지정해 주세요.');if(r.x-t<0||r.y-t<0||r.x+r.w+t>63||r.y+r.h+t>88)throw Error('창 여유가 카드 외곽을 넘어요.');
 if(!Number.isFinite(trimMargin)||trimMargin<0||trimMargin>bleed)throw Error('재단선 확장 값이 올바르지 않습니다.');
 const left=x-trimMargin*S,top=y-trimMargin*S;
 const trimWidth=PRINT.width+2*trimMargin,trimHeight=PRINT.height+2*trimMargin;
 const right=left+trimWidth*S,bottom=top+trimHeight*S;
 g.fillStyle='white';g.fillRect(0,0,c.width,c.height);drawArt(g,art,x,y,S,bleed);
 const wx=x+(r.x-t)*S,wy=y+(r.y-t)*S,ww=(r.w+2*t)*S,wh=(r.h+2*t)*S,ib=.5*S;
 // The sacrificial half-millimetre of artwork inside the cut window avoids a white seam.
 g.fillStyle='white';g.fillRect(wx+ib,wy+ib,ww-2*ib,wh-2*ib);g.strokeStyle='#666';g.lineWidth=.1*S;g.setLineDash([.6*S,.5*S]);const gi=Number(windowGuideInset);if(!Number.isFinite(gi)||gi<0||gi>.1)throw Error('절단선 위치 값이 올바르지 않습니다.');g.strokeRect(wx+gi*S,wy+gi*S,ww-2*gi*S,wh-2*gi*S);g.setLineDash([]);
 g.fillStyle='#777';g.textAlign='center';g.font=`${1.7*S}px sans-serif`;
 if(cutoutCard)drawCutoutCard(g,cutoutCard,wx+ib,wy+ib,ww-2*ib,wh-2*ib,S);
 else g.fillText('CUT OUT INSIDE',wx+ww/2,wy+wh/2);
 if(shape==='round'){const guideOffset=trimMargin?0:.06*S;g.strokeStyle='#777';g.lineWidth=.1*S;g.setLineDash([.65*S,.5*S]);g.beginPath();g.roundRect(left-guideOffset,top-guideOffset,trimWidth*S+2*guideOffset,trimHeight*S+2*guideOffset,PRINT.cornerRadius*S);g.stroke();g.setLineDash([]);}
 g.strokeStyle='#555';g.lineWidth=.12*S;for(const [px,py]of[[left,top],[right,top],[left,bottom],[right,bottom]]){const dx=px===left?-1:1,dy=py===top?-1:1;g.beginPath();g.moveTo(px+dx*2.4*S,py);g.lineTo(px+dx*4*S,py);g.moveTo(px,py+dy*2.4*S);g.lineTo(px,py+dy*4*S);g.stroke();}
 if(watermark)drawArtWatermark(g,x,y,PRINT.width*S,PRINT.height*S);
 g.fillStyle='#666';g.font=`${1.7*S}px sans-serif`;g.fillText(sample?'FUNY PIN · PRINT TEST SAMPLE':'FUNY PIN · AI EXTENDED ART',c.width/2,5*S);g.fillText(`${trimWidth} x ${trimHeight} mm · ${shape==='round'?'ROUND R3':'SQUARE'} · BLEED ${bleed-trimMargin} mm`,c.width/2,103*S);g.beginPath();g.moveTo(36.5*S,108*S);g.lineTo(46.5*S,108*S);g.moveTo(36.5*S,107*S);g.lineTo(36.5*S,109*S);g.moveTo(46.5*S,107*S);g.lineTo(46.5*S,109*S);g.stroke();g.fillText('10 mm · PRINT AT 100%',c.width/2,113*S);return c;
}

