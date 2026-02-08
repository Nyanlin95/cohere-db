/**
 * Show Command
 * Show current database schema in a readable format
 */

import * as fs from 'fs';
import * as path from 'path';
import { createExtractor, ExtractorType, UnifiedSchemaConverter } from '../extractors/index.js';

interface ShowOptions {
    format?: string;
}

export async function show(options: ShowOptions): Promise<void> {
    const format = options.format || 'markdown';

    console.log('📊 Loading database schema...\n');

    // Try to load from existing .ai directory first
    const aiDir = '.ai';
    const claudeFile = path.join(aiDir, 'CLAUDE.md');
    const agentsFile = path.join(aiDir, 'AGENTS.md');

    if (fs.existsSync(claudeFile)) {
        console.log('📄 Found existing context in .ai directory\n');
        const content = fs.readFileSync(claudeFile, 'utf-8');

        // Extract and display just the schema section
        const schemaMatch = content.match(/## Database Schema([\s\S]*?)(?=\n##|$)/);
        if (schemaMatch) {
            console.log('## Database Schema');
            console.log(schemaMatch[1].trim());
        } else {
            console.log(content);
        }
        return;
    }

    // If no existing context, try to generate from config
    const configPath = path.join(aiDir, 'cohere-config.json');
    if (!fs.existsSync(configPath)) {
        console.log('⚠️  No schema found.');
        console.log('\nRun one of the following:');
        console.log('  1. cohere init --url "your-database-url"');
        console.log('  2. cohere generate');
        console.log('  3. cohere generate --prisma');
        console.log('  4. cohere generate --drizzle');
        return;
    }

    // Load config and extract schema
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        let extractorType: ExtractorType = 'postgresql';
        let connectionString = config.databaseUrl || process.env.DATABASE_URL;
        let schemaPath: string | undefined;

        // Auto-detect extractor type
        if (fs.existsSync('prisma/schema.prisma')) {
            extractorType = 'prisma';
            schemaPath = 'prisma/schema.prisma';
        } else if (fs.existsSync('src/db/schema.ts')) {
            extractorType = 'drizzle';
            schemaPath = 'src/db/schema.ts';
        } else if (connectionString && (connectionString.startsWith('mongodb://') || connectionString.startsWith('mongodb+srv://'))) {
            extractorType = 'mongodb';
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            extractorType = 'firebase';
        } else if (connectionString) {
            if (connectionString.startsWith('mysql')) {
                extractorType = 'mysql';
            } else if (connectionString.includes('.db') || connectionString.includes('.sqlite')) {
                extractorType = 'sqlite';
            }
        }

        if (!connectionString && !schemaPath) {
            console.log('⚠️  No database connection or schema file found.');
            console.log('Run: cohere generate');
            return;
        }

        const extractor = await createExtractor(extractorType, connectionString || 'dummy', { schemaPath });

        try {
            const rawSchema = await extractor.extract();
            const unifiedSchema = UnifiedSchemaConverter.convert(rawSchema);

            console.log(`Database: ${unifiedSchema.databaseType || 'Unknown'}`);
            console.log(`Tables: ${unifiedSchema.tables.length}\n`);

            console.log('## Tables\n');

            for (const table of unifiedSchema.tables) {
                console.log(`### ${table.name}`);
                if (table.description) {
                    console.log(`  ${table.description}`);
                }
                console.log(`  Columns: ${table.columns.length}`);

                // Show primary keys
                const pkColumns = table.columns.filter(c => c.isPrimaryKey);
                if (pkColumns.length > 0) {
                    console.log(`  Primary Key: ${pkColumns.map(c => c.name).join(', ')}`);
                }

                // Show relations
                if (table.relations && table.relations.length > 0) {
                    console.log(`  Relations: ${table.relations.length}`);
                }

                console.log('');
            }

            // Show relationships  
            const relationships = unifiedSchema.tables
                .flatMap(t => (t.relations || []).map(rel => ({
                    from: rel.fromTable,
                    to: rel.toTable,
                    cardinality: rel.cardinality
                })));

            if (relationships.length > 0) {
                console.log('\n## Relationships\n');
                for (const rel of relationships) {
                    console.log(`  ${rel.from} [${rel.cardinality}] ${rel.to}`);
                }
            }

        } finally {
            if (extractor.close) {
                await extractor.close();
            }
        }

    } catch (error) {
        console.error('❌ Failed to load schema:', error);
        console.log('\nTry running: cohere generate');
    }
}
