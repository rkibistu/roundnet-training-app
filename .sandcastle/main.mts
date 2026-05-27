// Three-phase workflow: plan → implement → review
//
// Phase 1 (Plan):      An interactive session where you and the agent discuss
//                      the specified issue. The agent presents its reading of
//                      the issue, asks questions, and posts a comment if
//                      anything important was decided.
// Phase 2 (Implement): A sandboxed agent picks up the issue (including any
//                      new comment from Phase 1) and implements the fix using
//                      RGR (Red → Green → Repeat → Refactor).
// Phase 3 (Review):    A second agent reviews the branch diff and either
//                      approves or makes corrections directly on the branch.
//
// Usage:
//   npx tsx .sandcastle/main.mts <issue-number>
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.mts" }

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ISSUE_NUMBER = process.argv[2];

if (!ISSUE_NUMBER) {
  console.error("Usage: npx tsx .sandcastle/main.mts <issue-number>");
  process.exit(1);
}

// Hooks run inside the sandbox before the agent starts.
const hooks = {
  sandbox: { 
    onSandboxReady: [
      { command: "d=$(git rev-parse --git-dir) && mkdir -p \"$d/info\" && echo 'package-lock.json' >> \"$d/info/exclude\"" }, 
      { command: "mkdir -p ~/.claude/skills && cp -r .sandcastle/skills/tdd ~/.claude/skills/" },
      { command: "npm install", timeoutMs: 300_000}] },
};

console.log("\nStarting implementation...\n");

// ---------------------------------------------------------------------------
// Phase 1 & 2: Implement → Review
// ---------------------------------------------------------------------------

const branch = `sandcastle/sequential-reviewer/${Date.now()}`;
const branchStrategy = { type: "branch" as const, branch };

// Phase 1: Implement
console.log(`\n=== Phase 1: Implement — issue #${ISSUE_NUMBER} ===\n`);

const implement = await sandcastle.run({
  name: "implementer",
  maxIterations: 2,
  agent: sandcastle.claudeCode("claude-sonnet-4-6", { effort: "medium" }),
  sandbox: docker(),
  hooks,
  branchStrategy,
  copyToWorktree: ["node_modules"],
  promptFile: "./.sandcastle/implement-single-prompt.md",
  promptArgs: { ISSUE_NUMBER },
  completionSignal: ["<promise>COMPLETE</promise>", "<promise>BLOCKED</promise>", "<promise>ERROR</promise>"],
});

if (implement.completionSignal === "<promise>BLOCKED</promise>") {
  console.log("Implementation agent is blocked. Check the issue comments for details. Skipping review.");
} else if (implement.completionSignal === "<promise>ERROR</promise>") {
  console.log("Implementation agent hit an unrecoverable error. Skipping review.");
} else if (!implement.commits.length) {
  console.log("Implementation agent made no commits. Skipping review.");
} else if (!implement.completionSignal) {
  console.log("Implementation agent hit the iteration limit without completing (or an ERROR). Skipping review.");
} else {
  console.log(`\nImplementation complete on branch: ${branch}`);
  console.log(`Commits: ${implement.commits.length}`);

  // Phase 2: Review
  console.log(`\n=== Phase 2: Review ===\n`);

  await sandcastle.run({
    name: "reviewer",
    maxIterations: 1,
    agent: sandcastle.claudeCode("claude-opus-4-7"),
    sandbox: docker(),
    hooks,
    branchStrategy,
    copyToWorktree: ["node_modules"],
    promptFile: "./.sandcastle/review-prompt.md",
    promptArgs: { BRANCH: branch },
  });

  console.log("\nReview complete.");
}

console.log("\nAll done.");
console.log("\nBranch: ${branch}");
