import assert from 'node:assert/strict';
import {mediaFromEmbed} from '../supabase/functions/cms-instagram-capture/media.mjs';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
const embed=(url,pct)=>'<div class="Content EmbedFrame" style="padding-bottom: '+pct+'%;"><img class="EmbeddedMediaImage" src="'+url+'"></div>';
assert.deepEqual(mediaFromEmbed(embed('https://scontent.cdninstagram.com/photo.jpg?a=1&amp;b=2',100)),{url:'https://scontent.cdninstagram.com/photo.jpg?a=1&b=2',width:1200,height:1200});
assert.equal(mediaFromEmbed(embed('https://scontent.cdninstagram.com/photo.jpg',125)).height,1200);
for(const url of ['https://cdninstagram.com.evil.test/a','http://scontent.cdninstagram.com/a','https://user:pass@scontent.cdninstagram.com/a','https://example.com/a'])assert.throws(()=>mediaFromEmbed(embed(url,125)));
assert.throws(()=>mediaFromEmbed('<img class="Avatar" src="https://scontent.cdninstagram.com/a">'));
assert.throws(()=>mediaFromEmbed(embed('https://scontent.cdninstagram.com/a',300)));
const ctx={window:{},URL,document:{createElement:()=>({textContent:''}),head:{append(){}}}};vm.createContext(ctx);vm.runInContext(readFileSync(new URL('../cms-instagram-image-admin.js',import.meta.url),'utf8'),ctx);
const layout=ctx.window.FunyCmsInstagramImage.mediaLayout;
const square=layout(540,540,'4:5',50);assert.equal(square.height,540);assert.equal(square.maxTop,0);assert.equal(square.target,1.25);
const portrait=layout(540,675,'1:1',200);assert.equal(portrait.height,540);assert.equal(portrait.top,135);
assert.equal(layout(540,675,'4:5').height,675);
console.log('Media extraction allowlist, aspect layout and crop limits passed');

const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const {PNG}=require('pngjs');const {cropMediaPng}=await import('../supabase/functions/cms-instagram-capture/crop.mjs');const raw=new PNG({width:1200,height:1200});raw.data.fill(255);const result=PNG.sync.read(cropMediaPng(new Uint8Array(PNG.sync.write(raw)),960,1200,PNG));assert.equal(result.width,960);assert.equal(result.height,1200);
