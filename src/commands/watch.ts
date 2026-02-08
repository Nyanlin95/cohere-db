/**
 * Watch Command
 * Watch for schema changes and regenerate context
 */

import * as fs from 'fs';
import * as path from 'path';
import { generate } from './generate.js';

interface WatchOptions {
  debounce?: string;
}

export async function watch(options: WatchOptions): Promise<void> {
  const debounce = parseInt(options.debounce || '2000', 10);

  console.log('👀 Watch mode enabled...');
  console.log(`   Debounce: ${debounce}ms`);

  // Detect schema files to watch
  const watchPaths: string[] = [];

  if (fs.existsSync('prisma/schema.prisma')) {
    watchPaths.push('prisma/schema.prisma');
    console.log('   Watching: prisma/schema.prisma');
  }

  if (fs.existsSync('src/db/schema.ts')) {
    watchPaths.push('src/db/schema.ts');
    console.log('   Watching: src/db/schema.ts');
  }

  if (fs.existsSync('drizzle.config.ts')) {
    watchPaths.push('drizzle.config.ts');
    console.log('   Watching: drizzle.config.ts');
  }

  if (watchPaths.length === 0) {
    console.log('\n⚠️  No schema files detected.');
    console.log('   Looking for:');
    console.log('   - prisma/schema.prisma');
    console.log('   - src/db/schema.ts');
    console.log('   - drizzle.config.ts');
    return;
  }

  console.log('\n✨ Watching for changes... (Press Ctrl+C to stop)\n');

  let debounceTimer: NodeJS.Timeout | null = null;
  let generating = false;

  const regenerate = async () => {
    if (generating) return;

    generating = true;
    console.log(`\n🔄 Schema change detected, regenerating...`);

    try {
      await generate({});
      console.log('✅ Regeneration complete\n');
    } catch (error) {
      console.error('❌ Regeneration failed:', error);
    } finally {
      generating = false;
    }
  };

  const handleChange = (filename: string) => {
    console.log(`📝 Change detected: ${filename}`);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(regenerate, debounce);
  };

  // Watch each file
  const watchers = watchPaths.map(filePath => {
    return fs.watch(filePath, (eventType, filename) => {
      if (eventType === 'change') {
        handleChange(filePath);
      }
    });
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watch mode...');
    watchers.forEach(watcher => watcher.close());
    process.exit(0);
  });
}

