#!/usr/bin/env node

/**
 * Agent Awareness CLI
 * 
 * Command-line interface for the Agent Awareness Kanban board.
 * 
 * Usage:
 *   node cli.js                    - Show dashboard
 *   node cli.js add <col> <text>   - Add card to column
 *   node cli.js move <id> <col>    - Move card to column
 *   node cli.js edit <id> <text>   - Edit card
 *   node cli.js delete <id>        - Delete card
 *   node cli.js list               - List all cards
 *   node cli.js search <query>     - Search cards
 *   node cli.js metrics            - Show metrics
 *   node cli.js reset              - Reset all data
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import { fileURLToPath } from 'url';
import AgentAwareness from './agentAwareness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the awareness system
const awareness = new AgentAwareness({
  dataDir: path.join(__dirname, '..', 'memory'),
  dataFile: path.join(__dirname, '..', 'memory', 'agent-dashboard.json')
});

// Create CLI program
const program = new Command();

program
  .name('agent-awareness')
  .description('Agent Awareness Kanban Board - Self-monitoring for AI agents')
  .version('1.0.0');

// Default: show dashboard
program
  .command('dashboard')
  .alias('d')
  .description('Show the Kanban dashboard')
  .action(() => {
    console.log(awareness.renderASCII());
  });

// Status
program
  .command('status')
  .alias('s')
  .description('Show JSON status')
  .action(() => {
    console.log(JSON.stringify(awareness.renderStatus(), null, 2));
  });

// Add card
program
  .command('add <column> <content>')
  .alias('a')
  .description('Add a new card to a column')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .option('-p, --priority <priority>', 'Priority (low, medium, high, urgent)')
  .option('-d, --description <description>', 'Card description')
  .action((column, content, options) => {
    try {
      const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];
      const card = awareness.addCard(column, content, {
        tags,
        priority: options.priority || 'medium',
        description: options.description
      });
      console.log(`✅ Card created: ${card.id}`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Move card
program
  .command('move <cardId> <targetColumn>')
  .alias('m')
  .description('Move a card to a different column')
  .action((cardId, targetColumn) => {
    try {
      awareness.moveCard(cardId, targetColumn);
      console.log(`✅ Card moved to ${targetColumn}`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Edit card
program
  .command('edit <cardId> <newContent>')
  .alias('e')
  .description('Edit a card content')
  .action((cardId, newContent) => {
    try {
      awareness.editCard(cardId, { content: newContent });
      console.log(`✅ Card updated`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Delete card
program
  .command('delete <cardId>')
  .alias('del')
  .description('Delete a card')
  .action((cardId) => {
    try {
      awareness.deleteCard(cardId);
      console.log(`✅ Card deleted`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// List cards
program
  .command('list')
  .alias('l')
  .description('List all cards')
  .option('-c, --column <column>', 'Filter by column')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('-p, --priority <priority>', 'Filter by priority')
  .action((options) => {
    const filters = {};
    if (options.column) filters.columnId = options.column;
    if (options.tags) filters.tags = options.tags.split(',').map(t => t.trim());
    if (options.priority) filters.priority = options.priority;

    const cards = awareness.filterCards(filters);
    console.log('\n📋 Cards:');
    cards.forEach(card => {
      console.log(`  [${card.columnId}] ${card.content} (${card.priority})`);
    });
    console.log(`\nTotal: ${cards.length} cards`);
  });

// Search
program
  .command('search <query>')
  .alias('find')
  .description('Search cards')
  .action((query) => {
    const results = awareness.searchCards(query);
    console.log(`\n🔍 Search results for "${query}":`);
    results.forEach(card => {
      console.log(`  [${card.columnId}] ${card.content}`);
    });
    console.log(`\nFound: ${results.length} cards`);
  });

// Metrics
program
  .command('metrics')
  .alias('stats')
  .description('Show metrics dashboard')
  .action(() => {
    const metrics = awareness.getMetrics();
    console.log('\n📊 Agent Metrics:');
    console.log(`  Tasks Created: ${metrics.tasksCreated}`);
    console.log(`  Tasks Completed: ${metrics.tasksCompleted}`);
    console.log(`  Completion Rate: ${metrics.completionRate}%`);
    console.log(`  Skills Learned: ${metrics.skillsLearned}`);
    console.log(`  Memories Stored: ${metrics.memoriesStored}`);
    console.log(`  Corrections Made: ${metrics.correctionsMade}`);
    console.log(`  Sessions: ${metrics.sessionCount}`);
  });

// Add skill
program
  .command('skill <name>')
  .description('Add a new skill')
  .option('-d, --description <description>', 'Skill description')
  .action((name, options) => {
    const skill = awareness.addSkill({
      name,
      description: options.description || ''
    });
    console.log(`✅ Skill added: ${skill.name}`);
  });

// Show skills
program
  .command('skills')
  .description('List all skills')
  .action(() => {
    const skills = awareness.getSkills();
    console.log('\n🧠 Skills:');
    skills.forEach(skill => {
      console.log(`  • ${skill.name}${skill.description ? `: ${skill.description}` : ''}`);
    });
    console.log(`\nTotal: ${skills.length} skills`);
  });

// Add memory
program
  .command('memory <content>')
  .description('Add a memory')
  .option('-t, --type <type>', 'Memory type (entity, fact, lesson, etc.)')
  .action((content, options) => {
    const memory = awareness.addMemory({
      content,
      type: options.type || 'general'
    });
    console.log(`✅ Memory stored: ${memory.id}`);
  });

// Show memories
program
  .command('memories')
  .description('List all memories')
  .action(() => {
    const memories = awareness.getMemories();
    console.log('\n💾 Memories:');
    memories.forEach(memory => {
      console.log(`  [${memory.type}] ${memory.content.substring(0, 50)}...`);
    });
    console.log(`\nTotal: ${memories.length} memories`);
  });

// Reset
program
  .command('reset')
  .description('Reset all data')
  .action(() => {
    inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to reset ALL data? This cannot be undone.',
        default: false
      }
    ]).then((answers) => {
      if (answers.confirm) {
        awareness.reset();
        console.log('✅ All data reset');
      } else {
        console.log('Cancelled');
      }
    });
  });

// Export
program
  .command('export')
  .description('Export data to JSON')
  .action(() => {
    console.log(awareness.exportJSON());
  });

// Import
program
  .command('import <file>')
  .description('Import data from JSON file')
  .action((file) => {
    try {
      const json = fs.readFileSync(file, 'utf-8');
      awareness.importJSON(json);
      console.log('✅ Data imported');
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Run interactive mode')
  .action(async () => {
    console.log('🤖 Agent Awareness - Interactive Mode');
    console.log('Type "help" for commands, "exit" to quit.\n');

    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📊 View Dashboard', value: 'dashboard' },
            { name: '➕ Add Card', value: 'add' },
            { name: '📋 List Cards', value: 'list' },
            { name: '🔍 Search', value: 'search' },
            { name: '📈 Metrics', value: 'metrics' },
            { name: '🧠 Manage Skills', value: 'skills' },
            { name: '💾 Manage Memories', value: 'memories' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'exit') {
        console.log('👋 Goodbye!');
        break;
      }

      if (action === 'dashboard') {
        console.log(awareness.renderASCII());
      }

      if (action === 'list') {
        const cards = awareness.getAllCards();
        console.log('\n📋 All Cards:');
        cards.forEach(card => {
          console.log(`  [${card.columnId}] ${card.content} (${card.priority})`);
        });
      }

      if (action === 'metrics') {
        const metrics = awareness.getMetrics();
        console.log('\n📊 Metrics:', JSON.stringify(metrics, null, 2));
      }
    }
  });

// Parse arguments
program.parse(process.argv);

// If no arguments, show dashboard
if (process.argv.length === 2) {
  console.log(awareness.renderASCII());
  console.log('\nUsage:');
  console.log('  node cli.js                    - Show dashboard');
  console.log('  node cli.js add <col> <text>   - Add card');
  console.log('  node cli.js move <id> <col>    - Move card');
  console.log('  node cli.js list               - List cards');
  console.log('  node cli.js search <query>     - Search');
  console.log('  node cli.js metrics            - Show metrics');
  console.log('  node cli.js interactive        - Interactive mode');
  console.log('\nColumns: sleeping, active, next, ideas, done');
}
