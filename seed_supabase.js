import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = postgres(process.env.DATABASE_URL);

async function seed() {
    try {
        console.log('Reading seed file...');
        const seedFilePath = path.join(__dirname, 'database', 'init', '02-demo-data.sql');
        const seedSql = fs.readFileSync(seedFilePath, 'utf8');

        console.log('Executing seed data...');
        // Split by semicolons to execute statements individually if needed, 
        // but postgres.js might handle multiple statements. 
        // Ideally we should use the simple() method for raw SQL dumps.

        await sql.unsafe(seedSql);

        console.log('Seed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seed();
