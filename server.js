// server.js - PostgreSQL Backend for Dreams Bar & Guesthouse

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg'); // Import Pool from pg
const { URL } = require('url'); // For parsing the connection string
const dns = require('dns');     // For DNS lookup

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Ensure CORS is enabled for frontend
app.use(bodyParser.json());

// --- PostgreSQL Database Connection ---
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set.');
    // In a real app, you might want to gracefully exit or prevent server start
    // For now, we'll let it proceed to show the error in logs
}

// Parse the database URL to extract components
const parsedUrl = new URL(databaseUrl);

// Perform DNS lookup to get IPv4 address for the database host
// This ensures we connect via IPv4, bypassing potential IPv6 routing issues
dns.lookup(parsedUrl.hostname, 4, async (err, address, family) => {
    if (err) {
        console.error('DNS lookup error for database host:', err);
        // If DNS lookup fails, we cannot connect to the database.
        // In production, you might want to implement retry logic or exit.
        // For now, we'll log and let the app start, but DB operations will fail.
        return; // Exit the callback, preventing pool initialization
    }
    console.log(`Resolved Supabase host ${parsedUrl.hostname} to IP ${address} (IPv${family})`);

    // Create the pool with the resolved IPv4 address
    const pool = new Pool({
        host: address, // Use the resolved IPv4 address directly
        port: parsedUrl.port || 5432, // Use port from URL or default 5432
        user: parsedUrl.username,
        password: parsedUrl.password,
        database: parsedUrl.pathname.substring(1), // Remove leading '/' from pathname
        ssl: {
            rejectUnauthorized: false // Required for Render to Supabase connection
        }
    });

    // Test database connection on server start
    pool.connect((err, client, release) => {
        if (err) {
            return console.error('Error acquiring client from pool', err.stack);
        }
        client.query('SELECT NOW()', (err, result) => {
            release(); // Release the client back to the pool
            if (err) {
                return console.error('Error executing initial database query', err.stack);
            }
            console.log('Connected to PostgreSQL database:', result.rows[0].now);
        });
    });

    // --- API Routes (using PostgreSQL) ---
    // All routes are defined inside this dns.lookup callback
    // to ensure 'pool' is initialized before routes are registered.

    // Inventory Routes
    app.get('/api/inventory', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM inventory ORDER BY id ASC');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            res.status(500).json({ message: 'Failed to load inventory items. Please try again.' });
        }
    });

    app.post('/api/inventory', async (req, res) => {
        const { name, category_id, quantity, unit, cost_price, selling_price, reorder_level } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO inventory (name, category_id, quantity, unit, cost_price, selling_price, reorder_level) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [name, category_id, quantity, unit, cost_price, selling_price, reorder_level]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error adding inventory item:', err);
            res.status(500).json({ message: 'Failed to add inventory item.' });
        }
    });

    app.put('/api/inventory/:id', async (req, res) => {
        const { id } = req.params;
        const { name, category_id, quantity, unit, cost_price, selling_price, reorder_level } = req.body;
        try {
            const result = await pool.query(
                'UPDATE inventory SET name = $1, category_id = $2, quantity = $3, unit = $4, cost_price = $5, selling_price = $6, reorder_level = $7 WHERE id = $8 RETURNING *',
                [name, category_id, quantity, unit, cost_price, selling_price, reorder_level, id]
            );
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ message: 'Item not found' });
            }
        } catch (err) {
            console.error('Error updating inventory item:', err);
            res.status(500).json({ message: 'Failed to update inventory item.' });
        }
    });

    app.delete('/api/inventory/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length > 0) {
                res.status(204).send(); // No Content
            } else {
                res.status(404).json({ message: 'Item not found' });
            }
        } catch (err) {
            console.error('Error deleting inventory item:', err);
            res.status(500).json({ message: 'Failed to delete inventory item.' });
        }
    });

    // Rooms Routes
    app.get('/api/rooms', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM rooms ORDER BY id ASC');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching rooms:', err);
            res.status(500).json({ message: 'Failed to load rooms. Please try again.' });
        }
    });

    app.post('/api/rooms', async (req, res) => {
        const { room_number, type, price_per_night, status } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO rooms (room_number, type, price_per_night, status) VALUES ($1, $2, $3, $4) RETURNING *',
                [room_number, type, price_per_night, status]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error adding room:', err);
            res.status(500).json({ message: 'Failed to add room.' });
        }
    });

    app.put('/api/rooms/:id', async (req, res) => {
        const { id } = req.params;
        const { room_number, type, price_per_night, status } = req.body;
        try {
            const result = await pool.query(
                'UPDATE rooms SET room_number = $1, type = $2, price_per_night = $3, status = $4 WHERE id = $5 RETURNING *',
                [room_number, type, price_per_night, status, id]
            );
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ message: 'Room not found' });
            }
        } catch (err) {
            console.error('Error updating room:', err);
            res.status(500).json({ message: 'Failed to update room.' });
        }
    });

    app.delete('/api/rooms/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM rooms WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length > 0) {
                res.status(204).send();
            } else {
                res.status(404).json({ message: 'Room not found' });
            }
        } catch (err) {
            console.error('Error deleting room:', err);
            res.status(500).json({ message: 'Failed to delete room.' });
        }
    });

    // Clients Routes (needed for bookings dropdown)
    app.get('/api/clients', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM clients ORDER BY id ASC');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching clients:', err);
            res.status(500).json({ message: 'Failed to load clients.' });
        }
    });

    // Bookings Routes (with room and client details for display)
    app.get('/api/bookings/rooms', async (req, res) => {
        try {
            // Join bookings with rooms and clients to get names/numbers
            const result = await pool.query(`
                SELECT
                    b.*,
                    r.room_number,
                    r.type AS room_type,
                    c.name AS client_name,
                    c.contact_info AS client_contact_info
                FROM
                    bookings b
                JOIN
                    rooms r ON b.room_id = r.id
                JOIN
                    clients c ON b.client_id = c.id
                ORDER BY b.id ASC
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching detailed bookings:', err);
            res.status(500).json({ message: 'Failed to load bookings. Please try again.' });
        }
    });

    app.post('/api/bookings/rooms', async (req, res) => {
        const { room_id, client_id, check_in_date, check_out_date, total_price, status } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO bookings (room_id, client_id, check_in_date, check_out_date, total_price, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [room_id, client_id, check_in_date, check_out_date, total_price, status]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error adding booking:', err);
            res.status(500).json({ message: 'Failed to add booking.' });
        }
    });

    app.put('/api/bookings/rooms/:id', async (req, res) => {
        const { id } = req.params;
        const { room_id, client_id, check_in_date, check_out_date, total_price, status } = req.body;
        try {
            const result = await pool.query(
                'UPDATE bookings SET room_id = $1, client_id = $2, check_in_date = $3, check_out_date = $4, total_price = $5, status = $6 WHERE id = $7 RETURNING *',
                [room_id, client_id, check_in_date, check_out_date, total_price, status, id]
            );
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ message: 'Booking not found' });
            }
        } catch (err) {
            console.error('Error updating booking:', err);
            res.status(500).json({ message: 'Failed to update booking.' });
        }
    });

    app.delete('/api/bookings/rooms/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length > 0) {
                res.status(204).send();
            } else {
                res.status(404).json({ message: 'Booking not found' });
            }
        } catch (err) {
            console.error('Error deleting booking:', err);
            res.status(500).json({ message: 'Failed to delete booking.' });
        }
    });

    // Categories Routes (for inventory dropdown)
    app.get('/api/categories', async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching categories:', err);
            res.status(500).json({ message: 'Failed to load categories.' });
        }
    });

    // Start server
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}); // End of dns.lookup callback
