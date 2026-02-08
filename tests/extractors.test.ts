
// @ts-nocheck
import * as fs from 'fs';

// 1. Mock modules before imports
jest.mock('pg');
jest.mock('mysql2/promise');
// sqlite3 needs manual factory to avoid native binding errors during automock
jest.mock('sqlite3', () => ({
    Database: jest.fn(),
}));
jest.mock('mongodb');
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(),
}));
jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
    },
}));

// 2. Import modules
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import { MongoClient } from 'mongodb';
import * as admin from 'firebase-admin';

// 3. Import extractors
import { PostgresExtractor } from '../src/extractors/postgres.js';
import { MySQLExtractor } from '../src/extractors/mysql.js';
import { SQLiteExtractor } from '../src/extractors/sqlite.js';
import { MongoDBExtractor } from '../src/extractors/mongodb.js';
import { FirebaseExtractor } from '../src/extractors/firebase.js';
import { PrismaExtractor } from '../src/extractors/prisma.js';
import { DrizzleExtractor } from '../src/extractors/drizzle.js';

describe('Database Extractors', () => {

    // --- Postgres Mocks ---
    const mockPgQuery = jest.fn();
    const mockPgClient = {
        connect: jest.fn(),
        query: mockPgQuery,
        end: jest.fn(),
        release: jest.fn(),
    };
    const mockPgPool = {
        connect: jest.fn(() => Promise.resolve(mockPgClient)),
        query: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
    };

    // --- MySQL Mocks ---
    const mockMysqlQuery = jest.fn();
    const mockMysqlExecute = jest.fn();
    const mockMysqlConnection = {
        end: jest.fn(),
        execute: mockMysqlExecute,
        query: mockMysqlQuery,  // MySQL extractor uses query() method which returns [rows, fields]
        destroy: jest.fn(),
        release: jest.fn(),
    };
    const mockMysqlPool = {
        getConnection: jest.fn(() => Promise.resolve(mockMysqlConnection)),
        end: jest.fn(),
        execute: jest.fn(),
    };

    // --- SQLite Mocks ---
    const mockSqliteAll = jest.fn();
    const mockSqliteDb = {
        all: mockSqliteAll,
        close: jest.fn(),
        serialize: jest.fn((cb) => cb()),
    };

    // --- MongoDB Mocks ---
    const mockMongoFind = jest.fn();
    const mockMongoIndexes = jest.fn();
    const mockMongoCollectionObj = {
        name: 'users',
        countDocuments: jest.fn().mockResolvedValue(100),
        find: mockMongoFind,
        indexes: mockMongoIndexes,
    };
    const mockMongoDb = {
        listCollections: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([{ name: 'users' }])
        }),
        collection: jest.fn().mockReturnValue(mockMongoCollectionObj),
    };
    const mockMongoClientObj = {
        connect: jest.fn(),
        db: jest.fn().mockReturnValue(mockMongoDb),
        close: jest.fn(),
    };

    // --- Firebase Mocks ---
    const mockFirestoreGet = jest.fn();
    const mockFirestoreCollectionObj = {
        limit: jest.fn().mockReturnValue({
            get: mockFirestoreGet
        })
    };
    const mockFirestoreObj = {
        listCollections: jest.fn().mockResolvedValue([{ id: 'users' }]),
        collection: jest.fn().mockReturnValue(mockFirestoreCollectionObj),
    };
    const mockFirebaseApp = {
        delete: jest.fn(),
    };

    beforeAll(() => {
        // Setup implementations
        (Pool as unknown as jest.Mock).mockImplementation(() => mockPgPool);
        (mysql.createPool as unknown as jest.Mock).mockReturnValue(mockMysqlPool);

        // SQLite - handle default export structure
        const MockDatabase = jest.fn((file, cb) => {
            if (cb) cb(null);
            return mockSqliteDb;
        });
        if (sqlite3.Database) {
            (sqlite3.Database as unknown as jest.Mock).mockImplementation(MockDatabase);
        } else {
            // @ts-ignore
            sqlite3.Database = MockDatabase;
        }

        (MongoClient as unknown as jest.Mock).mockImplementation(() => mockMongoClientObj);

        (admin.initializeApp as unknown as jest.Mock).mockReturnValue(mockFirebaseApp);
        (admin.firestore as unknown as jest.Mock).mockReturnValue(mockFirestoreObj);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('PostgresExtractor', () => {
        it('should extract schema correctly', async () => {
            mockPgQuery
                .mockResolvedValueOnce({ rows: [{ table_name: 'users' }] }) // Tables
                .mockResolvedValueOnce({ rows: [{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: null }] }) // Columns
                .mockResolvedValueOnce({ rows: [{ index_name: 'users_pkey', columns: ['id'], is_unique: true, is_primary_key: true }] }) // Indexes with columns array
                .mockResolvedValueOnce({ rows: [] }); // Foreign Keys

            const extractor = new PostgresExtractor('postgres://user:pass@localhost:5432/db');
            const schema = await extractor.extract();

            expect(schema.databaseType).toBe('postgresql');
            expect(schema.tables).toHaveLength(1);
            expect(schema.tables[0].name).toBe('users');
            expect(schema.tables[0].columns).toHaveLength(1);
            expect(schema.tables[0].columns[0].name).toBe('id');
        });
    });

    describe('MySQLExtractor', () => {
        it('should extract schema correctly', async () => {
            // MySQL2 query() returns [rows, fields] tuple
            mockMysqlQuery
                .mockResolvedValueOnce([[{ table_name: 'users', table_comment: 'User table', engine: 'InnoDB', auto_increment: null }], []]) // Tables
                .mockResolvedValueOnce([[{ column_name: 'id', column_type: 'int', is_nullable: 'NO', column_key: 'PRI', column_default: null, extra: '' }], []]) // Columns  
                .mockResolvedValueOnce([[{ index_name: 'PRIMARY', non_unique: 0, index_type: 'BTREE', columns: 'id' }], []]) // Indexes with columns as comma-separated string
                .mockResolvedValueOnce([[{ index_name: 'PRIMARY' }], []]) // PK check query
                .mockResolvedValueOnce([[], []]); // Foreign Keys

            const extractor = new MySQLExtractor('mysql://user:pass@localhost:3306/db');
            const schema = await extractor.extract();

            expect(schema.databaseType).toBe('mysql');
            expect(schema.tables).toHaveLength(1);
            expect(schema.tables[0].name).toBe('users');
            expect(schema.tables[0].columns[0].name).toBe('id');
            expect(schema.tables[0].primaryKey).toContain('id');
        });
    });

    describe('SQLiteExtractor', () => {
        it('should extract schema correctly', async () => {
            mockSqliteAll
                .mockImplementationOnce((query, cb) => cb(null, [{ name: 'users', sql: 'CREATE TABLE users...' }])) // Tables
                .mockImplementationOnce((query, cb) => cb(null, [{ name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 }])) // Columns
                .mockImplementationOnce((query, cb) => cb(null, [])) // Indexes
                .mockImplementationOnce((query, cb) => cb(null, [])); // Foreign Keys

            const extractor = new SQLiteExtractor('file:test.db');
            const schema = await extractor.extract();

            expect(schema.databaseType).toBe('sqlite');
            expect(schema.tables).toHaveLength(1);
            expect(schema.tables[0].name).toBe('users');
            expect(schema.tables[0].columns[0].name).toBe('id');
            expect(schema.tables[0].primaryKey).toContain('id');
        });
    });

    describe('MongoDBExtractor', () => {
        it('should extract schema correctly with sampling', async () => {
            mockMongoFind.mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([
                        { _id: '123', name: 'John', age: 30, active: true, tags: ['a', 'b'], metadata: { created: new Date() } }
                    ])
                })
            });
            mockMongoIndexes.mockResolvedValue([{ name: '_id_', key: { _id: 1 }, unique: true }]);

            const extractor = new MongoDBExtractor('mongodb://localhost:27017/test');
            const schema = await extractor.extract();

            expect(schema.databaseType).toBe('mongodb');
            expect(schema.collections).toHaveLength(1);
            expect(schema.collections[0].name).toBe('users');

            const fields = schema.collections[0].fields;
            expect(fields).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: 'name', type: 'String' }),
                expect.objectContaining({ name: 'age', type: 'Int' }),
                expect.objectContaining({ name: 'active', type: 'Boolean' }),
                expect.objectContaining({ name: 'tags' }),
                expect.objectContaining({ name: 'metadata', type: 'Object' })
            ]));
        });
    });

    describe('FirebaseExtractor', () => {
        it('should extract schema correctly with sampling', async () => {
            const mockDocs = [
                {
                    data: () => ({
                        name: 'John',
                        age: 30,
                        active: true,
                        tags: ['a', 'b'],
                        metadata: { created: new Date() },
                        ref: { _path: 'users/123', firestore: {} } // Simulate reference
                    })
                }
            ];

            mockFirestoreGet.mockResolvedValue({
                size: 1,
                docs: mockDocs
            });

            process.env.GOOGLE_APPLICATION_CREDENTIALS = 'mock-creds.json';

            const extractor = new FirebaseExtractor('test-project');
            const schema = await extractor.extract();

            expect(schema.databaseType).toBe('firebase');
            expect(schema.collections).toHaveLength(1);
            expect(schema.collections[0].name).toBe('users');

            const fields = schema.collections[0].fields;
            expect(fields).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: 'name', type: 'String' }),
                expect.objectContaining({ name: 'age', type: 'Number' }),
                expect.objectContaining({ name: 'active', type: 'Boolean' }),
                expect.objectContaining({ name: 'tags' }),
                expect.objectContaining({ name: 'metadata', type: 'Map' }),
                expect.objectContaining({ name: 'ref', type: 'Reference', isReference: true })
            ]));

            delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
        });
    });

    describe('PrismaExtractor', () => {
        it('should extract schema from Prisma file', async () => {
            const prismaSchema = `
        metadata {
          provider = "prisma-client-js"
        }
        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }
        model User {
          id    Int     @id @default(autoincrement())
          email String  @unique
          name  String?
          role  String  @default("USER")
        }
      `;
            (fs.readFileSync as jest.Mock).mockReturnValue(prismaSchema);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const extractor = new PrismaExtractor('schema.prisma');
            const schema = await extractor.extract();

            expect(schema.tables).toHaveLength(1);
            expect(schema.tables[0].name).toBe('User');
            expect(schema.tables[0].columns).toHaveLength(4);
            expect(schema.tables[0].primaryKey).toEqual(['id']);
        });
    });

    describe('DrizzleExtractor', () => {
        it('should extract schema from Drizzle file', async () => {
            const drizzleSchemaContent = `
        import { pgTable, serial, text, boolean, integer } from 'drizzle-orm/pg-core';

        export const users = pgTable('users', {
          id: serial('id').primaryKey(),
          fullName: text('full_name'),
          phone: varchar('phone', { length: 256 }),
        });
      `;

            (fs.readFileSync as jest.Mock).mockReturnValue(drizzleSchemaContent);
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const extractor = new DrizzleExtractor('src/db/schema.ts');
            const schema = await extractor.extract();

            expect(schema.tables).toHaveLength(1);
            expect(schema.tables[0].name).toBe('users');
            expect(schema.tables[0].columns.length).toBeGreaterThan(0);
        });
    });

});
