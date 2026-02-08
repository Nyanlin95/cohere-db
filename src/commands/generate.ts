/**
 * Generate Command
 * Generates CLAUDE.md and AGENTS.md from database schema
 */

import * as fs from 'fs';
import * as path from 'path';
import { createExtractor, ExtractorType, UnifiedSchemaConverter, UnifiedSchemaInfo } from '../extractors/index.js';
import { TemplateGenerator } from '../generators/templates.js';

interface GenerateOptions {
  url?: string;
  orm?: string;
  output?: string;
  format?: string;
  schema?: string;
  mysql?: boolean;
  sqlite?: string;
  prisma?: string;
  drizzle?: string;
  mongodb?: string;
  firebaseKey?: string;
  firebaseProject?: string;
}

export async function generate(options: GenerateOptions): Promise<void> {
  const outputDir = options.output || '.ai';
  const schemaName = options.schema || 'public';

  console.log(`🔍 Generating database context...`);
  console.log(`   Output directory: ${outputDir}`);

  let extractorType: ExtractorType = 'postgresql';
  let connectionString = options.url || process.env.DATABASE_URL || '';
  let schemaPath: string | undefined;

  // Determine extractor type
  if (options.mysql) {
    extractorType = 'mysql';
    if (!connectionString) {
      throw new Error('MySQL connection URL required. Use --url or DATABASE_URL env var.');
    }
  } else if (options.sqlite) {
    extractorType = 'sqlite';
    connectionString = options.sqlite;
  } else if (options.prisma) {
    extractorType = 'prisma';
    schemaPath = typeof options.prisma === 'string' ? options.prisma : 'prisma/schema.prisma';
    connectionString = 'dummy'; // Not used for Prisma
  } else if (options.drizzle) {
    extractorType = 'drizzle';
    schemaPath = typeof options.drizzle === 'string' ? options.drizzle : 'src/db/schema.ts';
    connectionString = 'dummy'; // Not used for Drizzle
  } else if (options.orm === 'prisma') {
    extractorType = 'prisma';
    schemaPath = 'prisma/schema.prisma';
    connectionString = 'dummy';
  } else if (options.orm === 'drizzle') {
    extractorType = 'drizzle';
    schemaPath = 'src/db/schema.ts';
    connectionString = 'dummy';
  } else if (connectionString) {
    if (connectionString.startsWith('mysql')) {
      extractorType = 'mysql';
    } else if (connectionString.startsWith('file:') || connectionString.endsWith('.db') || connectionString.endsWith('.sqlite')) {
      extractorType = 'sqlite';
    } else {
      extractorType = 'postgresql';
    }
  } else {
    // Try to auto-detect
    if (fs.existsSync('prisma/schema.prisma')) {
      console.log('👀 Detected Prisma schema, using Prisma extractor...');
      extractorType = 'prisma';
      schemaPath = 'prisma/schema.prisma';
      connectionString = 'dummy';
    } else if (fs.existsSync('drizzle.config.ts') || fs.existsSync('src/db/schema.ts')) {
      console.log('👀 Detected Drizzle project, using Drizzle extractor...');
      extractorType = 'drizzle';
      schemaPath = 'src/db/schema.ts';
      connectionString = 'dummy';
    } else if (options.mongodb || (connectionString && (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://')))) {
      console.log('👀 Detected MongoDB connection...');
      extractorType = 'mongodb';
      connectionString = options.mongodb || connectionString;
      if (!connectionString) {
        throw new Error('MongoDB connection URL required. Use --url or DATABASE_URL env var.');
      }
    } else if (options.firebaseProject || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('👀 Detected Firebase project...');
      extractorType = 'firebase';
      connectionString = 'dummy'; // Not used for Firebase
    } else {
      throw new Error(
        'Database connection not found. Use --url, --sqlite, --prisma, --drizzle, or --mongodb.'
      );
    }
  }

  console.log(`📦 Using extractor: ${extractorType}`);
  if (schemaPath) console.log(`   Schema path: ${schemaPath}`);

  const extractor = await createExtractor(extractorType, connectionString, {
    schemaPath,
    projectId: options.firebaseProject,
    serviceAccountPath: options.firebaseKey
  });
  let unifiedSchema: UnifiedSchemaInfo;

  try {
    const rawSchema = await extractor.extract();
    rawSchema.databaseType = extractorType;
    rawSchema.schemaName = rawSchema.schemaName || schemaName;
    rawSchema.source = rawSchema.source || schemaPath || connectionString;

    // Convert to unified format using generic convert
    unifiedSchema = UnifiedSchemaConverter.convert(rawSchema);

    // Add source info
    unifiedSchema.source = schemaPath || connectionString.replace(/:[^:]*@/, ':***@'); // Hide password

  } finally {
    if (extractor.close) {
      await extractor.close();
    }
  }

  // Generate and save templates
  console.log('📝 Generating context files...');
  const generator = new TemplateGenerator('templates', outputDir);
  await generator.save(outputDir, unifiedSchema);

  // Summary
  console.log('\n✅ Generation complete!');
  console.log(`   Tables: ${unifiedSchema.tables.length}`);
  console.log(`   Output: ${path.resolve(outputDir)}`);
  console.log('\n📄 Generated files:');
  console.log(`   - ${outputDir}/CLAUDE.md`);
  console.log(`   - ${outputDir}/AGENTS.md`);
  console.log(`   - ${outputDir}/queries/`);

  console.log('\n💡 Next steps:');
  console.log('   1. Review the generated files');
  console.log('   2. Add custom business rules');
  console.log('   3. Commit to version control');
}
