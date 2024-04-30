const a=`
//# sourceMappingURL=data:application/json;base64,`,s=()=>{var e;return(e=process.sourceMapsEnabled)!=null?e:!0},r=({code:e,map:o})=>e+a+Buffer.from(JSON.stringify(o),"utf8").toString("base64"),n=({code:e})=>e,p=()=>"setSourceMapsEnabled"in process?(process.setSourceMapsEnabled(!0),r):n;export{r as inlineSourceMap,p as installSourceMapSupport,s as shouldApplySourceMap};
