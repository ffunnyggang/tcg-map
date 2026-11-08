import {insetWindow,validWindow} from './card-art-core.mjs?v=20261107-flow3';
export const WINDOW_PRESETS=Object.freeze({
 regular:Object.freeze({x:5.3,y:9.1,w:52.4,h:32.1}),
 evolution:Object.freeze({x:5.3,y:10.1,w:52.7,h:31.4}),
 classic:Object.freeze({x:7.9,y:11.7,w:47.4,h:33.2})
});
// Set-specific layout classification; never use English numbers as Japanese numbers.
const evolved=new Set([2,5,51,58,62,65,66,69,70,71,74,77,83,84,87,90,91,99,100]);
const englishEvolved=new Set(['Alolan Exeggutor','Vivillon','Toxtricity','Espeon','Chandelure','Cosmoem','Lunala','Lucario','Seismitoad','Lycanroc','Nidorina','Umbreon','Ferrothorn','Solgaleo','Gholdengo','Hakamo-o','Kommo-o','Hisuian Zoroark','Maushold'].map(s=>s.toLowerCase()));
export function windowPresetType(card){
 const n=Number(String(card.card_number).split('/')[0]);
 if(/^m6a-(ko|ja)-/.test(card.id)){
  if(n===136||n===137)return 'classic';
  if(n>=1&&n<=100)return evolved.has(n)?'evolution':'regular';
 }
 if(/^30th-en-/.test(card.id)&&n>=1&&n<=125)return englishEvolved.has(String(card.display_name).trim().toLowerCase())?'evolution':'regular';
 return null;
}
export function defaultArtWindow(card){
 const type=windowPresetType(card);
 if(type)return {...WINDOW_PRESETS[type]}; // Final cut coordinates: no additional 0.2mm inset.
 if(!validWindow(card.art_rect))throw Error('일러스트 창 정보가 준비되지 않았어요.');
 return insetWindow(card.art_rect); // Other historical layouts retain their existing per-card setting.
}
