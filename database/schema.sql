-- ==============================================================================
-- ONLINE MOVIE TICKET BOOKING SYSTEM
-- Project Owner: Shaik Irshad
-- Database Schema: movie_ticket_booking
-- Supports: MySQL 8.0+
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS movie_ticket_booking;
USE movie_ticket_booking;

-- Disable foreign key checks for clean teardown/rebuild
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS shows;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- TABLE 1: USERS
-- Purpose: Store customer account information and role-based authentication.
-- ==============================================================================
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- TABLE 2: MOVIES
-- Purpose: Store movie catalog with metadata, runtimes, ratings, and artwork.
-- ==============================================================================
CREATE TABLE movies (
    movie_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    genre VARCHAR(50) NOT NULL,
    language VARCHAR(30) NOT NULL,
    duration INT NOT NULL, -- runtime in minutes
    release_date DATE NOT NULL,
    poster_url VARCHAR(500) NULL,
    description TEXT NULL,
    rating DECIMAL(3,1) DEFAULT 8.5,
    trailer_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_movie_genre (genre),
    INDEX idx_movie_language (language),
    INDEX idx_movie_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- TABLE 3: SHOWS
-- Purpose: Store cinema show schedules, theatre screens, and ticket pricing.
-- Relationship: movie_id references movies(movie_id)
-- ==============================================================================
CREATE TABLE shows (
    show_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT NOT NULL,
    theatre_name VARCHAR(100) NOT NULL,
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    ticket_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shows_movie
        FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX idx_shows_movie_date (movie_id, show_date),
    INDEX idx_shows_theatre (theatre_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- TABLE 4: BOOKINGS
-- Purpose: Store customer ticket reservations and selected seat matrices.
-- Relationships:
--   user_id references users(user_id)
--   show_id references shows(show_id)
-- ==============================================================================
CREATE TABLE bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    show_id INT NOT NULL,
    seats INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    booking_status VARCHAR(30) NOT NULL DEFAULT 'Confirmed',
    seat_numbers JSON NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_bookings_show
        FOREIGN KEY (show_id) REFERENCES shows(show_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX idx_bookings_user (user_id),
    INDEX idx_bookings_show (show_id),
    INDEX idx_bookings_status (booking_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- SAMPLE DATA INSERTIONS
-- ==============================================================================

-- 1. USERS: Initial Admin & Sample Customers
-- Passwords:
-- Admin@123 => $2a$10$E53AbQCyCQb6IanVYxKmDuKh0xb82TXKo0ICDNSjUHf0mljaeWTly
-- User@123  => $2a$10$/MPh0y.5jRz7.IVMiwFlFe8ae0oFq7.Z.Lanbmtk/1ihqPylgNx4O
INSERT INTO users (user_id, name, email, password, role) VALUES
(1, 'Shaik Irshad (Admin)', 'admin@cinenova.com', '$2a$10$E53AbQCyCQb6IanVYxKmDuKh0xb82TXKo0ICDNSjUHf0mljaeWTly', 'admin'),
(2, 'Shaik Irshad', 'irshad@example.com', '$2a$10$/MPh0y.5jRz7.IVMiwFlFe8ae0oFq7.Z.Lanbmtk/1ihqPylgNx4O', 'customer'),
(3, 'Rahul Sharma', 'rahul.sharma@example.com', '$2a$10$/MPh0y.5jRz7.IVMiwFlFe8ae0oFq7.Z.Lanbmtk/1ihqPylgNx4O', 'customer'),
(4, 'Priya Patel', 'priya.patel@example.com', '$2a$10$/MPh0y.5jRz7.IVMiwFlFe8ae0oFq7.Z.Lanbmtk/1ihqPylgNx4O', 'customer'),
(5, 'Ananya Reddy', 'ananya.reddy@example.com', '$2a$10$/MPh0y.5jRz7.IVMiwFlFe8ae0oFq7.Z.Lanbmtk/1ihqPylgNx4O', 'customer');

-- 2. MOVIES: 10 Realistic Blockbuster Titles
INSERT INTO movies (movie_id, title, genre, language, duration, release_date, poster_url, description, rating, trailer_url) VALUES
(1, 'Oppenheimer', 'Biography / Drama / History', 'English', 180, '2023-07-21', 
 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 
 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.', 
 8.9, 'https://www.youtube.com/watch?v=uYPbbksJxIg'),

(2, 'Inception', 'Sci-Fi / Action', 'English', 148, '2010-07-16', 
 'https://image.tmdb.org/t/p/w780/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', 
 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', 
 8.8, 'https://www.youtube.com/watch?v=YoHD9XEInc0'),

(3, 'Interstellar', 'Sci-Fi / Adventure / Drama', 'English', 169, '2014-11-07', 
 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 
 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft along with a team of researchers to find a new planet for humans.', 
 8.7, 'https://www.youtube.com/watch?v=zSWdZVtXT7E'),

(4, 'The Dark Knight', 'Action / Crime / Drama', 'English', 152, '2008-07-18', 
 'https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 
 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', 
 9.0, 'https://www.youtube.com/watch?v=EXeTwQWrcwY'),

(5, 'Dune: Part Two', 'Sci-Fi / Adventure', 'English', 166, '2024-03-01', 
 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', 
 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.', 
 8.6, 'https://www.youtube.com/watch?v=Way9Dexny3w'),

(6, 'Gladiator II', 'Action / Adventure / Drama', 'English', 148, '2024-11-15', 
 'https://image.tmdb.org/t/p/w780/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg', 
 'Years after witnessing the death of revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered by tyrannical emperors.', 
 8.2, 'https://www.youtube.com/watch?v=4rgYUipGJNo'),

(7, 'Kalki 2898 AD', 'Sci-Fi / Action / Mythological', 'Telugu', 181, '2024-06-27', 
 'https://image.tmdb.org/t/p/w780/faXTvL1f1yM7d9k5k4Cq5QoE8Yv.jpg', 
 'A modern-day avatar of Vishnu, a Hindu god, who is believed to have descended to earth to protect the world from evil forces in a dystopian world.', 
 8.1, 'https://www.youtube.com/watch?v=kQDd1AhGIHk'),

(8, 'Jawan', 'Action / Thriller', 'Hindi', 169, '2023-09-07', 
 'https://image.tmdb.org/t/p/w780/jCWmB77LzQZ9hY7r0zFkE2B3rD1.jpg', 
 'A high-octane action thriller outlining the emotional journey of a man who is set to rectify the wrongs in society driven by a personal vendetta.', 
 7.8, 'https://www.youtube.com/watch?v=COv52Qyctws'),

(9, 'Spider-Man: Across the Spider-Verse', 'Animation / Action / Adventure', 'English', 140, '2023-06-02', 
 'https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 
 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.', 
 8.7, 'https://www.youtube.com/watch?v=cqGjhVJWtEg'),

(10, 'RRR', 'Action / Drama', 'Telugu', 187, '2022-03-25', 
 'https://image.tmdb.org/t/p/w780/nEufeZlyAOLqO2brrs0yeMu1QXO.jpg', 
 'A fictitious story about two legendary revolutionaries and their journey away from home before they began fighting for their country in the 1920s.', 
 8.8, 'https://www.youtube.com/watch?v=NgBoAMWnAbM');

-- 3. SHOWS: 16 Realistic Shows Across Multiple Theatres and Showtimes
INSERT INTO shows (show_id, movie_id, theatre_name, show_date, show_time, ticket_price) VALUES
(1, 1, 'PVR INOX Gold Class - Nexus Mall', '2026-11-07', '10:30:00', 350.00),
(2, 1, 'IMAX Experience - Forum South', '2026-11-07', '14:15:00', 450.00),
(3, 1, 'Cinepolis VIP - Grand Central', '2026-11-07', '18:00:00', 380.00),
(4, 2, 'PVR INOX Gold Class - Nexus Mall', '2026-11-07', '11:00:00', 300.00),
(5, 2, 'Miraj Cinemas - Apex Towers', '2026-11-07', '19:30:00', 250.00),
(6, 3, 'IMAX Experience - Forum South', '2026-11-07', '21:30:00', 450.00),
(7, 4, 'Cinepolis VIP - Grand Central', '2026-11-08', '13:00:00', 350.00),
(8, 4, 'Miraj Cinemas - Apex Towers', '2026-11-08', '17:30:00', 280.00),
(9, 5, 'IMAX Experience - Forum South', '2026-11-08', '15:45:00', 500.00),
(10, 5, 'PVR INOX Gold Class - Nexus Mall', '2026-11-08', '20:15:00', 420.00),
(11, 6, 'Cinepolis VIP - Grand Central', '2026-11-08', '18:30:00', 400.00),
(12, 7, 'Miraj Cinemas - Apex Towers', '2026-11-09', '11:30:00', 280.00),
(13, 7, 'PVR INOX Gold Class - Nexus Mall', '2026-11-09', '16:00:00', 360.00),
(14, 8, 'Cinepolis VIP - Grand Central', '2026-11-09', '14:00:00', 320.00),
(15, 9, 'IMAX Experience - Forum South', '2026-11-09', '12:00:00', 420.00),
(16, 10, 'Miraj Cinemas - Apex Towers', '2026-11-09', '20:00:00', 300.00);

-- 4. BOOKINGS: Sample Confirmed Bookings with Seat Numbers
INSERT INTO bookings (booking_id, user_id, show_id, seats, total_amount, booking_status, seat_numbers, booking_date) VALUES
(1, 3, 1, 2, 700.00, 'Confirmed', '["A1", "A2"]', '2026-11-06 14:20:00'),
(2, 4, 1, 3, 1050.00, 'Confirmed', '["C4", "C5", "C6"]', '2026-11-06 16:45:00'),
(3, 5, 2, 2, 900.00, 'Confirmed', '["F1", "F2"]', '2026-11-07 09:10:00'),
(4, 2, 3, 2, 760.00, 'Confirmed', '["D7", "D8"]', '2026-11-07 11:30:00');
