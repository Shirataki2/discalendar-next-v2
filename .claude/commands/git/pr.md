---
description: Create branch, commit changes, and open pull request in one command. Auto-generates branch name and commit message from changes if not provided. Can also checkout existing branch.
allowed-tools: Bash, Read
argument-hint: [branch-name] [commit-message] [pr-title] [pr-body] [--checkout <branch-name>]
---

# Git Branch, Commit, and PR Workflow

<background_information>
- **Mission**: Automate the complete git workflow from branch creation to pull request opening
- **Success Criteria**:
  - Auto-generate branch name and commit message from changes if not provided
  - Create new branch from current branch (or checkout existing branch)
  - Stage all changes
  - Commit with provided or generated message
  - Push branch to remote
  - Create pull request using GitHub CLI
</background_information>

<instructions>
## Core Task
Execute complete git workflow: analyze changes → generate branch/commit → create/checkout branch → commit → push → create PR.

## Parse Arguments
- `--checkout <branch-name>`: Checkout existing branch instead of creating new one
- Branch name: `$1` (optional, auto-generated if not provided)
- Commit message: `$2` (optional, auto-generated if not provided)
- PR title: `$3` (optional, defaults to commit message)
- PR body: `$4` (optional, defaults to empty)

**Mode Detection**:
- If `--checkout` flag present: Checkout mode (use provided branch name)
- If no arguments: Full auto mode (generate both branch name and commit message)
- If only branch name provided: Auto-generate commit message
- If both provided: Manual mode (use provided values)

## Validation
Before execution, verify:
1. Git repository is initialized
2. Current branch is clean or has uncommitted changes
3. GitHub CLI (`gh`) is installed and authenticated
4. Remote repository is configured

If validation fails, report specific error and suggest resolution.

## Execution Steps

### Step 0: Analyze Changes (for auto-generation)
If branch name or commit message needs to be generated:
- Get changed files: `git status --porcelain`
- Get diff summary: `git diff --stat`
- Get detailed diff: `git diff` (for staged and unstaged)
- Analyze file paths and changes to determine:
  - **Branch type**: feature/fix/refactor/docs/style/test/chore
  - **Branch name**: Based on changed files and functionality
  - **Commit message**: Summary of changes in conventional commit format

**Branch Name Generation Rules**:
- Extract feature/component name from file paths
- Use kebab-case: `feature/add-calendar`, `fix/login-bug`, `refactor/auth-module`
- Prefix with type: `feature/`, `fix/`, `refactor/`, `docs/`, `style/`, `test/`, `chore/`
- If multiple features: Use most significant or combine: `feature/calendar-and-events`

**Commit Message Generation Rules**:
- Use conventional commit format: `<type>(<scope>): <subject>`
- Types: feat, fix, refactor, docs, style, test, chore
- Scope: Component or module name (optional)
- Subject: Brief description of changes (50 chars or less)
- Examples:
  - `feat(calendar): add event creation dialog`
  - `fix(auth): resolve login redirect issue`
  - `refactor(components): extract calendar hooks`

### Step 1: Validate Prerequisites
Execute validation checks:
- Check git is initialized: `git rev-parse --git-dir`
- Check gh is installed: `gh --version` (only if creating PR)
- Check gh is authenticated: `gh auth status` (only if creating PR)
- Check remote is configured: `git remote get-url origin` (only if pushing)
- Get current branch: `git branch --show-current`
- Check for uncommitted changes: `git status --porcelain`

If any validation fails, report specific error and exit.

### Step 2: Determine Branch Name
- If `--checkout` flag: Use provided branch name, verify it exists
- If `$1` provided: Use `$1` as branch name
- Otherwise: Generate branch name from changes (Step 0)
- Sanitize branch name: lowercase, replace spaces/special chars with hyphens
- Check if branch exists: `git show-ref --verify --quiet refs/heads/{branch-name}`

### Step 3: Create or Checkout Branch
**If `--checkout` mode**:
- Verify branch exists: `git show-ref --verify --quiet refs/heads/{branch-name}`
- If not exists, report error and exit
- Checkout branch: `git checkout {branch-name}`
- If checkout fails, report error and exit

