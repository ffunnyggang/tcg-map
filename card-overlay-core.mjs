export const CARD={width:63,height:88};
export function validRect(r){return ['x','y','w','h'].every(k=>Number.isFinite(r[k]))&&r.x>=0&&r.y>=0&&r.w>=5&&r.h>=5&&r.x+r.w<=63&&r.y+r.h<=88;}
export function validateCorners(p){if(p.length!==4)throw Error('카드의 네 모서리를 순서대로 선택해 주세요.');let sign=0,area=0;for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],c=p[(i+2)%4];const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(!Number.isFinite(cross)||Math.abs(cross)<1e-5||sign&&Math.sign(cross)!==sign)throw Error('모서리가 교차하거나 너무 가까워요. 다시 지정해 주세요.');sign=Math.sign(cross);area+=a.x*b.y-b.x*a.y;}if(Math.abs(area)<0.01)throw Error('카드를 더 크게 선택해 주세요.');}
export function homography(p){validateCorners(p);const uv=[[0,0],[1,0],[1,1],[0,1]],a=[];p.forEach((q,i)=>{const [u,v]=uv[i];a.push([u,v,1,0,0,0,-q.x*u,-q.x*v,q.x],[0,0,0,u,v,1,-q.y*u,-q.y*v,q.y]);});for(let i=0;i<8;i++){let j=i;for(let k=i+1;k<8;k++)if(Math.abs(a[k][i])>Math.abs(a[j][i]))j=k;[a[i],a[j]]=[a[j],a[i]];if(Math.abs(a[i][i])<1e-10)throw Error('원근 보정에 실패했어요. 모서리를 다시 지정해 주세요.');const d=a[i][i];for(let k=i;k<9;k++)a[i][k]/=d;for(let j=0;j<8;j++)if(j!==i){const d=a[j][i];for(let k=i;k<9;k++)a[j][k]-=d*a[i][k];}}return a.map(r=>r[8]);}
export function project(h,u,v){const z=h[6]*u+h[7]*v+1;return{x:(h[0]*u+h[1]*v+h[2])/z,y:(h[3]*u+h[4]*v+h[5])/z};}
// A4 PDF with JPEG embedded at an explicit physical size; no remote PDF library.
export function makePDF(jpeg, pixelWidth, pixelHeight, widthMM, heightMM, {cutContour} = {}) {
 const enc = new TextEncoder(), parts = [], offsets = [0];
 let length = 0;
 const put = value => {
  const bytes = typeof value === 'string' ? enc.encode(value) : value;
  parts.push(bytes);
  length += bytes.length;
 };
 const obj = (number, value) => {
  offsets[number] = length;
  put(`${number} 0 obj\n${value}\nendobj\n`);
 };
 const k = 72 / 25.4, w = widthMM * k, h = heightMM * k;
 const x = (210 * k - w) / 2, y = (297 * k - h) / 2;
 let catalog = '', resources = '', contourStream = '';
 if (cutContour) {
  const {x: left, y: top, w: width, h: height} = cutContour;
  if (![left, top, width, height].every(Number.isFinite) || left < 0 || top < 0 ||
      width <= 0 || height <= 0 || left + width > widthMM || top + height > heightMM) {
   throw Error('PDF 커팅 영역의 위치가 올바르지 않습니다.');
  }
  catalog = ' /OCProperties << /OCGs [6 0 R] /D << /Name (Artwork) /Order [6 0 R] /OFF [6 0 R] >> >>';
  resources = ' /Properties << /WindowCut 6 0 R >> /ColorSpace << /CutContour 7 0 R >>';
  // The artwork bitmap and vector cut path are separate, with a shared sheet origin.
  const rect = [x + left*k, y + (heightMM-top-height)*k, width*k, height*k]
   .map(value => value.toFixed(6)).join(' ');
  contourStream = `/OC /WindowCut BDC\nq /CutContour CS 1 SCN 0.25 w ${rect} re S Q\nEMC\n`;
 }
 put(cutContour ? '%PDF-1.5\n' : '%PDF-1.4\n');
 obj(1, `<< /Type /Catalog /Pages 2 0 R${catalog} >>`);
 obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.2756 841.8898] /Resources << /XObject << /Im0 4 0 R >>${resources} >> /Contents 5 0 R >>`);
 offsets[4] = length;
 put(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
 put(jpeg);
 put('\nendstream\nendobj\n');
 const stream = `q ${w} 0 0 ${h} ${x} ${y} cm /Im0 Do Q\n${contourStream}`;
 obj(5, `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`);
 if (cutContour) {
  obj(6, '<< /Type /OCG /Name (CutContour) >>');
  obj(7, '[/Separation /CutContour /DeviceCMYK << /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 1 0 0] /N 1 >>]');
 }
 const start = length, size = offsets.length;
 put(`xref\n0 ${size}\n0000000000 65535 f \n`);
 for (let i = 1; i < size; i++) put(String(offsets[i]).padStart(10, '0')+' 00000 n \n');
 put(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`);
 return new Blob(parts, {type:'application/pdf'});
}
