const fs=require('fs');const [src,dst]=process.argv.slice(2);const b=fs.readFileSync(src);
const top=[];let off=0;while(off<b.length){let size=b.readUInt32BE(off);const type=b.toString('ascii',off+4,off+8);let hdr=8;if(size===1){size=Number(b.readBigUInt64BE(off+8));hdr=16}top.push({type,off,size});off+=size}
console.log(top.map(t=>t.type+':'+t.size).join(' '));
const moov=top.find(t=>t.type==='moov'),mdat=top.find(t=>t.type==='mdat');
if(moov.off<mdat.off){console.log('already faststart');fs.copyFileSync(src,dst);process.exit(0)}
const m=Buffer.from(b.slice(moov.off,moov.off+moov.size));const delta=moov.size;let patched=0;
(function walk(o,end){while(o<end){const size=m.readUInt32BE(o);const type=m.toString('ascii',o+4,o+8);
 if(['moov','trak','mdia','minf','stbl','edts','udta','meta'].includes(type)&&type!=='meta')walk(o+8,o+size);
 if(type==='stco'){const n=m.readUInt32BE(o+12);for(let i=0;i<n;i++){const p=o+16+i*4;const v=m.readUInt32BE(p)+delta;if(v>0xffffffff)throw new Error('needs co64');m.writeUInt32BE(v,p)}patched+=n}
 if(type==='co64'){const n=m.readUInt32BE(o+12);for(let i=0;i<n;i++){const p=o+16+i*8;m.writeBigUInt64BE(m.readBigUInt64BE(p)+BigInt(delta),p)}patched+=n}
 o+=size}})(8,m.length);
const parts=[];top.forEach(t=>{if(t.type==='moov')return;if(t===mdat)parts.push(m);parts.push(b.slice(t.off,t.off+t.size))});
fs.writeFileSync(dst,Buffer.concat(parts));console.log('patched chunk offsets',patched,'->',dst);
