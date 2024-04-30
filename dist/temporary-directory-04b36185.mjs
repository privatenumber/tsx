import r from"path";import o from"os";const{geteuid:t}=process,s=t?t():o.userInfo().username,e=r.join(o.tmpdir(),`tsx-${s}`);export{e as t};
