import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.ts'

const connectionString = process.env.DATABASE_URL?.replace(':6543', ':5432')

const pool = new pg.Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false },
})

export const db = drizzle(pool, { schema })
