"use strict";var i=require("node:module"),d=require("node:worker_threads"),t=typeof document<"u"?document.currentScript:null;const u=n=>{const{sourceMapsEnabled:a}=process;process.setSourceMapsEnabled(!0);const{port1:e,port2:r}=new d.MessageChannel;return i.register(`./esm/index.mjs?${Date.now()}`,{parentURL:typeof document>"u"?require("url").pathToFileURL(__filename).href:t&&t.src||new URL("register-CGZlKQMu.cjs",document.baseURI).href,data:{namespace:n?.namespace,port:r},transferList:[r]}),()=>(a===!1&&process.setSourceMapsEnabled(!1),e.postMessage("deactivate"),new Promise(o=>{const s=c=>{c==="deactivated"&&(o(),e.off("message",s))};e.on("message",s)}))};exports.register=u;
