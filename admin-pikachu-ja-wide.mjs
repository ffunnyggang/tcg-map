const W=1536,H=2136, matrix=Object.freeze([1,0,0,1,-264,-364]);
export function isJAPrintAlternative(id, ref) {
  return (ref==='m6a-ja-032'||ref==='m6a-ja-033') && id==='ja-wide-print:'+ref;
}
export async function decodeJAPrintAlternative(body,ref,id,decode,canvas) {
  const plate=body?.plate, is16=ref==='m6a-ja-032';
  const cutRect={x:94/16,y:155/16,w:820/16,h:500/16};
  if (!isJAPrintAlternative(id,ref) || plate?.id!==id || plate.referenceId!==ref || plate.width!==W || plate.height!==H ||
      plate.trimWidthMm!==64 || plate.trimHeightMm!==89 || plate.bleedMm!==2 ||
      plate.embeddedWatermark!==is16 || plate.windowKnockout!==is16 ||
      !Object.keys(cutRect).every(key=>plate.cutRect?.[key]===cutRect[key]) ||
      !plate.wideWebp?.startsWith('data:image/webp;base64,')) throw new Error('확장 일러스트 인쇄 파일 규격을 확인해 주세요.');
  const artwork=await decode(plate.wideWebp);
  if(artwork.width!==W||artwork.height!==H)throw new Error('확장 일러스트 인쇄 파일 해상도를 확인해 주세요.');
  const native=canvas(1008,1408);
  native.getContext('2d').drawImage(artwork,264,364,1008,1408,0,0,1008,1408);
  // JA16 has a baked-in aperture and mark; the UI locks its placement.
  // This wide raster is fully prepared, never the narrower managed archive mask.
  return {artwork,native,nativeMatrix:matrix,cutRect,windowKnockout:false,jaAlternative:true,embeddedWatermark:is16};
}
