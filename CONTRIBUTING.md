# Contributing to @particle-academy/fancy-doc-commons

Notes for anyone, human or agent, working ON this package's code. How to USE the
package is in [AGENTS.md](./AGENTS.md); what it is, is in [README.md](./README.md).
`CLAUDE.md` is a symlink to this file, so Claude Code reads these notes when it
works in this repo.

## Layout

- `src/` — the pure core: ordering, tree, op-spine (`ops.ts`), canvas, staged
  writes, style + CSS emitter. No React, no DOM, zero runtime dependencies.
- `test/` — tests (`*.test.ts`), run with Node's test runner via `tsx`.

## Commands

```bash
npm run build   # tsup
npm run dev     # tsup --watch
npm run lint    # tsc --noEmit
npm test        # node --import tsx --test test/*.test.ts
```

## Changelog

Update `CHANGELOG.md` in the same commit as the change.
