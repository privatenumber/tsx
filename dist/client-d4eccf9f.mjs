import i from"net";import{g as a}from"./get-pipe-path-9a395441.mjs";const p=()=>new Promise(e=>{const c=a(process.ppid),n=i.createConnection(c,()=>{e(f=>{const t=Buffer.from(JSON.stringify(f)),o=Buffer.alloc(4);o.writeInt32BE(t.length,0),n.write(Buffer.concat([o,t]))})});n.on("error",()=>{e()}),n.unref()}),r={send:void 0},s=p();s.then(e=>{r.send=e},()=>{});export{s as c,r as p};