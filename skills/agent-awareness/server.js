/**
 * Agent Awareness API Server
 * 
 * REST API for the Agent Awareness Kanban dashboard.
 * 
 * Endpoints:
 *   GET    /api/cards          - List all cards
 *   POST   /api/cards          - Create a card
 *   GET    /api/cards/:id      - Get a card
 *   PUT    /api/cards/:id      - Update a card
 *   DELETE /api/cards/:id      - Delete a card
 *   PUT    /api/cards/:id/move - Move card to different column
 *   GET    /api/skills         - List all skills
 *   POST   /api/skills         - Add a skill
 *   GET    /api/memories       - List all memories
 *   POST   /api/memories       - Add a memory
 *   GET    /api/metrics        - Get metrics
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'memory', 'agent-dashboard.json');
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || 'localhost'; // Bind to all interfaces with '0.0.0.0'

const app = express();
app.use(cors());
app.use(express.json());

// Load data
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading data:', error.message);
  }
  return {
    columns: {
      sleeping: { emoji: '🌙', title: 'Sleeping', description: 'Backlog and low priority items' },
      active: { emoji: '🚀', title: 'Active', description: 'Current focus and work' },
      next: { emoji: '📋', title: 'Next', description: 'Upcoming tasks' },
      ideas: { emoji: '💡', title: 'Ideas', description: 'Brainstorming and experiments' },
      done: { emoji: '✅', title: 'Done', description: 'Completed items' }
    },
    cards: [],
    metrics: {
      tasksCreated: 0,
      tasksCompleted: 0,
      skillsLearned: 0,
      memoriesStored: 0,
      correctionsMade: 0,
      sessionCount: 0,
      lastActive: null
    },
    skills: [],
    memories: [],
    sessions: []
  };
}

function saveData(data) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

// Cards API

// GET all cards
app.get('/api/cards', (req, res) => {
  res.json(data.cards);
});

// POST create card
app.post('/api/cards', (req, res) => {
  const { columnId, content, description, tags, priority, dependencies } = req.body;
  
  const card = {
    id: uuidv4(),
    columnId: columnId || 'active',
    content: content || 'Untitled',
    description: description || '',
    tags: tags || [],
    priority: priority || 'medium',
    dependencies: dependencies || [],  // Array of card IDs this task depends on
    blockedBy: [],  // Array of card IDs that depend on this task
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };
  
  data.cards.push(card);
  data.metrics.tasksCreated++;
  data.metrics.lastActive = new Date().toISOString();
  saveData(data);
  
  res.status(201).json(card);
});

// GET single card
app.get('/api/cards/:id', (req, res) => {
  const card = data.cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json(card);
});

// PUT update card
app.put('/api/cards/:id', (req, res) => {
  const card = data.cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  
  const { content, description, tags, priority, dependencies } = req.body;
  
  if (content !== undefined) card.content = content;
  if (description !== undefined) card.description = description;
  if (tags !== undefined) card.tags = tags;
  if (priority !== undefined) card.priority = priority;
  if (dependencies !== undefined) card.dependencies = dependencies;
  
  card.updatedAt = new Date().toISOString();
  saveData(data);
  
  res.json(card);
});

// PUT move card
app.put('/api/cards/:id/move', (req, res) => {
  const card = data.cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  
  const { columnId } = req.body;
  
  if (!data.columns[columnId]) {
    return res.status(400).json({ error: 'Invalid column' });
  }
  
  const previousColumn = card.columnId;
  card.columnId = columnId;
  card.updatedAt = new Date().toISOString();
  
  // Track completion
  if (columnId === 'done' && card.completedAt === null) {
    card.completedAt = new Date().toISOString();
    data.metrics.tasksCompleted++;
  } else if (previousColumn === 'done' && columnId !== 'done') {
    data.metrics.tasksCompleted--;
    card.completedAt = null;
  }
  
  data.metrics.lastActive = new Date().toISOString();
  saveData(data);
  
  res.json(card);
});

// DELETE card
app.delete('/api/cards/:id', (req, res) => {
  const index = data.cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }
  
  const card = data.cards[index];
  if (card.columnId === 'done') {
    data.metrics.tasksCompleted--;
  }
  
  data.cards.splice(index, 1);
  data.metrics.lastActive = new Date().toISOString();
  saveData(data);
  
  res.json({ success: true });
});

// Skills API

app.get('/api/skills', (req, res) => {
  res.json(data.skills);
});

app.post('/api/skills', (req, res) => {
  const { name, description } = req.body;
  
  const skill = {
    id: uuidv4(),
    name: name || 'Untitled',
    description: description || '',
    acquiredAt: new Date().toISOString()
  };
  
  data.skills.push(skill);
  data.metrics.skillsLearned++;
  data.metrics.lastActive = new Date().toISOString();
  saveData(data);
  
  res.status(201).json(skill);
});

// Memories API

app.get('/api/memories', (req, res) => {
  res.json(data.memories);
});

app.post('/api/memories', (req, res) => {
  const { content, type } = req.body;
  
  const memory = {
    id: uuidv4(),
    content: content || '',
    type: type || 'general',
    storedAt: new Date().toISOString()
  };
  
  data.memories.push(memory);
  data.metrics.memoriesStored++;
  data.metrics.lastActive = new Date().toISOString();
  saveData(data);
  
  res.status(201).json(memory);
});

// Metrics API

app.get('/api/metrics', (req, res) => {
  const completionRate = data.metrics.tasksCreated > 0
    ? Math.round((data.metrics.tasksCompleted / data.metrics.tasksCreated) * 100)
    : 0;
  
  res.json({
    ...data.metrics,
    completionRate,
    totalCards: data.cards.length,
    activeTasks: data.cards.filter(c => c.columnId !== 'done').length
  });
});

// Priority scoring algorithm
// Factors: priority, dueDate, tags, age, dependencies

function calculatePriorityScore(card, allCards = []) {
  let score = 0;

  // Priority weight (0-100 scale)
  const priorityScores = { urgent: 100, high: 75, medium: 50, low: 25 };
  score += priorityScores[card.priority] || 50;

  // Due date urgency
  if (card.dueDate) {
    const now = new Date();
    const due = new Date(card.dueDate);
    const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDue < 0) {
      // Overdue - significant boost
      score += 50;
    } else if (daysUntilDue < 1) {
      // Due today - big boost
      score += 40;
    } else if (daysUntilDue < 3) {
      // Due this week - moderate boost
      score += 20;
    } else if (daysUntilDue < 7) {
      // Due next week - small boost
      score += 10;
    }
  }

  // Tag-based boosts
  const tagBoosts = {
    'urgent': 50,
    'important': 30,
    'blocking': 25,
    'high': 20,
    'critical': 40,
    'security': 35,
    'bug': 25,
    'fix': 15,
    'automation': 10,
    'monitoring': 10
  };

  for (const tag of card.tags || []) {
    score += tagBoosts[tag.toLowerCase()] || 0;
  }

  // Negative tags (downgrade)
  const tagPenalties = {
    'low': -15,
    'ideas': -10,
    'learning': -5,
    'experimental': -10
  };

  for (const tag of card.tags || []) {
    score += tagPenalties[tag.toLowerCase()] || 0;
  }

  // Age factor - older tasks get slight boost (prevent starvation)
  const createdAt = new Date(card.createdAt);
  const now = new Date();
  const ageHours = (now - createdAt) / (1000 * 60 * 60);
  
  if (ageHours > 72) {
    // Older than 3 days - small boost
    score += Math.min(15, Math.floor(ageHours / 24));
  }

  // Dependency scoring
  // Check if this task is blocking other tasks (get boost)
  if (card.blockedBy && card.blockedBy.length > 0) {
    // Find which blocked tasks are still incomplete
    const blockingCards = allCards.filter(c => 
      card.blockedBy.includes(c.id) && 
      c.columnId !== 'done'
    );
    if (blockingCards.length > 0) {
      score += blockingCards.length * 25; // +25 per blocking task
    }
  }

  // Check if this task is blocked by other incomplete tasks (penalty)
  if (card.dependencies && card.dependencies.length > 0) {
    const blockedByCards = allCards.filter(c => 
      card.dependencies.includes(c.id) && 
      c.columnId !== 'done'
    );
    if (blockedByCards.length > 0) {
      score -= blockedByCards.length * 20; // -20 per blocking dependency
    }
  }

  // Completion penalty - don't prioritize already completed tasks
  if (card.completedAt) {
    score = -1;
  }

  return score;
}

// Prioritization API

app.get('/api/prioritize', (req, res) => {
  const { columnId, limit } = req.query;
  
  let cards = data.cards.filter(c => c.columnId !== 'done');
  
  if (columnId) {
    cards = cards.filter(c => c.columnId === columnId);
  }
  
  // Calculate scores
  const scoredCards = cards.map(card => ({
    ...card,
    priorityScore: calculatePriorityScore(card, data.cards)
  }));
  
  // Sort by score descending
  scoredCards.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Limit results
  if (limit) {
    scoredCards.splice(parseInt(limit));
  }
  
  res.json(scoredCards);
});

app.get('/api/priority/suggestions', (req, res) => {
  // Get suggestions for what to work on next
  const nextColumnCards = data.cards
    .filter(c => c.columnId === 'next')
    .map(card => ({ ...card, priorityScore: calculatePriorityScore(card, data.cards) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
  
  const sleepingCards = data.cards
    .filter(c => c.columnId === 'sleeping')
    .map(card => ({ ...card, priorityScore: calculatePriorityScore(card, data.cards) }))
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);
  
  res.json({
    nextColumn: nextColumnCards,
    recommendedFromSleeping: sleepingCards
  });
});

// Columns API

app.get('/api/columns', (req, res) => {
  const columnsWithCount = {};
  for (const [id, config] of Object.entries(data.columns)) {
    columnsWithCount[id] = {
      ...config,
      count: data.cards.filter(c => c.columnId === id).length
    };
  }
  res.json(columnsWithCount);
});

// Reset data
app.post('/api/reset', (req, res) => {
  data = {
    columns: {
      sleeping: { emoji: '🌙', title: 'Sleeping', description: 'Backlog' },
      active: { emoji: '🚀', title: 'Active', description: 'Current work' },
      next: { emoji: '📋', title: 'Next', description: 'Upcoming' },
      ideas: { emoji: '💡', title: 'Ideas', description: 'Brainstorming' },
      done: { emoji: '✅', title: 'Done', description: 'Completed' }
    },
    cards: [],
    metrics: {
      tasksCreated: 0,
      tasksCompleted: 0,
      skillsLearned: 0,
      memoriesStored: 0,
      correctionsMade: 0,
      sessionCount: 0,
      lastActive: null
    },
    skills: [],
    memories: [],
    sessions: []
  };
  saveData(data);
  res.json({ success: true });
});

// Serve static files from current directory and parent
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '..')));

// Serve HTML with correct content-type
app.get('/dashboard.html', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`🤖 Agent Awareness API running on ${HOST}:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
  if (localIP && HOST === '0.0.0.0') {
    console.log(`   Network access: http://${localIP}:${PORT}/dashboard.html`);
  }
});

// Helper to get local IP address
function getLocalIP() {
  const nets = import('os').then(os => os.networkInterfaces());
  // Fallback: use a simple synchronous approach
  try {
    const { networkInterfaces } = require('os');
    for (const name of Object.keys(networkInterfaces())) {
      for (const net of networkInterfaces()[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (e) {}
  return null;
}
