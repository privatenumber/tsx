import n from"node:module";import{MessageChannel as p}from"node:worker_threads";const c=r=>{const{sourceMapsEnabled:t}=process;process.setSourceMapsEnabled(!0);const{port1:e,port2:s}=new p;return n.register(`./esm/index.mjs?${Date.now()}`,{parentURL:import.meta.url,data:{namespace:r?.namespace,port:s},transferList:[s]}),()=>(e.postMessage("deactivate"),t===!1&&process.setSourceMapsEnabled(!1),new Promise(a=>{e.once("message",o=>{o==="deactivated"&&a()})}))};export{c as r};
