import { Pool } from 'pg';

// Fallback to avoid crashing if user hasn't supplied the connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const dbInit = async () => {
    try {
        if (!process.env.DATABASE_URL) {
            console.warn("No DATABASE_URL provided. PostgreSQL will not be connected.");
            return;
        }
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                role VARCHAR(50) NOT NULL CHECK (role IN ('Farmer', 'Transporter', 'Dealer')),
                name VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS listings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                author_id UUID,
                type VARCHAR(50) CHECK (type IN ('Produce', 'Transport Request', 'General Ad')),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'Open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS bids (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                listing_id UUID,
                bidder_id UUID,
                amount DECIMAL(10, 2),
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database tables verified/created.");
    } catch (e) {
        console.error("Failed to initialize database schema:", e);
    }
}

export default pool;
