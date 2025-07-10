import path from 'path';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { execSync } from 'child_process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzleInstance } from './db';
import { URL } from 'url';
import { randomUUID } from 'crypto';

class LocalSetup {
    private createdDatabases: Set<string> = new Set();
    private masterConnectionString: string = '';

    async createDatabase(): Promise<[DrizzleInstance, string]> {

        dotenv.config({ path: path.join(__dirname, '.env.test'), override: true });

        const baseURL = process.env.DATABASE_URL;

        if (!baseURL) throw new Error('DATABASE_URL is not set');

        const masterUrl = new URL(baseURL);
        masterUrl.pathname = '/postgres';

        const masterConn = masterUrl.toString();
        this.masterConnectionString = masterConn;
        const adminPool = new Pool({ connectionString: masterConn });

        const dbName = `testdb_${randomUUID()}`;
        console.log(`Creating local database ${dbName}…`);

        await adminPool.query(`CREATE DATABASE "${dbName}"`);
        this.createdDatabases.add(dbName);
        console.log(`Running migrations on ${dbName}…`);

        const databaseURL: string = masterConn.replace(/\/postgres$/, `/${dbName}`);

        console.log(`Database URL: ${databaseURL}`);

        execSync(`DATABASE_URL=\"${databaseURL}\" npm run db:push`, {
            stdio: 'inherit',
            cwd: process.cwd(),
        });

        const drizzlePool = new Pool({ connectionString: databaseURL });
        const db = drizzle(drizzlePool);

        await adminPool.end();

        return [db, databaseURL];
    }

    async setup(): Promise<() => Promise<void>> {

        console.log('Setting up local environment…');

        return async (): Promise<void> => {
            console.log('Cleaning up created databases…');
            
            if (this.createdDatabases.size > 0 && this.masterConnectionString) {
                const adminPool = new Pool({ connectionString: this.masterConnectionString });
                
                for (const dbName of this.createdDatabases) {
                    try {
                        console.log(`Dropping database ${dbName}…`);
                        // Terminate connections to the database before dropping
                        await adminPool.query(`
                            SELECT pg_terminate_backend(pg_stat_activity.pid)
                            FROM pg_stat_activity
                            WHERE pg_stat_activity.datname = $1
                            AND pid <> pg_backend_pid()
                        `, [dbName]);
                        
                        await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
                        console.log(`Successfully dropped database ${dbName}`);
                    } catch (error) {
                        console.error(`Failed to drop database ${dbName}:`, error);
                    }
                }
                
                await adminPool.end();
                this.createdDatabases.clear();
            }
        };
    }
}

const strategy = new LocalSetup()

export const createDatabase = strategy.createDatabase.bind(strategy);

export default strategy.setup.bind(strategy);


