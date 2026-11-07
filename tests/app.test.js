/**
 * ==============================================================================
 * Comprehensive Verification Test Suite
 * Online Movie Ticket Booking System - Project Owner: Shaik Irshad
 * ==============================================================================
 */

const http = require('http');
const app = require('../server');
const pool = require('../config/db');

const TEST_PORT = 3002;
let serverInstance;

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let json = null;
                try {
                    json = JSON.parse(body);
                } catch (e) {
                    json = body;
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: json
                });
            });
        });

        req.on('error', reject);

        if (postData) {
            const dataStr = typeof postData === 'string' ? postData : JSON.stringify(postData);
            req.write(dataStr);
        }
        req.end();
    });
}

async function runTestSuite() {
    console.log('\n================================================================');
    console.log('🧪 Starting IRSHAD CINEMAS Automated System Verification Suite');
    console.log('👤 Project Owner: Shaik Irshad');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  ✓ [PASS] ${testName}`);
            passed++;
        } else {
            console.error(`  ✗ [FAIL] ${testName}`);
            failed++;
        }
    }

    // Start HTTP Server on dedicated test port
    await new Promise((resolve) => {
        serverInstance = app.listen(TEST_PORT, () => {
            console.log(`  ℹ Test HTTP Server listening on port ${TEST_PORT}\n`);
            resolve();
        });
    });

    let adminToken = null;
    let customerToken = null;
    let testShowId = null;
    let bookedSeatLabel = null;

    try {
        // ---------------------------------------------------------------------
        // TEST GROUP 1: DATABASE INTEGRITY & FOUR REQUIRED TABLES
        // ---------------------------------------------------------------------
        console.log('📦 TEST GROUP 1: Database & Table Schema Integrity');
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
        
        assert(tableNames.includes('users'), 'Table 1: `users` exists');
        assert(tableNames.includes('movies'), 'Table 2: `movies` exists');
        assert(tableNames.includes('shows'), 'Table 3: `shows` exists');
        assert(tableNames.includes('bookings'), 'Table 4: `bookings` exists');

        const [userCols] = await pool.query('DESCRIBE users');
        const userColNames = userCols.map(c => c.Field.toLowerCase());
        assert(userColNames.includes('user_id') && userColNames.includes('name') && userColNames.includes('email') && userColNames.includes('password'), 'Table `users` matches question paper fields');

        const [movieCols] = await pool.query('DESCRIBE movies');
        const movieColNames = movieCols.map(c => c.Field.toLowerCase());
        assert(movieColNames.includes('movie_id') && movieColNames.includes('title') && movieColNames.includes('genre') && movieColNames.includes('duration'), 'Table `movies` matches question paper fields');

        const [bookingCols] = await pool.query('DESCRIBE bookings');
        const bookingColNames = bookingCols.map(c => c.Field.toLowerCase());
        assert(bookingColNames.includes('seat_numbers'), 'Table `bookings` includes required `seat_numbers` JSON field');

        // ---------------------------------------------------------------------
        // TEST GROUP 2: SYSTEM HEALTH & SECURITY HEADERS
        // ---------------------------------------------------------------------
        console.log('\n🛡️ TEST GROUP 2: System Health & Security');
        const healthRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/health',
            method: 'GET'
        });
        assert(healthRes.statusCode === 200, 'GET /api/health returns 200 OK');
        assert(healthRes.body.owner === 'Shaik Irshad', 'Health API attributes project ownership to Shaik Irshad');
        assert(healthRes.headers['x-dns-prefetch-control'] !== undefined, 'Helmet HTTP security headers active');

        // ---------------------------------------------------------------------
        // TEST GROUP 3: AUTHENTICATION APIS (JWT, BCRYPT, REGISTRATION)
        // ---------------------------------------------------------------------
        console.log('\n🔐 TEST GROUP 3: Authentication & Authorization');
        
        // 1. Admin Login
        const adminLoginRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'admin@irshadcinemas.com',
            password: 'Admin@123'
        });

        assert(adminLoginRes.statusCode === 200, 'Admin login with valid password succeeds (200)');
        assert(adminLoginRes.body.token !== undefined, 'JWT token returned on admin login');
        assert(adminLoginRes.body.user.role === 'admin', 'Admin user payload has role="admin"');
        adminToken = adminLoginRes.body.token;

        // 2. Customer Registration
        const testEmail = `testuser_${Date.now()}@example.com`;
        const registerRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/auth/register',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            name: 'Shaik Verification User',
            email: testEmail,
            password: 'Password@123',
            confirmPassword: 'Password@123'
        });

        assert(registerRes.statusCode === 201, 'Customer registration succeeds (201)');
        assert(registerRes.body.token !== undefined, 'JWT token returned on registration');
        customerToken = registerRes.body.token;

        // 3. Duplicate Email Prevention
        const dupRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/auth/register',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            name: 'Another User',
            email: testEmail,
            password: 'Password@123',
            confirmPassword: 'Password@123'
        });
        assert(dupRes.statusCode === 409, 'Duplicate email registration rejected with 409 Conflict');

        // 4. Invalid Password Rejection
        const badLoginRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: testEmail,
            password: 'WrongPassword'
        });
        assert(badLoginRes.statusCode === 401, 'Invalid password rejected with 401 Unauthorized');

        // 5. Auth Me Endpoint
        const meRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/auth/me',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(meRes.statusCode === 200, 'GET /api/auth/me succeeds with valid JWT');
        assert(meRes.body.user.email === testEmail, 'User profile correctly identified');

        // ---------------------------------------------------------------------
        // TEST GROUP 4: MOVIE APIS & CATALOG FILTERING
        // ---------------------------------------------------------------------
        console.log('\n🎬 TEST GROUP 4: Movies Catalog & Filters');
        
        const moviesRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/movies',
            method: 'GET'
        });
        assert(moviesRes.statusCode === 200, 'GET /api/movies returns 200 OK');
        assert(moviesRes.body.count >= 8, `Catalog contains at least 8 movies (found: ${moviesRes.body.count})`);

        // Filter by Genre
        const genreRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/movies?genre=Sci-Fi',
            method: 'GET'
        });
        assert(genreRes.statusCode === 200 && genreRes.body.movies.length > 0, 'Genre filtering works (Sci-Fi found)');

        // Search by Title
        const searchRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/movies?search=Oppenheimer',
            method: 'GET'
        });
        assert(searchRes.statusCode === 200 && searchRes.body.movies[0].title === 'Oppenheimer', 'Search query correctly locates "Oppenheimer"');

        // SQL Injection Attempt Prevention
        const sqliRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: `/api/movies?search=${encodeURIComponent("' OR '1'='1")}`,
            method: 'GET'
        });
        assert(sqliRes.statusCode === 200 && sqliRes.body.movies.length === 0, 'SQL Injection in search sanitized (returns 0 records without error)');

        // Single Movie Details
        const firstMovieId = moviesRes.body.movies[0].movie_id;
        const singleMovieRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: `/api/movies/${firstMovieId}`,
            method: 'GET'
        });
        assert(singleMovieRes.statusCode === 200, 'GET /api/movies/:id returns single movie with shows');

        // ---------------------------------------------------------------------
        // TEST GROUP 5: SHOWS APIS & SEAT AVAILABILITY
        // ---------------------------------------------------------------------
        console.log('\n🎭 TEST GROUP 5: Shows & Real-Time Seat Availability');
        
        const showsRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/shows',
            method: 'GET'
        });
        assert(showsRes.statusCode === 200, 'GET /api/shows returns 200 OK');
        assert(showsRes.body.count >= 12, `Shows catalog contains at least 12 shows (found: ${showsRes.body.count})`);

        testShowId = showsRes.body.shows[0].show_id;

        // Seat Availability Matrix for Show
        const seatsRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: `/api/shows/${testShowId}/seats`,
            method: 'GET'
        });
        assert(seatsRes.statusCode === 200, 'GET /api/shows/:id/seats returns booked seat array');
        assert(Array.isArray(seatsRes.body.booked_seats), 'booked_seats is an Array');

        // ---------------------------------------------------------------------
        // TEST GROUP 6: ATOMIC SEAT RESERVATION & CONCURRENCY TRANSACTION
        // ---------------------------------------------------------------------
        console.log('\n🎟️ TEST GROUP 6: Transactional Booking & Duplicate Seat Prevention');
        
        // Pick an unoccupied seat (e.g. H7, H8)
        const currentlyBooked = new Set(seatsRes.body.booked_seats.map(s => String(s).toUpperCase()));
        bookedSeatLabel = 'H8';
        if (currentlyBooked.has(bookedSeatLabel)) {
            bookedSeatLabel = 'H9';
        }

        // 1. Initial Booking Attempt (Must Succeed)
        const bookingAttempt1 = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/bookings',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            }
        }, {
            show_id: testShowId,
            seat_numbers: [bookedSeatLabel]
        });

        assert(bookingAttempt1.statusCode === 201, `Customer successfully reserves seat ${bookedSeatLabel} (201 Created)`);
        assert(bookingAttempt1.body.booking.booking_status === 'Confirmed', 'Booking status is "Confirmed"');

        // 2. Duplicate Seat Booking Attempt (Must Fail with 409 Conflict)
        const duplicateAttempt = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/bookings',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            }
        }, {
            show_id: testShowId,
            seat_numbers: [bookedSeatLabel]
        });

        assert(duplicateAttempt.statusCode === 409, `Duplicate reservation for seat ${bookedSeatLabel} correctly blocked with 409 Conflict`);
        assert(duplicateAttempt.body.conflicting_seats.includes(bookedSeatLabel), 'Conflicting seat reported back to client');

        // 3. User Booking History
        const myBookingsRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/bookings/my',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(myBookingsRes.statusCode === 200, 'GET /api/bookings/my retrieves user booking records');
        assert(myBookingsRes.body.bookings.length >= 1, 'Confirmed booking present in customer history');

        // ---------------------------------------------------------------------
        // TEST GROUP 7: ROLE-BASED ADMIN AUTHORIZATION & CRUD
        // ---------------------------------------------------------------------
        console.log('\n👑 TEST GROUP 7: Admin Authorization & Management Operations');
        
        // 1. Regular Customer attempting Admin Dashboard
        const unauthorizedAdminRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/admin/dashboard',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        assert(unauthorizedAdminRes.statusCode === 403, 'Regular customer blocked from /api/admin/dashboard (403 Forbidden)');

        // 2. Admin successfully accessing Dashboard
        const authorizedAdminRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/admin/dashboard',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(authorizedAdminRes.statusCode === 200, 'Admin successfully accesses /api/admin/dashboard');
        assert(authorizedAdminRes.body.stats.total_movies > 0, 'Admin overview metrics populated');

        // 3. Admin Users List
        const adminUsersRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/admin/users',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(adminUsersRes.statusCode === 200, 'GET /api/admin/users returns customer directory');

        // 4. Admin Movie CRUD: Create, Update, Delete
        const createMovieRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/movies',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        }, {
            title: 'Automated Test Movie Title',
            genre: 'Sci-Fi / Action',
            language: 'English',
            duration: 120,
            release_date: '2026-11-01',
            rating: 8.5
        });
        assert(createMovieRes.statusCode === 201, 'Admin POST /api/movies creates movie');
        const createdMovieId = createMovieRes.body.movie.movie_id;

        const updateMovieRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: `/api/movies/${createdMovieId}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        }, {
            title: 'Updated Test Movie Title'
        });
        assert(updateMovieRes.statusCode === 200 && updateMovieRes.body.movie.title === 'Updated Test Movie Title', 'Admin PUT /api/movies/:id updates movie');

        const deleteMovieRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: `/api/movies/${createdMovieId}`,
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(deleteMovieRes.statusCode === 200, 'Admin DELETE /api/movies/:id removes movie');

        // 5. Admin Show CRUD: Create Show & Delete Show
        const createShowRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: '/api/shows',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        }, {
            movie_id: firstMovieId,
            theatre_name: 'Test Theatre Screen',
            show_date: '2026-11-10',
            show_time: '19:00:00',
            ticket_price: 320.00
        });
        assert(createShowRes.statusCode === 201, 'Admin POST /api/shows schedules new show');
        const createdShowId = createShowRes.body.show.show_id;

        const deleteShowRes = await makeRequest({
            hostname: 'localhost',
            port: TEST_PORT,
            path: `/api/shows/${createdShowId}`,
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(deleteShowRes.statusCode === 200, 'Admin DELETE /api/shows/:id deletes show');

    } catch (suiteError) {
        console.error('💥 Test Suite Exception:', suiteError);
        failed++;
    } finally {
        if (serverInstance) {
            serverInstance.close();
        }
        await pool.end();
    }

    console.log('\n================================================================');
    console.log(`📊 Test Execution Summary:`);
    console.log(`   Total Tests Executed: ${passed + failed}`);
    console.log(`   ✓ Passed: ${passed}`);
    console.log(`   ✗ Failed: ${failed}`);
    console.log('================================================================\n');

    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED! System is production-ready.\n');
        process.exit(0);
    } else {
        console.error('❌ SOME TESTS FAILED. Please review the output above.\n');
        process.exit(1);
    }
}

if (require.main === module) {
    runTestSuite();
}

module.exports = runTestSuite;
