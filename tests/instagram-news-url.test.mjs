import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context={window:{},URL,document:{createElement:()=>({textContent:''}),head:{append(){}}}};
vm.createContext(context);
for(const file of ['cms-instagram-image-admin.js','cms-instagram-shop-map-admin.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
const parsers=[context.window.FunyCmsInstagramImage.parse,context.window.FunyCmsInstagramShopMap.canonical];
const cases=[
 ['https://www.instagram.com/p/ABC_12-/', 'https://www.instagram.com/p/ABC_12-/'],
 ['https://www.instagram.com/reel/ABC/?igsh=example','https://www.instagram.com/reel/ABC/'],
 ['https://www.instagram.com/reels/ABC/','https://www.instagram.com/reel/ABC/'],
 ['https://www.instagram.com/shop.name/p/ABC/?img_index=2','https://www.instagram.com/p/ABC/'],
 ['https://m.instagram.com/shop_name/reel/ABC/','https://www.instagram.com/reel/ABC/'],
 [' https://instagram.com/p/ABC/ ','https://www.instagram.com/p/ABC/'],
 ['https://instagram.com.evil.test/p/ABC/',null],
 ['https://user:pass@instagram.com/p/ABC/',null],
 ['https://www.instagram.com/share/reel/ABC/',null],
 ['https://www.instagram.com/stories/shop/123/',null],
 ['https://www.instagram.com/shop/',null],
 ['http://www.instagram.com/p/ABC/',null]
];
for(const parse of parsers)for(const [input,expected] of cases)assert.equal(parse(input),expected,input);
console.log('Instagram URL: 24 parser assertions passed');
