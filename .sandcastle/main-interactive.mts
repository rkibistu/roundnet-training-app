// Interactive workflow: implement → review loop
//
// Fresh start (implement from scratch):
//   npx tsx .sandcastle/main-interactive.mts <issue-number>
//
// Resume existing branch (skip implementation):
//   npx tsx .sandcastle/main-interactive.mts <issue-number> --branch <branch-name>
//
// After each implementation or adjustment the script offers:
//   1. PR and close issue
//   2. Adjustments from a GitHub issue
//   3. Adjustments from direct input
//
// For options 2/3 it asks how the agent should continue:
//   - Resume current session (in-memory, only available in the same execution)
//   - Resume a previous session by ID (cross-execution, loads from disk)
//   - Start a fresh session

import * as sandcastle from "@ai-hero/sandcastle";
import type { RunResult } from "@ai-hero/sandcastle";
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
const EXISTING_BRANCH = branchFlagIdx !== -1 ? rawArgs[branchFlagIdx + 1] : undefined;

if (!ISSUE_NUMBER) {
  console.error("Usage:");
  console.error("  npx tsx .sandcastle/main-interactive.mts <issue-number>");
  console.error("  npx tsx .sandcastle/main-interactive.mts <issue-number> --branch <branch-name>");
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

function buildAdjustInlinePrompt(issueNumber: string, adjIssueNumber: string, adjText: undefined): string;
function buildAdjustInlinePrompt(issueNumber: string, adjIssueNumber: undefined, adjText: string): string;
function buildAdjustInlinePrompt(issueNumber: string, adjIssueNumber: string | undefined, adjText: string | undefined): string {
  const adjustmentBlock = adjIssueNumber !== undefined
    ? (() => {
        const content = execSync(
          `gh issue view ${adjIssueNumber} --json number,title,body,comments --jq '{number, title, body, comments: [.comments[].body]}'`,
          { encoding: "utf8" }
        ).trim();
        return [`Required adjustments (from issue #${adjIssueNumber}):`, "", content].join("\n");
      })()
    : [`Required adjustments:`, "", adjText!].join("\n");

  const closeStep = adjIssueNumber !== undefined
    ? `- Close issue #${adjIssueNumber} with: gh issue close ${adjIssueNumber} --comment "Adjustments applied to branch."`
    : "";

  return [
    `Issue review: adjustments needed.`,
    ``,
    adjustmentBlock,
    ``,
    `Apply these adjustments to the existing implementation:`,
    `- Use the /tdd_afk skill for any code changes.`,
    `- Run \`npm run typecheck\` from the backend directory. Fix any failures.`,
    `- Commit with a \`RALPH:\` prefix, summarising the changes made.`,
    closeStep,
    `- Do NOT close issue #${issueNumber}. Do NOT open or modify any PR.`,
    ``,
    `When done output exactly one of:`,
    `<promise>COMPLETE</promise>`,
    `<promise>BLOCKED</promise>`,
    `<promise>ERROR</promise>`,
  ].filter(l => l !== undefined).join("\n");
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
      { command: "cd /home/agent/workspace/backend && npx prisma migrate deploy", timeoutMs: 60_000 },
    ],
  },
};

const COMPLETION_SIGNALS = ["<promise>COMPLETE</promise>", "<promise>BLOCKED</promise>", "<promise>ERROR</promise>"];

const sharedRunOptions = {
  agent: sandcastle.claudeCode("claude-sonnet-4-6", { effort: "medium" }),
  sandbox: docker(),
  hooks,
  copyToWorktree: ["node_modules", "backend/node_modules", "frontend/node_modules"] as string[],
  completionSignal: COMPLETION_SIGNALS,
};

// ---------------------------------------------------------------------------
// Branch setup
// ---------------------------------------------------------------------------

const branch = EXISTING_BRANCH ?? `sandcastle/implementer/${Date.now()}`;
const branchStrategy = { type: "branch" as const, branch };

// ---------------------------------------------------------------------------
// Phase 1: implement (or skip if resuming existing branch)
// ---------------------------------------------------------------------------

let lastRun: RunResult | undefined;

if (EXISTING_BRANCH) {
  console.log(`\nResuming work on branch: ${branch}`);
  console.log(`Issue #${ISSUE_NUMBER} — skipping implementation, jumping to review menu.\n`);
} else {
  console.log(`\nStarting implementation of issue #${ISSUE_NUMBER}...`);
  console.log(`Branch: ${branch}\n`);

  lastRun = await sandcastle.run({
    ...sharedRunOptions,
    name: "implementer",
    maxIterations: 5,
    branchStrategy,
    promptFile: "./.sandcastle/implement-no-pr-prompt.md",
    promptArgs: { ISSUE_NUMBER },
  });

  if (lastRun.completionSignal !== "<promise>COMPLETE</promise>") {
    const label = lastRun.completionSignal === "<promise>BLOCKED</promise>" ? "BLOCKED" : "ERROR";
    console.log(`\nImplementation ${label}. Check the issue for details.`);
    rl.close();
    process.exit(1);
  }

  console.log(`\nImplementation complete. Branch: ${branch} (${lastRun.commits.length} commit(s))`);
}

