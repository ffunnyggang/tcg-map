const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function alignment(record) {
  const { imageId, matrix, alignmentKey } = record;
  if (typeof imageId !== 'string' || typeof alignmentKey !== 'string' || !Array.isArray(matrix)
      || matrix.length !== 6 || !matrix.every(n=>Number.isFinite(n)&&Math.abs(n)<=1000000)) return null;
  try {
    const parsed=JSON.parse(alignmentKey);
    if (!Array.isArray(parsed)||parsed.length!==2||parsed[0]!==imageId) return null;
    const {x,y,w,h}=parsed[1];
    if (![x,y,w,h].every(Number.isFinite)||x<0||y<0||w<5||h<5||x+w>63.001||y+h>88.001) return null;
    const cutMm={x,y,w,h};
    if (JSON.stringify([imageId,cutMm])!==alignmentKey) return null;
    return {illustrationId:imageId,alignmentKey,matrix:[...matrix],cutMm};
  } catch { return null; }
}
export async function buildPrintSettingsExport({references, pageConfirmed, saved, isAlternative, resolve}){
  const rows=references.map((referenceId,index)=>({slot:String(index+1).padStart(2,'0'),referenceId,status:'missing'}));
  let next=0;
  const verify=async()=>{
    for(let i=next++;i<rows.length;i=next++){
      const row=rows[i];
      const exact = pageConfirmed[row.referenceId]?.confirmed === true ? pageConfirmed[row.referenceId] : null;
      const old = !exact && saved[row.referenceId]?.confirmed === true ? saved[row.referenceId] : null;
      if (!exact && !old) continue;
      const provenance=exact?'page-confirmed':'legacy-confirmed';
      row.provenance=provenance;
      const values=alignment(exact || old);
      if (!values) { row.status='invalid'; continue; }
      const alternative=!!exact && isAlternative(values.illustrationId,row.referenceId);
      if (!alternative && !UUID.test(values.illustrationId)) { row.status='unavailable'; continue; }
      const check=await resolve(row.referenceId, values, alternative);
      if (!check.nativeSource) { row.status=check.status; continue; }
      if(exact)Object.assign(row,values,{status:'verified',nativeSource:check.nativeSource});
      else Object.assign(row,{status:'legacy-candidate',candidate:{...values,nativeSource:check.nativeSource}});
    }
  };
  await Promise.all([verify(),verify(),verify()]);
  const exact=rows.filter(r=>r.status==='verified'&&r.provenance==='page-confirmed').length;
  const legacy=rows.filter(r=>r.status==='legacy-candidate').length;
  return {
    schema:'funypin-admin-pikachu-print-settings-v1',
    coordinateSystem:{matrix:'Canvas2D source pixels → native card pixels',nativeWidthPx:1008,nativeHeightPx:1408,nativePixelsPerMm:16,
      nativeWidthMm:63,nativeHeightMm:88,trimWidthMm:64,trimHeightMm:89,trimOffsetFromNativeMm:-0.5,bleedMm:2},
    summary:{exact,legacy,unverified:rows.length-exact-legacy,allExact:exact===rows.length}, rows,
  };
}
