#!/bin/bash
# Stop フック: 仕様に関わるファイルが変わったのに .claude/SPEC.md が更新されていなければ、
# Claude の終了を1回だけ止めて SPEC.md の更新（または仕様変更なしの判断）を促す。
# 同じ差分の状態では2回目以降は止めない（リファクタ等で毎ターン止まるのを防ぐ）。

input=$(cat)
[ "$(echo "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

SPEC='.claude/SPEC.md'
changed=$( { git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard; } | sort -u)

# 仕様に関わるファイル: src/ 配下（テスト・CSS 以外）と index.html
spec_relevant=$(echo "$changed" | grep -E '^(src/|index\.html$)' | grep -vE '\.test\.ts$|\.css$')
[ -z "$spec_relevant" ] && exit 0
echo "$changed" | grep -qx "$SPEC" && exit 0

# 同じ差分で一度注意済みなら通す
stamp="$(git rev-parse --git-dir)/spec-sync-ack"
hash=$(git diff HEAD -- $spec_relevant 2>/dev/null | cat - $(echo "$spec_relevant" | grep -v '^$') 2>/dev/null | shasum | cut -d' ' -f1)
[ -f "$stamp" ] && [ "$(cat "$stamp")" = "$hash" ] && exit 0
echo "$hash" > "$stamp"

files=$(echo "$spec_relevant" | sed 's/^/  - /')
reason="仕様に関わるファイルが変更されていますが ${SPEC} が更新されていません:
${files}
仕様変更・仕様追加であれば ${SPEC} の該当箇所と「変更履歴」を更新してください。
リファクタやバグ修正など仕様に影響しない変更なら、その旨をユーザーに一言伝えて終了して構いません。"

jq -n --arg r "$reason" '{decision: "block", reason: $r}'
