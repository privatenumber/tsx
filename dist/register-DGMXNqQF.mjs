import m from"node:module";import{MessageChannel as i}from"node:worker_threads";const f=r=>{const{sourceMapsEnabled:p}=process;process.setSourceMapsEnabled(!0);const{port1:e,port2:o}=new i;m.register(`./esm/index.mjs?${Date.now()}`,{parentURL:import.meta.url,data:{namespace:r?.namespace,port:o},transferList:[o]});const a=r?.onImport,s=a&&(t=>{t.type==="load"&&a(t.url)});return s&&(e.on("message",s),e.unref()),()=>(p===!1&&process.setSourceMapsEnabled(!1),s&&e.off("message",s),e.postMessage("deactivate"),new Promise(t=>{const n=c=>{c.type==="deactivated"&&(t(),e.off("message",n))};e.on("message",n)}))};export{f as r};
