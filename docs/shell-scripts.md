# Shell scripts

You can write a shell script in TypeScript by specifying _tsx_ in the [hashbang](https://bash.cyberciti.biz/guide/Shebang). The hashbang tells the shell how to run the script, making it executable.

### Project scripts

If `tsx` is installed in your project, use your package manager to reference _tsx_:

::: code-group
```ts [npm]
#!/usr/bin/env -S npx tsx

console.log('argv:', process.argv.slice(2))
```

```ts [pnpm]
#!/usr/bin/env -S pnpm tsx

console.log('argv:', process.argv.slice(2))
```

```ts [yarn]
#!/usr/bin/env -S yarn tsx

console.log('argv:', process.argv.slice(2))
```
:::

Make the file executable:
```sh
chmod +x ./file.ts
```

Now, you can run `./file.ts` directly:
```sh
./file.ts hello world
# Output: argv: [ 'hello', 'world' ]
```


### Global scripts

If `tsx` is installed globally, you can reference `tsx` directly in the hashbang:

_file.ts_:
```ts
#!/usr/bin/env tsx

console.log('argv:', process.argv.slice(2))
```

Don't forget to `chmod` the file to make it executable!
