# Contributing

Thank you for improving `family-relations-core`.

## Before opening an issue

- Reduce the case to fictional IDs such as `person-a`; never include real family names, dates, addresses, or images.
- For terminology requests, state the locale, the graph path, and the expected display label.
- Legal kinship, inheritance, registry, and tax questions are outside this project's scope.

## Local checks

```bash
npm ci
npm run check
npm run build:playground
```

Add a focused test for behavior changes. Public APIs require matching updates to both README files and `CHANGELOG.md`.

## Pull requests

1. Keep runtime dependencies at zero unless maintainers first approve a design discussion.
2. Keep algorithms deterministic and independent of network, storage, and UI APIs.
3. Use anonymous fixtures only.
4. Explain compatibility impact and any cultural or legal assumptions.
5. Confirm that `npm run check` succeeds.

By contributing, you agree that your contribution is licensed under the MIT License.
