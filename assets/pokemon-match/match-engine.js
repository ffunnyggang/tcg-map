'use strict';
const clamp01=v=>Math.max(0,Math.min(1,v));
const FACE_METRICS=[
{key:'roundness',label:'얼굴 가로·세로 비율',weight:.17,index:0,words:['길쭉한 쪽','중간 비율','둥근 쪽']},
{key:'jawTaper',label:'턱선이 좁아지는 정도',weight:.11,index:3,words:['좁아지는 쪽','중간 비율','완만한 쪽']},
{key:'eyes',label:'눈의 열린 정도',weight:.10,index:1,words:['작은 쪽','중간 정도','큰 쪽']},
{key:'eyeSpacing',label:'눈 사이 간격',weight:.08,index:4,words:['좁은 쪽','중간 간격','넓은 쪽']},
{key:'eyeTilt',label:'눈꼬리 각도',weight:.09,index:6,words:['아래쪽 기울기','수평에 가까움','위쪽 기울기']},
{key:'browArch',label:'눈썹 곡선',weight:.08,index:7,words:['평평한 쪽','중간 곡선','아치가 큰 쪽']},
{key:'browGap',label:'눈·눈썹 사이 간격',weight:.06,index:8,words:['가까운 쪽','중간 간격','떨어진 쪽']},
{key:'noseWidth',label:'코 너비 비율',weight:.08,index:9,words:['좁은 쪽','중간 비율','넓은 쪽']},
{key:'noseLength',label:'코 길이 비율',weight:.06,index:10,words:['짧은 쪽','중간 비율','긴 쪽']},
{key:'mouthWidth',label:'입 너비 비율',weight:.07,index:5,words:['작은 쪽','중간 비율','넓은 쪽']},
{key:'smile',label:'입꼬리 곡선',weight:.06,index:2,words:['완만한 쪽','중간 곡선','곡선이 큰 쪽']},
{key:'lipFullness',label:'입술 두께 비율',weight:.04,index:11,words:['얇은 쪽','중간 비율','도톰한 쪽']}
];
function describeFaceFeatures(face){return FACE_METRICS.map(m=>({label:m.label,value:m.words[Math.min(2,Math.floor(clamp01(face[m.key])*3))]}));}
function featureMatches(p,face){if(!face)return [];return FACE_METRICS.map(m=>({label:m.label,distance:Math.abs(face[m.key]-p.face[m.index])})).sort((a,b)=>a.distance-b.distance).slice(0,3).map(m=>m.label);}
function extractFaceFeatures(points){
 if(!Array.isArray(points)||points.length!==68||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))throw Error('얼굴 특징을 측정하지 못했어요.');
 const d=(a,b)=>Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y);
 const eye=(a)=>((d(a+1,a+5)+d(a+2,a+4))/(2*Math.max(1,d(a,a+3))));
 const center=indices=>({x:indices.reduce((v,i)=>v+points[i].x,0)/indices.length,y:indices.reduce((v,i)=>v+points[i].y,0)/indices.length});
 const brow=center([19,24]),chin=points[8],left=center([36,37,38,39,40,41]),right=center([42,43,44,45,46,47]);
 const angle=Math.atan2(right.y-left.y,right.x-left.x);const vertical=p=>-Math.sin(angle)*p.x+Math.cos(angle)*p.y;
 const height=Math.abs(vertical(chin)-vertical(brow));if(d(0,16)<15||height<15)throw Error('얼굴이 너무 작게 보여요. 가까이에서 찍어주세요.');
 const faceWidth=d(0,16),eyeWidth=(d(36,39)+d(42,45))/2;
 const eyeTilt=(vertical(points[39])-vertical(points[36])+vertical(points[42])-vertical(points[45]))/(2*Math.max(1,eyeWidth));
 const archLeft=((vertical(points[17])+vertical(points[21]))/2-vertical(points[19]))/Math.max(1,d(17,21));
 const archRight=((vertical(points[22])+vertical(points[26]))/2-vertical(points[24]))/Math.max(1,d(22,26));
 const browArch=(archLeft+archRight)/2;
 const browGap=(vertical(left)-vertical(center([17,18,19,20,21]))+vertical(right)-vertical(center([22,23,24,25,26])))/(2*height);
 const aspect=d(0,16)/height;const mouthWidth=d(48,54);const curve=(vertical(points[51])-(vertical(points[48])+vertical(points[54]))/2)/Math.max(1,mouthWidth);
 return {roundness:clamp01((aspect-.95)/.65),eyes:clamp01(((eye(36)+eye(42))/2-.12)/.26),smile:clamp01((curve+.02)/.18),jawTaper:clamp01((d(4,12)/d(0,16)-.4)/.38),eyeSpacing:clamp01((Math.hypot(right.x-left.x,right.y-left.y)/d(0,16)-.32)/.2),mouthWidth:clamp01((mouthWidth/d(0,16)-.25)/.32),eyeTilt:clamp01(.5+eyeTilt*3),browArch:clamp01(browArch/.24),browGap:clamp01((browGap-.04)/.16),noseWidth:clamp01((d(31,35)/faceWidth-.12)/.2),noseLength:clamp01((d(27,33)/height-.2)/.3),lipFullness:clamp01(((d(51,62)+d(57,66))/Math.max(1,mouthWidth)-.08)/.32),roll:Math.abs(angle)*180/Math.PI};
}
function rankPokemon(preference,rgb,face=null){
 const weights=face?{face:85,color:5,mood:7,element:3}:{face:0,color:25,mood:50,element:25};
 return CATALOG.map(p=>{
  const mood=preference.mood==='any'||p.moods.includes(preference.mood)?weights.mood:0;
  const element=preference.element==='any'||p.elements.includes(preference.element)?weights.element:p.elements.includes('any')?weights.element*.35:0;
  const distance=Math.hypot(...p.color.map((v,i)=>v-rgb[i]));const color=weights.color*Math.max(0,1-distance/441.68);
  const faceScore=face?weights.face*(1-Math.sqrt(FACE_METRICS.reduce((sum,m)=>sum+((face[m.key]??.5)-p.face[m.index])**2*m.weight,0))):0;
  return {...p,score:mood+element+color+faceScore,parts:{face:faceScore,color,mood,element},weights};
 }).sort((a,b)=>b.score-a.score||a.id-b.id).slice(0,3);
}