// ---------------------------------------------------------------------------
// Phase 2: interactive review loop
// ---------------------------------------------------------------------------

while (true) {
  const action = await askChoice("What would you like to do?", [
    "PR and close issue — everything looks good",
    "Need adjustments — read from a GitHub issue",
    "Need adjustments — provide input directly",
  ]);

  // --- Option 1: PR + close ---
  if (action === 1) {
    console.log("\nFetching issue title for PR...");
    const issueJson = execSync(
      `gh issue view ${ISSUE_NUMBER} --json title,number --jq '{title, number}'`,
      { encoding: "utf8" }
    );
    const { title } = JSON.parse(issueJson) as { title: string; number: number };

    console.log("Creating PR...");
    const prUrl = execSync(
      `gh pr create --head "${branch}" --base main --title "RALPH: ${title}" --body "Closes #${ISSUE_NUMBER}"`,
      { encoding: "utf8" }
    ).trim();

    console.log(`PR created: ${prUrl}`);
    execSync(`gh issue close ${ISSUE_NUMBER} --comment "Completed. PR: ${prUrl}"`, { stdio: "inherit" });
    console.log(`Issue #${ISSUE_NUMBER} closed.\n\nAll done!`);
    break;
  }

  // --- Options 2/3: collect adjustment input ---
  let adjIssueNumber: string | undefined;
  let adjText: string | undefined;

  if (action === 2) {
    adjIssueNumber = await ask("\nEnter the adjustment issue number: ");
  } else {
    console.log("\nDescribe the adjustments needed (press Enter twice when done):");
    const lines: string[] = [];
    while (true) {
      const line = await ask("> ");
      if (line === "" && lines.at(-1) === "") break;
      lines.push(line);
    }
    adjText = lines.join("\n").trim();
  }

  // --- Session mode ---
  const canResumeInMemory = lastRun?.resume !== undefined;
  const sessionChoices: string[] = [];
  if (canResumeInMemory) sessionChoices.push("Resume current session (in-memory context from this run)");
  sessionChoices.push("Resume a previous session by ID (cross-session, loads from disk)");
  sessionChoices.push("Start a fresh session");

  const sessionChoice = await askChoice("How should the agent continue?", sessionChoices);

  type SessionMode = "resume-memory" | "resume-id" | "fresh";
  const modeMap = canResumeInMemory
    ? (["resume-memory", "resume-id", "fresh"] as SessionMode[])
    : (["resume-id", "fresh"] as SessionMode[]);
  const sessionMode: SessionMode = modeMap[sessionChoice - 1]!;

  // --- Run adjustments ---
  if (sessionMode === "resume-memory") {
    const inlinePrompt = adjIssueNumber !== undefined
      ? buildAdjustInlinePrompt(ISSUE_NUMBER, adjIssueNumber, undefined)
      : buildAdjustInlinePrompt(ISSUE_NUMBER, undefined, adjText!);

    lastRun = await lastRun!.resume!(inlinePrompt, {
      name: "adjuster",
      branchStrategy,
      completionSignal: COMPLETION_SIGNALS,
    });

  } else if (sessionMode === "resume-id") {
    console.log("\nTo list recent session IDs, run in another terminal:");
    console.log("  ls -t ~/.claude/projects/**/*.jsonl 2>/dev/null | head -20");
    console.log("Each file is named <session-id>.jsonl\n");
    const sessionId = await ask("Enter session ID (without .jsonl): ");

    const inlinePrompt = adjIssueNumber !== undefined
      ? buildAdjustInlinePrompt(ISSUE_NUMBER, adjIssueNumber, undefined)
      : buildAdjustInlinePrompt(ISSUE_NUMBER, undefined, adjText!);

    // resumeSession is incompatible with maxIterations > 1
    lastRun = await sandcastle.run({
      ...sharedRunOptions,
      name: "adjuster",
      maxIterations: 1,
      branchStrategy,
      prompt: inlinePrompt,
      resumeSession: sessionId,
    });

  } else {
    // Fresh session
    if (adjIssueNumber !== undefined) {
      lastRun = await sandcastle.run({
        ...sharedRunOptions,
        name: "adjuster",
        maxIterations: 5,
        branchStrategy,
        promptFile: "./.sandcastle/adjust-from-issue-prompt.md",
        promptArgs: { ISSUE_NUMBER, ADJUSTMENT_ISSUE_NUMBER: adjIssueNumber },
      });
    } else {
      lastRun = await sandcastle.run({
        ...sharedRunOptions,
        name: "adjuster",
        maxIterations: 5,
        branchStrategy,
        promptFile: "./.sandcastle/adjust-from-input-prompt.md",
        promptArgs: { ISSUE_NUMBER, ADJUSTMENT_TEXT: adjText! },
      });
    }
  }

  if (lastRun.completionSignal !== "<promise>COMPLETE</promise>") {
    const label = lastRun.completionSignal === "<promise>BLOCKED</promise>" ? "BLOCKED" : "ERROR";
    console.log(`\nAdjustment run ${label}. Check the issue for details.`);
  } else {
    console.log(`\nAdjustments applied. Branch: ${branch} (${lastRun.commits.length} commit(s) total)`);
  }
}

rl.close();
