/**
 * Agent Awareness - Core Dashboard Class
 * 
 * Self-awareness and state tracking for AI agents.
 * Track tasks, goals, skills, memories, and metrics in a Kanban-style dashboard.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default columns configuration
const DEFAULT_COLUMNS = {
  'sleeping': { emoji: '🌙', title: 'Sleeping', description: 'Backlog and low priority items' },
  'active': { emoji: '🚀', title: 'Active', description: 'Current focus and work' },
  'next': { emoji: '📋', title: 'Next', description: 'Upcoming tasks' },
  'ideas': { emoji: '💡', title: 'Ideas', description: 'Brainstorming and experiments' },
  'done': { emoji: '✅', title: 'Done', description: 'Completed items' }
};

const DEFAULT_DATA = {
  version: '1.0.0',
  columns: DEFAULT_COLUMNS,
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

class AgentAwareness {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '..', 'memory');
    this.dataFile = options.dataFile || path.join(this.dataDir, 'agent-dashboard.json');
    this.columns = DEFAULT_COLUMNS;
    this.cards = [];
    this.metrics = { ...DEFAULT_DATA.metrics };
    this.skills = [];
    this.memories = [];
    this.sessions = [];
    
    this.load();
  }

  /**
   * Load data from JSON file
   */
  load() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        this.columns = data.columns || DEFAULT_COLUMNS;
        this.cards = data.cards || [];
        this.metrics = { ...DEFAULT_DATA.metrics, ...data.metrics };
        this.skills = data.skills || [];
        this.memories = data.memories || [];
        this.sessions = data.sessions || [];
      } else {
        this.save();
      }
    } catch (error) {
      console.error('Error loading data:', error.message);
      this.save();
    }
  }

  /**
   * Save data to JSON file
   */
  save() {
    try {
      const data = {
        version: '1.0.0',
        columns: this.columns,
        cards: this.cards,
        metrics: this.metrics,
        skills: this.skills,
        memories: this.memories,
        sessions: this.sessions,
        updatedAt: new Date().toISOString()
      };
      
      // Ensure directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error.message);
    }
  }

  /**
   * Add a new card to a column
   */
  addCard(columnId, content, options = {}) {
    const card = {
      id: uuidv4(),
      columnId,
      content,
      description: options.description || '',
      tags: options.tags || [],
      priority: options.priority || 'medium', // low, medium, high, urgent
      dueDate: options.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      metadata: options.metadata || {}
    };

    this.cards.push(card);
    this.metrics.tasksCreated++;
    this.save();
    
    return card;
  }

  /**
   * Move a card to a different column
   */
  moveCard(cardId, targetColumnId) {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const sourceColumnId = card.columnId;
    card.columnId = targetColumnId;
    card.updatedAt = new Date().toISOString();

    // If moving to done, mark completion
    if (targetColumnId === 'done' && card.completedAt === null) {
      card.completedAt = new Date().toISOString();
      this.metrics.tasksCompleted++;
    } else if (sourceColumnId === 'done' && targetColumnId !== 'done') {
      // Moving out of done, decrement completed
      this.metrics.tasksCompleted--;
      card.completedAt = null;
    }

    this.save();
    return card;
  }

  /**
   * Edit a card
   */
  editCard(cardId, updates) {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    Object.assign(card, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return card;
  }

  /**
   * Delete a card
   */
  deleteCard(cardId) {
    const index = this.cards.findIndex(c => c.id === cardId);
    if (index === -1) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const card = this.cards[index];
    if (card.columnId === 'done') {
      this.metrics.tasksCompleted--;
    }

    this.cards.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * Get cards by column
   */
  getCardsByColumn(columnId) {
    return this.cards.filter(c => c.columnId === columnId);
  }

  /**
   * Get all cards
   */
  getAllCards() {
    return this.cards;
  }

  /**
   * Filter cards
   */
  filterCards(filters = {}) {
    let result = [...this.cards];

    if (filters.columnId) {
      result = result.filter(c => c.columnId === filters.columnId);
    }

    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(c => 
        filters.tags.some(tag => c.tags.includes(tag))
      );
    }

    if (filters.priority) {
      result = result.filter(c => c.priority === filters.priority);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(c =>
        c.content.toLowerCase().includes(search) ||
        c.description.toLowerCase().includes(search)
      );
    }

    return result;
  }

  /**
   * Search cards
   */
  searchCards(query) {
    return this.filterCards({ search: query });
  }

  /**
   * Add a skill
   */
  addSkill(skill) {
    const newSkill = {
      id: uuidv4(),
      ...skill,
      acquiredAt: new Date().toISOString()
    };

    this.skills.push(newSkill);
    this.metrics.skillsLearned++;
    this.save();
    return newSkill;
  }

  /**
   * Get all skills
   */
  getSkills() {
    return this.skills;
  }

  /**
   * Add a memory
   */
  addMemory(memory) {
    const newMemory = {
      id: uuidv4(),
      ...memory,
      storedAt: new Date().toISOString()
    };

    this.memories.push(newMemory);
    this.metrics.memoriesStored++;
    this.save();
    return newMemory;
  }

  /**
   * Get all memories
   */
  getMemories() {
    return this.memories;
  }

  /**
   * Record a correction/mistake
   */
  recordCorrection(correction) {
    const newCorrection = {
      id: uuidv4(),
      ...correction,
      recordedAt: new Date().toISOString()
    };

    this.corrections = this.corrections || [];
    this.corrections.push(newCorrection);
    this.metrics.correctionsMade++;
    this.save();
    return newCorrection;
  }

  /**
   * Start a new session
   */
  startSession() {
    const session = {
      id: uuidv4(),
      startTime: new Date().toISOString(),
      endTime: null,
      tasksCompleted: 0,
      notes: []
    };

    this.sessions.push(session);
    this.metrics.sessionCount++;
    this.metrics.lastActive = new Date().toISOString();
    this.save();
    return session;
  }

  /**
   * End current session
   */
  endSession(sessionId, summary = {}) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.endTime = new Date().toISOString();
    session.summary = summary;
    this.save();
    return session;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const completionRate = this.metrics.tasksCreated > 0
      ? Math.round((this.metrics.tasksCompleted / this.metrics.tasksCreated) * 100)
      : 0;

    return {
      ...this.metrics,
      completionRate,
      activeTasks: this.cards.filter(c => c.columnId !== 'done').length,
      totalCards: this.cards.length
    };
  }

  /**
   * Calculate column statistics
   */
  getColumnStats() {
    const stats = {};
    
    for (const [columnId, config] of Object.entries(this.columns)) {
      const cards = this.cards.filter(c => c.columnId === columnId);
      stats[columnId] = {
        ...config,
        count: cards.length,
        urgent: cards.filter(c => c.priority === 'urgent').length,
        high: cards.filter(c => c.priority === 'high').length
      };
    }

    return stats;
  }

  /**
   * Render ASCII dashboard
   */
  renderASCII() {
    const metrics = this.getMetrics();
    const columnStats = this.getColumnStats();

    let output = '\n';
    output += '═══════════════════════════════════════════════════════\n';
    output += '           🤖 AGENT AWARENESS DASHBOARD               \n';
    output += '═══════════════════════════════════════════════════════\n\n';

    output += `📊 Tasks: ${metrics.totalCards} | ✅ ${metrics.tasksCompleted} | 🎯 ${metrics.completionRate}%\n`;
    output += `🧠 Skills: ${this.skills.length} | 💾 Memories: ${this.memories.length} | 🔧 Fixes: ${this.metrics.correctionsMade}\n`;
    output += `📅 ${metrics.sessionCount} sessions | Last Active: ${metrics.lastActive || 'Never'}\n\n`;

    output += '═══════════════════════════════════════════════════════\n';

    for (const [columnId, stats] of Object.entries(columnStats)) {
      output += `\n${stats.emoji} ${stats.title.toUpperCase()} (${stats.count})\n`;
      output += `${'─'.repeat(50)}\n`;

      const cards = this.cards.filter(c => c.columnId === columnId);
      
      if (cards.length === 0) {
        output += '   (empty)\n';
      } else {
        for (const card of cards) {
          const priorityEmoji = {
            urgent: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
          }[card.priority] || '⚪';

          const tagsStr = card.tags.length > 0 
            ? ` [${card.tags.join(', ')}]` 
            : '';

          const line = `   ${priorityEmoji} ${card.content}${tagsStr}`;
          output += line + '\n';

          if (card.description) {
            const desc = card.description.substring(0, 40);
            output += `      └─ ${desc}${desc.length < card.description.length ? '...' : ''}\n`;
          }
        }
      }
    }

    output += '\n═══════════════════════════════════════════════════════\n';

    return output;
  }

  /**
   * Render JSON status (for programmatic use)
   */
  renderStatus() {
    const metrics = this.getMetrics();
    const columnStats = this.getColumnStats();

    return {
      metrics,
      columns: columnStats,
      activeTasks: this.cards.filter(c => c.columnId !== 'done').length,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Export to JSON
   */
  exportJSON() {
    return JSON.stringify({
      columns: this.columns,
      cards: this.cards,
      metrics: this.metrics,
      skills: this.skills,
      memories: this.memories,
      sessions: this.sessions
    }, null, 2);
  }

  /**
   * Import from JSON
   */
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.columns) this.columns = data.columns;
      if (data.cards) this.cards = data.cards;
      if (data.metrics) this.metrics = { ...this.metrics, ...data.metrics };
      if (data.skills) this.skills = data.skills;
      if (data.memories) this.memories = data.memories;
      if (data.sessions) this.sessions = data.sessions;
      
      this.save();
      return true;
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }

  /**
   * Reset all data
   */
  reset() {
    this.cards = [];
    this.metrics = { ...DEFAULT_DATA.metrics };
    this.skills = [];
    this.memories = [];
    this.sessions = [];
    this.save();
    return true;
  }
}

export default AgentAwareness;
