# Interactive Workflow

The interactive workflow (`main-interactive.mts`) is a human-in-the-loop implementation loop. The agent implements an issue, then pauses and asks you what to do next — ship it, tweak it, or iterate.

## Commands

```bash
# Implement a fresh issue
npx tsx .sandcastle/workflow/main-interactive.mts <issue-number>

# Resume work on an existing branch (skip implementation)
npx tsx .sandcastle/workflow/main-interactive.mts <issue-number> --branch <branch-name>
```

The branch name is printed at the start of every run: `sandcastle/implementer/<timestamp>`.

---

## How it works

### Worktree lifecycle

At startup the script creates (or reattaches to) a persistent git worktree at `.sandcastle/worktrees/<branch>`:

- **Fresh run** — worktree is created, `node_modules` and `.env` are copied in.
- **`--branch` resume, worktree exists** — reattaches silently; no file copy.
- **`--branch` resume, worktree was deleted** — recreates the worktree from the existing branch and copies files again.

The worktree path is printed immediately after startup:

```
Worktree: .sandcastle/worktrees/sandcastle-implementer-1748612345678
```

You can open a second terminal, `cd` there, and run `claude` to inspect or discuss the changes while the script is paused at a menu.

**Ctrl+C** exits the script but leaves the worktree on disk. The path is printed again so you can find it:

```
Worktree preserved at: .sandcastle/worktrees/sandcastle-implementer-1748612345678
```

### Phase 1 — Implementation

Skipped when `--branch` is passed. Otherwise, the agent:

1. Creates a branch: `sandcastle/implementer/<timestamp>`
2. Boots a Docker sandbox and installs dependencies
3. Implements the issue using the `/tdd_afk` skill (max 5 iterations)
4. Commits the work — does **not** open a PR

If the agent reports BLOCKED or ERROR, the script exits and leaves a comment on the issue.

### Phase 2 — Review loop

After implementation (or immediately when resuming a branch), you get this menu on repeat:

```
1. PR and close issue — everything looks good
2. Need adjustments — read from a GitHub issue
3. Need adjustments — provide input directly
4. Discard worktree and exit
```

**Option 1 — Ship:** creates a PR titled `RALPH: <issue title>` targeting `main`, closes the issue, cleans up the worktree, and exits.

**Option 2 — Adjust from issue:** you provide a GitHub issue number. The agent fetches its content and applies the fixes to the branch. Closes the adjustment issue when done.

**Option 3 — Adjust from input:** you type the instructions directly (double Enter to finish). The agent applies them to the branch.

**Option 4 — Discard:** prompts for confirmation, then removes the worktree and exits. Use this when you want to abandon the current work entirely.

For options 2 and 3, you also choose how the agent continues:

| Choice | When available | What it does |
|---|---|---|
| Resume session | Only within the same process run | Agent keeps full in-memory context from the previous run |
| Fresh session | Always | Agent starts clean, re-reads the issue and codebase |

The loop repeats after every adjustment until you choose to ship or discard.

---

## Use cases

### Standard: implement and ship

```bash
npx tsx .sandcastle/workflow/main-interactive.mts 42
# agent implements...
# choice: 1 — ship
# → PR created, issue closed, worktree cleaned up
```

### Implement, review, iterate

```bash
npx tsx .sandcastle/workflow/main-interactive.mts 42
# agent implements...
# choice: 3 — provide input directly
# > The button colour should be red, not blue.
# >
# agent fixes, commits...
# choice: 1 — ship
```

### Resume after Ctrl+C or process restart

If you interrupted a previous run or the process exited, find the branch name in the terminal output and pass it with `--branch`. The worktree is reattached (or recreated) automatically:

```bash
# Original run printed: Worktree: .sandcastle/worktrees/sandcastle-implementer-1748612345678

npx tsx .sandcastle/workflow/main-interactive.mts 42 --branch sandcastle/implementer/1748612345678
# choice: 2 — adjustments from GitHub issue
# issue number: 55
# session: fresh (process was restarted)
# agent applies fixes to same branch...
# choice: 1 — ship
```

### Apply fixes from a dedicated GitHub issue

Useful when the reviewer leaves structured feedback in a separate issue rather than inline comments:

```bash
npx tsx .sandcastle/workflow/main-interactive.mts 42 --branch sandcastle/implementer/1748612345678
# choice: 2 — adjustments from GitHub issue
# issue number: 99
# agent fetches issue #99, applies fixes, closes #99
# choice: 1 — ship
```

### Inspect the worktree in a second terminal

The worktree path is printed at startup. While the menu is waiting for your input you can open another terminal and browse or run the app there:

```bash
cd .sandcastle/worktrees/sandcastle-implementer-1748612345678
claude   # discuss the changes interactively without touching your main checkout
```
