#!/bin/bash

# git コマンドをブロックし、gh ツールの利用を促すフック
# このフックは Cursor Hooks Spec の beforeShellExecution フックを実装します

# デバッグログを開始
echo "Hook execution started" >> /tmp/hooks.log

# 標準入力から JSON 入力を読み込む
input=$(cat)
echo "Received input: $input" >> /tmp/hooks.log

# JSON 入力から command をパース
command=$(echo "$input" | jq -r '.command // empty')
echo "Parsed command: '$command'" >> /tmp/hooks.log

# コマンドに 'git' または 'gh' が含まれているかを確認
if [[ "$command" =~ git[[:space:]] ]] || [[ "$command" == "git" ]]; then
    echo "Git command detected - blocking: '$command'" >> /tmp/hooks.log
    # git コマンドをブロックし、代わりに gh ツールを使うよう案内
    cat << EOF
{
  "continue": true,
  "permission": "deny",
  "user_message": "Git コマンドはブロックされました。代わりに GitHub CLI (gh) ツールを使用してください。",
  "agent_message": "git コマンド '$command' はフックによってブロックされました。生の git コマンドではなく、GitHub との統合性が高くベストプラクティスに沿った 'gh' ツールを使用してください。例えば:\n- 'git clone' の代わりに 'gh repo clone' を使用\n- 'git push' の代わりに 'gh repo sync' など、適切な gh コマンドを使用\n- その他の git 操作についても、同等の gh コマンドがないか確認するか、GitHub の Web インターフェースを使用してください\n\nこれにより、一貫性を保ちつつ、GitHub の強力なツール群を活用できます。"
}
EOF
elif [[ "$command" =~ gh[[:space:]] ]] || [[ "$command" == "gh" ]]; then
    echo "GitHub CLI command detected - asking for permission: '$command'" >> /tmp/hooks.log
    # gh コマンドについては許可を確認
    cat << EOF
{
  "continue": true,
  "permission": "ask",
  "user_message": "GitHub CLI コマンドの実行には許可が必要です: $command",
  "agent_message": "コマンド '$command' は GitHub CLI (gh) を使用しており、GitHub リポジトリやアカウントに対して操作を行う可能性があります。続行したい場合は、このコマンドの内容を確認し、承認してください。"
}
EOF
else
    echo "Non-git/non-gh command detected - allowing: '$command'" >> /tmp/hooks.log
    # git / gh 以外のコマンドは許可
    cat << EOF
{
  "continue": true,
  "permission": "allow"
}
EOF
fi
