"use strict";var m=require("module"),x=require("../client-2cbdebb3.cjs"),M=require("fs"),v=require("get-tsconfig"),h=require("../index-971a6964.cjs"),p=require("../source-map.cjs"),T=require("path"),_=require("../is-relative-path-pattern-d3bd85cb.cjs");require("net"),require("../get-pipe-path-86e97fc9.cjs"),require("../temporary-directory-2a027842.cjs"),require("os"),require("url"),require("esbuild"),require("crypto");const E=n=>{if(n.includes("import")||n.includes("export"))try{return h.parseEsm(n)[3]}catch{return!0}return!1},F=/\.[cm]?tsx?$/,f=process.env.TSX_TSCONFIG_PATH?{path:T.resolve(process.env.TSX_TSCONFIG_PATH),config:v.parseTsconfig(process.env.TSX_TSCONFIG_PATH)}:v.getTsconfig(),O=[".cts",".mts",".ts",".tsx",".jsx"],P=[".js",".cjs",".mjs"],y=f&&v.createFilesMatcher(f),g=(n,l)=>{const o=n[".js"],s=(c,e)=>{l.send&&l.send({type:"dependency",path:e});const i=O.some(r=>e.endsWith(r)),a=P.some(r=>e.endsWith(r));if(!i&&!a)return o(c,e);let t=M.readFileSync(e,"utf8");if(e.endsWith(".cjs")){const r=h.transformDynamicImport(e,t);r&&(t=p.shouldApplySourceMap()?p.inlineSourceMap(r):r.code)}else if(i||E(t)){const r=h.transformSync(t,e,{tsconfigRaw:y==null?void 0:y(e)});t=p.shouldApplySourceMap()?p.inlineSourceMap(r):r.code}c._compile(t,e)};[".js",".ts",".tsx",".jsx"].forEach(c=>{n[c]=s}),Object.defineProperty(n,".mjs",{value:s,enumerable:!1})},j=`${T.sep}node_modules${T.sep}`,S=f&&v.createPathsMatcher(f),q=n=>{const l=(o,s,c,e)=>{var i,a;const t=_.resolveTsPath(o);if(s!=null&&s.filename&&(F.test(s.filename)||(a=(i=f)==null?void 0:i.config.compilerOptions)!=null&&a.allowJs)&&t)for(const r of t)try{return n(r,s,c,e)}catch(u){const{code:d}=u;if(d!=="MODULE_NOT_FOUND"&&d!=="ERR_PACKAGE_PATH_NOT_EXPORTED")throw u}};return(o,s,c,e)=>{var i;const a=o.indexOf("?");if(a!==-1&&(o=o.slice(0,a)),S&&!_.isRelativePathPattern.test(o)&&!((i=s==null?void 0:s.filename)!=null&&i.includes(j))){const r=S(o);for(const u of r){const d=l(u,s,c,e);if(d)return d;try{return n(u,s,c,e)}catch{}}}const t=l(o,s,c,e);return t||n(o,s,c,e)}};process.setSourceMapsEnabled(!0),g(m._extensions,x.parent),m._resolveFilename=q(m._resolveFilename.bind(m));
