# family-relations-core

[![CI](https://github.com/kiyohara1021/family-relations-core/actions/workflows/ci.yml/badge.svg)](https://github.com/kiyohara1021/family-relations-core/actions/workflows/ci.yml)
[![Playground](https://img.shields.io/badge/Playground-browser-62d8cc)](https://kiyohara1021.github.io/family-relations-core/)
[![npm](https://img.shields.io/npm/v/family-relations-core)](https://www.npmjs.com/package/family-relations-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-b6f36a.svg)](LICENSE)

家族関係グラフを扱う、実行時依存ゼロのTypeScriptライブラリです。続柄、生まれ順、循環・世代矛盾の検証、重ならない決定論的レイアウトを、UIやデータベースから独立した純粋関数として提供します。

**[ブラウザで試す](https://kiyohara1021.github.io/family-relations-core/)** — APIキー・ログイン・データ送信はありません。

[English README](README.en.md)

## 特長

- 共通祖先への最短経路から、直系・きょうだい・おじ/おば・甥/姪・いとこを判定
- 配偶者、配偶者の血族、血族の配偶者を1段階だけ補完
- 長男・次男、長女・次女などを生年月日順で判定
- 不明な親、ID重複、自己参照、循環、世代矛盾、パートナー関係を構造化エラーで検出
- 夫婦を世帯としてまとめ、世代ごとにカードが重ならない座標を決定論的に計算
- 日本語・英語ラベル、ESM、型定義同梱、実行時依存ゼロ

## インストール

```bash
npm install family-relations-core
```

Node.js 24以上をサポートします。生成されたESMはモダンブラウザでも利用できます。

## クイックスタート

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
describeRelationship(family, "second", "parent", { locale: "ja" }).label; // 母
getBirthOrder("second", family.people, { locale: "ja" })?.label; // 次男
layoutFamilyGraph(family); // nodes, edges, width, height
```

匿名化された完全な入力例は[examples/anonymous-family.json](examples/anonymous-family.json)にあります。

## API

### `describeRelationship(graph, fromId, toId, options?)`

表示ラベルだけでなく、`kind`、共通祖先、上る世代数`up`、下る世代数`down`、いとこの次数と世代差を返します。

```ts
const relation = describeRelationship(family, "person-a", "person-b", {
  locale: "en", // "en" | "ja"
});
```

### `relationshipLabels(graph, fromId, options?)`

起点から全人物への`Relationship`を`ReadonlyMap`で返します。

### `getBirthOrder(personId, people, options?)`

同じ親を持つ人物を生年月日順に並べます。既定は同性きょうだい内の順位です。生年月日がない人物は後ろへ置き、IDで安定化します。

### `validateFamilyGraph(graph, options?)`

例外を投げず、`ValidationIssue[]`を返します。`maxParents`、`maxCurrentPartners`、隣接世代の強制を変更できます。例外が必要な境界では`assertValidFamilyGraph`を使えます。

### `layoutFamilyGraph(graph, options?)`

描画を行わず、カード座標と辺だけを返します。SVG、Canvas、HTMLなど任意のUIで利用できます。入力順が同じなら結果も同じです。

### `solveLayoutRow(items, gap)`

指定順序と最小間隔を守りながら、重み付き希望位置へ近づける一次元レイアウト関数です。

## 設計上の境界

- `parentIds`は血縁・養子縁組などの法的区分を判断しません。アプリ側で意味を管理してください。
- 続柄ラベルは表示支援であり、相続・戸籍・税務上の法的判定には使えません。
- 日本語の遠縁表現は、一般ユーザーが経路を理解しやすい表現へ簡略化します。
- 既定では親2人、現在のパートナー1人ですが、検証オプションで変更できます。
- レイアウトはカード座標を返します。線の経路探索やインタラクションはUI層の責務です。

## プライバシー

ライブラリはネットワーク、ストレージ、解析SDKを使用しません。Playgroundもブラウザ内だけで動作します。このリポジトリのfixtureは架空IDと架空ラベルのみです。実際の家族情報をIssueへ投稿しないでください。

## 開発

```bash
npm ci
npm run check
npm run build:playground
```

Node.js 24と26をCI対象にしています。

## ドキュメント

- [変更履歴](CHANGELOG.md)
- [コントリビュート](CONTRIBUTING.md)
- [セキュリティ](SECURITY.md)
- [サポート](SUPPORT.md)
- [行動規範](CODE_OF_CONDUCT.md)

## ライセンス

[MIT](LICENSE)
