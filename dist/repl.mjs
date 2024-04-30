import a from"repl";import{v as m}from"./package-c3a797f6.mjs";import{b as p}from"./index-29948669.mjs";import"url";import"esbuild";import"crypto";import"fs";import"path";import"os";import"./temporary-directory-04b36185.mjs";console.log(`Welcome to tsx v${m} (Node.js ${process.version}).
Type ".help" for more information.`);const r=a.start(),{eval:l}=r,c=async function(e,t,o,s){const i=await p(e,o,{loader:"ts",tsconfigRaw:{compilerOptions:{preserveValueImports:!0}},define:{require:"global.require"}}).catch(n=>(console.log(n.message),{code:`
`}));return l.call(this,i.code,t,o,s)};r.eval=c;
