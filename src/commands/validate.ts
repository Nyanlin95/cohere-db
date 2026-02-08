/**
 * Validate Command
 * Validate generated context against database
 */

import * as fs from 'fs';
import * as path from 'path';
import { createExtractor, ExtractorType, UnifiedSchemaConverter, UnifiedSchemaInfo } from '../extractors/index.js';

interface ValidateOptions {
  strict?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validate(options: ValidateOptions): Promise<void> {
  console.log('🔍 Validating database context...');
  console.log(`   Strict mode: ${options.strict ? 'enabled' : 'disabled'}\n`);

  const aiDir = '.ai';
  const configPath = path.join(aiDir, 'db-ai-config.json');

  // Check if context exists
  if (!fs.existsSync(configPath)) {
    console.log('❌ No configuration found.');
    console.log('\nRun: cohere init --url "your-database-url"');
    return;
  }

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    // Load configuration
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    let extractorType: ExtractorType = 'postgresql';
    let connectionString = config.databaseUrl || process.env.DATABASE_URL;
    let schemaPath: string | undefined;

    // Auto-detect extractor type
    if (fs.existsSync('prisma/schema.prisma')) {
      extractorType = 'prisma';
      schemaPath = 'prisma/schema.prisma';
      console.log('📦 Detected: Prisma');
    } else if (fs.existsSync('src/db/schema.ts')) {
      extractorType = 'drizzle';
      schemaPath = 'src/db/schema.ts';
      console.log('📦 Detected: Drizzle');
    } else if (connectionString && (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://'))) {
      extractorType = 'mongodb';
      console.log('📦 Detected: MongoDB');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      extractorType = 'firebase';
      console.log('📦 Detected: Firebase');
    } else if (connectionString) {
      if (connectionString.startsWith('mysql')) {
        extractorType = 'mysql';
        console.log('📦 Detected: MySQL');
      } else if (connectionString.includes('.db') || connectionString.includes('.sqlite')) {
        extractorType = 'sqlite';
        console.log('📦 Detected: SQLite');
      } else {
        console.log('📦 Detected: PostgreSQL');
      }
    }

    if (!connectionString && !schemaPath) {
      console.log('❌ No database connection or schema file found.');
      console.log('Run: cohere generate');
      return;
    }

    console.log('');

    // Extract current schema
    console.log('📊 Extracting current schema...');
    const extractor = await createExtractor(extractorType, connectionString || 'dummy', { schemaPath });

    let currentSchema: UnifiedSchemaInfo;
    try {
      const rawSchema = await extractor.extract();
      currentSchema = UnifiedSchemaConverter.convert(rawSchema);
    } finally {
      if (extractor.close) {
        await extractor.close();
      }
    }

    console.log(`   Tables found: ${currentSchema.tables.length}\n`);

    // Check if generated context files exist
    const claudeFile = path.join(aiDir, 'CLAUDE.md');
    const agentsFile = path.join(aiDir, 'AGENTS.md');

    if (!fs.existsSync(claudeFile) && !fs.existsSync(agentsFile)) {
      result.valid = false;
      result.errors.push('Generated context files not found');
      console.log('❌ No generated context files found in .ai directory');
      console.log('\nRun: cohere generate');
      return;
    }

    // Parse generated context to extract table names
    console.log('📄 Parsing generated context...');
    const generatedTables = new Set<string>();

    if (fs.existsSync(claudeFile)) {
      const content = fs.readFileSync(claudeFile, 'utf-8');
      // Extract table names from markdown (looking for ### TableName pattern)
      const tableMatches = content.matchAll(/###\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
      for (const match of tableMatches) {
        generatedTables.add(match[1]);
      }
    }

    console.log(`   Tables documented: ${generatedTables.size}\n`);

    // Validate tables
    console.log('🔍 Validating tables...');
    const currentTableNames = new Set(currentSchema.tables.map(t => t.name));

    // Check for missing tables in generated context
    for (const table of currentSchema.tables) {
      if (!generatedTables.has(table.name)) {
        result.warnings.push(`Table '${table.name}' exists in schema but not in generated context`);
      }
    }

    // Check for extra tables in generated context
    for (const tableName of generatedTables) {
      if (!currentTableNames.has(tableName)) {
        result.warnings.push(`Table '${tableName}' in generated context but not in current schema`);
      }
    }

    // Validate column counts
    for (const table of currentSchema.tables) {
      if (generatedTables.has(table.name)) {
        const columnCount = table.columns.length;
        if (columnCount === 0) {
          result.warnings.push(`Table '${table.name}' has no columns`);
        }
      }
    }

    // Display results
    console.log('');

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('✅ Validation passed!');
      console.log('   All tables match between schema and generated context.');
    } else {
      if (result.errors.length > 0) {
        console.log('❌ Validation errors:\n');
        result.errors.forEach(err => console.log(`   - ${err}`));
        console.log('');
      }

      if (result.warnings.length > 0) {
        console.log('⚠️  Validation warnings:\n');
        result.warnings.forEach(warn => console.log(`   - ${warn}`));
        console.log('');
      }

      if (result.warnings.length > 0 && result.errors.length === 0) {
        console.log('💡 Recommendation: Run "cohere generate" to update context');
      }

      if (options.strict && (result.errors.length > 0 || result.warnings.length > 0)) {
        console.log('\n❌ Validation failed in strict mode');
        process.exit(1);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Current tables: ${currentSchema.tables.length}`);
    console.log(`   Documented tables: ${generatedTables.size}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);

  } catch (error) {
    console.error('\n❌ Validation failed:', error);

    if (options.strict) {
      process.exit(1);
    }
  }
}

