import {normalizeCard} from './normalize.ts';
const base={certNumber:'153578569',company:'PSA',found:true,item:{game:'pokemon',name:'Bulbasaur',year:2022,setName:'Promo',cardNumber:'337',gradeLabel:'PSA 10'},certRecord:{grade:'10',subject:'Bulbasaur',year:2022,brand:'S-P Promo',cardNumber:'337'},certImages:{front:'https://example.com/front.jpg',back:'https://example.com/back.jpg'}};
const assert=(ok:boolean)=>{if(!ok)throw Error('assertion failed')};
Deno.test('verified PSA metadata and slab images',()=>{const p=normalizeCard(base,'153578569');assert(p.grade==='10'&&p.tcg_type==='pokemon'&&p.image_urls.length===2&&p.set_name==='S-P Promo')});
for(const [name,patch] of Object.entries({mismatched_cert:{certNumber:'12345678'},wrong_grader:{company:'CGC'},deactivated:{reason:'deactivated'},unsupported_game:{item:{...base.item,game:'sports'}},missing_slab:{certImages:null},incomplete_metadata:{item:{...base.item,year:null},certRecord:{...base.certRecord,year:null}}})){
 Deno.test('reject '+name,()=>{let rejected=false;try{normalizeCard({...base,...patch},'153578569')}catch{rejected=true}assert(rejected)});
}
Deno.test('unpriced identified card may still be listed',()=>assert(normalizeCard({...base,found:false,reason:'no_grade_price'},'153578569').card_name==='Bulbasaur'));
Deno.test('one-piece and legacy response are supported',()=>{const p=normalizeCard({...base,item:null,card:{...base.item,game:'one-piece'}},'153578569');assert(p.tcg_type==='one_piece')});
