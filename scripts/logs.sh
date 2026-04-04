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
