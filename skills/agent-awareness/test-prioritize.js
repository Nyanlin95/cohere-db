// Test script for prioritization algorithm
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3003/api';

async function testPrioritization() {
  console.log('🎯 Testing Task Prioritization Algorithm\n');
  console.log('═'.repeat(50));

  // Fetch prioritized tasks from all columns
  const res = await fetch(API_URL + '/prioritize?limit=10');
  const cards = await res.json();

  console.log('\n📊 All Active Tasks (sorted by priority score):\n');
  cards.forEach((c, i) => {
    const deps = c.dependencies?.length > 0 ? ` [deps: ${c.dependencies.length}]` : '';
    const block = c.blockedBy?.length > 0 ? ` [blocking: ${c.blockedBy.length}]` : '';
    console.log(`  ${i+1}. ${c.content.substring(0, 45)}...`);
    console.log(`     Score: ${c.priorityScore} | Priority: ${c.priority} | Tags: ${c.tags.join(', ') || 'none'}${deps}${block}`);
    console.log('');
  });

  console.log('═'.repeat(50));
  console.log('\n📋 Algorithm Factors:');
  console.log('  • Priority weight: urgent=100, high=75, medium=50, low=25');
  console.log('  • Due date urgency: overdue=+50, today=+40, week=+20');
  console.log('  • Tag boosts: critical=+40, urgent=+50, bug=+25');
  console.log('  • Tag penalties: ideas=-10, low=-15');
  console.log('  • Dependency boost: +25 per blocking task');
  console.log('  • Dependency penalty: -20 per blocked dependency');
  console.log('  • Age boost: +1 per day for tasks >3 days old');
  console.log('');
}

testPrioritization().catch(console.error);
