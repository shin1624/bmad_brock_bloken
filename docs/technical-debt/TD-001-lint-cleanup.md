# Technical Debt: TD-001 - Lint Error Cleanup

## 概要
- **ID**: TD-001
- **タイプ**: コード品質
- **優先度**: 高
- **作成日**: 2024-12-21
- **最終更新**: 2024-12-21
- **ステータス**: 🔄 進行中

## 問題の説明
既存コードベースに大量のlintエラーが存在し、新規開発の品質維持に影響を与えている。
Story 6.1実装完了後、技術的負債として計画的に解消を進める。

## 現在の状態

### エラー統計（2024-12-21現在）
```
総エラー数: 261件（256 errors, 5 warnings）
初期状態: 329件
改善済み: 68件（約21%削減）
```

### エラー内訳
| エラータイプ | 件数 | 割合 | 影響度 |
|------------|------|------|--------|
| @typescript-eslint/no-explicit-any | 159 | 61% | 高 |
| @typescript-eslint/no-unused-vars | 87 | 33% | 中 |
| @typescript-eslint/ban-ts-comment | 4 | 2% | 低 |
| react-refresh/only-export-components | 5 | 2% | 低 |
| no-prototype-builtins | 1 | <1% | 低 |
| その他 | 5 | 2% | 低 |

### ディレクトリ別分布
```
src/game/systems/__tests__: 14件
src/hooks: 8件
src/game/systems: 7件
src/utils: 5件
src/game/rendering: 5件
src/game/plugins/powerups: 4件
src/game/entities: 4件
```

## 実施計画

### Phase 1: 準備とセットアップ ✅ 完了
- [x] 作業ブランチ作成: `chore/lint-cleanup-post-story-6.1`
- [x] 現状分析とエラーカテゴライズ
- [x] 修正計画の策定

### Phase 2: 段階的修正（リスクベース）🔄 進行中

#### Phase 2-1: コアゲームロジック（高リスク）🔄 進行中
**完了済み（8ファイル）**:
- ✅ PowerUpSystem.ts - 11 any型除去
- ✅ PowerUpPlugin.ts - 7 any型除去
- ✅ PluginManager.ts - 10 any型除去
- ✅ CollisionDetector.ts - 9 any型除去
- ✅ EventBus.ts - 5 any型除去
- ✅ CollisionDebugger.ts - 2 any型除去
- ✅ MemoryManager.ts - 8 any型除去
- ✅ PowerUpSpawner.ts - 4 any型除去

**未対応（残り7ファイル）**:
- ⏳ ParticleSystem.ts
- ⏳ AudioSystem.ts
- ⏳ ThemeSystem.ts
- ⏳ その他systems配下

#### Phase 2-2: プラグインシステム（中リスク）⏳ 未着手
- game/plugins/powerups配下: 4ファイル

#### Phase 2-3: UI層（中リスク）⏳ 未着手
- hooks配下: 8ファイル
- components配下の該当ファイル

### Phase 3: テストファイル（低リスク）⏳ 未着手
- src/game/systems/__tests__: 14ファイル
- その他テストファイル

### Phase 4: 自動修正可能な項目 ⏳ 未着手
- 未使用変数の削除（87件）
- ESLint自動修正可能な項目

## 修正戦略

### any型の除去パターン
```typescript
// Before
const data: any = response.data;

// After - Pattern 1: unknown with type guard
const data: unknown = response.data;
if (isValidData(data)) {
  // use data
}

// After - Pattern 2: specific type
interface ResponseData {
  // specific fields
}
const data: ResponseData = response.data;
```

### テストの健全性維持
- 各修正後にユニットテストを実行
- ビルドエラーの段階的解消
- E2Eテストは最終段階で実施

## 進捗追跡

### マイルストーン
- [x] M1: 作業開始・計画策定（2024-12-21）
- [x] M2: 20%削減達成（2024-12-21）✅ 21%達成
- [ ] M3: 50%削減（目標: 165件以下）
- [ ] M4: コアロジックany型ゼロ化
- [ ] M5: ビルド成功
- [ ] M6: 全テスト成功

### 日次ログ

#### 2024-12-21
- 初期分析完了: 329件のエラー特定
- Phase 2-1開始: PowerUpSystem, PluginManager等8ファイル完了
- 進捗: 329→261件（68件削減、約21%改善）
- 次の作業: ParticleSystem.ts含む残り7ファイルの対応

## リスクと対策

### 識別されたリスク
1. **ビルドエラーの連鎖**: 段階的修正により一時的にビルドが失敗
   - 対策: ブランチ分離とテスト駆動での修正
2. **型定義の不整合**: 異なる箇所で同じ型の異なる定義
   - 対策: 共通型定義ファイルへの統合
3. **テストの破損**: 型変更によるテストケースの破損
   - 対策: テストと実装の同時修正

## 完了基準
- [ ] すべてのlintエラーが解消
- [ ] ビルドが成功
- [ ] すべてのテストが合格
- [ ] PRレビューの承認
- [ ] mainブランチへのマージ

## 参照
- 作業ブランチ: `chore/lint-cleanup-post-story-6.1`
- 関連Story: Story 6.1 Editor UI
- ESLint設定: `.eslintrc.cjs`

## 備考
- Story実装中は新規エラーを作らないことを優先
- 既存エラーの修正は別タスクとして管理
- 自動修正可能な項目は最後にバッチ処理