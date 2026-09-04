const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve Frontend Static Files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Route root to Home.html
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'Home.html'));
});

// Automatic Database Initialization & Seed Function
async function initDatabase() {
    try {
        // 1. Create Users Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT NOT NULL AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role ENUM('student', 'owner', 'admin') NOT NULL DEFAULT 'student',
                phone VARCHAR(50) DEFAULT NULL,
                college VARCHAR(255) DEFAULT NULL,
                city VARCHAR(100) DEFAULT NULL,
                kyc_status VARCHAR(50) DEFAULT 'Pending',
                status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Create Properties Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS properties (
                id INT NOT NULL AUTO_INCREMENT,
                owner_id INT DEFAULT NULL,
                owner_name VARCHAR(255) NOT NULL,
                owner_phone VARCHAR(50) NOT NULL,
                owner_email VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                price VARCHAR(100) NOT NULL,
                raw_price INT NOT NULL DEFAULT 0,
                location VARCHAR(255) NOT NULL,
                city VARCHAR(100) DEFAULT 'Delhi / NCR',
                gender VARCHAR(50) NOT NULL,
                room_type VARCHAR(100) NOT NULL,
                image TEXT DEFAULT NULL,
                amenities TEXT DEFAULT NULL,
                description TEXT DEFAULT NULL,
                status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                rating DECIMAL(3,1) DEFAULT 4.8,
                reviews_count INT DEFAULT 12,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Create Bookings Table
        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT NOT NULL AUTO_INCREMENT,
                booking_code VARCHAR(100) NOT NULL UNIQUE,
                property_id INT DEFAULT NULL,
                property_title VARCHAR(255) NOT NULL,
                property_location VARCHAR(255) DEFAULT 'University Area, Delhi',
                property_image TEXT DEFAULT NULL,
                tenant_id INT DEFAULT NULL,
                tenant_name VARCHAR(255) NOT NULL,
                tenant_email VARCHAR(255) NOT NULL,
                tenant_phone VARCHAR(50) NOT NULL,
                move_in_date DATE DEFAULT NULL,
                deposit_paid VARCHAR(100) DEFAULT '₹2,500',
                price VARCHAR(100) DEFAULT NULL,
                room_number VARCHAR(100) DEFAULT 'Awaiting Admin Assignment',
                key_pass VARCHAR(100) DEFAULT 'Pending Verification',
                status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                payment_status VARCHAR(255) DEFAULT 'Pending Admin Verification (24h Review)',
                booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Ensure missing columns are added to bookings if it was initialized with an older schema
        try {
            await db.query(`ALTER TABLE bookings ADD COLUMN property_location VARCHAR(255) DEFAULT 'University Area, Delhi'`);
        } catch (err) {
            // Ignore if column already exists
        }
        try {
            await db.query(`ALTER TABLE bookings ADD COLUMN property_image TEXT DEFAULT NULL`);
        } catch (err) {
            // Ignore if column already exists
        }

        // Ensure Admin user exists
        const [adminRows] = await db.query('SELECT * FROM users WHERE LOWER(email) = ?', ['admin@stayfinder.com']);
        if (adminRows.length === 0) {
            await db.query(`
                INSERT INTO users (name, email, password, role, phone, college, kyc_status, status)
                VALUES ('System Administrator', 'admin@stayfinder.com', 'admin123', 'admin', '+91 99999 88888', 'StayFinder HQ', 'Verified', 'approved')
            `);
        }

        console.log('✅ Database schema verified.');
    } catch (err) {
        console.warn('⚠️ Database auto-initialization warning:', err.message);
    }
}

// Run DB Init on Startup
initDatabase();

// Health Check Route
app.get('/', (req, res) => {
    res.json({ message: 'StayFinder Backend API Server is Running Live!', status: 'OK' });
});

// ==========================================
// AUTHENTICATION & REGISTRATION ENDPOINTS
// ==========================================

// Register Student Account (Status: pending)
app.post('/api/auth/register-student', async (req, res) => {
    try {
        const { name, email, college, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, Email and Password are required.' });
        }

        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists. Please login instead.' });
        }

        const [result] = await db.query(
            `INSERT INTO users (name, email, password, role, college, phone, kyc_status, status) 
             VALUES (?, ?, ?, 'student', ?, ?, 'Pending Verification', 'pending')`,
            [name, email, password, college || '', phone || '']
        );

        res.status(201).json({
            success: true,
            message: 'Student account registered successfully! Account sent to Admin Approval Queue.',
            userId: result.insertId
        });
    } catch (err) {
        console.error('Error in student registration:', err);
        res.status(500).json({ success: false, message: 'Server error during registration: ' + err.message });
    }
});

