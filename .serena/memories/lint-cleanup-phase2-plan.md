# Lint Cleanup Phase 2-2以降の実施計画

## 📊 現在の状況（2024-12-21時点）
- **総エラー数**: 261件（256 errors, 5 warnings）
- **Phase 2-1完了**: ParticleSystem.ts、PowerUpOptimization.ts、PowerUpValidator.ts、PowerUpStateManager.ts等の型安全化完了
- **削減実績**: 329件→261件（約21%改善）

## 🎯 Phase 2-2: プラグインシステム（中リスク）
### 対象ディレクトリ
- `game/plugins/powerups/` 配下: 4ファイル

### 修正内容
- any型の完全除去
- 型安全なプラグインインターフェース実装
- PowerUpType列挙型の活用

### 予想工数
- 2-3時間

## 🎯 Phase 2-3: UI層（中リスク）  
### 対象ディレクトリ
- `hooks/` 配下: 8ファイル
  - useGameState.ts
  - useHUD.ts
  - useHighScores.ts
  - useGameStateIntegration.ts
  - useDebugInfo.ts
  - useBlockSystem.ts
  - useBallPhysics.ts
  - usePauseMenuNavigation.ts

- `components/` 配下の該当ファイル

### 修正内容
- React Hooksの型定義強化
- イベントハンドラーの型安全化
- Zustandストアとの型整合性

### 予想工数
- 3-4時間

## 🎯 Phase 3: テストファイル（低リスク）
### 対象ディレクトリ
- `src/game/systems/__tests__/`: 14ファイル
- その他のテストファイル

### 修正戦略
- バルク修正アプローチ
- モックオブジェクトの型定義
- アサーションの型安全化

### 予想工数
- 2-3時間

## 🎯 Phase 4: 自動修正可能な項目
### 対象
- 未使用変数の削除: 87件
- ESLint自動修正可能な項目

### 実行コマンド
```bash
# 未使用変数の自動削除
npx eslint --fix --rule '@typescript-eslint/no-unused-vars: error' src/

# その他の自動修正
npx eslint --fix src/
```

### 予想工数
- 30分

## 📈 優先順位判断基準（QAレポートより）

### リスクベース優先順位
1. **🔴 高リスク（即座対応）**
   - game/systems配下の残りファイル（AudioSystem.ts、ThemeSystem.ts等）
   - ゲーム動作に直接影響

2. **🟡 中リスク（次フェーズ）**  
   - Phase 2-2: game/plugins/powerups
   - Phase 2-3: hooks層、components層
   - UI統合とユーザー体験に影響

3. **🟢 低リスク（バッチ処理可能）**
   - Phase 3: テストファイル
   - Phase 4: 未使用変数、自動修正可能項目

## 🚀 実施推奨順序

1. **Phase 2-1残作業**: game/systems配下の残り7ファイル（AudioSystem.ts, ThemeSystem.ts等）
2. **Phase 2-2**: game/plugins/powerups配下（4ファイル）
3. **Phase 2-3**: hooks配下（8ファイル）→ components配下
4. **Phase 4**: 自動修正（最も簡単・低リスク）
5. **Phase 3**: テストファイルのバルク修正

## ✅ 完了基準
- [ ] すべてのlintエラーが解消（0件）
- [ ] npm run buildが成功
- [ ] npm testが全て合格
- [ ] PRレビューの承認
- [ ] mainブランチへのマージ

## 📝 備考
- 各フェーズ完了後にコミット
- テスト実行で回帰がないことを確認
- 型定義は段階的に厳密化（any→unknown→具体型）
- 共通型定義は`types/`ディレクトリに集約