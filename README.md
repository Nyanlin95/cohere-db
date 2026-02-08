# Cohere

> AI-powered database schema extraction and documentation generator for Claude, Cursor, and other AI coding assistants

[![npm version](https://img.shields.io/npm/v/cohere.svg)](https://www.npmjs.com/package/cohere)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## The Problem

AI coding assistants struggle with databases because they lack context about:
- **Schema structure** - Tables, columns, types, and constraints
- **Relationships** - Foreign keys, joins, and cardinalities
- **Data types** - Proper mapping between SQL and your ORM
- **Valid queries** - Common patterns and edge cases

This leads to:
- ❌ Incorrect SQL generation (wrong table/column names)
- ❌ Missing relationships (N+1 query problems)
- ❌ Type mismatches and runtime errors
- ❌ Context drift in long conversations

## The Solution

`cohere` extracts database schema information and generates AI-optimized context files:
- `CLAUDE.md` - Structured context for Claude Code
- `AGENTS.md` - Context for Cursor/Windsurf
- `DATABASE.md` - Human-readable schema documentation
- Type definitions and query templates

## Features

### 🎯 Core Commands

```bash
# Initialize in your project
cohere init

# Generate context from your database
cohere generate --url "postgresql://user:pass@localhost:5432/mydb"

# Generate from ORM schema files
cohere generate --prisma
cohere generate --drizzle

# Watch for schema changes and auto-regenerate
cohere watch

# Validate generated context matches database
cohere validate

# Show current database state
cohere show
```

### 🗄️ Supported Databases

| Database | Status | Notes |
|----------|--------|-------|
| PostgreSQL | ✅ | Full support with indexes, FKs, constraints |
| MySQL | ✅ | Full support with InnoDB features |
| SQLite | ✅ | Full support with PRAGMA introspection |
| MongoDB | ✅ | Document sampling and type inference |
| Firebase Firestore | ✅ | Collection sampling with field detection |

### 🛠️ Supported ORMs & Schema Tools

| Tool | Status | Notes |
|------|--------|-------|
| Prisma | ✅ | Parse `schema.prisma` files |
| Drizzle ORM | ✅ | Parse schema files |
| Kysely | 🔄 | Planned |
| TypeORM | 🔄 | Planned |

## Installation

```bash
npm install -g cohere
```

Or use with npx:
```bash
npx cohere generate --url "postgresql://..."
```

## Quick Start

### 1. Initialize
```bash
cd my-project
cohere init
```

### 2. Generate Context

**From a Live Database:**
```bash
cohere generate --url "postgresql://localhost:5432/mydb"
```

**From Prisma Schema:**
```bash
cohere generate --prisma
```

**From Drizzle Schema:**
```bash
cohere generate --drizzle src/db/schema.ts
```

### 3. Generated Files

After running `generate`, you'll have:

```
.ai/
├── CLAUDE.md       # Claude-optimized context
├── AGENTS.md       # Cursor/Windsurf context
├── DATABASE.md     # Human-readable docs
└── queries/        # Example query templates
```

### 4. Use with AI Tools

**Claude Code:**
- Claude automatically reads `.ai/CLAUDE.md` in your project root

**Cursor/Windsurf:**
- Add `.ai/AGENTS.md` to your `.cursorrules` or `.windsurfrules`

**Gemini CLI:**
- Reference `.ai/DATABASE.md` in your context

## Example Output

```markdown
<!-- CLAUDE.md excerpt -->
## Database Schema

### users
**Type:** table  
**Engine:** InnoDB (MySQL)

#### Columns
- `id` - int, PRIMARY KEY, AUTO_INCREMENT
- `email` - varchar(255), UNIQUE, NOT NULL
- `full_name` - varchar(255), NULL
- `organization_id` - int, FOREIGN KEY → organizations.id
- `created_at` - timestamp, DEFAULT CURRENT_TIMESTAMP

#### Indexes
- PRIMARY KEY (`id`)
- UNIQUE INDEX `idx_email` (`email`)
- INDEX `idx_org` (`organization_id`)

#### Foreign Keys
- `fk_user_org` → organizations(id) ON DELETE CASCADE

### Relationships
- users → organizations (many-to-one)
- users → posts (one-to-many)

### Query Examples

**Get user with organization:**
\`\`\`sql
SELECT u.*, o.name as org_name
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.id = ?
\`\`\`
```

## Advanced Usage

### Watch Mode

Automatically regenerate when schema changes:
```bash
cohere watch
```

This monitors:
- Prisma schema files
- Database migrations
- Drizzle schema files

### MongoDB Sampling

For NoSQL databases, Cohere samples documents to infer schema:

```bash
cohere generate --url "mongodb://localhost:27017/mydb" --sample-size 1000
```

### Firebase/Firestore

Requires service account credentials:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
cohere generate --firebase my-project-id
```

Or provide the key directly:
```bash
cohere generate --firebase my-project-id --firebase-key service-account.json
```

### Validation

Ensure your generated docs match the actual database:

```bash
cohere validate --url "postgresql://..."
```

This checks:
- ✅ All tables documented
- ✅ Column types match
- ✅ Indexes present
- ✅ Foreign keys valid

## Configuration

Create `.cohererc.json` in your project root:

```json
{
  "outputDir": ".ai",
  "databases": {
    "development": "postgresql://localhost:5432/dev",
    "production": "postgresql://prod-server:5432/prod"
  },
  "include": ["users", "posts", "comments"],
  "exclude": ["migrations", "sessions"],
  "watch": {
    "enabled": true,
    "paths": ["prisma/schema.prisma", "src/db/**/*.ts"]
  },
  "templates": {
    "claude": "custom/claude-template.md"
  }
}
```

## CLI Reference

### `cohere init`
Initialize Cohere in your project

**Options:**
- `-u, --url <url>` - Database connection URL
- `-d, --dir <dir>` - Output directory (default: `.ai`)

### `cohere generate`
Generate context files from database or ORM

**Options:**
- `-u, --url <url>` - Database connection URL
- `--prisma [path]` - Use Prisma schema
- `--drizzle [path]` - Use Drizzle schema  
- `--firebase <projectId>` - Firestore project ID
- `--firebase-key <path>` - Service account key path
- `--mongo-sample <n>` - MongoDB sample size (default: 100)
- `-o, --output <dir>` - Output directory

### `cohere watch`
Watch for schema changes and auto-regenerate

**Options:**
- `-u, --url <url>` - Database connection URL
- `--interval <ms>` - Check interval (default: 5000)

### `cohere validate`
Validate generated docs against database

**Options:**
- `-u, --url <url>` - Database connection URL

### `cohere show`
Display current database state

**Options:**
- `-u, --url <url>` - Database connection URL
- `--json` - Output as JSON

## Architecture

```
cohere/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── commands/           # Command implementations
│   │   ├── generate.ts     # Schema extraction & generation
│   │   ├── init.ts         # Project initialization
│   │   ├── validate.ts     # Schema validation
│   │   ├── watch.ts        # File watching
│   │   └── show.ts         # Display schema
│   ├── extractors/         # Database-specific extractors
│   │   ├── postgres.ts     # PostgreSQL extractor
│   │   ├── mysql.ts        # MySQL extractor
│   │   ├── sqlite.ts       # SQLite extractor
│   │   ├── mongodb.ts      # MongoDB extractor
│   │   ├── firebase.ts     # Firestore extractor
│   │   ├── prisma.ts       # Prisma schema parser
│   │   └── drizzle.ts      # Drizzle schema parser
│   ├── generators/         # Context file generators
│   │   ├── claude.ts       # CLAUDE.md generator
│   │   ├── cursor.ts       # AGENTS.md generator
│   │   └── markdown.ts     # DATABASE.md generator
│   └── utils/              # Shared utilities
└── templates/              # Output templates
    ├── claude.md
    ├── cursor.md
    └── queries/
```

## Testing

Cohere includes comprehensive unit tests for all extractors:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

Test coverage:
- ✅ PostgreSQL extractor (tables, indexes, foreign keys)
- ✅ MySQL extractor (InnoDB features)
- ✅ SQLite extractor (PRAGMA queries)
- ✅ MongoDB extractor (document sampling)
- ✅ Firebase extractor (collection inference)
- ✅ Prisma parser (schema.prisma files)
- ✅ Drizzle parser (schema definitions)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for planned features.

## FAQ

**Q: Does Cohere send data to external services?**  
A: No. All schema extraction happens locally. Your database credentials and schema never leave your machine.

**Q: Can I use this with private/commercial databases?**  
A: Yes. Cohere is MIT licensed and can be used commercially.

**Q: How often should I regenerate context?**  
A: Use `cohere watch` during development. Regenerate after schema migrations in production.

**Q: Does this work with multi-tenant databases?**  
A: Yes. Cohere extracts the schema structure. Tenant-specific data is not included.

**Q: Can I customize the output templates?**  
A: Yes. Create custom templates in `.cohererc.json` or the `templates/` directory.

## License

MIT © Cohere Team

## Acknowledgments

- [Prisma](https://prisma.io) - Inspiration for type-safe database access
- [Drizzle ORM](https://orm.drizzle.team) - Lightweight ORM patterns
- [Supabase CLI](https://supabase.com/docs/reference/cli) - CLI design patterns
