export function normalizeCard(raw:any,cert:string,now=new Date().toISOString()){
 const card=raw.item||raw.card||{}, record=raw.certRecord||raw.collectible||{}, collectible=raw.collectible||{};
 if(String(raw.certNumber||'')!==cert||raw.company!=='PSA')throw Error('인증번호 또는 감정사가 응답과 일치하지 않습니다.');
 if(raw.reason==='deactivated'||record.deactivated||collectible.deactivated)throw Error('비활성화된 PSA 인증번호입니다.');
 const game=String(card.game||collectible.inferredType||'').toLowerCase();
 const tcg=game==='pokemon'?'pokemon':['one-piece','one_piece','onepiece'].includes(game)?'one_piece':null;
 if(!tcg)throw Error('포켓몬·원피스로 확인된 카드만 등록할 수 있습니다.');
 const text=(v:any)=>String(v??'').trim();
 const grade=text(record.grade||collectible.grade||raw.gradeLabel?.replace(/^PSA\s*/i,'')||card.gradeLabel?.replace(/^PSA\s*/i,'')||raw.grade);
 const year=text(record.year||collectible.year||card.year), set=text(record.brand||collectible.brand||card.setName),number=text(record.cardNumber||collectible.cardNumber||card.cardNumber),name=text(record.subject||collectible.subject||card.name);
 if(!/^\d{4}$/.test(year)||!grade||grade.length>20||!set||set.length>200||!number||number.length>40||!name||name.length>200)throw Error('필수 카드정보가 부족해 등록할 수 없습니다.');
 const safe=(v:any)=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
 const images=[safe(raw.certImages?.front||collectible.frontImageUrl),safe(raw.certImages?.back||collectible.backImageUrl)].filter(Boolean);
 if(!images.length)throw Error('해당 인증번호의 카드슬랩 이미지가 없어 등록할 수 없습니다.');
 return {cert_number:cert,tcg_type:tcg,grading_company:'PSA',grade,issue_year:year,set_name:set,card_number:number,card_name:name,image_urls:[...new Set(images)],source_url:'https://api.renaissos.com/v1/graded/PSA'+cert,checked_at:now};
}
