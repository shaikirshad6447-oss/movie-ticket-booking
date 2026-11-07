/**
 * Automated Database Provisioning and Seeding Script
 * Online Movie Ticket Booking System - Project Owner: Shaik Irshad
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seedDatabase() {
    console.log('🎬 [IRSHAD CINEMAS] Initializing MySQL Database for Online Movie Ticket Booking System...');
    console.log(`Connecting to MySQL host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);

    // Create initial connection without selecting the database first to ensure database exists
    const rootConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        multipleStatements: true
    });

    try {
        console.log('✓ Successfully authenticated with MySQL server.');

        const dbName = process.env.DB_NAME || 'movie_ticket_booking';
        console.log(`Creating database \`${dbName}\` if not exists...`);
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConnection.query(`USE \`${dbName}\`;`);

        // Read schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema.sql statements...');
        await rootConnection.query(schemaSql);

        // Verification query
        const [users] = await rootConnection.query('SELECT COUNT(*) AS total_users FROM users');
        const [movies] = await rootConnection.query('SELECT COUNT(*) AS total_movies FROM movies');
        const [shows] = await rootConnection.query('SELECT COUNT(*) AS total_shows FROM shows');
        const [bookings] = await rootConnection.query('SELECT COUNT(*) AS total_bookings FROM bookings');

        console.log('🎉 Database initialization and seeding successful!');
        console.log(`  - Users: ${users[0].total_users}`);
        console.log(`  - Movies: ${movies[0].total_movies}`);
        console.log(`  - Shows: ${shows[0].total_shows}`);
        console.log(`  - Bookings: ${bookings[0].total_bookings}`);
        console.log('Ready for production operations.');
    } catch (err) {
        console.error('❌ Database seeding error:', err.message);
        throw err;
    } finally {
        await rootConnection.end();
    }
}

if (require.main === module) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = seedDatabase;
