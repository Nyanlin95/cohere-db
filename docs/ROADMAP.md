# Feature Roadmap: db-ai-context

## Version History

| Version | Status | Date | Description |
|---------|--------|------|-------------|
| 0.1.0 | Planning | 2026-02-08 | MVP - Core functionality |
| 0.2.0 | Backlog | TBD | ORM Integration |
| 0.3.0 | Backlog | TBD | Multi-database support |
| 1.0.0 | Backlog | TBD | Production release |

---

## v0.1.0 (MVP) - First Release

**Goal:** Core functionality working with PostgreSQL

### Features

#### Must Have (MVP)
- [ ] PostgreSQL schema extraction via `pg` driver
- [ ] Generate `CLAUDE.md` with table list, columns, types
- [ ] Generate `AGENTS.md` for Cursor/Windsurf
- [ ] Basic CLI with `init`, `generate` commands
- [ ] Config file support (`db-ai.config.json`)
- [ ] Handle common types (text, uuid, timestamp, boolean, json)
- [ ] Primary key detection
- [ ] Foreign key relationship detection
- [ ] README with quick start guide

#### Should Have
- [ ] Configurable output directory
- [ ] Template customization
- [ ] Dry-run mode
- [ ] Colored CLI output

#### Nice to Have
- [ ] SQLite support (via `better-sqlite3`)
- [ ] Basic validation

### Technical Requirements

- Node.js 20+
- TypeScript 5.3+
- Commander.js for CLI
- Inquirer for interactive prompts

### Success Criteria

- [ ] Can run `db-ai init --url "postgresql://..."` successfully
- [ ] Generates `CLAUDE.md` with correct schema
- [ ] Claude Code can use generated context
- [ ] Cursor can use generated context
- [ ] Documentation is clear and actionable

---

## v0.2.0 - ORM Integration

**Goal:** Support Prisma and Drizzle schemas directly

### Features

#### Must Have
- [ ] Prisma schema extraction (via `prisma` CLI or introspection)
- [ ] Drizzle schema extraction (via schema files)
- [ ] Extract business rules from Prisma/Drizzle comments
- [ ] Generate query examples based on ORM patterns
- [ ] Support for enum types
- [ ] Support for relations (`hasOne`, `hasMany`, `belongsTo`, `manyToMany`)

#### Should Have
- [ ] Detect common query patterns from codebase
- [ ] Generate `.ai/queries/` directory with example queries
- [ ] Extract @default values as business rules
- [ ] Custom rule templates

#### Nice to Have
- [ ] TypeScript type export for AI reference
- [ ] Zod schema generation from DB types
- [ ] OpenAPI spec generation

### Technical Requirements

- Prisma CLI integration or `prisma` npm package
- Drizzle ORM introspection
- Pattern matching for query extraction

### Success Criteria

- [ ] Can run `db-ai generate --orm prisma` successfully
- [ ] Can run `db-ai generate --orm drizzle` successfully
- [ ] Generated context includes ORM-specific patterns
- [ ] Query examples match codebase patterns

---

## v0.3.0 - Multi-Database & Advanced Features

**Goal:** Support MySQL, SQLite, and add advanced features

### Features

#### Must Have
- [ ] MySQL schema extraction (via `mysql2`)
- [ ] SQLite schema extraction (via `better-sqlite3`)
- [ ] Schema diff detection (compare DB vs generated)
- [ ] Watch mode for development
- [ ] CI/CD integration (GitHub Actions)

#### Should Have
- [ ] MongoDB support (via `mongodb` driver)
- [ ] Kysely schema extraction
- [ ] TypeORM support
- [ ] Customizable templates via config
- [ ] Plugin system for custom rules

#### Nice to Have
- [ ] VSCode extension
- [ ] JetBrains IDE plugin
- [ ] GraphQL schema generation
- [ ] Multi-schema support (Postgres schemas)

### Technical Requirements

- MongoDB driver integration
- Watch mode with chokidar or similar
- GitHub Actions integration

### Success Criteria

- [ ] Can extract schema from MySQL database
- [ ] Can extract schema from SQLite database
- [ ] Watch mode detects schema changes
- [ ] CI/CD pipeline integration works

---

## v1.0.0 - Production Ready

**Goal:** Production-ready with all features and stability

### Features

#### Must Have
- [ ] Comprehensive test coverage (>80%)
- [ ] Error handling for all edge cases
- [ ] Performance optimization
- [ ] Plugin system documentation
- [ ] Contributing guide
- [ ] Security audit

#### Should Have
- [ ] Type-safe query generation
- [ ] AI model-specific optimizations
- [ ] Multi-language support (i18n)
- [ ] Cloud integration (Supabase, Neon, etc.)
- [ ] Enterprise features (SSO, audit logs)

#### Nice to Have
- [ ] Web UI
- [ ] API server mode
- [ ] Collaborative features
- [ ] Integration with AI coding platforms

### Technical Requirements

- Comprehensive test suite (Jest/Vitest)
- Performance benchmarks
- Security review
- Documentation website

### Success Criteria

- [ ] Zero critical bugs
- [ ] >80% test coverage
- [ ] Production users successfully using the tool
- [ ] Community contributions
- [ ] Positive feedback from AI coding assistant users

---

## Backlog (Future Ideas)

### Database Features
- [ ] CockroachDB support
- [ ] Snowflake support
- [ ] BigQuery support
- [ ] Redshift support
- [ ] TimescaleDB support
- [ ] PlanetScale support

### AI Integration Features
- [ ] Claude Code API integration
- [ ] Cursor API integration
- [ ] Custom prompt templates per AI tool
- [ ] Context-aware suggestions
- [ ] Query optimization hints

### Developer Experience
- [ ] VS Code extension
- [ ] JetBrains IDE plugin
- [ ] Vim/Neovim plugin
- [ ] CLI autocomplete
- [ ] Interactive schema builder
- [ ] Visual schema editor

### Enterprise Features
- [ ] SSO/SAML
- [ ] Audit logging
- [ ] Role-based access
- [ ] Team collaboration
- [ ] Centralized policy management

---

## Dependencies

### Core Dependencies
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `pg` - PostgreSQL driver
- `mysql2` - MySQL driver
- `better-sqlite3` - SQLite driver
- `js-yaml` - YAML parsing
- `chalk` - Colored output

### Dev Dependencies
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution
- `jest` - Testing framework
- `eslint` - Linting

### Optional Dependencies
- `prisma` - Prisma CLI
- `drizzle-kit` - Drizzle migrations
- `chokidar` - File watching
