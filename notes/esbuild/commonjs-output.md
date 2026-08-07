# CommonJS output

When generating CommonJS for Node with known exports, esbuild emits a dead-code `module.exports` annotation that static CommonJS export lexers can recognize ([linker output](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/linker/linker.go#L5065-L5127)).
