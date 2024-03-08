# Contribution guidelines

Welcome! We're thrilled you're interested in contributing. To ensure a smooth and productive collaboration, follow these guidelines.


## Issues

### Opening an Issue

#### Minimal reproduction required

Provide a clear, minimal example of the issue. This helps contributors identify genuine bugs efficiently.

#### Check the documentation

Review the project documentation for known behaviors or caveats to avoid unnecessary issues.

### Commenting on an Issue

#### Issue objectives

Issues serve as a platform for **contributors** to:
1. Verify bugs
2. Diagnose the underlying causes
3. Brainstorm solutions
4. Implement them effectively

#### Avoid detractive comments

Keep comments focused on fixing the issue.

Off-topic remarks like "updates?" or comments discussing workarounds will be hidden.

Issues may be locked post-verification to direct further conversation in PRs for more solution-oriented dialogue.

#### Be constructive

Aim to contribute to the discussion with research & PRs (tests, solutions).


> [!TIP]
> Get issues addressed faster! 💨
>
> Sponsors can prioritize issues. For as little as $20/month (cost of dinner), you can directly fund engineering labor and ensure your needs are addressed quickly.

## Pull requests


#### Open an Issue first

Ensure there’s an existing issue related to your PR to facilitate alignment and prevent wasted work.

#### Include tests

Add minimal tests verifying your changes to maintain behavior and reliability.

## Development

### Initial setup

After cloning the repo, use [nvm](https://nvm.sh) (optional) to set the expected Node.js version, and [pnpm](https://pnpm.io) to install dependencies:

```bash
nvm i      # Install or use Node.js version
pnpm i     # Install dependencies
```

### Building

Build the source code with:

```bash
pnpm build # Compiles to `dist`
```

> [!TIP]
> Temporarily disable minification by removing `--minify` in `package.json#scripts.build` for easier debugging.


### Linting and type-checking

Ensure code quality with:

```bash
pnpm lint           # ESLint
pnpm type-check     # TypeScript type checking
```

### Testing

Run automated tests with:

```bash
pnpm test             # Regular test
CI=1 pnpm test        # CI environments
```

### Manual testing

#### Local testing

Use the absolute path to run `./dist/cli.mjs`:

```sh
/tsx/dist/cli.mjs <ts file>
```

#### Collaborative testing

Use [`git-publish`](https://github.com/privatenumber/git-publish) to publish your changes to your GitHub fork. It can be shared with others and installed from for testing.


## Funding

tsx has outgrown its "hobby project" status to become a tool used and loved by many: <img align="center" src="https://badgen.net/npm/dm/tsx">

While it made it far without sponsorship, funding will help maintainers justify further investment over other paid work, accelerating development and growth.

If tsx is important to your workflow, [buy us coffee every month](https://github.com/sponsors/privatenumber) ❤️.
