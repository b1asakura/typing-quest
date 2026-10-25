# CLAUDE.md - Project Guidelines for Claude Code

## Build & Verify Commands
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Type check: `npx tsc --noEmit`
- Run unit tests: `npm run test` (Vitest)
- Build production: `npm run build`

## Architecture & Coding Rules
1. **Strict Separation of Data and Logic**:
   - 難易度定義、ステージ設定、キーと指のマッピング、単語リストはすべて `src/data/` 配下のTypeScriptファイルまたはJSONとして定義し、ゲームロジックから切り離すこと。
2. **Procedural Voxel Engine (`src/voxel/`)**:
   - 外部の `.gltf` や `.obj` に依存せず、`THREE.BoxGeometry` をベースにしたボクセルビルダー関数を作成し、モンスター（スライム、ゾンビ等）、金鉱石、ダイヤ鉱石、ボクセルハンドをコードで生成すること。
   - 破壊時のボクセル飛散パーティクルはパフォーマンスを考慮し、オブジェクトプールまたは軽量な物理演算（重力＋床バウンド＋プレイヤーへの吸引）で実装すること。
3. **Kid-Friendly UI/UX**:
   - 漢字には必ずふりがなを振るか、ひらがな・カタカナ表記を基本とすること（小学校低学年向け）。
   - ミスタイプ時に画面を赤くフラッシュさせるような恐怖感を与える演出は避け、3Dキーボード上の位置ガイドで優しく教えること。
4. **Verification Rule**:
   - コードを変更した後は、必ず `npx tsc --noEmit` と `npm run build` を実行し、コンパイルエラーがないことを確認してから完了報告を行うこと。
5. **Spec Sync Rule**:
   - 仕様変更・仕様追加（出題内容、キー配置、制限時間、演出、UI文言、操作方法など、遊び方や見た目が変わるもの）を行った場合は、同じ作業の中で必ず `.claude/SPEC.md` の該当箇所を更新し、末尾の「変更履歴」に日付つきで1行追記すること。
   - リファクタ・バグ修正など仕様に影響しない変更では SPEC.md の更新は不要。その場合は完了報告で「仕様変更なし」と明記すること。
   - Stop フック（`.claude/hooks/spec-sync-check.sh`）が、`src/`（テスト・CSS除く）や `index.html` の変更に対して SPEC.md が未更新だと終了を1回止めて確認を促す。
