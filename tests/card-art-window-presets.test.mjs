import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultArtWindow,windowPresetType} from '../card-art-window-presets.mjs';
test('three supplied samples use exact final millimetres without double inset',()=>{
 for(const [number,expected] of [[28,{x:5.3,y:9.1,w:52.4,h:32.1}],[77,{x:5.3,y:10.1,w:52.7,h:31.4}],[136,{x:7.9,y:11.7,w:47.4,h:33.2}]])for(const language of ['ko','ja'])assert.deepEqual(defaultArtWindow({id:'m6a-'+language+'-sample',card_number:number}),expected);
});
test('English numbering is independent and cached image presence does not change cut defaults',()=>{
 const card={id:'30th-en-091',card_number:'091',display_name:'Umbreon'};assert.equal(windowPresetType(card),'evolution');assert.deepEqual(defaultArtWindow(card),defaultArtWindow({...card,generationId:'existing'}));assert.equal(windowPresetType({id:'30th-en-077',card_number:'077',display_name:'Cosmog'}),'regular');
});
test('unclassified historical layout retains its per-card coordinates; returned presets cannot mutate defaults',()=>{
 assert.deepEqual(defaultArtWindow({id:'m6a-ja-143',card_number:'143',art_rect:{x:6,y:12,w:48,h:32}}),{x:6.2,y:12.2,w:47.6,h:31.6});const c={id:'m6a-ja-028',card_number:'028'};const a=defaultArtWindow(c);a.x=0;assert.equal(defaultArtWindow(c).x,5.3);
});
