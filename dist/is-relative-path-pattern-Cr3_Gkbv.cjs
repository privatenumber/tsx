"use strict";var r=require("node:path");const l=`
//# sourceMappingURL=data:application/json;base64,`,p=()=>process.sourceMapsEnabled??!0,u=({code:e,map:t})=>e+l+Buffer.from(JSON.stringify(t),"utf8").toString("base64"),s=Object.create(null);s[".js"]=[".ts",".tsx",".js",".jsx"],s[".jsx"]=[".tsx",".ts",".jsx",".js"],s[".cjs"]=[".cts"],s[".mjs"]=[".mts"];const h=e=>{const[t,n]=e.split("?"),a=r.extname(t),o=s[a];if(o){const i=t.slice(0,-a.length);return o.map(c=>i+c+(n?`?${n}`:""))}},x=/^\.{1,2}\//;exports.inlineSourceMap=u,exports.isRelativePathPattern=x,exports.resolveTsPath=h,exports.shouldApplySourceMap=p;
