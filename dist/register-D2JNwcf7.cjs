"use strict";var c=require("node:module"),i=require("node:worker_threads"),t=typeof document<"u"?document.currentScript:null;const u=n=>{process,process.setSourceMapsEnabled(!0);const{port1:e,port2:r}=new i.MessageChannel;return c.register(`./esm/index.mjs?${Date.now()}`,{parentURL:typeof document>"u"?require("url").pathToFileURL(__filename).href:t&&t.src||new URL("register-D2JNwcf7.cjs",document.baseURI).href,data:{namespace:n?.namespace,port:r},transferList:[r]}),()=>(console.log("unregister!"),e.postMessage("deactivate"),new Promise(s=>{const a=o=>{o==="deactivated"&&s()};e.on("message",a)}))};exports.register=u;
