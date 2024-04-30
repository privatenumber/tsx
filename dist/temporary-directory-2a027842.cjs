"use strict";var s=require("path"),r=require("os");const{geteuid:e}=process,t=e?e():r.userInfo().username,i=s.join(r.tmpdir(),`tsx-${t}`);exports.tmpdir=i;