**If create mode**:
- If branch exists, report error and exit
- Create and checkout new branch: `git checkout -b {branch-name}`
- If creation fails, report error and exit

### Step 4: Determine Commit Message
- If `$2` provided: Use `$2` as commit message
- Otherwise: Generate commit message from changes (Step 0)
- Validate commit message format (should be non-empty)

### Step 5: Stage and Commit
- Check if there are changes to commit: `git status --porcelain`
- If no changes:
  - In checkout mode: Report info and skip commit
  - In create mode: Report warning but continue (branch created, no commit)
- If changes exist:
  - Stage all changes: `git add .`
  - Commit with message: `git commit -m "{commit-message}"`
  - Verify commit succeeded

### Step 6: Push Branch (Optional)
- Check if branch is already pushed: `git ls-remote --heads origin {branch-name}`
- If not pushed or ahead:
  - Get remote name (default: origin): `git remote`
  - Push branch to remote: `git push -u origin {branch-name}`
  - If push fails, report error with details and exit
- If already up-to-date, skip push

### Step 7: Create Pull Request (Optional)
- Check if PR already exists: `gh pr list --head {branch-name} --json number`
- If PR exists, report info and skip creation
- If no PR exists:
  - Determine base branch (default: main, fallback to master): 
    - Check if main exists: `git show-ref --verify --quiet refs/heads/main`
    - If not, check master: `git show-ref --verify --quiet refs/heads/master`
    - Use detected base branch
  - Construct gh command:
    - Base: `--base {detected-base-branch}`
    - Title: Use `$3` if provided, else use commit message
    - Body: Use `$4` if provided, else generate from commit message and changes
  - Execute: `gh pr create --title "{title}" --body "{body}" --base {base-branch}`
  - Capture PR URL from output
  - If creation fails, report error and suggest manual creation

## Error Handling
- **Git not initialized**: Report error, suggest running `git init`
- **gh not installed**: Report error, suggest installing GitHub CLI
- **gh not authenticated**: Report error, suggest running `gh auth login`
- **Remote not configured**: Report error, suggest adding remote with `git remote add origin <url>`
- **Branch exists**: Report error, suggest using different branch name or deleting existing branch
- **No changes to commit**: Report warning, continue with branch creation and push (empty branch)
- **Commit fails**: Report error with details, suggest checking git status
- **Push fails**: Report error with details, suggest checking remote configuration and network
- **PR creation fails**: Report error with details, suggest manual PR creation via GitHub UI or checking gh permissions

## Output Description
Provide output in Japanese with the following structure:

1. **実行モード**: Auto-generation mode or manual mode
2. **生成された情報** (if auto-generated):
   - ブランチ名: Generated branch name with rationale
   - コミットメッセージ: Generated commit message with rationale
3. **実行結果**: Success or failure status
4. **実行したコマンド**: List of executed git/gh commands
5. **ブランチ情報**: Created/checked out branch name and remote URL
6. **プルリクエスト**: PR URL if created successfully
7. **次のステップ**: Any follow-up actions needed

**Format Requirements**:
- Use Markdown headings (##, ###)
- Wrap commands in code blocks
- Keep output concise and clear
- Use Japanese for all user-facing messages
- Show generated values clearly when auto-generation is used
</instructions>

## Tool Guidance
- Use **Bash** to execute git and gh commands
- Use **Read** to check git status and configuration if needed
- Validate prerequisites before execution
- Provide clear error messages in Japanese

## Safety & Fallback
- **No changes detected**: 
  - In create mode: Warn user but allow branch creation (empty branch)
  - In checkout mode: Info message, no commit needed
- **Branch name conflicts**: 
  - In create mode: Report error immediately, don't proceed
  - In checkout mode: If branch doesn't exist, report error
- **Auto-generation fails**: 
  - If cannot determine branch type: Default to `feature/` prefix
  - If cannot determine feature name: Use timestamp or ask user
  - If cannot generate commit message: Ask user for input
- **Authentication issues**: Report specific error and suggest `gh auth login`
- **Network failures**: Report error and suggest retry
- **Partial success**: Report what succeeded and what failed, provide recovery steps
- **Empty commit**: Allow empty commit only in checkout mode, warn in create mode
