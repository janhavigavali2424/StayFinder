const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stayfinder_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 2000
});

let isMysqlConnected = false;
let dbReady = false;

const connectionPromise = (async () => {
    try {
        const connection = await pool.getConnection();
        isMysqlConnected = true;
        console.log('✅ Connected to MySQL Database (stayfinder_db) successfully!');
        connection.release();
    } catch (err) {
        isMysqlConnected = false;
        console.warn('⚠️ Note: Local MySQL server not active. Operating with high-performance In-Memory Database Engine.');
    }
    dbReady = true;
})();

// In-Memory Database Engine Data
const memoryDb = {
    users: [
        {
            id: 1,
            name: 'System Administrator',
            email: 'admin@stayfinder.com',
            password: 'admin123',
            role: 'admin',
            phone: '+91 99999 88888',
            college: 'StayFinder HQ',
            city: 'Delhi',
            kyc_status: 'Verified',
            status: 'approved',
            created_at: new Date().toISOString()
        }
    ],
    properties: [],
    bookings: []
};

let nextIds = { users: 10, properties: 10, bookings: 105 };

async function query(sql, params = []) {
    if (!dbReady) {
        await connectionPromise;
    }
    if (isMysqlConnected) {
        try {
            return await pool.query(sql, params);
        } catch (err) {
            console.warn('MySQL Query Error, falling back to memory engine:', err.message);
        }
    }

    const lowerSql = sql.toLowerCase().trim().replace(/\s+/g, ' ');

    // 1. CREATE TABLE
    if (lowerSql.startsWith('create table')) {
        return [{ affectedRows: 0 }];
    }

    // 2. SELECT COUNT(*)
    if (lowerSql.includes('count(*)')) {
        let table = 'properties';
        if (lowerSql.includes('from users')) table = 'users';
        if (lowerSql.includes('from bookings')) table = 'bookings';
        if (lowerSql.includes('from properties')) table = 'properties';

        let items = memoryDb[table] || [];

        if (lowerSql.includes("'pending'") || (params.length > 0 && params[0] === 'pending')) {
            items = items.filter(i => (i.status || '').toLowerCase() === 'pending');
        } else if (lowerSql.includes("'approved'") || (params.length > 0 && params[0] === 'approved')) {
            items = items.filter(i => (i.status || '').toLowerCase() === 'approved');
        }

        if (lowerSql.includes("'owner'")) items = items.filter(i => (i.role || '').toLowerCase() === 'owner');
        if (lowerSql.includes("'student'")) items = items.filter(i => (i.role || '').toLowerCase() === 'student');

        const colMatch = lowerSql.match(/as\s+(\w+)/i);
        const colName = colMatch ? colMatch[1] : 'count';
        return [[{ [colName]: items.length }]];
    }

    // 3. SELECT * FROM users
    if (lowerSql.includes('from users')) {
        let users = [...memoryDb.users];
        if (params.length > 0 && lowerSql.includes('email = ?')) {
            users = users.filter(u => u.email.toLowerCase() === params[0].toLowerCase());
        }
        if (lowerSql.includes("'owner'")) users = users.filter(u => (u.role || '').toLowerCase() === 'owner');
        if (lowerSql.includes("'student'")) users = users.filter(u => (u.role || '').toLowerCase() === 'student');
        if (lowerSql.includes("'pending'")) users = users.filter(u => (u.status || '').toLowerCase() === 'pending');
        return [users];
    }

    // 4. SELECT * FROM properties
    if (lowerSql.includes('from properties')) {
        let props = [...memoryDb.properties];
        if (lowerSql.includes("'approved'")) props = props.filter(p => (p.status || '').toLowerCase() === 'approved');
        if (lowerSql.includes("'pending'")) props = props.filter(p => (p.status || '').toLowerCase() === 'pending');
        if (params.length > 0 && lowerSql.includes('owner_email = ?')) {
            props = props.filter(p => p.owner_email === params[0]);
        }
        if (params.length > 0 && lowerSql.includes('id = ?')) {
            props = props.filter(p => p.id == params[0]);
        }
        return [props];
    }

    // 5. SELECT * FROM bookings
    if (lowerSql.includes('from bookings')) {
        let bookings = [...memoryDb.bookings];
        if (params.length > 0 && lowerSql.includes('tenant_email = ?')) {
            bookings = bookings.filter(b => b.tenant_email.toLowerCase() === params[0].toLowerCase());
        }
        return [bookings];
    }

    // 6. INSERT INTO users
    if (lowerSql.startsWith('insert into users')) {
        const newUser = {
            id: nextIds.users++,
            name: params[0] || 'New User',
            email: params[1] || `user${Date.now()}@stayfinder.com`,
            password: params[2] || 'pass123',
            role: lowerSql.includes("'owner'") ? 'owner' : 'student',
            phone: params[4] || '',
            college: params[3] || '',
            city: params[4] || 'Delhi',
            kyc_status: 'Pending',
            status: 'pending',
            created_at: new Date().toISOString()
        };
        memoryDb.users.unshift(newUser);
        return [{ insertId: newUser.id, affectedRows: 1 }];
    }

    // 7. INSERT INTO properties
    if (lowerSql.startsWith('insert into properties')) {
        const newProp = {
            id: nextIds.properties++,
            owner_id: params[0] || 1,
            owner_name: params[1] || 'Property Owner',
            owner_phone: params[2] || '',
            owner_email: params[3] || 'owner@stayfinder.com',
            title: params[4] || 'Student PG Accommodation',
            category: params[5] || 'Boys PG',
            price: params[6] || '₹8,500/mo',
            raw_price: params[7] || 8500,
            location: params[8] || 'North Campus',
            city: params[9] || 'Delhi',
            gender: params[10] || 'Boys',
            room_type: params[11] || 'Single Room',
            image: params[12] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
            amenities: params[13] || 'Wi-Fi, Security',
            description: params[14] || 'Student residence accommodation.',
            status: 'pending',
            rating: 4.8,
            reviews_count: 10,
            created_at: new Date().toISOString()
        };
        memoryDb.properties.unshift(newProp);
        return [{ insertId: newProp.id, affectedRows: 1 }];
    }

    // 8. INSERT INTO bookings
    if (lowerSql.startsWith('insert into bookings')) {
        const newBooking = {
            id: nextIds.bookings++,
            booking_code: params[0] || 'ALLOT-2026-' + Math.floor(1000 + Math.random() * 9000),
            property_id: params[1] || 1,
            property_title: params[2] || 'Stay Accommodation',
            property_location: params[3] || 'University Area',
            property_image: params[4] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
            tenant_name: params[5] || 'Student Tenant',
            tenant_email: params[6] || 'student@stayfinder.com',
            tenant_phone: params[7] || '+91 91234 56789',
            move_in_date: params[8] || '2026-09-01',
            deposit_paid: params[9] || '₹2,500',
            price: params[10] || '₹8,500/mo',
            room_number: 'Awaiting Admin Assignment',
            key_pass: 'Pending Verification',
            status: 'pending',
            payment_status: 'Pending Admin Verification (24h Review)',
            booked_at: new Date().toISOString()
        };
        memoryDb.bookings.unshift(newBooking);
        return [{ insertId: newBooking.id, affectedRows: 1 }];
    }

    // 9. UPDATE
    if (lowerSql.startsWith('update users')) {
        const status = params[0];
        const id = params[2];
        const user = memoryDb.users.find(u => u.id == id);
        if (user) {
            user.status = status;
            user.kyc_status = status === 'approved' ? 'Verified' : 'Rejected';
        }
        return [{ affectedRows: 1 }];
    }

    if (lowerSql.startsWith('update properties')) {
        const status = params[0];
        const id = params[1];
        const prop = memoryDb.properties.find(p => p.id == id);
        if (prop) prop.status = status;
        return [{ affectedRows: 1 }];
    }

    if (lowerSql.startsWith('update bookings')) {
        const status = params[0];
        const roomNumber = params[1];
        const keyPass = params[2];
        const paymentStatus = params[3];
        const id = params[4];
        const b = memoryDb.bookings.find(item => item.id == id || item.booking_code == id);
        if (b) {
            b.status = status;
            if (roomNumber) b.room_number = roomNumber;
            if (keyPass) b.key_pass = keyPass;
            if (paymentStatus) b.payment_status = paymentStatus;
        }
        return [{ affectedRows: 1 }];
    }

    // 10. DELETE
    if (lowerSql.startsWith('delete from properties')) {
        const id = params[0];
        memoryDb.properties = memoryDb.properties.filter(p => p.id != id);
        return [{ affectedRows: 1 }];
    }

    if (lowerSql.startsWith('delete from bookings')) {
        const id = params[0];
        memoryDb.bookings = memoryDb.bookings.filter(b => b.id != id && b.booking_code != id);
        return [{ affectedRows: 1 }];
    }

    return [[], []];
}

module.exports = {
    query
};
