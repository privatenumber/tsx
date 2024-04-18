---
outline: deep
---

# VS Code integration

Enhance your debugging experience with source map support.

## Step 1: Setup configuration

Create the following configuration file in your project to setup debugging in VS Code:

`.vscode/launch.json`
```json5
{
    "version": "0.2.0",

    "configurations": [
        /*
        Each config in this array is an option in the debug drop-down
        See below for configurations to add...
        */
    ],
}
```

## Step 2: Choose a debugging method

### Method 1: Run tsx from inside VSCode

1. Add the following configuration to the `configurations` array in `.vscode/launch.json`:
	```json5
	{
	    "name": "tsx",
	    "type": "node",
	    "request": "launch",

	    // Debug current file in VSCode
	    "program": "${file}",

	    /*
	    Path to tsx binary
	    Assuming locally installed
	    */
	    "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/tsx",

	    /*
	    Open terminal when debugging starts (Optional)
	    Useful to see console.logs
	    */
	    "console": "integratedTerminal",
	    "internalConsoleOptions": "neverOpen",

	    // Files to exclude from debugger (e.g. call stack)
	    "skipFiles": [
	        // Node.js internal core modules
	        "<node_internals>/**",

	        // Ignore all dependencies (optional)
	        "${workspaceFolder}/node_modules/**",
	    ],
	}
	```

2. In VSCode, open the file you want to run

3. Go to VSCode's debug panel, select "tsx" in the drop down, and hit the play button (<kbd>F5</kbd>).

### Method 2: Attach the debugger to a running Node.js process

::: tip
This method works for any Node.js process like tsx, and is not specific to tsx.
:::


1. Add the following configuration to the `configurations` array in `.vscode/launch.json`:
	```json
	{
	    "name": "Attach to process",
	    "type": "node",
	    "request": "attach",
	    "port": 9229,
	    "skipFiles": [
	        // Node.js internal core modules
	        "<node_internals>/**",

	        // Ignore all dependencies (optional)
	        "${workspaceFolder}/node_modules/**",
	    ],
	}
	```
2. Run tsx with `--inspect-brk` in a terminal window:

	```sh
	tsx --inspect-brk ./your-file.ts 
	```

3. Go to VSCode's debug panel, select "Attach to process" in the drop down, and hit the play button (<kbd>F5</kbd>).


## VSCode debugging documentation

See the [VSCode documentation on _Launch Configuration_](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_launch-configuration) for more information.
