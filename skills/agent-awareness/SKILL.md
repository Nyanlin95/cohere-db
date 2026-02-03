---
name: agent-awareness
description: Self-awareness and state tracking for AI agents. Track tasks, goals, skills, memories, and metrics in a Kanban-style dashboard.
metadata:
 {
   "openclaw": {
     "emoji": "📊",
     "requires": { "bins": ["node"] },
     "install": [
       { "id": "npm-deps", "kind": "node", "label": "Install npm dependencies" }
     ]
   }
 }
---

# Agent Awareness

Self-monitoring system for AI agents with a full Kanban board for task management.

## Core Concept

An agent needs awareness of its own state to function effectively. This skill provides:

- **Kanban Board** - 5 columns: Sleeping, Active, Next, Ideas, Done
- **Task Tracking** - Add, move, edit, delete cards
- **Metric Tracking** - Tasks completed, skills learned, memories stored
- **Session Continuity** - Remembering context across sessions
- **Self-Reflection** - Understanding progress and gaps

## Architecture

```
skills/agent-awareness/
├── SKILL.md                 # This file
├── package.json             # Dependencies
├── scripts/
│   ├── agentAwareness.js    # Core dashboard class
│   ├── cli.js               # CLI interface
│   └── htmlDashboard.js     # HTML generator
├── memory/
│   └── agent-dashboard.json # Persistent state
└── dashboard.html           # Visual board (generated)
```

## Usage

### CLI Commands

```bash
# Navigate to skill folder
cd skills/agent-awareness

# Install dependencies
npm install

# Show dashboard
node scripts/cli.js dashboard

# Add card
node scripts/cli.js add active "Fix socket bug" --priority high --tags kasar,bug

# Move card
node scripts/cli.js move <card-id> done

# List cards
node scripts/cli.js list

# Search cards
node scripts/cli.js search "socket"

# Show metrics
node scripts/cli.js metrics

# Interactive mode
node scripts/cli.js interactive

# Generate HTML dashboard
node scripts/htmlDashboard.js
```

### Available Columns

| Column | Emoji | Description |
|--------|-------|-------------|
| sleeping | 🌙 | Backlog and low priority items |
| active | 🚀 | Current focus and work |
| next | 📋 | Upcoming tasks |
| ideas | 💡 | Brainstorming and experiments |
| done | ✅ | Completed items |

### Options

```bash
# Priority levels: low, medium, high, urgent
--priority high

# Comma-separated tags
--tags kasar,bug,socket

# Description
--description "Detailed explanation"
```

## Self-Awareness Metrics

| Metric | Description |
|--------|-------------|
| `tasksCreated` | Total tasks/items added |
| `tasksCompleted` | Items moved to Done |
| `completionRate` | Tasks completed / created |
| `skillsLearned` | New skills acquired |
| `memoriesStored` | Entities/facts remembered |
| `correctionsMade` | Mistakes fixed |
| `sessionCount` | Total sessions |

## Integration with OpenClaw

### As Autonomous Worker

Use in autonomous sessions via exec tool:

```javascript
// Add task to active
exec({
  command: 'cd skills/agent-awareness && node scripts/cli.js add active "Fix socket bug" --priority high --tags kasar',
  workdir: '~/clawd'
});

// Move task to done
exec({
  command: 'cd skills/agent-awareness && node scripts/cli.js move <card-id> done',
  workdir: '~/clawd'
});

// Show dashboard
exec({
  command: 'cd skills/agent-awareness && node scripts/cli.js dashboard',
  workdir: '~/clawd'
});
```

### As Scheduled Task

Add to HEARTBEAT.md or cron for regular updates:

```markdown
## Agent Awareness Check
- [ ] Check pending tasks
- [ ] Move completed items to Done
- [ ] Review metrics
```

### HTML Dashboard

Generate visual dashboard:

```bash
cd skills/agent-awareness
node scripts/htmlDashboard.js
# Open dashboard.html in browser
```

## Example Dashboard Output

```
═══════════════════════════════════════════════════════
           🤖 AGENT AWARENESS DASHBOARD               
═══════════════════════════════════════════════════════

📊 Tasks: 24 | ✅ 18 | 🎯 75%
🧠 Skills: 20 | 💾 Memories: 47 | 🔧 Fixes: 8
📅 5 sessions | Last Active: 20:13:53

═══════════════════════════════════════════════════════

🌙 SLEEPING (5)
...

🚀 ACTIVE (2)
🔴 Fix socket bug [kasar, bug]
🟡 Review PR #42 [pr, review]

📋 NEXT (3)
...

💡 IDEAS (4)
...

✅ DONE (10)
...
```

## Best Practices

1. **Update frequently** - Add items as soon as they're created
2. **Complete items** - Move to Done when finished
3. **Review regularly** - Check dashboard before new sessions
4. **Tag appropriately** - Use tags for filtering
5. **Keep it current** - Don't let items stagnate
6. **Track skills** - Record new skills learned
7. **Store memories** - Remember important facts

## Skill Auto-Discovery

This skill includes an auto-discovery feature that scans the `skills/` folder and automatically detects new skills.

### Discovery Commands

```bash
# Discover skills and show results
node scripts/discover.js

# Discover with JSON output
node scripts/discover.js --json

# Discover and generate config for new skills
node scripts/discover.js --register

# Via quick-cli
node scripts/quick-cli.js discover
```

### Cron Job for Scheduled Discovery

```bash
# Run discovery cron (stores state, detects new skills)
node scripts/discover-cron.js

# With config generation for new skills
node scripts/discover-cron.js --register

# Quiet mode (less output)
node scripts/discover-cron.js --quiet

# JSON output for scripts
node scripts/discover-cron.js --json
```

### Scheduling Auto-Discovery

Add to cron for automatic skill detection:

```bash
# Every hour
0 * * * * cd /path/to/clawd && node skills/agent-awareness/scripts/discover-cron.js --quiet

# Every day at midnight
0 0 * * * cd /path/to/clawd && node skills/agent-awareness/scripts/discover-cron.js --register

# Every week
0 0 * * 0 cd /path/to/clawd && node skills/agent-awareness/scripts/discover-cron.js --register --json >> /var/log/skill-discovery.log
```

### How It Works

1. Scans `skills/` folder for directories containing `SKILL.md`
2. Parses YAML frontmatter for skill metadata (name, description, emoji, tags, requirements)
3. Compares with previous discovery state
4. Reports new skills since last run
5. Generates config entries for new skills (with `--register`)

### Discovery State

Discovery state is stored in `memory/skill-discovery.json`:
```json
{
  "lastDiscovery": "2026-02-03T00:18:55.395Z",
  "skills": {
    "agent-awareness": { "name": "agent-awareness", "path": "agent-awareness", ... },
    "gno": { "name": "gno", "path": "gno", ... }
  }
}
```

## Connecting with Other Systems

- **Preference Learner** → Update behavior based on feedback
- **Context Router** → Track conversation topics
- **Auto Corrector** → Log and learn from mistakes
- **Memory System** → Track concept connections
