const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.resolve(process.argv[2]);const port=+process.argv[3]||8765;
const T={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.glb':'model/gltf-binary','.pdf':'application/pdf','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8'};
http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);let f=path.join(root,u);if(!f.startsWith(root)){res.writeHead(403);return res.end()}
 fs.stat(f,(e,st)=>{if(!e&&st.isDirectory()){f=path.join(f,'index.html');try{st=fs.statSync(f)}catch(x){e=x}}
  if(e){res.writeHead(404,{'Content-Type':'text/plain'});console.log('404',u);return res.end('404')}
  const type=T[path.extname(f).toLowerCase()]||'application/octet-stream';const r=req.headers.range;
  if(r){const m=/bytes=(\d*)-(\d*)/.exec(r);let s=m[1]?+m[1]:0,en=m[2]?+m[2]:st.size-1;if(en>=st.size)en=st.size-1;res.writeHead(206,{'Content-Type':type,'Content-Range':`bytes ${s}-${en}/${st.size}`,'Accept-Ranges':'bytes','Content-Length':en-s+1});fs.createReadStream(f,{start:s,end:en}).pipe(res)}
  else if(/text|javascript|json|svg/.test(type)&&/gzip/.test(req.headers['accept-encoding']||'')){res.writeHead(200,{'Content-Type':type,'Content-Encoding':'gzip','Vary':'Accept-Encoding','Cache-Control':'max-age=600'});if(req.method==='HEAD')return res.end();fs.createReadStream(f).pipe(zlib.createGzip()).pipe(res)}
  else{res.writeHead(200,{'Content-Type':type,'Content-Length':st.size,'Accept-Ranges':'bytes','Cache-Control':'max-age=600'});if(req.method==='HEAD')return res.end();fs.createReadStream(f).pipe(res)}})}).listen(port,()=>console.log('serving',root,'on',port));
