# Contribution guide

Welcome! We're excited you're interested in contributing. To ensure a smooth and productive collaboration, follow these guidelines.

## Goals of tsx

1. Enhance Node.js with TypeScript support
2. Improve ESM ↔ CommonJS interoperability as the ecosystem migrates to ESM
3. Support the [active LTS versions of Node.js](https://endoflife.date/nodejs)

## Issues & Discussions

> [!IMPORTANT]
> Please be polite, respectful, and considerate of people's time and effort.
>
> This is an open source project relying on community contributions.

### Opening a new Issue

> [!IMPORTANT]
> The Issues tab is a bug & feature tracker. Not a place for debugging support. To keep threads concise and easy to follow for collaborators, please participate constructively and follow the guidelines.

#### Minimal reproduction required

Provide a clear, minimal example of the issue. This helps contributors identify genuine bugs efficiently.

#### Check the documentation

Review the project documentation for known behaviors or caveats to avoid unnecessary issues.

### Commenting on an existing Issue

#### ⭐️ Issue objectives

Issues serve as a platform for **contributors** to:
1. Verify bugs
2. Diagnose the causes
3. Brainstorm solutions
4. Implement fix

#### ✅ Be constructive

Aim to contribute to the solution with research & PRs (tests + solutions). The goal is to land an improvement in _tsx_ for everyone to benefit.

Be concise to save people's time.

#### ❌ Avoid detractive comments

Keep comments constructive towards fixing the issue.

These types of comments will be hidden or deleted:
- Comments that pollute the thread (e.g. "updates?", "me too", "also happening in ...")
- Discussing workarounds that can't land in _tsx_
- Off-topic comments

After an issue is confirmed by the provided reproduction, the thread may sometimes be locked to direct further conversation & action to PRs.

> [!TIP]
> **⚡️ Get issues addressed faster!**
>
> Sponsors can prioritize issues. By helping fund development, you can ensure your needs are addressed quickly!
>
> [Sponsor now →](https://github.com/sponsors/privatenumber)

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

> [!TIP]
>
> If you encounter issues with the `node-pty` installation, please ensure you have installed the required build dependencies (listed on the [node-pty GitHub page](https://github.com/microsoft/node-pty?tab=readme-ov-file#dependencies)) before retrying the installation command.

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


## Giving back

<img align="center" src="https://badgen.net/npm/dm/tsx">

_tsx_ has outgrown its "hobby project" status to become a tool used and loved by many.

While it made it far without sponsorship, funding will accelerate further development by making it easier for devs to choose tsx over other paid work.

If tsx has helped you, help tsx back! ❤️

Any amount makes a difference.

[Sponsor now →](https://github.com/sponsors/privatenumber)
