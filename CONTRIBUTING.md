# Contributing to the Zryna website

Thank you for helping improve Zryna's public website and documentation experience.

## Before opening a change

1. Read [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md).
2. Keep language semantics and normative compiler documentation in
   [`zryna/zryna`](https://github.com/zryna/zryna).
3. Create focused changes that preserve the machine-enforced repository structure.
4. Add or update a failure test when an architecture rule changes.

## Development

```sh
pnpm install --frozen-lockfile
pnpm verify
```

For production-image changes, also run:

```sh
docker build --tag zryna-website:local .
```

## Pull requests

Describe the user-visible result, the architecture impact, and the checks you actually ran. Do not
claim checks that were not executed. Keep generated compiler reference data separate from authored
website guides, and never edit generated files by hand.

By participating, you agree to follow [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
