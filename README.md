# cohere-db

> AI-optimized database schema extraction for Claude, Cursor, and other AI coding assistants

[![npm version](https://img.shields.io/npm/v/cohere-db.svg)](https://www.npmjs.com/package/cohere-db)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why?

AI assistants struggle with databases because they don't know your schema. This leads to wrong table names, missing relationships, and broken queries.

**cohere-db** fixes this by extracting your database schema and generating AI-optimized context files that give assistants perfect knowledge of your database structure.

## What You Get

```
.ai/
├── CLAUDE.md       # Claude-optimized context
├── AGENTS.md       # Cursor/Windsurf context  
├── DATABASE.md     # Human-readable docs
└── queries/        # Example query templates
```

## Quick Start

```bash
# Install globally
npm install -g cohere-db

# Or use with npx
npx cohere-db init

# Generate from your database
cohere-db generate --url "postgresql://localhost:5432/mydb"

# Or from your ORM
cohere-db generate --prisma
cohere-db generate --drizzle
```

That's it! Your AI assistant now has complete schema knowledge.

## Commands

```bash
cohere-db init                    # Initialize in your project
cohere-db generate               # Generate context files
cohere-db watch                  # Auto-regenerate on changes
cohere-db validate              # Verify docs match database
cohere-db show                  # Display current schema
```

## Supported Databases

| Database | Support |
|----------|---------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| SQLite | ✅ |
| MongoDB | ✅ |
| Firebase Firestore | ✅ |

## Supported ORMs

| ORM | Support |
|-----|---------|
| Prisma | ✅ |
| Drizzle | ✅ |
| Kysely | 🔄 Soon |
| TypeORM | 🔄 Soon |

## Examples

### From a Database

```bash
# PostgreSQL
cohere-db generate --url "postgresql://user:pass@localhost:5432/mydb"

# MySQL
cohere-db generate --url "mysql://user:pass@localhost:3306/mydb"

# SQLite
cohere-db generate --url "sqlite://./database.db"

# MongoDB (with sampling)
cohere-db generate --url "mongodb://localhost:27017/mydb" --sample-size 1000
```

### From an ORM

```bash
# Prisma (auto-detects schema.prisma)
cohere-db generate --prisma

# Drizzle (specify schema file)
cohere-db generate --drizzle src/db/schema.ts
```

### Firebase/Firestore

```bash
# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
cohere-db generate --firebase my-project-id

# Or provide directly
cohere-db generate --firebase my-project-id --firebase-key service-account.json
```

### Watch Mode

Auto-regenerate when your schema changes:

```bash
cohere-db watch
```

Monitors:
- Database migrations
- Prisma schema files
- Drizzle schema files

### Validation

Ensure docs match your database:

```bash
cohere-db validate --url "postgresql://..."
```

Checks:
- All tables documented
- Column types match
- Indexes present
- Foreign keys valid

## Generated Output

Here's what your AI assistant sees:

```markdown
## Database Schema

### users
**Type:** table  
**Engine:** InnoDB

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

## Configuration

Create `.cohererc.json`:

```json
{
  "outputDir": ".ai",
  "databases": {
    "development": "postgresql://localhost:5432/dev",
    "production": "postgresql://prod:5432/prod"
  },
  "include": ["users", "posts", "comments"],
  "exclude": ["migrations", "sessions"],
  "watch": {
    "enabled": true,
    "paths": ["prisma/schema.prisma", "src/db/**/*.ts"]
  }
}
```

## CLI Options

### `cohere-db generate`

| Option | Description |
|--------|-------------|
| `-u, --url <url>` | Database connection URL |
| `--prisma [path]` | Use Prisma schema |
| `--drizzle [path]` | Use Drizzle schema |
| `--firebase <id>` | Firestore project ID |
| `--firebase-key <path>` | Service account key |
| `--mongo-sample <n>` | MongoDB sample size (default: 100) |
| `-o, --output <dir>` | Output directory |

### `cohere-db watch`

| Option | Description |
|--------|-------------|
| `-u, --url <url>` | Database connection URL |
| `--interval <ms>` | Check interval (default: 5000) |

### `cohere-db validate`

| Option | Description |
|--------|-------------|
| `-u, --url <url>` | Database connection URL |

### `cohere-db show`

| Option | Description |
|--------|-------------|
| `-u, --url <url>` | Database connection URL |
| `--json` | Output as JSON |

## Using with AI Tools

### Claude Code
Claude automatically reads `.ai/CLAUDE.md` from your project root. Just generate and start coding!

### Cursor/Windsurf
Add `.ai/AGENTS.md` to your `.cursorrules` or `.windsurfrules`:

```
@.ai/AGENTS.md
```

### Gemini CLI
Reference the context in your prompts:

```
Read .ai/DATABASE.md for schema information
```

## Privacy & Security

**100% local.** All extraction happens on your machine. Your database credentials and schema never leave your computer.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for planned features.

## FAQ

**Q: Does this send my data anywhere?**  
A: No. Everything runs locally.

**Q: Can I use this commercially?**  
A: Yes. MIT licensed.

**Q: How often should I regenerate?**  
A: Use `cohere-db watch` during development. Regenerate after migrations in production.

**Q: Does it work with multi-tenant databases?**  
A: Yes. It extracts schema structure only, not tenant data.

**Q: Can I customize templates?**  
A: Yes. Via `.cohererc.json` or the `templates/` directory.

## License

MIT © Nyan Lin Maung

## Acknowledgments

Inspired by:
- [Prisma](https://prisma.io) - Type-safe database access
- [Drizzle ORM](https://orm.drizzle.team) - Lightweight ORM patterns
- [Supabase CLI](https://supabase.com/docs/reference/cli) - CLI design
