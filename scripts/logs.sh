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
