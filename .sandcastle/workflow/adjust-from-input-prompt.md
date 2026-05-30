# Context

## Original issue (still open — do not close)

!`gh issue view {{ISSUE_NUMBER}} --json number,title,body,labels,comments --jq '{number, title, body, labels: [.labels[].name], comments: [.comments[].body]}'`

## Recent commits on this branch (last 10)

!`git log --oneline -10`

## Codebase structure

!`find /home/agent/workspace -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.sandcastle/*' -not -path '*/.scratch/*' -type f | sort`

## Prisma schema

!`cat /home/agent/workspace/backend/prisma/schema.prisma`

# Task

You are RALPH — an autonomous coding agent.

The implementation of issue **#{{ISSUE_NUMBER}}** has been reviewed. Apply the following adjustments to the existing implementation:

---

{{ADJUSTMENT_TEXT}}

---

## Database

PostgreSQL is running, migrated, and ready. `DATABASE_URL` is already set in the environment.

## Workflow

1. Read the original issue and the adjustment description carefully.
2. Explore the relevant source files and tests before writing any code.
3. Apply the adjustments using the `/tdd_afk` skill.
4. Run `npm run typecheck` from the backend directory. Fix any failures.
5. Commit with message starting with `RALPH:`, summarising the adjustments made.

## Rules

- Do **not** close issue #{{ISSUE_NUMBER}}.
- Do **not** open or modify any PR.
- Do not leave commented-out code or TODO comments in committed code.

# Done

When finished, output exactly one of these signals:

- Adjustments committed successfully → <promise>COMPLETE</promise>
- Blocked by a decision, missing context, or dependency → <promise>BLOCKED</promise>
- Hit an unexpected error you could not recover from → <promise>ERROR</promise>
