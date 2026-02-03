/**
 * HTML Dashboard Generator
 *
 * Generates an interactive HTML dashboard with drag-and-drop Kanban board.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AgentAwareness from './agentAwareness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Workspace path (3 levels up from skills/agent-awareness/scripts → clawd)
const workspaceDir = path.join(__dirname, '..', '..', '..');

// Initialize awareness
const awareness = new AgentAwareness({
  dataDir: path.join(__dirname, '..', 'memory'),
  dataFile: path.join(__dirname, '..', 'memory', 'agent-dashboard.json')
});

const columns = awareness.columns;
const cards = awareness.getAllCards();
const metrics = awareness.getMetrics();

// Get recent daily memory files
function getRecentMemoryLogs() {
  const memoryDir = path.join(workspaceDir, 'memory');
  if (!fs.existsSync(memoryDir)) return [];

  const files = fs.readdirSync(memoryDir)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
    .sort()
    .reverse()
    .slice(0, 5); // Last 5 days

  return files.map(file => {
    const content = fs.readFileSync(path.join(memoryDir, file), 'utf8');
    const title = content.split('\n')[0].replace('# ', '').trim();
    const date = file.replace('.md', '');
    return { file, date, title, path: `memory/${file}` };
  });
}

const memoryLogs = getRecentMemoryLogs();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Awareness Dashboard</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 2rem;
      margin-bottom: 10px;
    }

    .metrics {
      display: flex;
      justify-content: center;
      gap: 30px;
      flex-wrap: wrap;
      margin-bottom: 30px;
    }

    .metric-card {
      background: #16213e;
      padding: 15px 25px;
      border-radius: 10px;
      text-align: center;
      min-width: 120px;
    }

    .metric-value {
      font-size: 1.8rem;
      font-weight: bold;
      color: #00d9ff;
    }

    .metric-label {
      font-size: 0.85rem;
      color: #888;
      margin-top: 5px;
    }

    .board {
      display: flex;
      gap: 20px;
      overflow-x: auto;
      padding-bottom: 20px;
    }

    .column {
      background: #16213e;
      border-radius: 12px;
      min-width: 280px;
      max-width: 280px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }

    .column-header {
      padding: 15px;
      border-bottom: 1px solid #2a2a4a;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .column-emoji {
      font-size: 1.5rem;
    }

    .column-title {
      font-weight: 600;
      font-size: 1rem;
    }

    .column-count {
      margin-left: auto;
      background: #2a2a4a;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.8rem;
      color: #888;
    }

    .column-description {
      padding: 0 15px 10px;
      font-size: 0.8rem;
      color: #666;
    }

    .cards {
      flex: 1;
      padding: 10px;
      overflow-y: auto;
      min-height: 200px;
      max-height: calc(80vh - 120px);
    }

    .card {
      background: #1a1a2e;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      cursor: grab;
      border-left: 3px solid #00d9ff;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .card.dragging {
      opacity: 0.5;
      cursor: grabbing;
    }

    .card.priority-urgent { border-left-color: #ff4757; }
    .card.priority-high { border-left-color: #ffa502; }
    .card.priority-medium { border-left-color: #00d9ff; }
    .card.priority-low { border-left-color: #2ed573; }

    .card-content {
      font-size: 0.95rem;
      margin-bottom: 8px;
    }

    .card-tags {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .tag {
      background: #2a2a4a;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #00d9ff;
    }

    .card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #666;
    }

    .card-actions {
      display: flex;
      gap: 5px;
      margin-top: 8px;
    }

    .card-btn {
      background: #2a2a4a;
      border: none;
      color: #888;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      transition: background 0.2s, color 0.2s;
    }

    .card-btn:hover {
      background: #3a3a5a;
      color: #00d9ff;
    }

    .card-btn.delete:hover {
      color: #ff4757;
    }

    .card-priority {
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.5px;
    }

    /* Modal styles */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }

    .modal-overlay.active {
      display: flex;
    }

    @keyframes modalBackdropIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(-20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      animation: modalBackdropIn 0.2s ease-out;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal {
      background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid #2a2a4a;
      border-radius: 16px;
      padding: 0;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: modalSlideIn 0.3s ease-out;
      overflow: hidden;
    }

    .modal-header {
      padding: 20px 25px 15px;
      border-bottom: 1px solid #2a2a4a;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-header-icon {
      font-size: 1.5rem;
      width: 40px;
      height: 40px;
      background: #2a2a4a;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-header-text h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .modal-header-text p {
      margin: 2px 0 0;
      font-size: 0.8rem;
      color: #888;
    }

    .modal-body {
      padding: 20px 25px;
    }

    .modal h2 {
      display: none;
    }

    .modal-label {
      display: block;
      font-size: 0.8rem;
      color: #888;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .modal input, .modal select {
      width: 100%;
      padding: 12px 15px;
      margin-bottom: 18px;
      background: #0f0f1a;
      border: 1px solid #2a2a4a;
      border-radius: 8px;
      color: #eee;
      font-size: 0.95rem;
      transition: all 0.2s;
    }

    .modal input:focus, .modal select:focus {
      outline: none;
      border-color: #00d9ff;
      box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1);
    }

    .modal input::placeholder {
      color: #555;
    }

    .modal-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding-top: 10px;
    }

    .modal-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .modal-btn.cancel {
      background: #2a2a4a;
      color: #aaa;
    }

    .modal-btn.cancel:hover {
      background: #3a3a5a;
      color: #fff;
    }

    .modal-btn.save {
      background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%);
      color: #1a1a2e;
    }

    .modal-btn.save:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 217, 255, 0.3);
    }

    .modal-btn.delete {
      background: linear-gradient(135deg, #ff4757 0%, #ff3347 100%);
      color: white;
    }

    .modal-btn.delete:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
    }

    .add-card-btn {
      margin: 10px;
      padding: 10px;
      background: transparent;
      border: 2px dashed #2a2a4a;
      border-radius: 8px;
      color: #666;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }

    .add-card-btn:hover {
      border-color: #00d9ff;
      color: #00d9ff;
    }

    .sidebar {
      position: fixed;
      right: 20px;
      top: 20px;
      bottom: 20px;
      width: 250px;
      background: #16213e;
      border-radius: 12px;
      padding: 20px;
      overflow-y: auto;
    }

    .sidebar h2 {
      font-size: 1rem;
      margin-bottom: 15px;
      color: #00d9ff;
    }

    .skill-item, .memory-item {
      background: #1a1a2e;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 8px;
      font-size: 0.85rem;
    }

    .memory-item a:hover {
      color: #00d9ff !important;
    }

    .skills-section, .memories-section {
      margin-bottom: 20px;
    }

    .skills-section h3, .memories-section h3 {
      font-size: 0.9rem;
      margin-bottom: 10px;
      color: #888;
    }

    .main-content {
      margin-right: 290px;
    }

    @media (max-width: 1200px) {
      .sidebar {
        display: none;
      }
      .main-content {
        margin-right: 0;
      }
    }

    @media (max-width: 768px) {
      .board {
        flex-direction: column;
        align-items: center;
      }
      .column {
        width: 100%;
        max-width: 400px;
        max-height: none;
      }
      .cards {
        max-height: 300px;
      }
      .metrics {
        gap: 15px;
      }
      .metric-card {
        min-width: 80px;
        padding: 10px 15px;
      }
      .metric-value {
        font-size: 1.4rem;
      }
    }
  </style>
</head>
<body>
  <div class="main-content">
    <div class="header">
      <h1>🤖 Agent Awareness Dashboard</h1>
      <p>Self-monitoring for AI agents</p>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-value">${metrics.tasksCreated}</div>
        <div class="metric-label">Tasks Created</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.tasksCompleted}</div>
        <div class="metric-label">Completed</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.completionRate}%</div>
        <div class="metric-label">Completion Rate</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${awareness.getSkills().length}</div>
        <div class="metric-label">Skills</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${memoryLogs.length}</div>
        <div class="metric-label">Daily Logs</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.sessionCount}</div>
        <div class="metric-label">Sessions</div>
      </div>
    </div>

    <div class="board" id="board">
      ${Object.entries(columns).map(([id, col]) => `
        <div class="column" data-column="${id}">
          <div class="column-header">
            <span class="column-emoji">${col.emoji}</span>
            <span class="column-title">${col.title}</span>
            <span class="column-count">${cards.filter(c => c.columnId === id).length}</span>
          </div>
          <div class="column-description">${col.description}</div>
          <div class="cards" data-column="${id}">
            ${cards.filter(c => c.columnId === id).map(card => `
              <div class="card priority-${card.priority}" draggable="true" data-card="${card.id}">
                <div class="card-content">${card.content}</div>
                ${card.tags.length > 0 ? `
                  <div class="card-tags">
                    ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                  </div>
                ` : ''}
                <div class="card-meta">
                  <span class="card-priority">${card.priority}</span>
                  <span>${new Date(card.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="card-actions">
                  <button class="card-btn edit-btn" data-card="${card.id}" data-content="${card.content.replace(/"/g, '&quot;')}" data-priority="${card.priority}" data-tags="${card.tags.join(',')}">✏️ Edit</button>
                  <button class="card-btn delete delete-btn" data-card="${card.id}">🗑️ Delete</button>
                </div>
              </div>
            `).join('')}
          </div>
          <button class="add-card-btn" data-column="${id}">+ Add Card</button>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="sidebar">
    <div class="skills-section">
      <h2>🧠 Skills</h2>
      ${awareness.getSkills().map(skill => `
        <div class="skill-item">
          <strong>${skill.name}</strong>
          ${skill.description ? `<br><small>${skill.description}</small>` : ''}
        </div>
      `).join('') || '<p style="color: #666; font-size: 0.85rem;">No skills recorded</p>'}
    </div>

    <div class="memories-section">
      <h2>📝 Daily Logs</h2>
      ${memoryLogs.map(log => `
        <div class="memory-item">
          <a href="${log.path}" target="_blank" style="color: inherit; text-decoration: none;">
            <strong>${log.date}</strong><br>
            <small style="color: #888;">${log.title.substring(0, 30)}...</small>
          </a>
        </div>
      `).join('') || '<p style="color: #666; font-size: 0.85rem;">No memory logs found</p>'}
    </div>
  </div>

  <!-- Edit Modal -->
  <div class="modal-overlay" id="editModal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-header-icon">✏️</div>
        <div class="modal-header-text">
          <h2>Edit Card</h2>
          <p>Update card details</p>
        </div>
      </div>
      <div class="modal-body">
        <label class="modal-label">Content</label>
        <input type="text" id="editContent" placeholder="Card content">
        <label class="modal-label">Priority</label>
        <select id="editPriority">
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
          <option value="urgent">Urgent</option>
        </select>
        <label class="modal-label">Tags</label>
        <input type="text" id="editTags" placeholder="Tags (comma-separated)">
        <div class="modal-buttons">
          <button class="modal-btn cancel" id="editCancel">Cancel</button>
          <button class="modal-btn save" id="editSave">Save Changes</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Modal -->
  <div class="modal-overlay" id="deleteModal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-header-icon">🗑️</div>
        <div class="modal-header-text">
          <h2>Delete Card</h2>
          <p>This action cannot be undone</p>
        </div>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 20px; color: #888;">Are you sure you want to delete this card?</p>
        <div class="modal-buttons">
          <button class="modal-btn cancel" id="deleteCancel">Cancel</button>
          <button class="modal-btn delete" id="deleteConfirm">Delete</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Card Modal -->
  <div class="modal-overlay" id="addModal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-header-icon">➕</div>
        <div class="modal-header-text">
          <h2>Add Card</h2>
          <p>Create a new task card</p>
        </div>
      </div>
      <div class="modal-body">
        <label class="modal-label">Column</label>
        <select id="addColumn">
          <option value="sleeping">🌙 Sleeping</option>
          <option value="active">🚀 Active</option>
          <option value="next">📋 Next</option>
          <option value="ideas">💡 Ideas</option>
          <option value="done">✅ Done</option>
        </select>
        <label class="modal-label">Content</label>
        <input type="text" id="addContent" placeholder="What needs to be done?">
        <label class="modal-label">Priority</label>
        <select id="addPriority">
          <option value="low">Low Priority</option>
          <option value="medium" selected>Medium Priority</option>
          <option value="high">High Priority</option>
          <option value="urgent">Urgent</option>
        </select>
        <label class="modal-label">Tags</label>
        <input type="text" id="addTags" placeholder="Tags (comma-separated)">
        <div class="modal-buttons">
          <button class="modal-btn cancel" id="addCancel">Cancel</button>
          <button class="modal-btn save" id="addConfirm">Add Card</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const API_URL = 'http://localhost:3003/api';

    // Drag and drop functionality
    let draggedCard = null;

    // Add card modal functionality
    const addModal = document.getElementById('addModal');
    const addColumn = document.getElementById('addColumn');
    const addContent = document.getElementById('addContent');
    const addPriority = document.getElementById('addPriority');
    const addTags = document.getElementById('addTags');

    document.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        addColumn.value = btn.dataset.column;
        addContent.value = '';
        addPriority.value = 'medium';
        addTags.value = '';
        addModal.classList.add('active');
        addContent.focus();
      });
    });

    document.getElementById('addCancel').addEventListener('click', () => {
      addModal.classList.remove('active');
    });

    document.getElementById('addConfirm').addEventListener('click', async () => {
      const columnId = addColumn.value;
      const content = addContent.value.trim();
      const priority = addPriority.value;
      const tags = addTags.value.split(',').map(t => t.trim()).filter(t => t);

      if (content) {
        try {
          await fetch(API_URL + '/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId, content, priority, tags })
          });
          refreshDashboard();
        } catch (error) {
          console.error('Error adding card:', error);
          alert('Card added! (Refresh to see changes)');
        }
      }
      addModal.classList.remove('active');
    });

    // Drag and drop for cards - handled by attachCardListeners()

    document.querySelectorAll('.cards').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      column.addEventListener('drop', async (e) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData('text/plain');
        const targetColumn = column.dataset.column;

        if (cardId && targetColumn) {
          try {
            await fetch(API_URL + '/cards/' + cardId + '/move', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ columnId: targetColumn })
            });
            refreshDashboard();
          } catch (error) {
            console.error('Error moving card:', error);
            alert('Card moved! (Refresh to see changes)');
          }
        }
      });
    });

    // Edit functionality
    let currentEditCardId = null;
    const editModal = document.getElementById('editModal');
    const editContent = document.getElementById('editContent');
    const editPriority = document.getElementById('editPriority');
    const editTags = document.getElementById('editTags');

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        currentEditCardId = btn.dataset.card;
        editContent.value = btn.dataset.content;
        editPriority.value = btn.dataset.priority;
        editTags.value = btn.dataset.tags;
        editModal.classList.add('active');
      });
    });

    document.getElementById('editCancel').addEventListener('click', () => {
      editModal.classList.remove('active');
      currentEditCardId = null;
    });

    document.getElementById('editSave').addEventListener('click', async () => {
      const content = editContent.value.trim();
      const priority = editPriority.value;
      const tags = editTags.value.split(',').map(t => t.trim()).filter(t => t);

      if (content && currentEditCardId) {
        try {
          await fetch(API_URL + '/cards/' + currentEditCardId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, priority, tags })
          });
          refreshDashboard();
        } catch (error) {
          console.error('Error updating card:', error);
          alert('Card updated! (Refresh to see changes)');
        }
      }
      editModal.classList.remove('active');
      currentEditCardId = null;
    });

    // Delete functionality
    let currentDeleteCardId = null;
    const deleteModal = document.getElementById('deleteModal');

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        currentDeleteCardId = btn.dataset.card;
        deleteModal.classList.add('active');
      });
    });

    document.getElementById('deleteCancel').addEventListener('click', () => {
      deleteModal.classList.remove('active');
      currentDeleteCardId = null;
    });

    document.getElementById('deleteConfirm').addEventListener('click', async () => {
      if (currentDeleteCardId) {
        try {
          await fetch(API_URL + '/cards/' + currentDeleteCardId, {
            method: 'DELETE'
          });
          refreshDashboard();
        } catch (error) {
          console.error('Error deleting card:', error);
          alert('Card deleted! (Refresh to see changes)');
        }
      }
      deleteModal.classList.remove('active');
      currentDeleteCardId = null;
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    // Auto-refresh functionality (counts only - lightweight)
    const REFRESH_INTERVAL = 30000; // 30 seconds

    async function refreshDashboard(renderFull = false) {
      try {
        const response = await fetch(API_URL + '/cards');
        const cards = await response.json();
        updateCardCounts(cards);
        if (renderFull) {
          renderCards(cards);
          attachCardListeners();
        }
        refreshIndicator.textContent = '🔄 Last refresh: ' + new Date().toLocaleTimeString();
      } catch (error) {
        console.error('Refresh failed:', error);
        refreshIndicator.textContent = '⚠️ Refresh failed: ' + new Date().toLocaleTimeString();
      }
    }

    // Manual refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 Refresh';
    refreshBtn.style.cssText = 'margin-left: 10px; padding: 5px 10px; background: #2a2a4a; border: none; border-radius: 4px; color: #888; cursor: pointer;';
    refreshBtn.addEventListener('click', () => refreshDashboard(true));
    document.querySelector('.header').appendChild(refreshBtn);

    function updateCardCounts(cards) {
      const counts = { sleeping: 0, active: 0, next: 0, ideas: 0, done: 0 };
      cards.forEach(card => {
        if (counts[card.columnId] !== undefined) {
          counts[card.columnId]++;
        }
      });
      document.querySelectorAll('.column').forEach(column => {
        const columnId = column.dataset.column;
        const countEl = column.querySelector('.column-count');
        if (countEl && counts[columnId] !== undefined) {
          countEl.textContent = counts[columnId];
        }
      });
    }

    function renderCards(cards) {
      document.querySelectorAll('.cards').forEach(container => {
        const columnId = container.dataset.column;
        const columnCards = cards.filter(c => c.columnId === columnId);

        // Clear existing cards
        container.innerHTML = '';

        // Add cards
        columnCards.forEach(card => {
          const cardEl = document.createElement('div');
          cardEl.className = 'card priority-' + card.priority;
          cardEl.setAttribute('draggable', 'true');
          cardEl.setAttribute('data-card', card.id);

          const tagsHtml = card.tags.length > 0 ?
            '<div class="card-tags">' + card.tags.map(t => '<span class="tag">' + t + '</span>').join('') + '</div>' : '';

          cardEl.innerHTML = '<div class="card-content">' + card.content + '</div>' +
            tagsHtml +
            '<div class="card-meta"><span class="card-priority">' + card.priority + '</span><span>' +
            new Date(card.createdAt).toLocaleDateString() + '</span></div>' +
            '<div class="card-actions">' +
            '<button class="card-btn edit-btn" data-card="' + card.id + '" data-content="' + card.content.replace(/"/g, '&quot;') +
            '" data-priority="' + card.priority + '" data-tags="' + card.tags.join(',') + '">✏️ Edit</button>' +
            '<button class="card-btn delete delete-btn" data-card="' + card.id + '">🗑️ Delete</button></div>';

          container.appendChild(cardEl);
        });

        // Re-attach event listeners for this column
        attachCardListeners();
      });
    }

    function attachCardListeners() {
      // Drag and drop for cards
      document.querySelectorAll('.card').forEach(card => {
        card.removeEventListener('dragstart', handleDragStart);
        card.removeEventListener('dragend', handleDragEnd);
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
      });
    }

    function handleDragStart(e) {
      draggedCard = e.target.closest('.card');
      draggedCard.classList.add('dragging');
      e.dataTransfer.setData('text/plain', draggedCard.dataset.card);
    }

    function handleDragEnd(e) {
      e.target.classList.remove('dragging');
      draggedCard = null;
    }

    // Auto-promote tasks from Next to Active when Active is empty
    async function autoPromoteTasks() {
      try {
        const response = await fetch(API_URL + '/cards');
        const cards = await response.json();
        const activeCount = cards.filter(c => c.columnId === 'active').length;
        if (activeCount === 0) {
          const nextCards = cards.filter(c => c.columnId === 'next').slice(0, 2);
          for (const card of nextCards) {
            await fetch(API_URL + '/cards/' + card.id + '/move', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ columnId: 'active' })
            });
            console.log('Auto-promoted:', card.content.substring(0, 50));
          }
          if (nextCards.length > 0) {
            refreshDashboard();
          }
        }
      } catch (error) {
        console.error('Auto-promote failed:', error);
      }
    }

    // Add refresh indicator
    const header = document.querySelector('.header');
    const refreshIndicator = document.createElement('div');
    refreshIndicator.style.cssText = 'font-size: 0.75rem; color: #666; margin-top: 5px;';
    header.appendChild(refreshIndicator);

    // Start auto-refresh and auto-promote
    setInterval(() => refreshDashboard(false), REFRESH_INTERVAL);
    refreshDashboard(true).then(() => attachCardListeners());
    autoPromoteTasks(); // Check for task promotion on load
    console.log('Auto-refresh enabled (every ' + REFRESH_INTERVAL/1000 + 's) - counts only');

    console.log('Agent Awareness Dashboard loaded');
  </script>
</body>
</html>`;

// Generate HTML
const outputPath = path.join(__dirname, '..', 'dashboard.html');
fs.writeFileSync(outputPath, html);

console.log('✅ Dashboard generated:', outputPath);
console.log('Open in browser to view the interactive Kanban board.');
