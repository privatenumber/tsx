"use strict";var i=require("node:module"),u=require("node:worker_threads"),t=typeof document<"u"?document.currentScript:null;const d=s=>{const{sourceMapsEnabled:n}=process;process.setSourceMapsEnabled(!0);const{port1:e,port2:r}=new u.MessageChannel;return i.register(`./esm/index.mjs?${Date.now()}`,{parentURL:typeof document>"u"?require("url").pathToFileURL(__filename).href:t&&t.src||new URL("register-DQnAFLZ9.cjs",document.baseURI).href,data:{namespace:s?.namespace,port:r},transferList:[r]}),()=>(e.postMessage("deactivate"),n===!1&&process.setSourceMapsEnabled(!1),new Promise(a=>{const o=c=>{c==="deactivated"&&a()};e.on("message",o),e.unref()}))};exports.register=d;
