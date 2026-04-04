# Production Log Tracer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shell script (`scripts/logs.sh`) that streams production logs from both Discord Bot (CloudWatch) and Next.js Web (Vercel) into a single terminal with color-coded labels.

**Architecture:** Two background processes (`aws logs tail` and `vercel logs`) stream their output through formatting pipes that add colored source labels. A trap handler ensures clean shutdown on Ctrl+C.

**Tech Stack:** Bash, AWS CLI (`aws logs tail`), Vercel CLI (`vercel logs`), jq (optional, for Pino JSON formatting)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `scripts/logs.sh` | Create | Main script: argument parsing, prerequisite checks, env loading, process management, output formatting |

Single file. All logic lives in `scripts/logs.sh`.

---

### Task 1: Script skeleton with argument parsing and prerequisite checks

**Files:**
- Create: `scripts/logs.sh`

- [ ] **Step 1: Create the script with shebang, usage, and argument parsing**

```bash
#!/bin/bash
set -euo pipefail

# Stream production logs from Discord Bot (CloudWatch) and Next.js Web (Vercel)
# Usage: ./scripts/logs.sh [--bot-only] [--web-only]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# ─── Colors ───
CYAN='\033[36m'
MAGENTA='\033[35m'
RED='\033[31m'
YELLOW='\033[33m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Defaults ───
STREAM_BOT=true
STREAM_WEB=true

# ─── Argument Parsing ───
for arg in "$@"; do
  case "$arg" in
    --bot-only)
      STREAM_WEB=false
      ;;
    --web-only)
      STREAM_BOT=false
      ;;
    -h|--help)
      echo "Usage: $0 [--bot-only] [--web-only]"
      echo ""
      echo "Stream production logs from Discord Bot and Next.js Web."
      echo ""
      echo "Options:"
      echo "  --bot-only   Stream only Discord Bot logs (CloudWatch)"
      echo "  --web-only   Stream only Next.js Web logs (Vercel)"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option '$arg'${RESET}"
      echo "Usage: $0 [--bot-only] [--web-only]"
      exit 1
      ;;
  esac
done

# ─── Prerequisite Checks ───
check_command() {
  local cmd="$1"
  local hint="$2"
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}Error: '$cmd' is not installed.${RESET}"
    echo -e "  Install: ${BOLD}${hint}${RESET}"
    return 1
  fi
}

HAS_JQ=true
if ! command -v jq &>/dev/null; then
  echo -e "${YELLOW}Warning: 'jq' is not installed. Bot logs will be displayed as raw JSON.${RESET}"
  echo -e "  Install: ${BOLD}brew install jq${RESET}"
  HAS_JQ=false
fi

if [ "$STREAM_BOT" = true ]; then
  check_command "aws" "brew install awscli" || exit 1
fi

if [ "$STREAM_WEB" = true ]; then
  check_command "vercel" "pnpm add -g vercel" || exit 1
fi
```

- [ ] **Step 2: Make the script executable and verify argument parsing**

Run:
```bash
chmod +x scripts/logs.sh
./scripts/logs.sh --help
```

Expected: Help message displayed with usage info.

Run:
```bash
./scripts/logs.sh --invalid 2>&1; echo "exit: $?"
```

