const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2]||''),port=Number(process.argv[3]||8084);
if(!process.argv[2]||!fs.existsSync(path.join(root,'binder.html')))throw Error('Pass a web checkout containing binder.html');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer((req,res)=>{
 try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,'.'+name),ext=path.extname(file).toLowerCase();
 if(!file.startsWith(root+path.sep)||name.split('/').some(p=>p.startsWith('.'))||!mime[ext]){res.writeHead(403);res.end();return;}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[ext]+'; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end();}
}).listen(port,'127.0.0.1',()=>console.log('Local web QA listening on '+port));
