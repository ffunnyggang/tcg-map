const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const root=path.resolve(__dirname,'..');let checked=0;
for(const name of ['admin.html','talk.html','index.html','reviews.html','shops.html']){const html=fs.readFileSync(root+'/'+name,'utf8');for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\bsrc\s*=|application\/ld\+json/i.test(match[1])||!match[2].trim())continue;new vm.Script(match[2],{filename:name+':inline'});checked++;}}
console.log('PASS '+checked+' inline scripts parse');
