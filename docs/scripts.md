---
outline: deep
---

# Scripts

To write scripts that can be executed directly without it being passed into _tsx_, you can declare tsx in the [hashbang](https://bash.cyberciti.biz/guide/Shebang).

### Global scripts
If you have `tsx` globally installed, simply add `#!/usr/bin/env tsx` at the top of your file:

_file.ts_:
```ts
#!/usr/bin/env tsx

console.log('argv:', process.argv.slice(2))
```

And make the file executable:
```sh
chmod +x ./file.ts
```

Now, you can run `./file.ts` directly:
```sh
$ ./file.ts hello world
argv: [ 'hello', 'world' ]
```

### Project scripts
If you have `tsx` installed in the current project, use `npx` to call `tsx`:

```ts
#!/usr/bin/env -S npx tsx

console.log('argv:', process.argv.slice(2))
```

If you prefer using [`pnpm`](https://pnpm.io/), use the following hashbang:

```ts
#!/usr/bin/env -S pnpm tsx
```