// Register Property Owner Account (Status: pending)
app.post('/api/auth/register-owner', async (req, res) => {
    try {
        const { name, email, phone, city, password } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Owner Name and Email are required.' });
        }

        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        let userId = null;

        if (existing.length > 0) {
            userId = existing[0].id;
        } else {
            const [result] = await db.query(
                `INSERT INTO users (name, email, password, role, phone, city, kyc_status, status) 
                 VALUES (?, ?, ?, 'owner', ?, ?, 'Pending KYC', 'pending')`,
                [name, email, password || 'owner123', phone || '', city || 'Delhi']
            );
            userId = result.insertId;
        }

        res.status(201).json({
            success: true,
            message: 'Owner account registered in database. Awaiting Admin Approval.',
            userId
        });
    } catch (err) {
        console.error('Error in owner registration:', err);
        res.status(500).json({ success: false, message: 'Server error during owner registration: ' + err.message });
    }
});

// Login Endpoint with DB Verification & Admin Approval Check
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and Password are required.' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                code: 'NOT_REGISTERED',
                message: 'Account not found in database. You need to first register before logging in.'
            });
        }

        const user = users[0];

        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid password. Please check your credentials and try again.'
            });
        }

        if (user.status === 'pending') {
            return res.status(403).json({
                success: false,
                code: 'APPROVAL_PENDING',
                message: 'Your registration is pending Admin approval. You cannot log in until an Admin approves your account.'
            });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({
                success: false,
                code: 'ACCOUNT_REJECTED',
                message: 'Your account registration was rejected by the Admin.'
            });
        }

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                phone: user.phone,
                college: user.college
            }
        });
    } catch (err) {
        console.error('Error in login endpoint:', err);
        res.status(500).json({ success: false, message: 'Server error during authentication: ' + err.message });
    }
});

// ==========================================
// PROPERTY MANAGEMENT ENDPOINTS
// ==========================================

// Register Property Listing (Status: pending)
app.post('/api/properties/register', async (req, res) => {
    try {
        const {
            title, category, price, rawPrice, location, city,
            roomType, ownerName, ownerPhone, ownerEmail, image, amenities, description
        } = req.body;

        if (!title || !price || !ownerEmail) {
            return res.status(400).json({ success: false, message: 'Property title, price, and owner email are required.' });
        }

        const [ownerRows] = await db.query('SELECT id FROM users WHERE email = ?', [ownerEmail]);
        let ownerId = null;
        if (ownerRows.length > 0) {
            ownerId = ownerRows[0].id;
        } else {
            const [newOwner] = await db.query(
                `INSERT INTO users (name, email, password, role, phone, kyc_status, status)
                 VALUES (?, ?, 'owner123', 'owner', ?, 'Pending KYC', 'pending')`,
                [ownerName || 'Property Owner', ownerEmail, ownerPhone || '']
            );
            ownerId = newOwner.insertId;
        }

        const formattedAmenities = Array.isArray(amenities) ? amenities.join(', ') : (amenities || '');
        const gender = (category && category.includes('Girls')) ? 'Girls' : ((category && category.includes('Boys')) ? 'Boys' : 'Both');

        const [result] = await db.query(
            `INSERT INTO properties 
             (owner_id, owner_name, owner_phone, owner_email, title, category, price, raw_price, location, city, gender, room_type, image, amenities, description, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                ownerId, ownerName || 'Property Owner', ownerPhone || '', ownerEmail, title, category || 'Boys PG',
                price.includes('₹') ? price : `₹${price}/mo`, parseInt(rawPrice || price.replace(/[^0-9]/g, '')) || 8500,
                location || 'University Area', city || 'Delhi / NCR', gender, roomType || 'Single Room', image || '', formattedAmenities, description || ''
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Property listing submitted! It is now in the Admin Approval Queue.',
            propertyId: result.insertId
        });
    } catch (err) {
        console.error('Error submitting property:', err);
        res.status(500).json({ success: false, message: 'Failed to submit property listing: ' + err.message });
    }
});

// Fetch Live Approved Properties (Public Website / Home Page)
app.get('/api/properties', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM properties WHERE LOWER(status) = 'approved' ORDER BY id DESC`);
        res.json({ success: true, properties: rows });
    } catch (err) {
        console.error('Error fetching properties:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch properties: ' + err.message });
    }
});

