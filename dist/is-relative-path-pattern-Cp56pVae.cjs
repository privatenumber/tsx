"use strict";var r=require("node:path");const l=`
//# sourceMappingURL=data:application/json;base64,`,p=()=>process.sourceMapsEnabled??!0,u=({code:e,map:t})=>e+l+Buffer.from(JSON.stringify(t),"utf8").toString("base64"),s=Object.create(null);s[".js"]=[".ts",".tsx",".js",".jsx"],s[".jsx"]=[".tsx",".ts",".jsx",".js"],s[".cjs"]=[".cts"],s[".mjs"]=[".mts"];const x=e=>{const[t,a]=e.split("?"),n=r.extname(t),o=s[n];if(console.log({filePath:e,extension:n,possibleExtensions:o}),o){const c=t.slice(0,-n.length);return o.map(i=>c+i+(a?`?${a}`:""))}},j=/^\.{1,2}\//;exports.inlineSourceMap=u,exports.isRelativePathPattern=j,exports.resolveTsPath=x,exports.shouldApplySourceMap=p;
