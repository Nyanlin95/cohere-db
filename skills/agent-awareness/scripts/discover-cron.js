#!/usr/bin/env node
/**
 * Skill Auto-Discovery Cron Job
 * Run this script to auto-discover skills and optionally register them
 * 
 * Usage: node scripts/discover-cron.js [--register] [--json]
 * 
 * Schedule with cron for automatic discovery:
 * - Every hour: 0 * * * *
 * - Every day at midnight: 0 0 * * *
 * - Every week: 0 0 * * 0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const SKILLS_DIR = WORKSPACE_DIR;
const STATE_FILE = path.join(__dirname, '..', 'memory', 'skill-discovery.json');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Parse YAML frontmatter from file content
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  try {
    const yaml = match[1];
    const result = {};
    let currentObj = result;
    const stack = [{ obj: result, indent: -1 }];
    
    yaml.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const indent = line.search(/\S/);
      
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }
      
      const parent = stack[stack.length - 1].obj;
      
      if (trimmed.startsWith('- ')) {
        const value = trimmed.substring(2).trim();
        if (Array.isArray(parent)) {
          parent.push(value);
        } else {
          const keyMatch = line.trim().match(/^-\s*(\w+):\s*(.*)$/);
          if (keyMatch) {
            const [, key, val] = keyMatch;
            if (val) {
              parent[key] = val.replace(/^["']|["']$/g, '');
            } else {
              parent[key] = [];
              stack.push({ obj: parent[key], indent });
            }
          } else if (value) {
            if (!parent['tags']) parent['tags'] = [];
            parent['tags'].push(value);
          }
        }
      } else {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) return;
        
        const key = trimmed.substring(0, colonIdx).trim();
        const value = trimmed.substring(colonIdx + 1).trim();
        
        if (value === '') {
          parent[key] = {};
          stack.push({ obj: parent[key], indent });
        } else if (value.startsWith('[') && value.endsWith(']')) {
          parent[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(s => s);
        } else {
          parent[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return result;
  } catch (e) {
    return null;
  }
}

/**
 * Extract description from SKILL.md content
 */
function extractDescription(content) {
  const afterFrontmatter = content.replace(/^---\n[\s\S]*?\n---/, '').trim();
  const firstPara = afterFrontmatter.split('\n\n')[0];
  return firstPara.replace(/^#\s*/, '').trim();
}

/**
 * Discover all skills in the skills/ directory
 */
function discoverSkills() {
  const skills = [];
  
  if (!fs.existsSync(SKILLS_DIR)) {
    return skills;
  }
  
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const skillPath = path.join(SKILLS_DIR, entry.name);
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    
    if (!fs.existsSync(skillMdPath)) continue;
    
    try {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      
      if (!frontmatter) continue;
      
      const skill = {
        name: frontmatter.name || entry.name,
        path: entry.name,
        description: frontmatter.description || extractDescription(content),
        emoji: frontmatter.metadata?.openclaw?.emoji || '📦',
        tags: frontmatter.metadata?.openclaw?.tags || [],
        requires: frontmatter.metadata?.openclaw?.requires || {},
        discoveredAt: new Date().toISOString(),
      };
      
      skills.push(skill);
    } catch (e) {
      // Skip invalid skills
    }
  }
  
  return skills;
}

/**
 * Load previous discovery state
 */
function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { lastDiscovery: null, skills: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch (e) {
    return { lastDiscovery: null, skills: {} };
  }
}

/**
 * Save discovery state
 */
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Find new skills since last discovery
 */
function findNewSkills(currentSkills, previousState) {
  const previousSkills = Object.keys(previousState.skills);
  const newSkills = currentSkills.filter(s => !previousSkills.includes(s.name));
  return newSkills;
}

/**
 * Notify via dashboard API if available
 */
async function notifyNewSkills(newSkills) {
  const notifyUrl = process.env.NOTIFICATION_URL || 'http://localhost:3003/api/notify';
  
  if (!newSkills.length) return;
  
  try {
    const message = `🔍 ${newSkills.length} new skill(s) discovered: ${newSkills.map(s => s.name).join(', ')}`;
    
    await fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'skill-discovery', message, skills: newSkills })
    }).catch(() => {}); // Silently fail if notification endpoint not available
  } catch (e) {
    // Ignore notification errors
  }
}

// Main execution
const args = process.argv.slice(2);
const register = args.includes('--register');
const json = args.includes('--json');
const quiet = args.includes('--quiet');

async function main() {
  const timestamp = new Date().toISOString();
  console.log(`${colors.cyan}[${timestamp}]${colors.reset} Skill Discovery Cron`);
  
  // Discover current skills
  const currentSkills = discoverSkills();
  
  // Load previous state
  const previousState = loadState();
  
  // Find new skills
  const newSkills = findNewSkills(currentSkills, previousState);
  
  // Update state
  const newState = {
    lastDiscovery: timestamp,
    skills: Object.fromEntries(currentSkills.map(s => [s.name, s]))
  };
  saveState(newState);
  
  // Output results
  if (json) {
    console.log(JSON.stringify({
      timestamp,
      totalSkills: currentSkills.length,
      newSkills: newSkills.map(s => s.name),
      allSkills: currentSkills.map(s => s.name)
    }, null, 2));
    return;
  }
  
  console.log(`\n${colors.green}✓${colors.reset} Discovered ${currentSkills.length} skills`);
  
  if (newSkills.length > 0) {
    console.log(`\n${colors.yellow}🆕${colors.reset} ${newSkills.length} NEW SKILLS:`);
    for (const skill of newSkills) {
      console.log(`   ${skill.emoji} ${skill.name}`);
      console.log(`      Path: ${skill.path}`);
      if (skill.description) {
        console.log(`      Desc: ${skill.description.substring(0, 60)}...`);
      }
    }
    
    if (!quiet) {
      console.log(`\n${colors.cyan}💡${colors.reset} Run with --register to auto-enable new skills`);
    }
    
    await notifyNewSkills(newSkills);
  } else {
    console.log(`${colors.green}✓${colors.reset} No new skills found`);
  }
  
  if (register && newSkills.length > 0) {
    console.log(`\n${colors.cyan}📝${colors.reset} Generating config for ${newSkills.length} new skills...`);
    
    const configEntries = {};
    for (const skill of newSkills) {
      configEntries[skill.name] = {
        enabled: true,
        path: skill.path,
      };
    }
    
    const config = {
      skills: {
        entries: configEntries
      }
    };
    
    console.log(JSON.stringify(config, null, 2));
    console.log(`\n${colors.yellow}💡${colors.reset} Add these entries to ~/.openclaw/openclaw.json`);
  }
  
  console.log(`\nState saved to: ${STATE_FILE}`);
}

main().catch(console.error);
