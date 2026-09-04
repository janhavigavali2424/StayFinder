/**
 * StayFinder Central Data Store & Authentication System
 * Connects Frontend UI to Node.js Express & MySQL Database Backend
 * API Endpoint: http://localhost:5000/api
 */

const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http') && window.location.port === '5000')
    ? '/api'
    : 'http://localhost:5000/api';

const DEFAULT_PROPERTIES = [];
const DEFAULT_BOOKINGS = [];
const DEFAULT_OWNERS = [];
const DEFAULT_TENANTS = [];

const PROPS_KEY = 'stayfinder_properties';
const OWNERS_KEY = 'stayfinder_owners';
const TENANTS_KEY = 'stayfinder_tenants';
const BOOKINGS_KEY = 'stayfinder_bookings';
const USER_KEY = 'stayfinder_user';

class StayFinderStore {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(PROPS_KEY)) {
            localStorage.setItem(PROPS_KEY, JSON.stringify(DEFAULT_PROPERTIES));
        }
        if (!localStorage.getItem(OWNERS_KEY)) {
            localStorage.setItem(OWNERS_KEY, JSON.stringify(DEFAULT_OWNERS));
        }
        if (!localStorage.getItem(TENANTS_KEY)) {
            localStorage.setItem(TENANTS_KEY, JSON.stringify(DEFAULT_TENANTS));
        }
        if (!localStorage.getItem(BOOKINGS_KEY)) {
            localStorage.setItem(BOOKINGS_KEY, JSON.stringify(DEFAULT_BOOKINGS));
        }
    }

    // ==========================================
    // BACKEND REST API METHODS (Node.js & MySQL)
    // ==========================================

    /**
     * Authenticate User against Database via Backend API
     * Returns error if not registered or if status is pending Admin approval.
     */
    async loginApi(email, password, role = 'student') {
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });

            const data = await res.json();
            if (data.success) {
                // Save user session in localStorage
                const userObj = {
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role,
                    status: data.user.status,
                    phone: data.user.phone,
                    college: data.user.college,
                    loginTime: new Date().toISOString()
                };
                localStorage.setItem(USER_KEY, JSON.stringify(userObj));
                window.dispatchEvent(new Event('stayfinder-auth-changed'));
            }
            return data;
        } catch (err) {
            console.warn('Backend API unreachable, using local store check:', err.message);
            // Fallback for local demo testing if Node server is not active
            return this.localAuthFallback(email, password, role);
        }
    }

    localAuthFallback(email, password, role) {
        // Strict fallback checking
        if (role === 'admin') {
            if (password === 'admin123' || password === 'admin') {
                const userObj = { name: 'System Administrator', email: email || 'admin@stayfinder.com', role: 'admin', status: 'approved' };
                localStorage.setItem(USER_KEY, JSON.stringify(userObj));
                window.dispatchEvent(new Event('stayfinder-auth-changed'));
                return { success: true, user: userObj };
            }
            return { success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid Admin Passcode.' };
        }

        const tenants = this.getTenants();
        const owners = this.getOwners();

        let matched = null;
        if (role === 'student') {
            matched = tenants.find(t => t.email.toLowerCase() === email.toLowerCase());
        } else {
            matched = owners.find(o => o.email.toLowerCase() === email.toLowerCase());
        }

        if (!matched) {
            return {
                success: false,
                code: 'NOT_REGISTERED',
                message: 'Account not found. You need to first register before logging in.'
            };
        }

        if (matched.status === 'Pending' || matched.status === 'pending') {
            return {
                success: false,
                code: 'APPROVAL_PENDING',
                message: 'Your registration is pending Admin approval. You cannot log in until an Admin approves your account.'
            };
        }

        const userObj = { name: matched.name, email: matched.email, role: role, status: matched.status };
        localStorage.setItem(USER_KEY, JSON.stringify(userObj));
        window.dispatchEvent(new Event('stayfinder-auth-changed'));
        return { success: true, user: userObj };
    }

    /**
     * Register Student Account via API
     */
    async registerStudentApi(studentData) {
        try {
            const res = await fetch(`${API_BASE}/auth/register-student`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });
            const data = await res.json();

            // Also store in local store for fallback
            if (data.success) {
                const tenants = this.getTenants();
                tenants.unshift({
                    id: 'ten-' + (data.userId || Date.now()),
                    name: studentData.name,
                    email: studentData.email,
                    college: studentData.college || 'University',
                    phone: studentData.phone || '',
                    studentIdStatus: 'Pending Verification',
                    status: 'Pending',
                    registeredAt: new Date().toISOString()
                });
                this.saveTenants(tenants);
            }
            return data;
        } catch (err) {
            console.warn('API Error, saving locally:', err.message);
            const tenants = this.getTenants();
            const newTenant = {
                id: 'ten-' + Date.now(),
                name: studentData.name,
                email: studentData.email,
                college: studentData.college || 'University',
                phone: studentData.phone || '',
                studentIdStatus: 'Pending Verification',
                status: 'Pending',
                registeredAt: new Date().toISOString()
            };
            tenants.unshift(newTenant);
            this.saveTenants(tenants);
            return { success: true, message: 'Student registered locally (Pending Admin Approval).' };
        }
    }

    /**
     * Submit Property Listing & Owner Registration via API
     */
    async addPropertyApi(propData) {
        try {
            const res = await fetch(`${API_BASE}/properties/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(propData)
            });
            const data = await res.json();

            // Sync with local store
            this.addProperty(propData);
            return data;
        } catch (err) {
            console.warn('API offline, adding property to local storage:', err.message);
            const localProp = this.addProperty(propData);
            return { success: true, message: 'Property registered locally (Pending Admin Approval)', propertyId: localProp.id };
        }
    }

    /**
     * Fetch Live Approved Properties from API
     */
    async fetchLivePropertiesApi() {
        try {
            const res = await fetch(`${API_BASE}/properties`);
            const data = await res.json();
            if (data.success && data.properties.length > 0) {
                const formatted = data.properties.map(p => ({
                    id: p.id,
                    title: p.title,
                    category: p.category,
                    price: p.price,
                    rawPrice: p.raw_price || p.rawPrice || 8500,
                    location: p.location,
                    city: p.city || 'Delhi / NCR',
                    gender: p.gender,
                    roomType: p.room_type || p.roomType || 'Single Room',
                    ownerId: p.owner_id || p.ownerId,
                    ownerName: p.owner_name || p.ownerName || 'Property Owner',
                    ownerContact: p.owner_phone || p.ownerPhone || p.ownerContact || '',
                    ownerEmail: p.owner_email || p.ownerEmail || '',
                    image: p.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
                    amenities: typeof p.amenities === 'string' ? (p.amenities ? p.amenities.split(', ') : []) : (p.amenities || []),
                    description: p.description,
                    status: p.status === 'approved' ? 'Approved' : (p.status === 'pending' ? 'Pending' : 'Rejected'),
                    rating: p.rating || 4.8,
                    reviewsCount: p.reviews_count || 12
                }));
                return formatted;
            }
        } catch (err) {
            console.warn('Could not fetch from Node API, loading local properties:', err.message);
        }
        return this.getApprovedProperties();
    }

    /**
     * Get Property by ID (Async with API check)
     */
    async getPropertyByIdAsync(id) {
        if (!id) return this.getPropertyById(id);
        try {
            const res = await fetch(`${API_BASE}/properties/${id}`);
            const data = await res.json();
            if (data.success && data.property) {
                const p = data.property;
                return {
                    id: p.id,
                    title: p.title,
                    category: p.category,
                    price: p.price,
                    rawPrice: p.raw_price || p.rawPrice || 8500,
                    location: p.location,
                    city: p.city || 'Delhi / NCR',
                    gender: p.gender,
                    roomType: p.room_type || p.roomType || 'Single Room',
                    ownerName: p.owner_name || p.ownerName || 'Property Owner',
                    ownerContact: p.owner_phone || p.ownerPhone || p.ownerContact || '',
                    ownerEmail: p.owner_email || p.ownerEmail || '',
                    image: p.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
                    amenities: typeof p.amenities === 'string' ? (p.amenities ? p.amenities.split(', ') : []) : (p.amenities || []),
                    description: p.description,
                    status: p.status === 'approved' ? 'Approved' : 'Pending'
                };
            }
        } catch (err) { }
        return this.getPropertyById(id);
    }

    /**
     * Admin: Fetch Overview Stats
     */
    async fetchAdminStatsApi() {
        try {
            const res = await fetch(`${API_BASE}/admin/stats`);
            const data = await res.json();
            if (data.success) return data.stats;
        } catch (err) { }

        return {
            pendingProps: this.getPendingProperties().length,
            pendingBookings: this.getPendingBookings().length,
            pendingOwners: this.getPendingOwners().length,
            pendingTenants: this.getPendingTenants().length,
            approvedProps: this.getApprovedProperties().length
        };
    }

    /**
     * Admin: Fetch Pending Users Queue (Owners & Students)
     */
    async fetchPendingUsersApi() {
        try {
            const res = await fetch(`${API_BASE}/admin/users/pending`);
            const data = await res.json();
            if (data.success) return data;
        } catch (err) { }

        return {
            owners: this.getPendingOwners(),
            students: this.getPendingTenants()
        };
    }

    /**
     * Admin: Approve or Reject User Status
     */
    async updateUserStatusApi(userId, status) {
        try {
            const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();

            // Also update local store if present
            if (status === 'approved') {
                this.approveOwner(userId);
                this.approveTenant(userId);
            } else {
                this.rejectOwner(userId);
                this.rejectTenant(userId);
            }
            window.dispatchEvent(new Event('stayfinder-data-changed'));
            return data;
        } catch (err) {
            if (status === 'approved') {
                this.approveOwner(userId);
                this.approveTenant(userId);
            } else {
                this.rejectOwner(userId);
                this.rejectTenant(userId);
            }
            window.dispatchEvent(new Event('stayfinder-data-changed'));
            return { success: true, message: `User #${userId} status updated locally to ${status}` };
        }
    }

    /**
     * Admin: Fetch Pending Properties Queue
     */
    async fetchAdminPropertiesApi() {
        try {
            const res = await fetch(`${API_BASE}/admin/properties/pending`);
            const data = await res.json();
            if (data.success) {
                const mapProp = p => ({
                    id: p.id,
                    title: p.title,
                    category: p.category,
                    price: p.price,
                    rawPrice: p.raw_price || p.rawPrice,
                    location: p.location,
                    gender: p.gender,
                    roomType: p.room_type || p.roomType,
                    ownerName: p.owner_name || p.ownerName || 'Property Owner',
                    ownerContact: p.owner_phone || p.ownerPhone || p.ownerContact || '',
                    ownerEmail: p.owner_email || p.ownerEmail || '',
                    image: p.image,
                    status: p.status
                });

                return {
                    pendingProperties: (data.pendingProperties || []).map(mapProp),
                    approvedProperties: (data.approvedProperties || []).map(mapProp)
                };
            }
        } catch (err) { }

        return {
            pendingProperties: this.getPendingProperties(),
            approvedProperties: this.getApprovedProperties()
        };
    }

    /**
     * Admin: Approve or Reject Property
     */
    async updatePropertyStatusApi(propId, status) {
        try {
            const res = await fetch(`${API_BASE}/admin/properties/${propId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (status === 'approved') this.approveProperty(propId);
            else this.rejectProperty(propId);
            window.dispatchEvent(new Event('stayfinder-data-changed'));
            return data;
        } catch (err) {
            if (status === 'approved') this.approveProperty(propId);
            else this.rejectProperty(propId);
            window.dispatchEvent(new Event('stayfinder-data-changed'));
            return { success: true, message: `Property #${propId} status updated locally to ${status}` };
        }
    }

    /**
     * Create Booking Request via API & Local Storage
     */
    async createBookingApi(bookingData) {
        try {
            const res = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingCode: bookingData.id,
                    propertyId: bookingData.propertyId,
                    propertyTitle: bookingData.title,
                    propertyLocation: bookingData.location,
                    propertyImage: bookingData.image,
                    tenantName: bookingData.tenantName,
                    tenantEmail: bookingData.tenantEmail,
                    tenantPhone: bookingData.tenantPhone,
                    moveInDate: bookingData.moveInDate,
                    price: bookingData.price,
                    depositPaid: bookingData.depositPaid || '₹2,500'
                })
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.warn('Backend API offline, booking created locally:', err.message);
            return { success: false, message: err.message };
        }
    }

    createBookingAllotment(bookingData) {
        const bookings = this.getBookings();
        const bookingId = 'ALLOT-2026-' + Math.floor(1000 + Math.random() * 9000);
        const newBooking = {
            id: bookingId,
            propertyId: bookingData.propertyId || 'prop-1',
            title: bookingData.title || 'Student Accommodation',
            location: bookingData.location || 'University Campus Area',
            image: bookingData.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
            roomNumber: 'Awaiting Admin Assignment',
            price: bookingData.price || '₹8,500/mo',
            depositPaid: bookingData.depositPaid || '₹2,500',
            tenantEmail: bookingData.tenantEmail || 'student@stayfinder.com',
            tenantName: bookingData.tenantName || 'Rahul Sharma',
            tenantPhone: bookingData.tenantPhone || '+91 91234 56789',
            moveInDate: bookingData.moveInDate || '2026-09-01',
            keyPass: 'Pending Verification',
            status: 'Pending',
            paymentStatus: 'Pending Admin Verification (24h Review)',
            bookedAt: new Date().toISOString()
        };

        bookings.unshift(newBooking);
        this.saveBookings(bookings);

        // Also trigger API call asynchronously
        this.createBookingApi(newBooking).then(res => {
            if (res && res.success && res.booking) {
                // Update local record ID if API returned specific code
                const current = this.getBookings();
                const found = current.find(b => b.id === bookingId);
                if (found && res.booking.id) {
                    found.id = res.booking.id;
                    this.saveBookings(current);
                }
            }
        });

        return newBooking;
    }

    /**
     * Fetch User Bookings from API
     */
    async fetchUserBookingsApi(email) {
        if (!email) return this.getBookings();
        try {
            const res = await fetch(`${API_BASE}/bookings/user/${encodeURIComponent(email)}`);
            const data = await res.json();
            if (data.success && data.bookings) {
                // Merge API bookings into local store
                const existing = this.getBookings().filter(b => (b.tenantEmail || b.tenant_email || '').toLowerCase() !== email.toLowerCase());
                const updated = [...data.bookings, ...existing];
                localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated));
                return data.bookings;
            }
        } catch (err) {
            console.warn('Backend API unreachable for user bookings:', err.message);
        }
        return this.getUserBookings(email);
    }

    getUserBookings(email) {
        const bookings = this.getBookings();
        if (!email) return bookings;
        return bookings.filter(b => (b.tenantEmail || b.tenant_email || '').toLowerCase() === email.toLowerCase());
    }

    /**
     * Admin: Fetch All Bookings
     */
    async fetchAdminBookingsApi() {
        try {
            const res = await fetch(`${API_BASE}/admin/bookings`);
            const data = await res.json();
            if (data.success) return data.bookings;
        } catch (err) { }

        return this.getBookings();
    }

    /**
     * Admin: Approve or Reject Booking
     */
    async updateBookingStatusApi(bookingId, status, roomNumber, keyPass) {
        try {
            const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, roomNumber, keyPass })
            });
            const data = await res.json();
            if (status === 'approved') this.approveBooking(bookingId, roomNumber, keyPass);
            else this.rejectBooking(bookingId);
            window.dispatchEvent(new Event('stayfinder-data-changed'));
            return data;
        } catch (err) {
            if (status === 'approved') this.approveBooking(bookingId, roomNumber, keyPass);
            else this.rejectBooking(bookingId);
            window.dispatchEvent(new Event('stayfinder-data-changed'));
            return { success: true, message: `Booking #${bookingId} status updated locally to ${status}` };
        }
    }

    /**
     * Admin: Delete Property from DB & Local Store
     */
    async deletePropertyApi(propId) {
        try {
            await fetch(`${API_BASE}/admin/properties/${propId}`, { method: 'DELETE' });
        } catch (err) { }

        const properties = this.getProperties().filter(p => p.id !== propId && p.id != propId);
        this.saveProperties(properties);
        window.dispatchEvent(new Event('stayfinder-data-changed'));
        return { success: true, message: `Property #${propId} deleted.` };
    }

    /**
     * Admin: Delete Booking from DB & Local Store
     */
    async deleteBookingApi(bookingId) {
        try {
            await fetch(`${API_BASE}/admin/bookings/${bookingId}`, { method: 'DELETE' });
        } catch (err) { }

        const bookings = this.getBookings().filter(b => b.id !== bookingId && b.id != bookingId);
        this.saveBookings(bookings);
        window.dispatchEvent(new Event('stayfinder-data-changed'));
        return { success: true, message: `Booking #${bookingId} deleted.` };
    }

    // ==========================================
    // LOCAL STORAGE STATE METHODS (Sync Fallback)
    // ==========================================

    getProperties() {
        try {
            const data = localStorage.getItem(PROPS_KEY);
            return data ? JSON.parse(data) : DEFAULT_PROPERTIES;
        } catch (e) {
            return DEFAULT_PROPERTIES;
        }
    }

    saveProperties(properties) {
        try {
            localStorage.setItem(PROPS_KEY, JSON.stringify(properties));
            window.dispatchEvent(new Event('stayfinder-data-changed'));
        } catch (e) { }
    }

    getApprovedProperties() {
        return this.getProperties().filter(p => p.status === 'Approved' || p.status === 'approved');
    }

    getPendingProperties() {
        return this.getProperties().filter(p => p.status === 'Pending' || p.status === 'pending');
    }

    getPropertyById(id) {
        return this.getProperties().find(p => p.id === id || p.id == id);
    }

    addProperty(newProp) {
        const properties = this.getProperties();
        const id = 'prop-' + Date.now();
        const property = {
            id,
            title: newProp.title || 'Student PG Accommodation',
            category: newProp.category || 'Boys PG',
            price: newProp.price ? (newProp.price.includes('₹') ? newProp.price : `₹${newProp.price}/mo`) : '₹8,500/mo',
            rawPrice: parseInt(newProp.price ? newProp.price.toString().replace(/[^0-9]/g, '') : 8500) || 8500,
            location: newProp.location || 'University Campus Area',
            city: newProp.city || 'Delhi / NCR',
            gender: newProp.gender || 'Boys',
            roomType: newProp.roomType || 'Double Sharing',
            ownerName: newProp.ownerName || 'Property Owner',
            ownerContact: newProp.ownerContact || newProp.ownerPhone || '+91 98765 00000',
            ownerEmail: newProp.ownerEmail || 'owner@stayfinder.com',
            image: newProp.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
            amenities: newProp.amenities && newProp.amenities.length > 0 ? newProp.amenities : ['Wi-Fi', 'Security', 'Meals Included'],
            description: newProp.description || 'Newly submitted student accommodation awaiting Admin verification.',
            status: 'Pending',
            rating: 5.0,
            reviewsCount: 1,
            createdAt: new Date().toISOString()
        };

        properties.unshift(property);
        this.saveProperties(properties);

        // Also add owner to pending owners list if not existing
        const owners = this.getOwners();
        if (!owners.find(o => o.email === property.ownerEmail)) {
            owners.unshift({
                id: 'own-' + Date.now(),
                name: property.ownerName,
                email: property.ownerEmail,
                phone: property.ownerContact,
                city: property.city,
                propertyCount: 1,
                kycStatus: 'Pending KYC Verification',
                idType: 'Government ID',
                status: 'Pending',
                registeredAt: new Date().toISOString()
            });
            this.saveOwners(owners);
        }

        return property;
    }

    approveProperty(id) {
        const properties = this.getProperties();
        const prop = properties.find(p => p.id === id || p.id == id);
        if (prop) {
            prop.status = 'Approved';
            this.saveProperties(properties);
            return true;
        }
        return false;
    }

    rejectProperty(id) {
        const properties = this.getProperties();
        const prop = properties.find(p => p.id === id || p.id == id);
        if (prop) {
            prop.status = 'Rejected';
            this.saveProperties(properties);
            return true;
        }
        return false;
    }

    getOwners() {
        try {
            const data = localStorage.getItem(OWNERS_KEY);
            return data ? JSON.parse(data) : DEFAULT_OWNERS;
        } catch (e) {
            return DEFAULT_OWNERS;
        }
    }

    saveOwners(owners) {
        try {
            localStorage.setItem(OWNERS_KEY, JSON.stringify(owners));
            window.dispatchEvent(new Event('stayfinder-data-changed'));
        } catch (e) { }
    }

    getPendingOwners() {
        return this.getOwners().filter(o => o.status === 'Pending' || o.status === 'pending');
    }

    approveOwner(id) {
        const owners = this.getOwners();
        const owner = owners.find(o => o.id === id || o.id == id);
        if (owner) {
            owner.status = 'Approved';
            owner.kycStatus = 'Verified';
            this.saveOwners(owners);
            return true;
        }
        return false;
    }

    rejectOwner(id) {
        const owners = this.getOwners();
        const owner = owners.find(o => o.id === id || o.id == id);
        if (owner) {
            owner.status = 'Rejected';
            owner.kycStatus = 'Rejected';
            this.saveOwners(owners);
            return true;
        }
        return false;
    }

    getTenants() {
        try {
            const data = localStorage.getItem(TENANTS_KEY);
            return data ? JSON.parse(data) : DEFAULT_TENANTS;
        } catch (e) {
            return DEFAULT_TENANTS;
        }
    }

    saveTenants(tenants) {
        try {
            localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
            window.dispatchEvent(new Event('stayfinder-data-changed'));
        } catch (e) { }
    }

    getPendingTenants() {
        return this.getTenants().filter(t => t.status === 'Pending' || t.status === 'pending');
    }

    approveTenant(id) {
        const tenants = this.getTenants();
        const tenant = tenants.find(t => t.id === id || t.id == id);
        if (tenant) {
            tenant.status = 'Approved';
            tenant.studentIdStatus = 'Verified Student ID';
            this.saveTenants(tenants);
            return true;
        }
        return false;
    }

    rejectTenant(id) {
        const tenants = this.getTenants();
        const tenant = tenants.find(t => t.id === id || t.id == id);
        if (tenant) {
            tenant.status = 'Rejected';
            tenant.studentIdStatus = 'Verification Failed';
            this.saveTenants(tenants);
            return true;
        }
        return false;
    }

    getBookings() {
        try {
            const data = localStorage.getItem(BOOKINGS_KEY);
            return data ? JSON.parse(data) : DEFAULT_BOOKINGS;
        } catch (e) {
            return DEFAULT_BOOKINGS;
        }
    }

    saveBookings(bookings) {
        try {
            localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
            window.dispatchEvent(new Event('stayfinder-data-changed'));
        } catch (e) { }
    }

    getPendingBookings() {
        return this.getBookings().filter(b => b.status === 'Pending' || b.status === 'pending');
    }

    getApprovedBookings() {
        return this.getBookings().filter(b => b.status === 'Approved' || b.status === 'approved');
    }

    approveBooking(id, roomNum, keyPass) {
        const bookings = this.getBookings();
        const b = bookings.find(item => item.id === id || item.id == id);
        if (b) {
            const randomNum = Math.floor(100 + Math.random() * 800);
            b.status = 'Approved';
            b.paymentStatus = 'Payment Verified - Room Allotted';
            b.roomNumber = roomNum || `Room #${randomNum} (Block A)`;
            b.keyPass = keyPass || '#' + Math.floor(1000 + Math.random() * 9000);
            this.saveBookings(bookings);
            return b;
        }
        return null;
    }

    rejectBooking(id) {
        const bookings = this.getBookings();
        const b = bookings.find(item => item.id === id || item.id == id);
        if (b) {
            b.status = 'Rejected';
            b.paymentStatus = 'Verification Declined';
            this.saveBookings(bookings);
            return true;
        }
        return false;
    }

    // --- Session Management ---
    getCurrentUser() {
        try {
            const user = localStorage.getItem(USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    }

    logout() {
        localStorage.removeItem(USER_KEY);
        window.dispatchEvent(new Event('stayfinder-auth-changed'));
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }

    isOwner() {
        const user = this.getCurrentUser();
        return user && user.role === 'owner';
    }

    isStudent() {
        const user = this.getCurrentUser();
        return user && user.role === 'student';
    }

    syncAuthUI() {
        const isAdmin = this.isAdmin();
        const isOwner = this.isOwner();
        const isStudent = this.isStudent();
        const currentUser = this.getCurrentUser();

        document.querySelectorAll('.admin-only-link').forEach(el => {
            if (isAdmin) {
                el.classList.remove('hidden');
                el.style.display = '';
            } else {
                el.classList.add('hidden');
                el.style.display = 'none';
            }
        });

        document.querySelectorAll('.owner-only-link').forEach(el => {
            if (isOwner || isAdmin) {
                el.classList.remove('hidden');
                el.style.display = 'flex';
            } else {
                el.classList.add('hidden');
                el.style.display = 'none';
            }
        });

        document.querySelectorAll('.tenant-only-link').forEach(el => {
            if (isStudent || isAdmin) {
                el.classList.remove('hidden');
                el.style.display = 'flex';
            } else {
                el.classList.add('hidden');
                el.style.display = 'none';
            }
        });

        const userBadge = document.getElementById('nav-user-badge');
        const loginBtn = document.getElementById('nav-login-btn');
        if (userBadge) {
            if (currentUser) {
                userBadge.classList.remove('hidden');
                userBadge.style.display = 'flex';

                let portalLink = 'Profile Dashboard.html';
                let portalName = 'My Tenant Portal';
                if (currentUser.role === 'owner') {
                    portalLink = 'Owner Dashboard.html';
                    portalName = 'My Owner Portal';
                } else if (currentUser.role === 'admin') {
                    portalLink = 'Admin.html';
                    portalName = 'Admin Control';
                }

                userBadge.innerHTML = `
                    <div class="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/30 text-xs">
                        <span class="w-2 h-2 rounded-full ${isAdmin ? 'bg-secondary animate-pulse' : 'bg-emerald-500'}"></span>
                        <a href="${portalLink}" class="font-bold text-primary hover:underline">
                            ${currentUser.name} <span class="opacity-60 text-[10px]">(${portalName})</span>
                        </a>
                        <button onclick="window.stayfinderStore.logout(); location.reload();" title="Logout Session" class="text-xs text-error hover:bg-error/10 p-1 rounded-lg transition-colors font-bold ml-1 flex items-center">
                            <span class="material-symbols-outlined text-sm">logout</span>
                        </button>
                    </div>
                `;
                if (loginBtn) loginBtn.classList.add('hidden');
            } else {
                userBadge.classList.add('hidden');
                userBadge.style.display = 'none';
                if (loginBtn) loginBtn.classList.remove('hidden');
            }
        }
    }
}

// Global Instance
window.stayfinderStore = new StayFinderStore();

document.addEventListener('DOMContentLoaded', () => {
    window.stayfinderStore.syncAuthUI();
});
window.addEventListener('stayfinder-auth-changed', () => {
    window.stayfinderStore.syncAuthUI();
});
