"use strict";var i=require("node:module"),d=require("node:worker_threads"),a=typeof document<"u"?document.currentScript:null;const u=t=>{const{sourceMapsEnabled:o}=process;process.setSourceMapsEnabled(!0);const{port1:r,port2:s}=new d.MessageChannel;if(i.register(`./esm/index.mjs?${Date.now()}`,{parentURL:typeof document>"u"?require("url").pathToFileURL(__filename).href:a&&a.src||new URL("register-C5xuRGe5.cjs",document.baseURI).href,data:{namespace:t?.namespace,port:s},transferList:[s]}),t?.onImport){const{onImport:n}=t;r.on("message",e=>{e&&"type"in e&&e.type==="load"&&n(e.url)})}return()=>(o===!1&&process.setSourceMapsEnabled(!1),r.postMessage("deactivate"),new Promise(n=>{const e=c=>{c==="deactivated"&&(n(),r.off("message",e))};r.on("message",e)}))};exports.register=u;
