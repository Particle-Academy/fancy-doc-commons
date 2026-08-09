# Changelog

Notable changes to `@particle-academy/fancy-doc-commons`.

**BREAKING** marks anything that can stop working on upgrade. This package is
pre-1.0, so breaking changes land in MINOR releases — read those entries before
upgrading.

> Entries below **1.0** were reconstructed from git history when this file was
> introduced, so they summarise commit subjects rather than consumer impact.
> Everything from the next release onward is written by hand, in the same commit
> as the change.

---

## [Unreleased]

## [0.2.1] — 2026-08-09

### Fixed

- **A cyclic tree no longer hangs the process.** `ancestorsOf` walked the parent
  chain with no guard, so a document where `a` is parented under `b` and `b`
  under `a` spun forever. A `DocTree` arrives as JSON — from a file, a network
  payload, or a reducer bug — so it is not guaranteed acyclic, and every walk
  has to terminate on one anyway.

  The sharpest version: `isAncestorOrSelf` is the guard that PREVENTS a node
  being reparented into its own subtree, and on a document that already had a
  cycle, the guard itself was what hung. This is a hang rather than a crash,
  which is strictly worse to diagnose — the process sits at 100% and never
  returns.

- **`descendantsOf` is iterative.** It recursed once per level, so a cyclic
  document overflowed the stack and an acyclic-but-deep one was bounded by the
  JS stack (~11k frames) rather than by anything the document model says.
  Verified: the previous implementation throws `RangeError` at 12,000 levels;
  this one does not.

  **What you must do:** nothing. Acyclic results are unchanged, pinned by a test.

### Added

- **`LICENSE`.** The package has declared MIT since it shipped, with no file to
  back it — and `files` did not include one, so no published tarball ever
  carried the licence text either. Both fixed.

### Known, and deliberately not changed here

- `childrenOf` scans every node to find one parent's children, so walking a
  chain is O(n²). Worth an index, and worth measuring before adding one — but a
  separate change from removing the recursion, and bundling them would have hidden
  it.


## 0.2.0 — 2026-08-07

### Changed

- **BREAKING — Node 22 is now declared as the floor.** `engines.node` is `>=22`, where this package previously declared **nothing at all**.

  Declaring nothing was not the same as supporting old Node: a consumer on 18 installed cleanly and found out at runtime.

  **What you must do:** on Node 22 or newer, nothing. Note npm only *warns* on an `engines` mismatch while **pnpm fails the install**, so this surfaces differently depending on your package manager. Node 18 is end-of-life and 20 is maintenance-only.

### Why

These are the kit 0.5 platform floors, applied across every package at once so a consumer never has to resolve a mix. **No API changed, nothing was removed, nothing was renamed** — only what the package requires.


## 0.1.0 — 2026-07-10

### Added

- add per-breakpoint StyleProps + deterministic CSS emitter
- fancy-doc-commons v0.1 — the shared document substrate (Phase 1)
