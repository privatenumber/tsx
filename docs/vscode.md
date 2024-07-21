# VS Code debugging

If you use [VS Code](https://code.visualstudio.com), you can configure it to use _tsx_ to enhance your debugging experience.

To learn more about VS Code configuration, refer to the [_Launch Configuration_](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_launch-configuration) documentation.

## Setup
1. Create the config file

	Create a launch configuration file in your project at `.vscode/launch.json`:
	```json5
	{
	    "version": "0.2.0",
	    "configurations": [
	        /*
	         * Each config in this array corresponds to an option
	         * in the debug drop-down
	         */
	    ],
	}
	```

2. Pick and choose debugging methods

::: details Method 1: Run _tsx_ from inside VSCode

1. Add the following configuration to the `configurations` array in `.vscode/launch.json`:
	```json5
	{
	    "name": "tsx",
	    "type": "node",
	    "request": "launch",

	    // Debug current file in VSCode
	    "program": "${file}",

	    /*
	     * Path to tsx binary
	     * Assuming locally installed
	     */
	    "runtimeExecutable": "tsx",

	    /*
	     * Open terminal when debugging starts (Optional)
	     * Useful to see console.logs
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

2. In VSCode, open the JS/TS file you want to run

3. Go to VSCode's debug panel, select "tsx" in the drop down, and hit the play button (<kbd>F5</kbd>).

:::

::: details Method 2: Attach the VS Code debugger to a running Node.js process

> This method works for any Node.js process like _tsx_, and is not specific to _tsx_.

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
2. Run _tsx_ with [`--inspect-brk`](https://nodejs.org/api/cli.html#--inspect-brkhostport) in a terminal window:

	```sh
	tsx --inspect-brk ./your-file.ts 
	```

3. Go to VSCode's debug panel, select "Attach to process" in the drop down, and hit the play button (<kbd>F5</kbd>).
:::
