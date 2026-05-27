// Single-phase workflow: implement
//
// The implementer picks up the issue, implements it using /tdd_afk,
// opens a PR, and closes the issue — all in one pass.
//
// Usage:
//   npx tsx .sandcastle/main.mts <issue-number>
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.mts" }

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

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
      { command: "mkdir -p ~/.claude/skills && cp -r .sandcastle/skills/tdd_afk ~/.claude/skills/" },
      { command: "cd /home/agent/workspace/backend && npm install", timeoutMs: 300_000 },
      { command: "cd /home/agent/workspace/frontend && npm install", timeoutMs: 300_000 },
      { command: "cd /home/agent/workspace/backend && npx prisma migrate deploy", timeoutMs: 60_000 }] },
};

console.log("\nStarting implementation...\n");

// ---------------------------------------------------------------------------
// Implement
// ---------------------------------------------------------------------------

const branch = `sandcastle/implementer/${Date.now()}`;
const branchStrategy = { type: "branch" as const, branch };

console.log(`\n=== Implement — issue #${ISSUE_NUMBER} ===\n`);

const implement = await sandcastle.run({
  name: "implementer",
  maxIterations: 2,
  agent: sandcastle.claudeCode("claude-sonnet-4-6", { effort: "medium" }),
  sandbox: docker(),
  hooks,
  branchStrategy,
  copyToWorktree: ["node_modules", "backend/node_modules", "frontend/node_modules"],
  promptFile: "./.sandcastle/implement-single-prompt.md",
  promptArgs: { ISSUE_NUMBER },
  completionSignal: ["<promise>COMPLETE</promise>", "<promise>BLOCKED</promise>", "<promise>ERROR</promise>"],
});

if (implement.completionSignal === "<promise>COMPLETE</promise>") {
  console.log(`\nDone. Branch: ${branch}`);
  console.log(`Commits: ${implement.commits.length}`);
} else if (implement.completionSignal === "<promise>BLOCKED</promise>") {
  console.log("Blocked. Check the issue comments for details.");
} else if (implement.completionSignal === "<promise>ERROR</promise>") {
  console.log("Unrecoverable error. Check the issue comments for details.");
} else {
  console.log("Hit the iteration limit without completing.");
}

console.log("\nAll done.");
