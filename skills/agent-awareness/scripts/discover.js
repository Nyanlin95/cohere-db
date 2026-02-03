#!/usr/bin/env node
/**
 * Skill Auto-Discovery Tool
 * Scans skills/ folder and auto-registers new skills
 * 
 * Usage: node scripts/discover.js [--json] [--register]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine workspace root - skills/agent-awareness is inside skills/
// So workspace is two levels up from scripts/
const WORKSPACE_DIR = path.join(__dirname, '..', '..');
const SKILLS_DIR = WORKSPACE_DIR;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Parse YAML frontmatter from file content
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  try {
    // Simple YAML parser for frontmatter
    const yaml = match[1];
    const result = {};
    let currentObj = result;
    const stack = [{ obj: result, indent: -1 }];
    
    yaml.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      const indent = line.search(/\S/);
      
      // Find the right parent based on indentation
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }
      
      const parent = stack[stack.length - 1].obj;
      
      // Array item
      if (trimmed.startsWith('- ')) {
        const value = trimmed.substring(2).trim();
        if (Array.isArray(parent)) {
          parent.push(value);
        } else {
          // New array property
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
      }
      // Key: value
      else {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) return;
        
        const key = trimmed.substring(0, colonIdx).trim();
        const value = trimmed.substring(colonIdx + 1).trim();
        
        if (value === '') {
          // Nested object
          parent[key] = {};
          stack.push({ obj: parent[key], indent });
        } else if (value.startsWith('[') && value.endsWith(']')) {
          // Inline array
          parent[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(s => s);
        } else {
          // Simple value
          parent[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return result;
  } catch (e) {
    console.error('Failed to parse YAML:', e.message);
    return null;
  }
}

/**
 * Extract description from SKILL.md content (first paragraph after frontmatter)
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
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
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
      
      if (!frontmatter) {
        console.warn(`${colors.yellow}⚠${colors.reset} ${entry.name}: Invalid frontmatter`);
        continue;
      }
      
      const skill = {
        name: frontmatter.name || entry.name,
        path: entry.name,
        description: frontmatter.description || extractDescription(content),
        emoji: frontmatter.metadata?.openclaw?.emoji || '📦',
        tags: frontmatter.metadata?.openclaw?.tags || [],
        requires: frontmatter.metadata?.openclaw?.requires || {},
        install: frontmatter.metadata?.openclaw?.install || [],
        homepage: frontmatter.metadata?.openclaw?.homepage || null,
        os: frontmatter.metadata?.openclaw?.os || null,
        userInvocable: frontmatter.metadata?.openclaw?.['user-invocable'] || false,
        commandDispatch: frontmatter.metadata?.openclaw?.['command-dispatch'] || null,
      };
      
      skills.push(skill);
    } catch (e) {
      console.warn(`${colors.yellow}⚠${colors.reset} ${entry.name}: ${e.message}`);
    }
  }
  
  return skills;
}

/**
 * Format skills for display
 */
function formatSkills(skills, json = false) {
  if (json) {
    return JSON.stringify(skills, null, 2);
  }
  
  let output = '';
  output += `${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n`;
  output += `${colors.cyan}           🔍 SKILL AUTO-DISCOVERY                ${colors.reset}\n`;
  output += `${colors.cyan}═══════════════════════════════════════════════${colors.reset}\n\n`;
  
  output += `Found ${colors.green}${skills.length}${colors.reset} skills in ${SKILLS_DIR}\n\n`;
  
  for (const skill of skills) {
    output += `${skill.emoji} ${colors.green}${skill.name}${colors.reset}\n`;
    output += `   Path: ${skill.path}\n`;
    if (skill.description) {
      output += `   Desc: ${skill.description.substring(0, 60)}${skill.description.length > 60 ? '...' : ''}\n`;
    }
    if (skill.tags.length > 0) {
      output += `   Tags: ${skill.tags.map(t => colors.blue + t + colors.reset).join(', ')}\n`;
    }
    if (Object.keys(skill.requires).length > 0) {
      output += `   Requires: ${JSON.stringify(skill.requires)}\n`;
    }
    output += '\n';
  }
  
  return output;
}

/**
 * Generate config entries for discovered skills
 */
function generateConfigEntries(skills) {
  const entries = {};
  
  for (const skill of skills) {
    entries[skill.name] = {
      enabled: true,
      path: skill.path,
    };
    
    if (skill.requires?.env) {
      entries[skill.name].env = {};
      for (const envKey of skill.requires.env) {
        entries[skill.name].env[envKey] = null; // Placeholder
      }
    }
  }
  
  return entries;
}

// Main execution
const args = process.argv.slice(2);
const json = args.includes('--json');
const register = args.includes('--register');

const skills = discoverSkills();
const formatted = formatSkills(skills, json);

if (json) {
  console.log(formatted);
} else {
  console.log(formatted);
  
  if (register) {
    console.log(`${colors.yellow}📝 Generated config entries:${colors.reset}\n`);
    const configEntries = generateConfigEntries(skills);
    console.log(JSON.stringify({ skills: { entries: configEntries } }, null, 2));
    console.log(`\n${colors.yellow}💡 To apply, add these entries to ~/.openclaw/openclaw.json${colors.reset}`);
  }
}

export { discoverSkills, parseFrontmatter, generateConfigEntries };
