// Must be .js file so it can toggle between commonjs and module
import(process.argv[2]).then(m => console.log(JSON.stringify(m)));
