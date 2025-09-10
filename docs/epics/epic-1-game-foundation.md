# Epic 1: ゲーム基盤構築

**目的**: Reactアプリケーションの土台とCanvasゲームエンジンの統合

## 概要
モダンレトロなデザインと高い拡張性を持つブロック崩しゲームの基盤を構築します。React（UIレイヤー）とCanvas API（ゲームレンダリング）のハイブリッドアーキテクチャを採用し、優れたユーザー体験とパフォーマンスを実現します。

## ユーザーストーリー

### Story 1.1: プロジェクトセットアップ
**As a** 開発者  
**I want** React + TypeScript + Viteの開発環境  
**So that** 効率的に開発を進められる

**受け入れ基準:**
- Viteプロジェクトが正常に作成される
- React 18とTypeScript 5が設定される
- ESLintとPrettierが設定される
- 基本的なフォルダ構造が作成される
- HMRが正常に動作する

### Story 1.2: Canvasゲームエンジン基盤
**As a** 開発者  
**I want** ゲームループとレンダリングシステム  
**So that** ゲーム描画を制御できる

**受け入れ基準:**
- requestAnimationFrameベースのゲームループ
- 60 FPSでの安定動作
- Canvas要素のReactコンポーネント化
- 基本的な描画メソッド実装
- デバッグ用FPSカウンター表示

### Story 1.3: 状態管理システム
**As a** 開発者  
**I want** UIとゲーム状態の分離管理  
**So that** 複雑な状態を効率的に扱える

**受け入れ基準:**
- Zustandによる UI状態管理
- カスタムGameStateクラス
- ReactとCanvasの状態同期
- 状態変更のイベントシステム
- DevToolsでの状態確認