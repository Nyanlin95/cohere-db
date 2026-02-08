/**
 * Handoff Command
 * 
 * Multi-agent handoff management for Cohere.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface HandoffOptions {
  record?: boolean;
  resume?: string;
  list?: boolean;
  output?: string;
  status?: string;
  agentId?: string;
}

export async function handoff(options: HandoffOptions): Promise<void> {
  const outputDir = options.output || '.ai';

  if (options.list) {
    await listSessions(outputDir);
    return;
  }

  if (options.resume) {
    await resumeSession(outputDir, options.resume);
    return;
  }

  if (options.record) {
    await recordHandoff(outputDir, options);
    return;
  }

  // Default: show help
  console.log('Handoff command - record session state for multi-agent handoff\n');
  console.log('Usage:');
  console.log('  cohere-db handoff --record           Record current session state');
  console.log('  cohere-db handoff --resume <id>     Resume from previous session');
  console.log('  cohere-db handoff --list            List available sessions');
  console.log('');
  console.log('Options:');
  console.log('  -o, --output <dir>     Output directory (default: .ai)');
  console.log('  --status <status>      Session status (in_progress, completed, paused)');
  console.log('  --agentId <id>         Agent identifier');
}

async function listSessions(outputDir: string): Promise<void> {
  const handoffsDir = path.join(outputDir, 'handoffs');

  try {
    const files = await fs.readdir(handoffsDir);
    const handoffFiles = files
      .filter(f => f.startsWith('HANDOFF_') && f.endsWith('.md'))
      .sort()
      .reverse();

    if (handoffFiles.length === 0) {
      console.log('No handoff sessions found.\n');
      console.log('Record a session with: cohere-db handoff --record');
      return;
    }

    console.log('Available Sessions:\n');
    console.log('| Session ID | Timestamp | Status |');
    console.log('|------------|-----------|--------|');

    for (const file of handoffFiles.slice(0, 10)) {
      const content = await fs.readFile(path.join(handoffsDir, file), 'utf-8');
      const sessionMatch = content.match(/\|\s*\*\*Session ID\*\*\s*\|\s*([^\|]+?)\s*\|/);
      const timestampMatch = content.match(/\|\s*\*\*Timestamp\*\*\s*\|\s*([^\|]+?)\s*\|/);
      const statusMatch = content.match(/\|\s*\*\*Status\*\*\s*\|\s*([^\|]+?)\s*\|/);

      const sessionId = sessionMatch?.[1] || 'unknown';
      const timestamp = timestampMatch?.[1] || 'unknown';
      const status = statusMatch?.[1] || 'unknown';

      console.log(`| ${sessionId} | ${timestamp} | ${status} |`);
    }

    console.log('');
    console.log(`Total: ${handoffFiles.length} session(s)\n`);
    console.log('Resume with: cohere-db handoff --resume <session_id>');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No handoff sessions found.\n');
      console.log('Record a session with: cohere-db handoff --record');
    } else {
      throw error;
    }
  }
}

async function resumeSession(outputDir: string, sessionId: string): Promise<void> {
  const handoffsDir = path.join(outputDir, 'handoffs');
  const stateDir = path.join(outputDir, 'state');
  const contextDir = path.join(outputDir, 'context');

  // Try to find session files
  const sessionPatterns = [
    `HANDOFF_${sessionId}.md`,
    `HANDOFF_${sessionId}-*.md`,
  ];

  let handoffFile: string | null = null;

  for (const pattern of sessionPatterns) {
    try {
      const files = await fs.readdir(handoffsDir);
      const handoffFiles = files.filter(f => f.startsWith('HANDOFF_') && f.endsWith('.md'));

      for (const file of handoffFiles) {
        const filePath = path.join(handoffsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const sessionMatch = content.match(/\|\s*\*\*Session ID\*\*\s*\|\s*([^\|]+?)\s*\|/);

        if (sessionMatch && sessionMatch[1].trim() === sessionId) {
          handoffFile = path.join(handoffsDir, file);
          break;
        }
      }

      if (handoffFile) break;
    } catch {
      // Continue
    }
  }

  if (!handoffFile) {
    console.log(`Session ${sessionId} not found.\n`);
    console.log('List sessions with: cohere-db handoff --list');
    return;
  }

  // Load state files
  const stateFile = path.join(stateDir, 'CURRENT_STATE.md');
  const contextFile = path.join(contextDir, 'SESSION_CONTEXT.json');

  console.log(`Resuming session: ${sessionId}\n`);

  try {
    const handoffContent = await fs.readFile(handoffFile, 'utf-8');
    console.log('--- Handoff Summary ---');
    console.log(handoffContent.slice(0, 500) + '...\n');
  } catch {
    // Continue
  }

  try {
    const stateContent = await fs.readFile(stateFile, 'utf-8');
    console.log('--- Current State ---');
    console.log(stateContent.slice(0, 500) + '...\n');
  } catch {
    console.log('(No current state file found)\n');
  }

  try {
    const contextContent = await fs.readFile(contextFile, 'utf-8');
    console.log('--- Context (JSON) ---');
    console.log(contextContent.slice(0, 500) + '...\n');
  } catch {
    console.log('(No context JSON found)\n');
  }

  console.log('Ready to resume. Review state before continuing.');
}

async function recordHandoff(outputDir: string, options: HandoffOptions): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionId = `sess_${timestamp}`;
  const agentId = options.agentId || 'agent-unknown';

  const handoffsDir = path.join(outputDir, 'handoffs');
  const stateDir = path.join(outputDir, 'state');
  const contextDir = path.join(outputDir, 'context');
  const decisionsDir = path.join(outputDir, 'decisions');

  // Create directories
  await fs.mkdir(handoffsDir, { recursive: true });
  await fs.mkdir(stateDir, { recursive: true });
  await fs.mkdir(contextDir, { recursive: true });
  await fs.mkdir(decisionsDir, { recursive: true });

  // Generate handoff file
  const handoffContent = generateHandoffMarkdown(sessionId, agentId, timestamp, options.status || 'in_progress');
  const handoffFile = path.join(handoffsDir, `HANDOFF_${timestamp}.md`);
  await fs.writeFile(handoffFile, handoffContent);

  // Generate state file
  const stateContent = generateStateMarkdown(sessionId, agentId, timestamp, options.status || 'in_progress');
  await fs.writeFile(path.join(stateDir, 'CURRENT_STATE.md'), stateContent);

  // Generate context JSON
  const contextContent = generateContextJson(sessionId, agentId, timestamp, options.status || 'in_progress');
  await fs.writeFile(path.join(contextDir, 'SESSION_CONTEXT.json'), contextContent);

  console.log(`Session recorded: ${sessionId}\n`);
  console.log('Files created:');
  console.log(`  - ${handoffFile}`);
  console.log(`  - ${path.join(stateDir, 'CURRENT_STATE.md')}`);
  console.log(`  - ${path.join(contextDir, 'SESSION_CONTEXT.json')}`);
  console.log('');
  console.log('Multi-agent protocol:');
  console.log('1. Share handoff file with next agent');
  console.log('2. Next agent reads: .ai/state/CURRENT_STATE.md');
  console.log('3. Full context: .ai/context/SESSION_CONTEXT.json');
}

function generateHandoffMarkdown(sessionId: string, agentId: string, timestamp: string, status: string): string {
  return `# Agent Handoff Record

> AUTO-GENERATED by cohere-db. Read this before continuing.

## Session Info

| Field | Value |
|-------|-------|
| **Agent ID** | ${agentId} |
| **Session ID** | ${sessionId} |
| **Timestamp** | ${timestamp} |
| **Status** | ${status} |

---

## What Was Attempted

### Goals
- Goal 1
- Goal 2

### Actions Taken

| Step | Action | Result |
|------|--------|--------|
| 1 | Initial setup | ✅ Complete |

---

## What Succeeded

- ✅ Success item 1

---

## What Failed

- (None yet)

---

## Decisions Made

> See \`.ai/decisions/\` for detailed logs.

---

## Current State

### Last Completed Step
- Initial handoff recorded

### Pending Work
- [ ] Pending item 1

---

## Context for Next Agent

### Variables
\`\`\`json
{
  "sessionId": "${sessionId}",
  "agentId": "${agentId}"
}
\`\`\`

---

## Next Steps

1. Review CURRENT_STATE.md
2. Check SESSION_CONTEXT.json for full state
3. Continue from last checkpoint

---

> **PROTOCOL**: Before spawning subagents:
> 1. Generate handoff file
> 2. Pass handoff to next agent
> 3. Next agent reads state first
`;
}

function generateStateMarkdown(sessionId: string, agentId: string, timestamp: string, status: string): string {
  return `# Current State

> AUTO-GENERATED by cohere-db. Active progress snapshot.

## Session Status

| Field | Value |
|-------|-------|
| **Status** | ${status} |
| **Last Updated** | ${timestamp} |
| **Session ID** | ${sessionId} |
| **Agent ID** | ${agentId} |

---

## Progress

### Completed Steps
- ✅ Initial session recorded

### Current Step
- Session initialization

### Remaining Steps
- ⏳ Define goals
- ⏳ Execute work

---

## Variables & State

\`\`\`json
{
  "sessionId": "${sessionId}",
  "agentId": "${agentId}"
}
\`\`\`

---

> **MULTI-AGENT**: Read this first when resuming.
`;
}

function generateContextJson(sessionId: string, agentId: string, timestamp: string, status: string): string {
  return JSON.stringify({
    version: "1.0.2",
    session: {
      id: sessionId,
      agentId: agentId,
      parentSessionId: null,
      timestamp: timestamp,
      status: status
    },
    state: {
      phase: "initializing",
      progress: 0,
      lastAction: "Session created",
      nextAction: "Define goals"
    },
    variables: {},
    schema: {
      databaseType: null,
      tablesModified: [],
      schemaHash: null
    },
    decisions: [],
    handoffs: [],
    errors: []
  }, null, 2);
}

function dirname(dirnameUrl: string): string {
  return fileURLToPath(new URL('..', `file://${dirnameUrl}`));
}
