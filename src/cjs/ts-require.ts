import { createRequire } from 'module';

const r = createRequire(import.meta.url);
console.log(r);

console.log(r.resolve);