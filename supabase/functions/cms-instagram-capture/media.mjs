// Extract only public embed media markup; never use profile images or caption URLs.
export function mediaFromEmbed(html){
 const tag=String(html).match(/<img\b[^>]*\bclass=["'][^"']*\bEmbeddedMediaImage\b[^"']*["'][^>]*>/i)?.[0];
 const frame=String(html).match(/<div\b[^>]*\bclass=["'][^"']*\bEmbedFrame\b[^"']*["'][^>]*>/i)?.[0];
 const src=tag?.match(/\bsrc=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g,'&').replace(/&#0*38;/g,'&');
 const percent=Number(frame?.match(/padding-bottom:\s*([\d.]+)%/i)?.[1]);
 if(!src||!Number.isFinite(percent)||percent<50||percent>190)throw Error('게시물 이미지 영역을 확인하지 못했습니다. 공개 게시물인지 확인해주세요.');
 const u=new URL(src);
 if(u.protocol!=='https:'||u.username||u.password||u.port||!/(^|\.)(cdninstagram\.com|fbcdn\.net)$/i.test(u.hostname))throw Error('게시물 이미지 주소를 확인하지 못했습니다.');
 const ratio=percent/100,width=Math.min(1200,Math.floor(1200/ratio));return {url:u.href,width,height:Math.round(width*ratio)};
}
