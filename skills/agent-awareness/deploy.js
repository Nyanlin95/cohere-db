#!/usr/bin/env node

/**
 * Deploy Script for Agent Awareness Dashboard
 * 
 * Usage:
 *   node deploy.js              # Local access only
 *   node deploy.js --network    # Allow network access (local IP)
 *   node deploy.js --ngrok      # Create public URL with ngrok
 *   node deploy.js --cloud      # Show cloud deployment options
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const options = {
  network: args.includes('--network') || args.includes('-n'),
  ngrok: args.includes('--ngrok') || args.includes('-ng'),
  cloud: args.includes('--cloud') || args.includes('-c'),
  help: args.includes('--help') || args.includes('-h')
};

function showHelp() {
  console.log(`
🤖 Agent Awareness Dashboard - Deployment Options

Usage: node deploy.js [options]

Options:
  --network, -n    Allow access from network (binds to 0.0.0.0)
  --ngrok, -ng     Create public URL via ngrok tunnel
  --cloud, -c      Show cloud deployment options
  --help, -h       Show this help

Examples:
  node deploy.js                    # Local only (localhost:3003)
  node deploy.js --network          # Network access (192.168.x.x:3003)
  node deploy.js --ngrok            # Public URL via ngrok
  node deploy.js --network --ngrok  # Network + ngrok

For mobile access:
  1. Use --network flag on same WiFi
  2. Use --ngrok for remote access from anywhere
`);
}

async function main() {
  if (options.help) {
    showHelp();
    return;
  }

  if (options.cloud) {
    console.log(`
☁️ Cloud Deployment Options

1. Vercel (Recommended - Free tier available)
   npm i -g vercel
   vercel

2. Render.com
   - Connect GitHub repo
   - Build command: npm install
   - Start command: node skills/agent-awareness/server.js
   - Environment: PORT=3003

3. Railway.app
   - Deploy from GitHub
   - Add environment variable PORT=3003
   - Start command: node skills/agent-awareness/server.js

4. Fly.io
   - fly launch
   - Set internal_port = 3003
   - fly deploy

All cloud options provide permanent URL accessible from anywhere.
`);
    return;
  }

  // Build environment
  const env = { ...process.env };
  if (options.network) {
    env.HOST = '0.0.0.0';
    console.log('🌐 Network access enabled (0.0.0.0)');
  }

  // Start server
  console.log('🚀 Starting Agent Awareness Dashboard...');
  const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    env,
    stdio: 'inherit'
  });

  // Handle ngrok if requested
  if (options.ngrok) {
    console.log('\n🔗 Starting ngrok tunnel...');
    try {
      const ngrok = spawn('npx', ['ngrok', 'http', '3003', '--bind-tls=true'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let ngrokOutput = '';
      ngrok.stdout.on('data', (data) => {
        ngrokOutput += data.toString();
        console.log(data.toString().trim());
      });

      ngrok.stderr.on('data', (data) => {
        const msg = data.toString();
        // Extract public URL from ngrok output
        const urlMatch = msg.match(/https:\/\/[a-zA-Z0-9]+\.ngrok-free\.app/);
        if (urlMatch) {
          console.log(`\n✅ Public URL: ${urlMatch[0]}`);
          console.log(`   Dashboard: ${urlMatch[0]}/dashboard.html`);
        }
      });

      ngrok.on('error', (err) => {
        if (err.message.includes('ngrok')) {
          console.log('❌ ngrok not found. Install with: npm i -g ngrok');
          console.log('   Or visit https://ngrok.com/ to download');
        }
      });
    } catch (error) {
      console.log('❌ ngrok error:', error.message);
    }
  }

  server.on('error', (err) => {
    console.error('Failed to start server:', err.message);
  });
}

main().catch(console.error);
