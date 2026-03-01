#!/bin/bash
set -euo pipefail

SESSION_NAME="${1:-discalendar}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting tmux session '$SESSION_NAME' in directory '$PROJECT_DIR'..."

# 既存セッションがあればアタッチして終了
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Session '$SESSION_NAME' already exists. Attaching..."
  exec tmux attach-session -t "$SESSION_NAME"
fi

# セッション作成（左上ペイン）
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_DIR"

# 左右に分割（右上ペインを作成）— 右側を70%に
tmux split-window -h -p 90 -t "$SESSION_NAME" -c "$PROJECT_DIR"

# 右ペインを上下に分割（右下ペインを作成）
tmux split-window -v -p 15 -t "$SESSION_NAME" -c "$PROJECT_DIR"

# 左ペイン（index 0）を上下に分割（左下ペインを作成）
tmux select-pane -t "$SESSION_NAME:.1"
tmux split-window -v -p 15 -t "$SESSION_NAME" -c "$PROJECT_DIR"

# --- 各ペインで実行するコマンド ---
# ペイン番号:
#   1 = 左上  2 = 左下  3 = 右上  4 = 右下

tmux send-keys -t "$SESSION_NAME:.1" 'yazi' C-m
tmux send-keys -t "$SESSION_NAME:.2" 'keifu' C-m
tmux send-keys -t "$SESSION_NAME:.3" 'claude' C-m
# tmux send-keys -t "$SESSION_NAME:.4" 'echo "右下: ここにコマンド"' C-m

# 右上ペイン（メイン作業領域）にフォーカス
tmux select-pane -t "$SESSION_NAME:.3"

# アタッチ
exec tmux attach-session -t "$SESSION_NAME"
