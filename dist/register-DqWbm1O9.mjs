import p from"node:module";import{MessageChannel as c}from"node:worker_threads";const m=r=>{const{sourceMapsEnabled:o}=process;process.setSourceMapsEnabled(!0);const{port1:e,port2:a}=new c;if(p.register(`./esm/index.mjs?${Date.now()}`,{parentURL:import.meta.url,data:{namespace:r?.namespace,port:a},transferList:[a]}),r?.onImport){const{onImport:t}=r;e.on("message",s=>{s.type==="load"&&t(s.url)}),e.unref()}return()=>(o===!1&&process.setSourceMapsEnabled(!1),e.postMessage("deactivate"),new Promise(t=>{const s=n=>{n.type==="deactivated"&&(t(),e.off("message",s))};e.on("message",s),e.unref()}))};export{m as r};
