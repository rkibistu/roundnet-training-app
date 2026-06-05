// Interactive workflow: implement → review loop
//
// Fresh start (implement from scratch):
//   npx tsx .sandcastle/workflow/main-interactive.mts <issue-number>
//
// Resume existing branch (skip implementation, go straight to review menu):
//   npx tsx .sandcastle/workflow/main-interactive.mts <issue-number> --branch <branch-name>
//
// After each run you can:
//   1. PR and close issue — everything OK
//   2. Need adjustments — read from a GitHub issue
//   3. Need adjustments — provide input directly
//   4. Discard worktree and exit
//
// For options 2/3 you also choose whether the next agent run continues
// the same Claude Code session (keeping its memory) or starts fresh.

import * as sandcastle from "@ai-hero/sandcastle";
import { createWorktree } from "@ai-hero/sandcastle";
import type { WorktreeRunResult } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2);
const ISSUE_NUMBER = rawArgs.find(a => !a.startsWith("-"));
const branchFlagIdx = rawArgs.indexOf("--branch");
if (branchFlagIdx !== -1 && !rawArgs[branchFlagIdx + 1]) {
  console.error("Error: --branch requires a branch name.");
  console.error("  npx tsx .sandcastle/workflow/main-interactive.mts <issue-number> --branch <branch-name>");
  process.exit(1);
}
const EXISTING_BRANCH = branchFlagIdx !== -1 ? rawArgs[branchFlagIdx + 1] : undefined;

