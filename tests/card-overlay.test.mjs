import {test} from 'node:test';import assert from 'node:assert/strict';import {validRect,homography,project,makePDF} from '../card-overlay-core.mjs';
import {printWindowRect} from '../card-overlay-print.mjs';
import {makePikachuSheetPDF, PIKACHU_SHEET_IDS} from '../admin-pikachu-sheet.mjs';

test('Pikachu imposition places 30 life-size tiles on one A2 page and keeps both cut layers editable', async () => {
 const item = {jpeg:Uint8Array.of(255,216,255,217),cut:{x:5.9,y:9.7,w:51.2,h:31.2},shape:'square'};
 assert.deepEqual([PIKACHU_SHEET_IDS[0],PIKACHU_SHEET_IDS.at(-1)],['m6a-ja-017','m6a-ja-046']);
 assert.throws(() => makePikachuSheetPDF([item]), /30종/);
 const pdf = await makePikachuSheetPDF(PIKACHU_SHEET_IDS.map(() => item)).text();
 assert.match(pdf,/\/Count 1/);
 assert.match(pdf,/\/MediaBox \[0 0 1190\.551181 1683\.779528\]/);
 assert.match(pdf,/\/OFF \[5 0 R 6 0 R\]/);
 const rows = [...pdf.matchAll(/q (\S+) 0 0 (\S+) (\S+) (\S+) cm \/Card\d+ Do Q/g)];
 assert.equal(rows.length,30);
 assert.equal(new Set(rows.map(row=>row[3])).size,5);
 assert.equal(new Set(rows.map(row=>row[4])).size,6);
 const mm = value => Number(value)*25.4/72;
 for (const [,w,h] of rows) {
  assert.ok(Math.abs(mm(w)-67)<.00001);
  assert.ok(Math.abs(mm(h)-92)<.00001);
 }
 for (const layer of ['WindowCut','OuterCut']) {
  const body = pdf.split(`/OC /${layer} BDC\n`)[1].split('EMC')[0];
  assert.equal([...body.matchAll(/ re S/g)].length,30);
 }
});

test('print PDF stores the inner cut at its real A4 coordinates on a separate spot-color layer', async () => {
 const cut = printWindowRect({x:5.9,y:9.7,w:51.2,h:31.2});
 const jpeg = Uint8Array.of(255,216,255,217);
 const pdf = await makePDF(jpeg,996,1416,83,118,{cutContour:cut}).text();
 assert.match(pdf,/^%PDF-1\.5/);
 assert.match(pdf,/\/OCGs \[6 0 R\].*\/OFF \[6 0 R\]/);
 assert.match(pdf,/\/Type \/OCG \/Name \(CutContour\)/);
 assert.match(pdf,/\[\/Separation \/CutContour \/DeviceCMYK/);
 const path = pdf.match(/\/OC \/WindowCut BDC\nq \/CutContour CS 1 SCN 0.25 w ([\d. ]+) re S Q\nEMC/);
 assert.ok(path);
 const coordinates = path[1].split(' ').map(pt => Number(pt)*25.4/72);
 const millimeters = [79.4,156.6,51.2,31.2];
 coordinates.forEach((value,index) => assert.ok(Math.abs(value-millimeters[index])<.00001));
 const event = await makePDF(jpeg,996,1416,83,118).text();
 assert.match(event,/^%PDF-1\.4/);
 assert.doesNotMatch(event,/CutContour|OCProperties/);
});
test('print window cannot leave physical card',()=>{assert.ok(validRect({x:5,y:13,w:53,h:33}));for(const r of [{x:-1,y:0,w:5,h:5},{x:60,y:0,w:5,h:5},{x:0,y:85,w:5,h:5},{x:0,y:0,w:NaN,h:5}])assert.equal(validRect(r),false);});
test('homography maps corners to original photographed card',()=>{const p=[{x:.2,y:.1},{x:.9,y:.2},{x:.8,y:.95},{x:.1,y:.8}],h=homography(p);[[0,0],[1,0],[1,1],[0,1]].forEach(([u,v],i)=>{const q=project(h,u,v);assert.ok(Math.abs(q.x-p[i].x)<1e-9);assert.ok(Math.abs(q.y-p[i].y)<1e-9);});});
test('reject crossed or collinear corners',()=>{assert.throws(()=>homography([{x:0,y:0},{x:1,y:1},{x:1,y:0},{x:0,y:1}]));assert.throws(()=>homography([{x:0,y:0},{x:.1,y:.1},{x:.2,y:.2},{x:.3,y:.3}]));});
test('PDF uses A4 physical dimensions with byte-correct xref',async()=>{const bytes=new Uint8Array(await makePDF(Uint8Array.from([255,216,255,217]),996,1416,83,118).arrayBuffer()),s=new TextDecoder().decode(bytes);assert.match(s,/MediaBox \[0 0 595.2756 841.8898\]/);assert.ok(s.includes(`${83*72/25.4}`.slice(0,12)));const start=Number(s.match(/startxref\n(\d+)/)[1]);assert.equal(new TextDecoder().decode(bytes.slice(start,start+4)),'xref');const rows=s.slice(s.indexOf('0000000000 65535 f')).split('\n').slice(1,6);rows.forEach((row,i)=>{const off=Number(row.slice(0,10));assert.equal(new TextDecoder().decode(bytes.slice(off,off+7)),`${i+1} 0 obj`);});});
