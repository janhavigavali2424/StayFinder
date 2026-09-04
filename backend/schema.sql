-- StayFinder Database Schema for MySQL / XAMPP phpMyAdmin
-- Database: stayfinder_db

CREATE DATABASE IF NOT EXISTS `stayfinder_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `stayfinder_db`;

-- --------------------------------------------------------
-- Table structure for `users`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('student', 'owner', 'admin') NOT NULL DEFAULT 'student',
  `phone` VARCHAR(50) DEFAULT NULL,
  `college` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `kyc_status` VARCHAR(50) DEFAULT 'Pending',
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `properties`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `properties` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `owner_id` INT DEFAULT NULL,
  `owner_name` VARCHAR(255) NOT NULL,
  `owner_phone` VARCHAR(50) NOT NULL,
  `owner_email` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `price` VARCHAR(100) NOT NULL,
  `raw_price` INT NOT NULL DEFAULT 0,
  `location` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) DEFAULT 'Delhi / NCR',
  `gender` VARCHAR(50) NOT NULL,
  `room_type` VARCHAR(100) NOT NULL,
  `image` TEXT DEFAULT NULL,
  `amenities` TEXT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `rating` DECIMAL(3,1) DEFAULT 4.8,
  `reviews_count` INT DEFAULT 12,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `bookings`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `booking_code` VARCHAR(100) NOT NULL UNIQUE,
  `property_id` INT DEFAULT NULL,
  `property_title` VARCHAR(255) NOT NULL,
  `property_location` VARCHAR(255) DEFAULT 'University Area',
  `property_image` TEXT DEFAULT NULL,
  `tenant_id` INT DEFAULT NULL,
  `tenant_name` VARCHAR(255) NOT NULL,
  `tenant_email` VARCHAR(255) NOT NULL,
  `tenant_phone` VARCHAR(50) NOT NULL,
  `move_in_date` DATE DEFAULT NULL,
  `deposit_paid` VARCHAR(100) DEFAULT '₹2,500',
  `price` VARCHAR(100) DEFAULT NULL,
  `room_number` VARCHAR(100) DEFAULT 'Awaiting Admin Assignment',
  `key_pass` VARCHAR(100) DEFAULT 'Pending Verification',
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `payment_status` VARCHAR(255) DEFAULT 'Pending Admin Verification (24h Review)',
  `booked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Seed Initial Admin User
-- Email: admin@stayfinder.com | Passcode: admin123 | Status: approved
-- --------------------------------------------------------

INSERT INTO `users` (`name`, `email`, `password`, `role`, `phone`, `college`, `kyc_status`, `status`)
VALUES ('System Administrator', 'admin@stayfinder.com', 'admin123', 'admin', '+91 99999 88888', 'StayFinder HQ', 'Verified', 'approved')
ON DUPLICATE KEY UPDATE `status` = 'approved';

-- Sample Seed Properties (Optional for Initial Demo)
INSERT INTO `properties` (`owner_name`, `owner_phone`, `owner_email`, `title`, `category`, `price`, `raw_price`, `location`, `gender`, `room_type`, `image`, `amenities`, `description`, `status`)
VALUES 
('Rajesh Kumar', '+91 98765 12345', 'rajesh@stayfinder.com', 'Starlight Luxury PG for Boys', 'Boys PG', '₹8,500/mo', 8500, 'North Campus, University Road', 'Boys', 'Double Sharing', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80', 'High-Speed Wi-Fi, AC Rooms, 3 Meals Included, CCTV Security', 'Modern fully-furnished PG for male students with high-speed internet and home-style meals near North Campus.', 'approved'),
('Sunita Sharma', '+91 98112 34567', 'sunita@stayfinder.com', 'Serenity Heights Girls Residency', 'Girls PG', '₹9,200/mo', 9200, 'South Campus, Anand Niketan', 'Girls', 'Single Room', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80', 'Biometric Entry, Wi-Fi & Study Desk, Attach Bathroom, Laundry Service', 'Safe premium girls PG featuring biometric security and 24/7 warden.', 'approved');
