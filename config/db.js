/**
 * MySQL Database Pool Configuration
 * Online Movie Ticket Booking System - Project Owner: Shaik Irshad
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'movie_ticket_booking',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    timezone: '+00:00'
};

const pool = mysql.createPool(dbConfig);

// Perform connection verification on application start
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`✓ MySQL Connection Pool established successfully on [${dbConfig.host}:${dbConfig.port}/${dbConfig.database}]`);
        connection.release();
    } catch (err) {
        console.error('❌ Failed to establish MySQL Connection:');
        console.error(`   Host: ${dbConfig.host}, Port: ${dbConfig.port}, Database: ${dbConfig.database}, User: ${dbConfig.user}`);
        console.error(`   Error message: ${err.message}`);
        console.error('   Please check your .env database credentials and verify MySQL Server is running.');
    }
})();

module.exports = pool;
