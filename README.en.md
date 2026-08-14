# family-relations-core

[![CI](https://github.com/kiyohara1021/family-relations-core/actions/workflows/ci.yml/badge.svg)](https://github.com/kiyohara1021/family-relations-core/actions/workflows/ci.yml)
[![Playground](https://img.shields.io/badge/Playground-browser-62d8cc)](https://kiyohara1021.github.io/family-relations-core/)
[![npm](https://img.shields.io/npm/v/family-relations-core)](https://www.npmjs.com/package/family-relations-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-b6f36a.svg)](LICENSE)

A zero-runtime-dependency TypeScript library for family relationship graphs. It provides kinship labels, sibling birth order, cycle and generation validation, and deterministic non-overlapping layouts as pure functions independent of any UI or database.

**[Try the browser playground](https://kiyohara1021.github.io/family-relations-core/)** — no API key, account, or data upload.

[日本語README](README.md)

## Features

- Classifies ancestors, descendants, siblings, aunts/uncles, nieces/nephews, and cousins through the closest shared ancestor
- Adds one level of spouse relatives and relatives' spouses without producing unbounded labels
- Calculates Japanese and English son/daughter birth-order labels from partial dates
- Reports unknown parents, duplicate IDs, self references, cycles, generation mismatches, and partnership conflicts as structured issues
- Groups partners into households and calculates deterministic, non-overlapping card coordinates by generation
- Japanese and English labels, ESM, bundled types, and zero runtime dependencies

## Install

```bash
npm install family-relations-core
```

Node.js 24 or later is supported. The generated ESM also runs in modern browsers.

## Quick start

```ts
import {
  describeRelationship,
  getBirthOrder,
  layoutFamilyGraph,
  validateFamilyGraph,
  type FamilyGraph,
} from "family-relations-core";

const family: FamilyGraph = {
  people: [
    { id: "parent", sex: "female", generation: 0 },
    {
      id: "first",
      sex: "male",
      generation: 1,
      parentIds: ["parent"],
      birthDate: { year: 2001 },
    },
    {
      id: "second",
      sex: "male",
      generation: 1,
      parentIds: ["parent"],
      birthDate: { year: 2004 },
    },
  ],
};

validateFamilyGraph(family); // []
describeRelationship(family, "second", "parent").label; // mother
getBirthOrder("second", family.people)?.label; // second son
layoutFamilyGraph(family); // nodes, edges, width, height
```

See [examples/anonymous-family.json](examples/anonymous-family.json) for a complete anonymous input.

## API

### `describeRelationship(graph, fromId, toId, options?)`

Returns a display label together with `kind`, closest common ancestor, upward and downward steps, cousin degree, and removal.

### `relationshipLabels(graph, fromId, options?)`

Returns a `ReadonlyMap` containing a `Relationship` from the origin to every person.

### `getBirthOrder(personId, people, options?)`

Orders people with the same parents by partial birth date. By default it calculates a rank among same-sex siblings. Missing dates sort last and IDs provide a deterministic tie-break.

### `validateFamilyGraph(graph, options?)`

Returns `ValidationIssue[]` without throwing. Parent limits, current-partner limits, and adjacent-generation checks are configurable. Use `assertValidFamilyGraph` at boundaries that should throw.

### `layoutFamilyGraph(graph, options?)`

Returns card coordinates and edges without rendering. Use the result with SVG, Canvas, or HTML. Identical input order produces identical output.

### `solveLayoutRow(items, gap)`

A one-dimensional weighted layout primitive that preserves item order and minimum spacing.

## Deliberate boundaries

- `parentIds` does not distinguish biological, adoptive, or other legal parenthood. Keep that meaning in your application model.
- Labels are display helpers, not legal determinations for inheritance, registry, or taxation.
- Distant Japanese labels favor understandable path descriptions over exhaustive historical terminology.
- Defaults allow two parents and one current partner; validation options can change both limits.
- Layout returns card coordinates. Edge routing and interaction belong to the UI layer.

## Privacy

The library uses no network, storage, or analytics APIs. The playground runs entirely in the browser. Repository fixtures use fictional IDs and labels only. Never post real family information in an issue.

## Development

```bash
npm ci
npm run check
npm run build:playground
```

CI covers Node.js 24 and 26.

## Documentation

- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Support](SUPPORT.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## License

[MIT](LICENSE)