// Fetch Specific Property by ID
app.get('/api/properties/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM properties WHERE id = ?`, [req.params.id]);
        if (rows.length > 0) {
            res.json({ success: true, property: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Property not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Fetch Properties by Owner Email
app.get('/api/properties/owner/:email', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM properties WHERE owner_email = ? ORDER BY id DESC`, [req.params.email]);
        res.json({ success: true, properties: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete Property Endpoint (Admin)
app.delete('/api/admin/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM properties WHERE id = ?`, [id]);
        res.json({ success: true, message: `Property #${id} deleted from database.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// ADMIN DASHBOARD & APPROVAL ENDPOINTS
// ==========================================

// Get Admin Overview Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [[{ pendingProps }]] = await db.query(`SELECT COUNT(*) as pendingProps FROM properties WHERE LOWER(status) = 'pending'`);
        const [[{ pendingBookings }]] = await db.query(`SELECT COUNT(*) as pendingBookings FROM bookings WHERE LOWER(status) = 'pending'`);
        const [[{ pendingOwners }]] = await db.query(`SELECT COUNT(*) as pendingOwners FROM users WHERE LOWER(role) = 'owner' AND LOWER(status) = 'pending'`);
        const [[{ pendingTenants }]] = await db.query(`SELECT COUNT(*) as pendingTenants FROM users WHERE LOWER(role) = 'student' AND LOWER(status) = 'pending'`);
        const [[{ approvedProps }]] = await db.query(`SELECT COUNT(*) as approvedProps FROM properties WHERE LOWER(status) = 'approved'`);

        res.json({
            success: true,
            stats: {
                pendingProps,
                pendingBookings,
                pendingOwners,
                pendingTenants,
                approvedProps
            }
        });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Pending Users (Owners & Students) for Admin Review
app.get('/api/admin/users/pending', async (req, res) => {
    try {
        const [owners] = await db.query(`SELECT * FROM users WHERE LOWER(role) = 'owner' AND LOWER(status) = 'pending' ORDER BY id DESC`);
        const [students] = await db.query(`SELECT * FROM users WHERE LOWER(role) = 'student' AND LOWER(status) = 'pending' ORDER BY id DESC`);
        res.json({ success: true, owners, students });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update User Approval Status (Approve/Reject User)
app.put('/api/admin/users/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        if (!['approved', 'rejected', 'pending'].includes(status.toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Invalid status parameter.' });
        }

        const kycUpdate = status.toLowerCase() === 'approved' ? 'Verified' : 'Rejected';
        await db.query(`UPDATE users SET status = ?, kyc_status = ? WHERE id = ?`, [status.toLowerCase(), kycUpdate, id]);

        res.json({ success: true, message: `User account #${id} has been marked as ${status.toUpperCase()}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Pending & Approved Properties for Admin Review Table
app.get('/api/admin/properties/pending', async (req, res) => {
    try {
        const [pending] = await db.query(`SELECT * FROM properties WHERE LOWER(status) = 'pending' ORDER BY id DESC`);
        const [approved] = await db.query(`SELECT * FROM properties WHERE LOWER(status) = 'approved' ORDER BY id DESC`);
        res.json({ success: true, pendingProperties: pending, approvedProperties: approved });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update Property Status (Approve/Reject Property)
app.put('/api/admin/properties/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status parameter.' });
        }

        await db.query(`UPDATE properties SET status = ? WHERE id = ?`, [status, id]);

        res.json({ success: true, message: `Property #${id} status updated to ${status.toUpperCase()}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get Bookings for Admin Table
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const [bookings] = await db.query(`SELECT * FROM bookings ORDER BY id DESC`);
        const formatted = bookings.map(b => ({
            id: b.booking_code || `ALLOT-2026-${b.id}`,
            dbId: b.id,
            propertyId: b.property_id,
            title: b.property_title,
            location: b.property_location || 'University Area, Delhi',
            image: b.property_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
            tenantName: b.tenant_name,
            tenantEmail: b.tenant_email,
            tenantPhone: b.tenant_phone,
            moveInDate: b.move_in_date ? new Date(b.move_in_date).toISOString().split('T')[0] : '2026-09-01',
            price: b.price || '₹8,500/mo',
            depositPaid: b.deposit_paid || '₹2,500',
            roomNumber: b.room_number || 'Awaiting Admin Assignment',
            keyPass: b.key_pass || 'Pending Verification',
            status: b.status === 'approved' ? 'Approved' : (b.status === 'rejected' ? 'Rejected' : 'Pending'),
            paymentStatus: b.payment_status || 'Pending Admin Verification (24h Review)',
            bookedAt: b.booked_at
        }));
        res.json({ success: true, bookings: formatted });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// Update Booking Status (Approve & Allot Room / Reject Booking)
app.put('/api/admin/bookings/:id/status', async (req, res) => {
    try {
        const { status, roomNumber, keyPass } = req.body;
        const { id } = req.params;

        const room = roomNumber || 'Room #102 (Block A)';
        const pass = keyPass || '#KEY-' + Math.floor(1000 + Math.random() * 9000);

        const paymentStatus =
            status.toLowerCase() === 'approved'
                ? 'Payment Done - Room Allotted'
                : 'Booking Declined';

        const [result] = await db.query(
            `UPDATE bookings
             SET status = ?, room_number = ?, key_pass = ?, payment_status = ?
             WHERE id = ? OR booking_code = ?`,
            [
                status.toLowerCase(),
                room,
                pass,
                paymentStatus,
                id,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: `Booking #${id} was not found.`
            });
        }

        res.json({
            success: true,
            message: `Booking #${id} status updated successfully.`,
            booking: {
                id: id,
                status: status.toLowerCase(),
                roomNumber: room,
                keyPass: pass,
                paymentStatus: paymentStatus
            }
        });

    } catch (err) {
        console.error('Error updating booking status:', err);

        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
// Delete Booking Endpoint (Admin)
app.delete('/api/admin/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM bookings WHERE id = ? OR booking_code = ?`, [id, id]);
        res.json({ success: true, message: `Booking #${id} deleted from database.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// BOOKING ENDPOINTS
// ==========================================

// Create Booking Request (Pending Admin Room Allotment Approval)
app.post('/api/bookings', async (req, res) => {
    try {
        const {
            bookingCode,
            propertyId, propertyTitle, propertyLocation, propertyImage,
            tenantName, tenantEmail, tenantPhone, moveInDate, price, depositPaid
        } = req.body;

        if (!tenantEmail || !tenantName) {
            return res.status(400).json({ success: false, message: 'Tenant Name and Email are required.' });
        }

        const finalBookingCode = bookingCode || 'ALLOT-2026-' + Math.floor(1000 + Math.random() * 9000);

        // Safely parse propertyId
        const parsedPropertyId = parseInt(propertyId);
        const cleanPropertyId = isNaN(parsedPropertyId) ? null : parsedPropertyId;

        const [result] = await db.query(
            `INSERT INTO bookings 
             (booking_code, property_id, property_title, property_location, property_image, tenant_name, tenant_email, tenant_phone, move_in_date, deposit_paid, price, room_number, key_pass, status, payment_status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Awaiting Admin Assignment', 'Pending Verification', 'pending', 'Pending Admin Verification (24h Review)')`,
            [
                finalBookingCode,
                cleanPropertyId,
                propertyTitle || 'Stay Room Accommodation',
                propertyLocation || 'University Area, Delhi',
                propertyImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
                tenantName,
                tenantEmail,
                tenantPhone || '+91 91234 56789',
                moveInDate || '2026-09-01',
                depositPaid || '₹2,500',
                price || '₹8,500/mo'
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Booking request created! Sent to Admin for 24h room allotment verification.',
            bookingId: result.insertId,
            bookingCode: finalBookingCode,
            booking: {
                id: finalBookingCode,
                propertyId: cleanPropertyId,
                title: propertyTitle || 'Stay Room Accommodation',
                location: propertyLocation || 'University Area, Delhi',
                image: propertyImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
                tenantName,
                tenantEmail,
                tenantPhone: tenantPhone || '+91 91234 56789',
                moveInDate: moveInDate || '2026-09-01',
                price: price || '₹8,500/mo',
                depositPaid: depositPaid || '₹2,500',
                roomNumber: 'Awaiting Admin Assignment',
                keyPass: 'Pending Verification',
                status: 'Pending',
                paymentStatus: 'Pending Admin Verification (24h Review)'
            }
        });
    } catch (err) {
        console.error('Error creating booking:', err);
        res.status(500).json({ success: false, message: 'Server error creating booking: ' + err.message });
    }
});

// Get User Bookings
app.get('/api/bookings/user/:email', async (req, res) => {
    try {
        const [bookings] = await db.query(`SELECT * FROM bookings WHERE tenant_email = ? ORDER BY id DESC`, [req.params.email]);
        const formatted = bookings.map(b => ({
            id: b.booking_code || `ALLOT-2026-${b.id}`,
            dbId: b.id,
            propertyId: b.property_id,
            title: b.property_title,
            location: b.property_location || 'University Area, Delhi',
            image: b.property_image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
            tenantName: b.tenant_name,
            tenantEmail: b.tenant_email,
            tenantPhone: b.tenant_phone,
            moveInDate: b.move_in_date ? new Date(b.move_in_date).toISOString().split('T')[0] : '2026-09-01',
            price: b.price || '₹8,500/mo',
            depositPaid: b.deposit_paid || '₹2,500',
            roomNumber: b.room_number || 'Awaiting Admin Assignment',
            keyPass: b.key_pass || 'Pending Verification',
            status: b.status === 'approved' ? 'Approved' : (b.status === 'rejected' ? 'Rejected' : 'Pending'),
            paymentStatus: b.payment_status || 'Pending Admin Verification (24h Review)',
            bookedAt: b.booked_at
        }));
        res.json({ success: true, bookings: formatted });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StayFinder Express Server listening on port ${PORT}`);
    console.log(`📡 API Server running on port ${PORT}`);
});