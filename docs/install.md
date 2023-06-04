# Install

## Local installation

If you're using it in an npm project, install it as a development dependency:

```sh
npm install --save-dev tsx
```

You can reference it directly in the `package.json#scripts` object:

```json5
{
	scripts: {
		dev: "tsx ...",
	},
}
```

To use the binary, you can call it with [`npx`](https://docs.npmjs.com/cli/v8/commands/npx) while in the project directory:

```sh
npx tsx ...
```

## Global installation

If you want to use it in any arbitrary project without [`npx`](https://docs.npmjs.com/cli/v8/commands/npx), install it globally:

```sh
npm install --global tsx
```

Then, you can call `tsx` directly:

```sh
tsx ...
```
