"use strict";var o=require("node:module"),c=require("node:worker_threads"),s=typeof document<"u"?document.currentScript:null;const i=()=>{const{sourceMapsEnabled:t}=process;process.setSourceMapsEnabled(!0);const{port1:e,port2:r}=new c.MessageChannel;return console.log("registering!"),o.register("./esm/index.mjs?"+Date.now(),{parentURL:typeof document>"u"?require("url").pathToFileURL(__filename).href:s&&s.src||new URL("register-UFSeg3ZA.cjs",document.baseURI).href,data:{port:r},transferList:[r]}),async()=>{e.postMessage("deactivate"),await new Promise(n=>{e.once("message",a=>{a==="deactivated"&&n()})}),t===!1&&process.setSourceMapsEnabled(!1)}};exports.register=i;
