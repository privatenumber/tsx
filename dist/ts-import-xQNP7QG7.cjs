"use strict";var c=require("node:url"),i=require("node:module"),u=require("node:worker_threads"),n=typeof document<"u"?document.currentScript:null;const o=()=>{const{sourceMapsEnabled:s}=process;process.setSourceMapsEnabled(!0);const{port1:e,port2:r}=new u.MessageChannel;return i.register(`./esm/index.mjs?${Date.now()}`,{parentURL:typeof document>"u"?require("url").pathToFileURL(__filename).href:n&&n.src||new URL("ts-import-xQNP7QG7.cjs",document.baseURI).href,data:{port:r},transferList:[r]}),()=>(e.postMessage("deactivate"),s===!1&&process.setSourceMapsEnabled(!1),new Promise(t=>{e.once("message",a=>{a==="deactivated"&&t()})}))};console.log(1);const p=(s,e)=>{if(!e)throw new Error("The current file path (import.meta.url) must be provided in the second argument of tsImport()");const r=e.startsWith("file://")?e:c.pathToFileURL(e),t=new URL(s,r);return t.searchParams.set("tsx.tsImport",""),t.toString()},d=(s,e)=>{const r=p(s,e),t=o();return import(r).finally(()=>t())};exports.register=o,exports.tsImport=d;