if (!ISSUE_NUMBER) {
  console.error("Usage:");
  console.error("  npx tsx .sandcastle/workflow/main-interactive.mts <issue-number>");
  console.error("  npx tsx .sandcastle/workflow/main-interactive.mts <issue-number> --branch <branch-name>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rl = createInterface({ input: stdin, output: stdout });

async function ask(question: string): Promise<string> {
  return (await rl.question(question)).trim();
}

async function askChoice(prompt: string, choices: string[]): Promise<number> {
  while (true) {
    console.log(`\n${prompt}`);
    choices.forEach((label, i) => console.log(`  ${i + 1}. ${label}`));
    const raw = await ask("\nYour choice: ");
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= choices.length) return n;
    console.log(`Please enter a number between 1 and ${choices.length}.`);
  }
}

// Returns true if it's safe to proceed, false if the user wants to abort.
async function ensureBranchNotCheckedOut(branch: string): Promise<boolean> {
  const current = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  if (current !== branch) return true;

  console.log(`\nWarning: branch '${branch}' is currently checked out in your working directory.`);
  console.log("The agent needs a worktree for this branch, which requires it not to be checked out here.\n");

  const choice = await askChoice("How would you like to resolve this?", [
    "Switch to main automatically (script will run: git checkout main)",
    "I will switch manually — script will wait for my confirmation",
  ]);

  if (choice === 1) {
    try {
      execSync("git checkout main", { stdio: "pipe" });
      console.log("Switched to main.");
    } catch {
      console.log("\nCould not switch automatically (uncommitted changes or other error).");
      console.log("Please resolve any conflicts and run: git checkout main");
      console.log("Then press Enter to continue...");
      await ask("");
    }
  } else {
    console.log(`\nPlease run: git checkout main (or any other branch)`);
    console.log("Then press Enter when ready...");
    await ask("");
  }

  const nowCurrent = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  if (nowCurrent === branch) {
    console.log(`\nBranch '${branch}' is still checked out here. Aborting.`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const hooks = {
  sandbox: {
    onSandboxReady: [
      { command: `d=$(git rev-parse --git-dir) && mkdir -p "$d/info" && echo 'package-lock.json' >> "$d/info/exclude"` },
      { command: "mkdir -p ~/.claude/skills && cp -r .sandcastle/skills/tdd_afk ~/.claude/skills/" },
      { command: "cd /home/agent/workspace/backend && npm install", timeoutMs: 300_000 },
      { command: "cd /home/agent/workspace/frontend && npm install", timeoutMs: 300_000 },
      { command: "cd /home/agent/workspace/backend && npx prisma@5 migrate deploy", timeoutMs: 60_000 },
    ],
  },
};

const sharedRunOptions = {
  agent: sandcastle.claudeCode("claude-sonnet-4-6", { effort: "medium" }),
  sandbox: docker(),
  hooks,
  completionSignal: ["<promise>COMPLETE</promise>", "<promise>BLOCKED</promise>", "<promise>ERROR</promise>"] as string[],
};

const branch = EXISTING_BRANCH ?? `sandcastle/implementer/${Date.now()}`;
const branchStrategy = { type: "branch" as const, branch };

// ---------------------------------------------------------------------------
// Startup: ensure branch is free, create worktree
// ---------------------------------------------------------------------------

const canStart = await ensureBranchNotCheckedOut(branch);
if (!canStart) {
  rl.close();
  process.exit(1);
}

const wt = await createWorktree({
  branchStrategy,
  copyToWorktree: ["node_modules", "backend/node_modules", "frontend/node_modules", ".env"],
});

console.log(`Worktree: ${wt.worktreePath}`);

process.on("SIGINT", () => {
  console.log(`\nWorktree preserved at: ${wt.worktreePath}`);
  process.exit(0);
});

// ---------------------------------------------------------------------------
// Phase 1: implement (skipped if --branch is provided)
// ---------------------------------------------------------------------------

let lastRun: WorktreeRunResult | undefined;
let autoCreatedPrUrl: string | undefined;

if (EXISTING_BRANCH) {
  console.log(`\nResuming work on branch: ${branch}`);
  console.log(`Issue #${ISSUE_NUMBER} — skipping implementation, jumping to review menu.\n`);
} else {
  console.log(`\nStarting implementation of issue #${ISSUE_NUMBER}...`);
  console.log(`Branch: ${branch}\n`);

  lastRun = await wt.run({
    ...sharedRunOptions,
    name: "implementer",
    maxIterations: 5,
    promptFile: "./.sandcastle/workflow/implement-no-pr-prompt.md",
    promptArgs: { ISSUE_NUMBER },
  });

  if (lastRun.completionSignal !== "<promise>COMPLETE</promise>") {
    const label = lastRun.completionSignal === "<promise>BLOCKED</promise>" ? "BLOCKED" : "ERROR";
    console.log(`\nImplementation ${label}. Check the issue for details.`);
    rl.close();
    process.exit(1);
  }

  console.log(`\nImplementation complete. Branch: ${branch} (${lastRun.commits.length} commit(s))`);

  console.log("\nFetching issue title for PR...");
  const issueJson = execSync(
    `gh issue view ${ISSUE_NUMBER} --json title,number --jq '{title, number}'`,
    { encoding: "utf8" }
  );
  const { title: issueTitle } = JSON.parse(issueJson) as { title: string; number: number };

  console.log("Pushing branch and creating PR...");
  execSync(`git push origin "${branch}"`, { stdio: "inherit" });
  autoCreatedPrUrl = execSync(
    `gh pr create --head "${branch}" --base main --title "RALPH: ${issueTitle}" --body "Closes #${ISSUE_NUMBER}"`,
    { encoding: "utf8" }
  ).trim();
  console.log(`\nPR created: ${autoCreatedPrUrl}`);
}

// ---------------------------------------------------------------------------
// Phase 2: interactive review loop
// ---------------------------------------------------------------------------

while (true) {
  const prUrl = autoCreatedPrUrl ?? execSync(
    `gh pr list --head "${branch}" --json url --jq '.[0].url // ""'`,
    { encoding: "utf8" }
  ).trim();

  const action = await askChoice("What would you like to do?", [
    `Close issue #${ISSUE_NUMBER} — everything looks good${prUrl ? ` (PR: ${prUrl})` : ""}`,
    "Need adjustments — read from a GitHub issue",
    "Need adjustments — provide input directly",
    "Discard worktree and exit",
  ]);

  // --- Option 1: close issue (PR was already created after implementation) ---
  if (action === 1) {
    const confirm = await ask(`\nClose issue #${ISSUE_NUMBER}? (y/n): `);
    if (confirm.toLowerCase() !== "y") {
      console.log("Cancelled. Returning to menu.");
      continue;
    }

    let resolvedPrUrl = prUrl;
    if (!resolvedPrUrl) {
      // Fallback: resuming an existing branch that had no auto-created PR
      console.log("\nNo PR found — creating one now...");
      const issueJson = execSync(
        `gh issue view ${ISSUE_NUMBER} --json title,number --jq '{title, number}'`,
        { encoding: "utf8" }
      );
      const { title } = JSON.parse(issueJson) as { title: string; number: number };
      execSync(`git push origin "${branch}"`, { stdio: "inherit" });
      resolvedPrUrl = execSync(
        `gh pr create --head "${branch}" --base main --title "RALPH: ${title}" --body "Closes #${ISSUE_NUMBER}"`,
        { encoding: "utf8" }
      ).trim();
      console.log(`PR created: ${resolvedPrUrl}`);
    }

    execSync(`gh issue close ${ISSUE_NUMBER} --comment "Completed. PR: ${resolvedPrUrl}"`, { stdio: "inherit" });
    await wt.close();

    console.log(`Issue #${ISSUE_NUMBER} closed.\n\nAll done!`);
    break;
  }

  // --- Option 4: Discard worktree and exit ---
  if (action === 4) {
    const confirm = await ask("\nDiscard the worktree and exit? All uncommitted work will be lost. (y/n): ");
    if (confirm.toLowerCase() !== "y") {
      console.log("Cancelled. Returning to menu.");
      continue;
    }
    await wt.close();
    console.log("Worktree discarded. Exiting.");
    break;
  }

  // --- Options 2/3: adjustments ---
  let adjIssueNumber: string | undefined;
  let adjText: string | undefined;

  if (action === 2) {
    adjIssueNumber = await ask("\nEnter the adjustment issue number: ");
  } else {
    while (true) {
      console.log("\nDescribe the adjustments needed (press Enter twice when done):");
      const lines: string[] = [];
      while (true) {
        const line = await ask("> ");
        if (line === "" && lines.at(-1) === "") break;
        lines.push(line);
      }
      adjText = lines.join("\n").trim();
      if (adjText) break;
      console.log("Adjustment text cannot be empty. Please describe what needs to change.");
    }
  }

  const continueSession = await askChoice("Continue on the same session?", [
    "Yes — resume with existing context",
    "No — start a fresh session",
  ]);

  const lastSessionId = lastRun?.iterations.at(-1)?.sessionId;
  const useResume = continueSession === 1 && lastSessionId !== undefined;
  if (continueSession === 1 && !useResume) {
    console.log("\n[Note] Session resume is not available for this run — starting a fresh session instead.");
  }

  // --- Run adjustments ---
  if (useResume) {
    // Build inline prompt for the resumed session
    let inlinePrompt: string;

    if (adjIssueNumber !== undefined) {
      const issueContent = execSync(
        `gh issue view ${adjIssueNumber} --json number,title,body,comments --jq '{number, title, body, comments: [.comments[].body]}'`,
        { encoding: "utf8" }
      ).trim();

      inlinePrompt = [
        `Issue review: adjustments needed.`,
        ``,
        `The following adjustments are required (from issue #${adjIssueNumber}):`,
        ``,
        issueContent,
        ``,
        `Apply these adjustments to the existing implementation:`,
        `- Use the /tdd_afk skill for any code changes.`,
        `- Run \`npm run typecheck\` from the backend directory. Fix any failures.`,
        `- Commit with a \`RALPH:\` prefix, summarising the changes made.`,
        `- Close issue #${adjIssueNumber} with: gh issue close ${adjIssueNumber} --comment "Adjustments applied to branch."`,
        `- Do NOT close issue #${ISSUE_NUMBER}. Do NOT open or modify any PR.`,
        ``,
        `When done output exactly one of:`,
        `<promise>COMPLETE</promise>`,
        `<promise>BLOCKED</promise>`,
        `<promise>ERROR</promise>`,
      ].join("\n");
    } else {
      inlinePrompt = [
        `Issue review: adjustments needed.`,
        ``,
        `Apply the following adjustments to the existing implementation:`,
        ``,
        adjText!,
        ``,
        `- Use the /tdd_afk skill for any code changes.`,
        `- Run \`npm run typecheck\` from the backend directory. Fix any failures.`,
        `- Commit with a \`RALPH:\` prefix, summarising the changes made.`,
        `- Do NOT close issue #${ISSUE_NUMBER}. Do NOT open or modify any PR.`,
        ``,
        `When done output exactly one of:`,
        `<promise>COMPLETE</promise>`,
        `<promise>BLOCKED</promise>`,
        `<promise>ERROR</promise>`,
      ].join("\n");
    }

    lastRun = await wt.run({
      ...sharedRunOptions,
      name: "adjuster",
      prompt: inlinePrompt,
      resumeSession: lastSessionId,
    });
  } else {
    if (adjIssueNumber !== undefined) {
      lastRun = await wt.run({
        ...sharedRunOptions,
        name: "adjuster",
        maxIterations: 5,
        promptFile: "./.sandcastle/workflow/adjust-from-issue-prompt.md",
        promptArgs: { ISSUE_NUMBER, ADJUSTMENT_ISSUE_NUMBER: adjIssueNumber },
      });
    } else {
      lastRun = await wt.run({
        ...sharedRunOptions,
        name: "adjuster",
        maxIterations: 5,
        promptFile: "./.sandcastle/workflow/adjust-from-input-prompt.md",
        promptArgs: { ISSUE_NUMBER, ADJUSTMENT_TEXT: adjText! },
      });
    }
  }

  if (lastRun!.completionSignal !== "<promise>COMPLETE</promise>") {
    const label = lastRun!.completionSignal === "<promise>BLOCKED</promise>" ? "BLOCKED" : "ERROR";
    console.log(`\nAdjustment run ${label}. Check the issue for details.`);
  } else {
    console.log(`\nAdjustments applied. Branch: ${branch} (${lastRun!.commits.length} commit(s) total)`);
    execSync(`git push origin "${branch}"`, { stdio: "inherit" });
    console.log("Branch pushed — PR updated on GitHub.");
  }
}

rl.close();
