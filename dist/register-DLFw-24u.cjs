"use strict";var i=require("node:module"),u=require("node:worker_threads"),o=typeof document<"u"?document.currentScript:null;const f=t=>{const{sourceMapsEnabled:c}=process;process.setSourceMapsEnabled(!0);const{port1:e,port2:n}=new u.MessageChannel;i.register(`./esm/index.mjs?${Date.now()}`,{parentURL:typeof document>"u"?require("url").pathToFileURL(__filename).href:o&&o.src||new URL("register-DLFw-24u.cjs",document.baseURI).href,data:{namespace:t?.namespace,port:n},transferList:[n]});const r=t?.onImport&&(s=>{s.type==="load"&&t.onImport(s.url)});return r&&e.on("message",r),()=>(c===!1&&process.setSourceMapsEnabled(!1),r&&e.off("message",r),e.postMessage("deactivate"),new Promise(s=>{const a=d=>{d.type==="deactivated"&&(console.log(22222),s(),e.off("message",a))};e.on("message",a)}))};exports.register=f;