Expected: Error message about unknown option, exit code 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/logs.sh
git commit -m "feat(scripts): add logs.sh skeleton with argument parsing and prerequisite checks"
```

---

### Task 2: Environment variable loading

**Files:**
- Modify: `scripts/logs.sh`

- [ ] **Step 1: Add env loading after prerequisite checks**

Append the following after the prerequisite checks section in `scripts/logs.sh`:

```bash
# ─── Environment Variables ───
load_env_file() {
  local file="$1"
  if [ -f "$file" ]; then
    while IFS='=' read -r key value; do
      # Skip comments and empty lines
      [[ -z "$key" || "$key" =~ ^# ]] && continue
      # Remove surrounding quotes from value
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      # Only export if not already set in environment
      if [ -z "${!key+x}" ]; then
        export "$key=$value"
      fi
    done < "$file"
  fi
}

if [ "$STREAM_BOT" = true ]; then
  # Load from .env.local first (higher priority), then .env
  load_env_file "$PROJECT_DIR/.env.local"
  load_env_file "$PROJECT_DIR/.env"

  AWS_REGION="${AWS_REGION:-ap-northeast-1}"
  CLOUDWATCH_LOG_GROUP="${AWS_CLOUDWATCH_LOG_GROUP:-${CLOUDWATCH_LOG_GROUP:-}}"

  if [ -z "$CLOUDWATCH_LOG_GROUP" ]; then
    echo -e "${RED}Error: CLOUDWATCH_LOG_GROUP (or AWS_CLOUDWATCH_LOG_GROUP) is not set.${RESET}"
    echo -e "  Add to ${BOLD}.env.local${RESET}:"
    echo -e "    CLOUDWATCH_LOG_GROUP=/your/log-group-name"
    exit 1
  fi
fi
```

- [ ] **Step 2: Verify env loading with missing variable**

Run:
```bash
CLOUDWATCH_LOG_GROUP="" AWS_CLOUDWATCH_LOG_GROUP="" ./scripts/logs.sh --bot-only 2>&1; echo "exit: $?"
```

Expected: Error message about CLOUDWATCH_LOG_GROUP not set, exit code 1.

Run:
```bash
./scripts/logs.sh --web-only 2>&1 | head -5; echo "exit: $?"
```

Expected: No env error (bot env check is skipped with `--web-only`). May fail at vercel command — that's fine, we handle streaming next.

- [ ] **Step 3: Commit**

```bash
git add scripts/logs.sh
git commit -m "feat(scripts): add environment variable loading to logs.sh"
```

---

### Task 3: Bot log streaming with Pino JSON formatting

**Files:**
- Modify: `scripts/logs.sh`

- [ ] **Step 1: Add the Bot log streaming function**

Append the following after the environment variables section:

```bash
# ─── Pino Log Level Mapping ───
# Pino uses numeric levels: 10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal
format_bot_line() {
  local line="$1"
  if [ "$HAS_JQ" = true ]; then
    local formatted
    formatted=$(echo "$line" | jq -r '
      def level_name:
        if . <= 10 then "TRACE"
        elif . <= 20 then "DEBUG"
        elif . <= 30 then "INFO "
        elif . <= 40 then "WARN "
        elif . <= 50 then "ERROR"
        else "FATAL"
        end;
      "\(.time // "" | if . == "" then "---" else (. / 1000 | strftime("%Y-%m-%dT%H:%M:%SZ")) end) \(.level // 30 | level_name) \(.msg // .message // .)"
    ' 2>/dev/null)
    if [ -n "$formatted" ]; then
      echo -e "${CYAN}[BOT]${RESET} $formatted"
    else
      # jq parse failed — print raw line with label
      echo -e "${CYAN}[BOT]${RESET} $line"
    fi
  else
    echo -e "${CYAN}[BOT]${RESET} $line"
  fi
}

stream_bot_logs() {
  aws logs tail "$CLOUDWATCH_LOG_GROUP" \
    --region "$AWS_REGION" \
    --follow \
    --format short \
    --since 5m 2>&1 | while IFS= read -r line; do
    # Skip empty lines
    [ -z "$line" ] && continue
    # Check if line is JSON (starts with {)
    if [[ "$line" == "{"* ]]; then
      format_bot_line "$line"
    else
      echo -e "${CYAN}[BOT]${RESET} $line"
    fi
  done
}
```

- [ ] **Step 2: Verify the formatting function with a sample Pino JSON line**

Run:
```bash
source scripts/logs.sh --help 2>/dev/null; true
# Test format_bot_line directly (source the functions)
bash -c '
  source <(sed -n "/^# ─── Colors/,/^stream_bot_logs/p" scripts/logs.sh | head -n -1)
  HAS_JQ=true
  format_bot_line "{\"level\":30,\"time\":1743868800000,\"msg\":\"Bot ready\"}"
'
```

Expected: Colored `[BOT]` label with formatted timestamp, `INFO`, and message.

- [ ] **Step 3: Commit**

```bash
git add scripts/logs.sh
git commit -m "feat(scripts): add bot log streaming with Pino JSON formatting"
```

---

### Task 4: Web log streaming and process management

**Files:**
- Modify: `scripts/logs.sh`

- [ ] **Step 1: Add the Web log streaming function**

Append after the bot streaming function:

```bash
stream_web_logs() {
  vercel logs --follow --cwd "$PROJECT_DIR" 2>&1 | while IFS= read -r line; do
    [ -z "$line" ] && continue
    echo -e "${MAGENTA}[WEB]${RESET} $line"
  done
}
```

- [ ] **Step 2: Add process management and main execution**

Append at the end of `scripts/logs.sh`:

```bash
# ─── Process Management ───
BOT_PID=""
WEB_PID=""

cleanup() {
  echo ""
  echo -e "${BOLD}Stopping log streams...${RESET}"
  [ -n "$BOT_PID" ] && kill "$BOT_PID" 2>/dev/null
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null
  wait 2>/dev/null
  echo -e "${BOLD}Done.${RESET}"
  exit 0
}

trap cleanup INT TERM

# ─── Start Streaming ───
echo -e "${BOLD}Starting production log stream...${RESET}"
[ "$STREAM_BOT" = true ] && echo -e "  ${CYAN}[BOT]${RESET} CloudWatch: $CLOUDWATCH_LOG_GROUP ($AWS_REGION)"
[ "$STREAM_WEB" = true ] && echo -e "  ${MAGENTA}[WEB]${RESET} Vercel: $(basename "$PROJECT_DIR")"
echo -e "${BOLD}Press Ctrl+C to stop.${RESET}"
echo ""

if [ "$STREAM_BOT" = true ]; then
  stream_bot_logs &
  BOT_PID=$!
fi

if [ "$STREAM_WEB" = true ]; then
  stream_web_logs &
  WEB_PID=$!
fi

# Wait for any child to exit; if one dies, report and keep the other running
while true; do
  if [ -n "$BOT_PID" ] && ! kill -0 "$BOT_PID" 2>/dev/null; then
    echo -e "${RED}[BOT] Stream ended unexpectedly.${RESET}"
    BOT_PID=""
  fi
  if [ -n "$WEB_PID" ] && ! kill -0 "$WEB_PID" 2>/dev/null; then
    echo -e "${RED}[WEB] Stream ended unexpectedly.${RESET}"
    WEB_PID=""
  fi
  # If all streams are dead, exit
  if [ -z "$BOT_PID" ] && [ -z "$WEB_PID" ]; then
    echo -e "${RED}All streams ended.${RESET}"
    exit 1
  fi
  sleep 2
done
```

- [ ] **Step 3: Remove `set -e` from the top of the script**

Change the first line after the shebang from:
```bash
set -euo pipefail
```
to:
```bash
set -uo pipefail
```

Reason: `set -e` would cause the script to exit when a background process exits non-zero, which conflicts with the "keep other stream running" behavior. The `set -u` (undefined variable check) and `set -o pipefail` are still useful.

- [ ] **Step 4: Verify the full script syntax**

Run:
```bash
bash -n scripts/logs.sh
```

Expected: No output (syntax OK).

- [ ] **Step 5: Commit**

```bash
git add scripts/logs.sh
git commit -m "feat(scripts): add web log streaming and process management to logs.sh"
```

---

### Task 5: Manual testing and final adjustments

**Files:**
- Modify: `scripts/logs.sh` (if needed)

- [ ] **Step 1: Test `--help` output**

Run:
```bash
./scripts/logs.sh --help
```

Expected:
```
Usage: ./scripts/logs.sh [--bot-only] [--web-only]

Stream production logs from Discord Bot and Next.js Web.

Options:
  --bot-only   Stream only Discord Bot logs (CloudWatch)
  --web-only   Stream only Next.js Web logs (Vercel)
  -h, --help   Show this help message
```

- [ ] **Step 2: Test prerequisite check error messages**

Run (if `aws` is not installed, skip):
```bash
PATH=/usr/bin ./scripts/logs.sh --bot-only 2>&1 | head -3
```

Expected: Error about missing `aws` command with install hint.

- [ ] **Step 3: Test `--web-only` launches Vercel stream**

Run:
```bash
timeout 5 ./scripts/logs.sh --web-only 2>&1; true
```

Expected: Startup banner with `[WEB] Vercel: discalendar-next`, then either log output or stream ends after timeout.

- [ ] **Step 4: Test `--bot-only` with valid CloudWatch credentials**

Run (requires AWS credentials and CLOUDWATCH_LOG_GROUP in .env.local):
```bash
timeout 10 ./scripts/logs.sh --bot-only 2>&1; true
```

Expected: Startup banner with `[BOT] CloudWatch: <log-group>`, then either formatted log output or stream ends after timeout.

- [ ] **Step 5: Final commit**

```bash
git add scripts/logs.sh
git commit -m "feat(scripts): production log tracer script complete"
```
