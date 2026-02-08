# Contributing to cohere-db

Thank you for your interest in contributing! This document provides guidelines and instructions.

## Quick Start

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Build the project: `npm run build`
5. Run tests: `npm test`

## Development

### Code Structure

```
src/
├── cli.ts           # Entry point
├── commands/        # CLI commands
│   ├── generate.ts  # Generate context files
│   ├── init.ts      # Initialize project
│   ├── validate.ts  # Validate generated context
│   └── watch.ts     # Watch for changes
├── extractors/      # Schema extraction
│   ├── postgres.ts  # PostgreSQL extraction
│   ├── mysql.ts     # MySQL extraction
│   ├── drizzle.ts   # Drizzle ORM extraction
│   └── prisma.ts    # Prisma ORM extraction
├── generators/      # Context generation
│   ├── claude.ts    # Claude Code format
│   ├── cursor.ts    # Cursor/Windsurf format
│   └── queries.ts   # Query examples
├── templates/       # Output templates
│   ├── claude.md
│   ├── cursor.md
│   └── queries/
└── utils/           # Utility functions
```

### Adding a New Database

1. Create an extractor in `src/extractors/`
2. Implement the `SchemaExtractor` interface
3. Add database option to CLI
4. Add tests

### Adding a New ORM

1. Create an extractor in `src/extractors/`
2. Parse ORM schema files
3. Extract tables, columns, relationships
4. Add tests

### Adding a New Output Format

1. Create a generator in `src/generators/`
2. Implement the `ContextGenerator` interface
3. Add template file
4. Add tests

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- extractors/postgres.test.ts
```

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and add tests
3. Run `npm run lint` and fix any issues
4. Run `npm test` to ensure all tests pass
5. Commit your changes
6. Push to your fork
7. Open a Pull Request

## Style Guide

- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use meaningful variable names

## Questions?

Open an issue for discussion.
