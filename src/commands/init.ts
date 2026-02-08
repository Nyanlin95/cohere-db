/**
 * Init Command
 * Initialize Cohere in a project
 */

import * as fs from 'fs';
import * as path from 'path';

interface InitOptions {
  url?: string;
  dir?: string;
}

export async function init(options: InitOptions): Promise<void> {
  const outputDir = options.dir || '.ai';
  console.log(`🚀 Initializing Cohere...`);
  console.log(`   Output directory: ${outputDir}`);

  // Create output directory
  const fullPath = path.resolve(outputDir);
  fs.mkdirSync(fullPath, { recursive: true });

  // Create config file
  const config = {
    databaseUrl: options.url || process.env.DATABASE_URL || '',
    outputDir,
    schema: 'public',
    format: 'markdown',
  };

  fs.writeFileSync(
    path.join(fullPath, 'cohere-config.json'),
    JSON.stringify(config, null, 2)
  );

  console.log(`✅ Initialized!`);
  console.log(`\n📄 Created: ${path.join(fullPath, 'cohere-config.json')}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Run 'cohere-db generate' to create context files`);
  console.log(`   2. Or 'cohere-db generate --url "postgresql://..." if URL not set`);
}
