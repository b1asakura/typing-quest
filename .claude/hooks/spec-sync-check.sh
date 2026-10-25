#!/bin/bash
# Stop フック: 仕様まわりの記録漏れを検出して、Claude の終了を1回だけ止める。
#  1. 仕様に関わるファイルが変わったのに .claude/SPEC.md が更新されていない
#  2. SPEC.md が変わったのに経緯ログ（.claude/decisions/NNNN-*.md）が追加・更新されていない
# 同じ差分の状態では2回目以降は止めない（仕様に影響しない変更で毎ターン止まるのを防ぐ）。

input=$(cat)
[ "$(echo "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

SPEC='.claude/SPEC.md'
DECISIONS='.claude/decisions'
# core.quotePath=false: 日本語のファイル名がエスケープされて判定から漏れないようにする
changed=$( { git -c core.quotePath=false diff --name-only HEAD 2>/dev/null; git -c core.quotePath=false ls-files --others --exclude-standard; } | sort -u)

# 仕様に関わるファイル: src/ 配下（テスト・CSS 以外）と index.html
spec_relevant=$(echo "$changed" | grep -E '^(src/|index\.html$)' | grep -vE '\.test\.ts$|\.css$')
spec_changed=$(echo "$changed" | grep -x "$SPEC")
decision_changed=$(echo "$changed" | grep -E "^${DECISIONS}/[0-9]{4}-.*\.md$")

problems=''
if [ -n "$spec_relevant" ] && [ -z "$spec_changed" ]; then
  problems+="■ 仕様に関わるファイルが変更されていますが ${SPEC} が更新されていません:
$(echo "$spec_relevant" | sed 's/^/  - /')
  仕様変更・仕様追加であれば ${SPEC} の該当箇所と「変更履歴」を更新してください。
"
fi
if [ -n "$spec_changed" ] || { [ -n "$spec_relevant" ] && [ -z "$spec_changed" ]; }; then
  if [ -z "$decision_changed" ]; then
    problems+="■ 経緯ログ（${DECISIONS}/NNNN-題名.md）が追加・更新されていません。
  仕様変更の背景・決定・採らなかった案・見直す条件を ${DECISIONS}/TEMPLATE.md に沿って記録し、
  ${DECISIONS}/INDEX.md に1行追加してください。
"
  fi
fi
[ -z "$problems" ] && exit 0

# 同じ差分で一度注意済みなら通す
stamp="$(git rev-parse --git-dir)/spec-sync-ack"
targets=$(printf '%s\n%s\n' "$spec_relevant" "$spec_changed" | grep -v '^$')
hash=$( { git diff HEAD -- $targets 2>/dev/null; cat $targets 2>/dev/null; } | shasum | cut -d' ' -f1)
[ -f "$stamp" ] && [ "$(cat "$stamp")" = "$hash" ] && exit 0
echo "$hash" > "$stamp"

reason="${problems}リファクタやバグ修正など仕様に影響しない変更なら、その旨をユーザーに一言伝えて終了して構いません。"
jq -n --arg r "$reason" '{decision: "block", reason: $r}'
