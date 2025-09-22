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

### エラー統計（2024-12-21更新）
```
総エラー数: 227件（前回: 261件）
初期状態: 329件
改善済み: 102件（約31%削減）
```

### エラー内訳
| エラータイプ | 前回 | 現在 | 削減 | 影響度 |
|------------|------|------|------|--------|
| @typescript-eslint/no-explicit-any | 159 | 135 | -24 | 高 |
| @typescript-eslint/no-unused-vars | 87 | 83 | -4 | 中 |
| その他のエラー | 15 | 9 | -6 | 低 |

### 完了したフェーズ
- ✅ Phase 2-1: game/systems (7ファイル修正)
- ✅ Phase 2-2: game/plugins/powerups (4ファイル修正)
- ✅ Phase 2-3: hooks (8ファイル修正)
- ✅ Phase 2-4: components (5ファイル修正)
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

### Phase 2: 段階的修正（リスクベース）✅ 完了

#### Phase 2-1: game/systems（高リスク）✅ 完了
**完了済み（7ファイル）**:
- ✅ ParticleSystem.ts - any型除去、getPerformanceStats追加
- ✅ PowerUpOptimization.ts - any型除去、型安全性向上
- ✅ PowerUpValidator.ts - 未使用パラメータ修正
- ✅ PowerUpStateManager.ts - 未使用パラメータ修正
- ✅ PowerUpSystem.ts - 未使用パラメータ修正
- ✅ PowerUpConflictResolver.ts - 未使用パラメータ修正
- ✅ PaddleController.ts - 未使用インポート削除

#### Phase 2-2: game/plugins/powerups ✅ 完了
**完了済み（4ファイル）**:
- ✅ BallSpeedPowerUp.ts - ball.id any型除去
- ✅ MultiBallPowerUp.ts - ball.id any型除去
- ✅ PaddleSizePowerUp.ts - paddle.id any型除去、未使用パラメータ修正
- ✅ PowerUpRegistry.ts - 未使用インポート削除

#### Phase 2-3: hooks ✅ 完了
**完了済み（8ファイル）**:
- ✅ useBallPhysics.ts - 未使用パラメータ修正
- ✅ useBlockSystem.ts - 未使用パラメータ修正
- ✅ useDebugInfo.ts - 未使用パラメータ修正
- ✅ useGameState.ts - any型をunknownに変更
- ✅ useGameStateIntegration.ts - 未使用パラメータ修正
- ✅ useHighScores.ts - any型を適切な型に変更
- ✅ usePauseMenuNavigation.test.ts - 未使用変数修正

#### Phase 2-4: components ✅ 完了
**完了済み（5ファイル）**:
- ✅ PauseMenu.tsx - グローバルWindow型定義追加、any型除去
- ✅ PowerUpAnimations.tsx - 型定義を別ファイルに分離
- ✅ PowerUpEffects.tsx - 型定義を別ファイルに分離
- ✅ LevelSelect.tsx - LevelData, LevelProgress型追加
- ✅ Settings.tsx - any型を適切な型に変更
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