import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

// Function to create a new connection pool.
export const createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
    max: 10,
    idleTimeoutMillis: 30000, // keep idle connections around slightly longer to minimize reconnect overhead
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000, // Send active TCP keepalive packets every 10 seconds to keep firewall mappings warm
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Wrap pool.query to handle connection errors and retry
const originalQuery = pool.query;
pool.query = (async function (this: any, ...args: any[]) {
  let attempts = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      attempts++;
      return await originalQuery.apply(this, args as any);
    } catch (err: any) {
      const isConnectionError = 
        err?.message?.includes('Connection terminated unexpectedly') ||
        err?.message?.includes('Client has encountered a connection error') ||
        err?.message?.includes('terminating connection due to administrator command') ||
        err?.message?.includes('read ECONNRESET') ||
        err?.code === '57P01' || 
        err?.code === '57P02' || 
        err?.code === '57P03' ||
        err?.code === '08006' ||
        err?.code === '08001' ||
        err?.code === '08004';

      if (isConnectionError && attempts < maxAttempts) {
        console.log(`[DB Pool] Re-initiating query operation (attempt ${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 150 * attempts));
        continue;
      }
      throw err;
    }
  }
} as any);

// Wrap pool.connect to handle connection errors and retry
const originalConnect = pool.connect;
pool.connect = (async function (this: any, ...args: any[]) {
  let attempts = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      attempts++;
      return await originalConnect.apply(this, args as any);
    } catch (err: any) {
      const isConnectionError = 
        err?.message?.includes('Connection terminated unexpectedly') ||
        err?.message?.includes('Client has encountered a connection error') ||
        err?.message?.includes('terminating connection due to administrator command') ||
        err?.message?.includes('read ECONNRESET') ||
        err?.code === '57P01' || 
        err?.code === '57P02' || 
        err?.code === '57P03' ||
        err?.code === '08006' ||
        err?.code === '08001' ||
        err?.code === '08004';

      if (isConnectionError && attempts < maxAttempts) {
        console.log(`[DB Pool] Re-connecting stream socket (attempt ${attempts}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 150 * attempts));
        continue;
      }
      throw err;
    }
  }
} as any);

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
