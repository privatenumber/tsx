import { createRequire } from 'module';

const require = createRequire(import.meta.url);
console.log(JSON.stringify(require(process.argv[2])));
