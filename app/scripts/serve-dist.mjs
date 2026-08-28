import http from 'node:http';
import { createReadStream,existsSync,statSync } from 'node:fs';
import { extname,join,normalize } from 'node:path';

const root=join(process.cwd(),'dist');
const port=4173;
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.css':'text/css; charset=utf-8'};

if(!existsSync(join(root,'index.html'))){
  console.error('dist/index.html não encontrado. Execute npm run export:web antes do servidor E2E.');
  process.exit(1);
}

const server=http.createServer((req,res)=>{
  const rawPath=decodeURIComponent((req.url??'/').split('?')[0]);
  const safePath=normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
  let file=join(root,safePath);
  if(!file.startsWith(root)||!existsSync(file)||statSync(file).isDirectory())file=join(root,'index.html');
  res.setHeader('Content-Type',contentTypes[extname(file)]??'application/octet-stream');
  createReadStream(file).pipe(res);
});
server.listen(port,'127.0.0.1',()=>console.log(`E2E web server: http://127.0.0.1:${port}`));
