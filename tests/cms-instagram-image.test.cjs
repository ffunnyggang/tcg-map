const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx={URL,window:{},document:{createElement:()=>({}),head:{append(){}}}};
vm.runInNewContext(fs.readFileSync('cms-instagram-image-admin.js','utf8'),ctx);
const I=ctx.window.FunyCmsInstagramImage;
test('only public Instagram post and reel URLs reach the capture service',()=>{
 for(const url of ['javascript:alert(1)','http://instagram.com/p/a/','https://instagram.com.evil.test/p/a/','https://user@instagram.com/p/a/','https://instagram.com:444/p/a/','https://instagram.com/stories/a/','https://instagram.com/p/a/embed/'])assert.equal(I.parse(url),null);
 assert.equal(I.parse('https://instagram.com/reel/Ab_-1/?igsh=tracking'),'https://www.instagram.com/reel/Ab_-1/');
});
test('crop rectangles stay inside the captured 540 by 760 embed',()=>{
 for(const frame_width of [0,80,188.83,400,999])for(const frame_height of [0,80,188.83,600,999])for(const view_width of [-1,80,540,999]){
  const v=I.settings({frame_width,frame_height,view_width,top_crop:999,left_crop:999});
  assert.ok(v.left_crop>=0&&v.top_crop>=0);
  assert.ok(v.left_crop+v.view_width<=540.000001);
  assert.ok(v.top_crop+v.view_height<=760.000001);
  assert.equal(v.enabled,false);assert.equal(v.kind,'screenshot');
 }
 const v=I.settings();assert.equal(v.frame_width,188.83);assert.equal(v.top_crop,56);assert.equal(v.view_height,540);
});
test('save is gated by screenshot validation and user application, without a public iframe',()=>{
 const editor=fs.readFileSync('cms-final-fixes.js','utf8'),module=fs.readFileSync('cms-instagram-image-admin.js','utf8');
 assert.ok(editor.indexOf('getSettings()')<editor.indexOf('await uploadCmsImage(file)'));
 assert.match(module,/if\(dirty\)throw Error/);
 assert.match(module,/!q\('\[data-confirm\]'\)\.checked/);
 assert.ok(!fs.readFileSync('cms-frontend-renderer.js','utf8').includes('cms-instagram-runtime.js'));
});
