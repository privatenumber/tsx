import o from"path";import{t as r}from"./temporary-directory-04b36185.mjs";const i=t=>{const p=o.join(r,`${t}.pipe`);return process.platform==="win32"?`\\\\?\\pipe\\${p}`:p};export{i as g};
