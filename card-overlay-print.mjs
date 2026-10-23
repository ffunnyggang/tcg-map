export const PRINT={scale:12,bleed:2,width:63,height:88,sheetWidth:83,sheetHeight:118,cornerRadius:3,innerBleed:.5};
export function artPlacement(rect,bleed=2,width=1024,height=1536){return{x:(rect.x+bleed)/(63+2*bleed)*width,y:(rect.y+bleed)/(88+2*bleed)*height,w:rect.w/(63+2*bleed)*width,h:rect.h/(88+2*bleed)*height};}
export function drawArt(g,art,x,y,s,bleed=2,crop=false){if(crop)g.drawImage(art,bleed/(63+2*bleed)*art.width,bleed/(88+2*bleed)*art.height,63/(63+2*bleed)*art.width,88/(88+2*bleed)*art.height,x,y,63*s,88*s);else g.drawImage(art,x-bleed*s,y-bleed*s,(63+bleed*2)*s,(88+bleed*2)*s);}
export function makePrintSheet(art,r,{shape='square',tolerance=0,bleed=2,sample=false}={}){
 const S=PRINT.scale,c=document.createElement('canvas');c.width=83*S;c.height=118*S;const g=c.getContext('2d'),x=10*S,y=10*S,t=Number(tolerance);if(!Number.isFinite(t)||t<0||t>.5)throw Error('창 여유는 0~0.5mm로 지정해 주세요.');if(r.x-t<0||r.y-t<0||r.x+r.w+t>63||r.y+r.h+t>88)throw Error('창 여유가 카드 외곽을 넘어요.');
 g.fillStyle='white';g.fillRect(0,0,c.width,c.height);drawArt(g,art,x,y,S,bleed);
 const wx=x+(r.x-t)*S,wy=y+(r.y-t)*S,ww=(r.w+2*t)*S,wh=(r.h+2*t)*S,ib=.5*S;
 // The sacrificial half-millimetre of artwork inside the cut window avoids a white seam.
 g.fillStyle='white';g.fillRect(wx+ib,wy+ib,ww-2*ib,wh-2*ib);g.strokeStyle='#666';g.lineWidth=.1*S;g.setLineDash([.6*S,.5*S]);g.strokeRect(wx+.07*S,wy+.07*S,ww-.14*S,wh-.14*S);g.setLineDash([]);
 g.fillStyle='#777';g.textAlign='center';g.font=`${1.7*S}px sans-serif`;g.fillText('CUT OUT INSIDE',wx+ww/2,wy+wh/2);
 if(shape==='round'){g.strokeStyle='#777';g.lineWidth=.1*S;g.setLineDash([.65*S,.5*S]);g.beginPath();g.roundRect(x-.06*S,y-.06*S,63*S+.12*S,88*S+.12*S,PRINT.cornerRadius*S);g.stroke();g.setLineDash([]);}
 g.strokeStyle='#555';g.lineWidth=.12*S;for(const [px,py]of[[x,y],[x+63*S,y],[x,y+88*S],[x+63*S,y+88*S]]){const dx=px===x?-1:1,dy=py===y?-1:1;g.beginPath();g.moveTo(px+dx*2.4*S,py);g.lineTo(px+dx*4*S,py);g.moveTo(px,py+dy*2.4*S);g.lineTo(px,py+dy*4*S);g.stroke();}
 g.fillStyle='#666';g.font=`${1.7*S}px sans-serif`;g.fillText(sample?'FUNY PIN · PRINT TEST SAMPLE':'FUNY PIN · AI EXTENDED ART',c.width/2,5*S);g.fillText(`63 x 88 mm · ${shape==='round'?'ROUND R3 (TEST)':'SQUARE'} · BLEED ${bleed} mm`,c.width/2,103*S);g.beginPath();g.moveTo(36.5*S,108*S);g.lineTo(46.5*S,108*S);g.moveTo(36.5*S,107*S);g.lineTo(36.5*S,109*S);g.moveTo(46.5*S,107*S);g.lineTo(46.5*S,109*S);g.stroke();g.fillText('10 mm · PRINT AT 100%',c.width/2,113*S);return c;
}
