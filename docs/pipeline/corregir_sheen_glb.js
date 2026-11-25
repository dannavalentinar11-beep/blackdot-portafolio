const fs=require('fs');
const W={'KAIRO_Mascara_PRO':0.08,'KAIRO_Material_PBR':0.08,'Mat_Handle_Wrap_Black.003':0.8,'NOX_Material_PBR':0.1};
for(const f of process.argv.slice(2)){
 const b=fs.readFileSync(f);const jl=b.readUInt32LE(12);const g=JSON.parse(b.slice(20,20+jl).toString());
 let changed=0;(g.materials||[]).forEach(m=>{const s=m.extensions&&m.extensions.KHR_materials_sheen;if(!s)return;const w=W[m.name];
  console.log(f.split(/[\/]/).pop(),m.name,'before',JSON.stringify(s));
  if(w===undefined||s._fixed)return; s.sheenColorFactor=(s.sheenColorFactor||[0,0,0]).map(v=>+(v*w).toFixed(4)); changed++; console.log('   after',JSON.stringify(s));});
 if(!changed)continue;
 let js=Buffer.from(JSON.stringify(g));const pad=(4-js.length%4)%4;js=Buffer.concat([js,Buffer.alloc(pad,0x20)]);
 const rest=b.slice(20+jl);const head=Buffer.alloc(20);head.writeUInt32LE(0x46546C67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(20+js.length+rest.length,8);head.writeUInt32LE(js.length,12);head.writeUInt32LE(0x4E4F534A,16);
 fs.writeFileSync(f,Buffer.concat([head,js,rest]));console.log('written',f);
}
