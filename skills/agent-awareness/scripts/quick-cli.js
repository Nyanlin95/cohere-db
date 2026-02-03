#!/usr/bin/env node

/**
 * Quick CLI for Agent Awareness - Uses API directly
 * Simpler alternative to full commander-based CLI
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3003/api';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'dashboard' || command === 'd') {
    // Fetch and display dashboard
    const [cardsRes, metricsRes, columnsRes] = await Promise.all([
      fetch(API_URL + '/cards'),
      fetch(API_URL + '/metrics'),
      fetch(API_URL + '/columns')
    ]);
    
    const cards = await cardsRes.json();
    const metrics = await metricsRes.json();
    const columns = await columnsRes.json();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('           🤖 AGENT AWARENESS DASHBOARD               ');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`📊 Tasks: ${metrics.totalCards} | ✅ ${metrics.tasksCompleted} | 🎯 ${metrics.completionRate}%`);
    console.log(`🧠 Skills: ${metrics.skillsLearned} | 💾 Memories: ${metrics.memoriesStored}`);
    console.log(`📅 ${metrics.sessionCount} sessions | Last Active: ${metrics.lastActive || 'Never'}\n`);

    console.log('═══════════════════════════════════════════════════════\n');

    for (const [id, col] of Object.entries(columns)) {
      const colCards = cards.filter(c => c.columnId === id);
      const priorityEmoji = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
      
      console.log(`${col.emoji} ${col.title.toUpperCase()} (${colCards.length})`);
      console.log('─'.repeat(54));
      
      if (colCards.length === 0) {
        console.log('   (empty)\n');
      } else {
        for (const card of colCards) {
          const tags = card.tags.length > 0 ? ` [${card.tags.join(', ')}]` : '';
          console.log(`   ${priorityEmoji[card.priority] || '⚪'} ${card.content}${tags}`);
        }
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('\nUsage:');
    console.log('  node quick-cli.js add <column> <content> [--priority p] [--tags t1,t2]');
    console.log('  node quick-cli.js move <card-id> <column>');
    console.log('  node quick-cli.js delete <card-id>');
    console.log('  node quick-cli.js skills');
    console.log('  node quick-cli.js metrics');
    console.log('\nColumns: sleeping, active, next, ideas, done');
    return;
  }

  if (command === 'add' || command === 'a') {
    // Parse: add <column> [--priority p] [--tags t] [--] <content>
    // Strategy: Use -- to separate flags from content, or parse flags first

    let column = args[1];
    let content = '';
    let priority = 'medium';
    let tags = [];

    // Find -- separator (explicit content marker)
    const dashDashIdx = args.indexOf('--');

    if (dashDashIdx !== -1) {
      // Explicit: flags before --, content after --
      let i = 2;
      while (i < dashDashIdx) {
        const arg = args[i];
        if (arg === '--priority' || arg === '-p') {
          if (i + 1 < dashDashIdx) priority = args[i + 1];
          i += 2;
        } else if (arg === '--tags' || arg === '-t') {
          if (i + 1 < dashDashIdx) {
            tags = args[i + 1].split(',').map(t => t.trim()).filter(t => t);
          }
          i += 2;
        } else {
          i++;
        }
      }
      content = args.slice(dashDashIdx + 1).join(' ');
    } else {
      // No explicit separator - collect all non-flag args first
      const nonFlags = [];
      let i = 2;

      while (i < args.length) {
        const arg = args[i];

        if (arg === '--priority' || arg === '-p') {
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            priority = args[i + 1];
          }
          i += 2;
        } else if (arg === '--tags' || arg === '-t') {
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            tags = args[i + 1].split(',').map(t => t.trim()).filter(t => t);
          }
          i += 2;
        } else if (arg.startsWith('-')) {
          // Unknown flag, skip
          i++;
        } else {
          // Non-flag arg - collect it and continue to check for more flags
          nonFlags.push(arg);
          i++;
        }
      }

      content = nonFlags.join(' ') || 'Untitled';
    }

    // DEBUG
    // console.log('DEBUG: args =', JSON.stringify(args));
    // console.log('DEBUG: priority =', priority, 'tags =', JSON.stringify(tags));

    const res = await fetch(API_URL + '/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: column, content, priority, tags })
    });
    
    const card = await res.json();
    console.log(`✅ Card created: ${card.id}`);
    console.log(`   Content: ${card.content}`);
    console.log(`   Column: ${column}`);
    console.log(`   Priority: ${card.priority}`);
    return;
  }

  if (command === 'move' || command === 'm') {
    const cardId = args[1];
    const columnId = args[2];
    
    const res = await fetch(API_URL + '/cards/' + cardId + '/move', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId })
    });
    
    console.log(`✅ Card moved to "${columnId}"`);
    return;
  }

  if (command === 'delete' || command === 'del') {
    const cardId = args[1];
    
    await fetch(API_URL + '/cards/' + cardId, { method: 'DELETE' });
    console.log('✅ Card deleted');
    return;
  }

  if (command === 'skills') {
    const res = await fetch(API_URL + '/skills');
    const skills = await res.json();
    console.log('\n🧠 Skills:');
    skills.forEach(s => {
      console.log(`  • ${s.name}${s.description ? ': ' + s.description : ''}`);
    });
    return;
  }

  if (command === 'metrics' || command === 'stats') {
    const res = await fetch(API_URL + '/metrics');
    const metrics = await res.json();
    console.log('\n📊 Metrics:');
    console.log(`  Tasks Created: ${metrics.tasksCreated}`);
    console.log(`  Tasks Completed: ${metrics.tasksCompleted}`);
    console.log(`  Completion Rate: ${metrics.completionRate}%`);
    console.log(`  Skills Learned: ${metrics.skillsLearned}`);
    console.log(`  Memories Stored: ${metrics.memoriesStored}`);
    return;
  }

  if (command === 'prioritize' || command === 'p' || command === 'top') {
    const column = args[1] || 'next';
    const limit = args[2] || 10;
    
    const res = await fetch(API_URL + '/prioritize?columnId=' + column + '&limit=' + limit);
    const cards = await res.json();
    
    console.log('\n🎯 PRIORITIZED TASKS (' + column.toUpperCase() + ')\n');
    console.log('═'.repeat(60));
    
    if (cards.length === 0) {
      console.log('   No tasks found');
    } else {
      for (const card of cards) {
        const tags = card.tags.length > 0 ? ` [${card.tags.join(', ')}]` : '';
        const score = card.priorityScore !== undefined ? ` (score: ${card.priorityScore})` : '';
        console.log(`   ${card.priorityScore >= 100 ? '🔴' : card.priorityScore >= 75 ? '🟠' : card.priorityScore >= 50 ? '🟡' : '🟢'} ${card.content}${tags}${score}`);
      }
    }
    console.log('═'.repeat(60));
    console.log('\nUsage: node quick-cli.js prioritize [column] [limit]');
    return;
  }

  if (command === 'suggest') {
    const res = await fetch(API_URL + '/priority/suggestions');
    const suggestions = await res.json();
    
    console.log('\n💡 TASK SUGGESTIONS\n');
    
    console.log('📋 NEXT COLUMN (ready to work):');
    console.log('─'.repeat(50));
    if (suggestions.nextColumn.length === 0) {
      console.log('   (empty - consider promoting from sleeping)');
    } else {
      for (const card of suggestions.nextColumn.slice(0, 5)) {
        const tags = card.tags.length > 0 ? ` [${card.tags.join(', ')}]` : '';
        console.log(`   🟡 ${card.content}${tags}`);
      }
    }
    console.log('');
    
    console.log('🌙 RECOMMENDED FROM SLEEPING:');
    console.log('─'.repeat(50));
    for (const card of suggestions.recommendedFromSleeping) {
      const tags = card.tags.length > 0 ? ` [${card.tags.join(', ')}]` : '';
      console.log(`   🟢 ${card.content}${tags} (score: ${card.priorityScore})`);
    }
    console.log('');
    return;
  }

  if (command === 'discover' || command === 'scan') {
    const { discoverSkills } = await import('./discover.js');
    const skills = discoverSkills();
    
    console.log('\n🔍 Skill Discovery Results:\n');
    console.log(`Found ${skills.length} skills in workspace\n`);
    
    for (const skill of skills) {
      console.log(`${skill.emoji} ${skill.name}`);
      console.log(`   Path: ${skill.path}`);
      if (skill.requires && Object.keys(skill.requires).length > 0) {
        console.log(`   Requires: ${JSON.stringify(skill.requires)}`);
      }
      console.log('');
    }
    return;
  }

  console.log('Unknown command:', command);
  console.log('Usage:');
  console.log('  node quick-cli.js dashboard');
  console.log('  node quick-cli.js add <column> <content> [--priority p] [--tags t1,t2]');
  console.log('  node quick-cli.js move <card-id> <column>');
  console.log('  node quick-cli.js delete <card-id>');
}

main().catch(console.error);
