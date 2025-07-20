// server.js - Dreams Bar Backend
// This server handles API requests for inventory, room, client, and booking management, and connects to a MariaDB database.

const express = require('express');
const mysql = require('mysql2/promise'); // Using the promise-based API for async/await
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Enable parsing of JSON request bodies

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to MariaDB!');
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error('Error connecting to MariaDB:', err.message);
        process.exit(1); // Exit the process if database connection fails
    });

// Helper function to convert numeric strings from DB to actual numbers
// MySQL/MariaDB's DECIMAL type often returns as string in Node.js drivers.
const parseNumericFields = (item) => {
    if (!item) return item;

    const newItem = { ...item };
    if (typeof newItem.quantity === 'string') {
        newItem.quantity = parseFloat(newItem.quantity);
    }
    if (typeof newItem.cost_price === 'string') {
        newItem.cost_price = parseFloat(newItem.cost_price);
    }
    if (typeof newItem.selling_price === 'string') {
        newItem.selling_price = parseFloat(newItem.selling_price);
    }
    if (typeof newItem.reorder_level === 'string') {
        newItem.reorder_level = parseFloat(newItem.reorder_level);
    }
    // For rooms:
    if (typeof newItem.price_per_night === 'string') {
        newItem.price_per_night = parseFloat(newItem.price_per_night);
    }
    // For bookings:
    if (typeof newItem.total_price === 'string') {
        newItem.total_price = parseFloat(newItem.total_price);
    }
    return newItem;
};


// --- API Endpoints for Inventory ---

// GET all inventory items
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory');
        // Map over rows to ensure numeric fields are actual numbers
        const inventoryItems = rows.map(parseNumericFields);
        res.json(inventoryItems);
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ message: 'Failed to retrieve inventory items.' });
    }
});

// GET a single inventory item by ID
app.get('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }
        // Parse numeric fields for the single item
        res.json(parseNumericFields(rows[0]));
    } catch (err) {
        console.error(`Error fetching inventory item with ID ${id}:`, err);
        res.status(500).json({ message: 'Failed to retrieve inventory item.' });
    }
});

// POST a new inventory item
app.post('/api/inventory', async (req, res) => {
    const { name, category_id, quantity, unit, cost_price, selling_price, reorder_level } = req.body;
    // Basic validation
    if (!name || !category_id || quantity === undefined || !unit || cost_price === undefined || selling_price === undefined || reorder_level === undefined) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO inventory (name, category_id, quantity, unit, cost_price, selling_price, reorder_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, category_id, quantity, unit, cost_price, selling_price, reorder_level]
        );
        res.status(201).json({ message: 'Inventory item added successfully!', id: result.insertId });
    } catch (err) {
        console.error('Error adding inventory item:', err);
        res.status(500).json({ message: 'Failed to add inventory item.' });
    }
});

// PUT (Update) an inventory item
app.put('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category_id, quantity, unit, cost_price, selling_price, reorder_level } = req.body;

    // Basic validation
    if (!name || !category_id || quantity === undefined || !unit || cost_price === undefined || selling_price === undefined || reorder_level === undefined) {
        return res.status(400).json({ message: 'All fields are required for update.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE inventory SET name = ?, category_id = ?, quantity = ?, unit = ?, cost_price = ?, selling_price = ?, reorder_level = ? WHERE id = ?',
            [name, category_id, quantity, unit, cost_price, selling_price, reorder_level, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }
        res.json({ message: 'Inventory item updated successfully!' });
    } catch (err) {
        console.error(`Error updating inventory item with ID ${id}:`, err);
        res.status(500).json({ message: 'Failed to update inventory item.' });
    }
});

// DELETE an inventory item
app.delete('/api/inventory/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM inventory WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }
        res.json({ message: 'Inventory item deleted successfully!' });
    } catch (err) {
        console.error(`Error deleting inventory item with ID ${id}:`, err);
        res.status(500).json({ message: 'Failed to delete inventory item.' });
    }
});

// --- API Endpoint for Categories ---
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name FROM categories');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Failed to retrieve categories.' });
    }
});

// --- API Endpoints for Rooms ---

// GET all rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM rooms');
        const rooms = rows.map(parseNumericFields); // Ensure price_per_night is parsed
        res.json(rooms);
    } catch (err) {
        console.error('Error fetching rooms:', err);
        res.status(500).json({ message: 'Failed to retrieve rooms.' });
    }
});

// POST a new room
app.post('/api/rooms', async (req, res) => {
    const { room_number, type, price_per_night, status } = req.body;
    if (!room_number || !type || price_per_night === undefined || !status) {
        return res.status(400).json({ message: 'All fields are required for a new room.' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO rooms (room_number, type, price_per_night, status) VALUES (?, ?, ?, ?)',
            [room_number, type, price_per_night, status]
        );
        res.status(201).json({ message: 'Room added successfully!', id: result.insertId });
    } catch (err) {
        console.error('Error adding room:', err);
        res.status(500).json({ message: 'Failed to add room.' });
    }
});

// PUT (Update) a room
app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { room_number, type, price_per_night, status } = req.body;
    if (!room_number || !type || price_per_night === undefined || !status) {
        return res.status(400).json({ message: 'All fields are required for room update.' });
    }
    try {
        const [result] = await pool.query(
            'UPDATE rooms SET room_number = ?, type = ?, price_per_night = ?, status = ? WHERE id = ?',
            [room_number, type, price_per_night, status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        res.json({ message: 'Room updated successfully!' });
    } catch (err) {
        console.error(`Error updating room with ID ${id}:`, err);
        res.status(500).json({ message: 'Failed to update room.' });
    }
});

// DELETE a room
app.delete('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM rooms WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Room not found.' });
        }
        res.json({ message: 'Room deleted successfully!' });
    } catch (err) {
        console.error(`Error deleting room with ID ${id}:`, err);
        res.status(500).json({ message: 'Failed to delete room.' });
    }
});

// --- NEW API Endpoints for Clients ---

// GET all clients
app.get('/api/clients', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clients');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching clients:', err);
        res.status(500).json({ message: 'Failed to retrieve clients.' });
    }
});

// POST a new client
app.post('/api/clients', async (req, res) => {
    const { name, contact_info } = req.body;
    if (!name || !contact_info) {
        return res.status(400).json({ message: 'Name and contact info are required for a new client.' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO clients (name, contact_info) VALUES (?, ?)',
            [name, contact_info]
        );
        res.status(201).json({ message: 'Client added successfully!', id: result.insertId });
    } catch (err) {
        console.error('Error adding client:', err);
        res.status(500).json({ message: 'Failed to add client.' });
    }
});

// --- NEW API Endpoints for Room Bookings ---

// GET all room bookings (with room and client details)
app.get('/api/bookings/rooms', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                rb.id,
                rb.check_in_date,
                rb.check_out_date,
                rb.total_price,
                rb.status,
                r.room_number,
                r.type AS room_type,
                c.name AS client_name,
                c.contact_info AS client_contact_info
            FROM room_bookings rb
            JOIN rooms r ON rb.room_id = r.id
            JOIN clients c ON rb.client_id = c.id
        `);
        const bookings = rows.map(parseNumericFields); // Ensure total_price is parsed
        res.json(bookings);
    } catch (err) {
        console.error('Error fetching room bookings:', err);
        res.status(500).json({ message: 'Failed to retrieve room bookings.' });
    }
});

// POST a new room booking
app.post('/api/bookings/rooms', async (req, res) => {
    const { room_id, client_id, check_in_date, check_out_date, total_price, status } = req.body;
    if (!room_id || !client_id || !check_in_date || !check_out_date || total_price === undefined || !status) {
        return res.status(400).json({ message: 'All booking fields are required.' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO room_bookings (room_id, client_id, check_in_date, check_out_date, total_price, status) VALUES (?, ?, ?, ?, ?, ?)',
            [room_id, client_id, check_in_date, check_out_date, total_price, status]
        );
        res.status(201).json({ message: 'Room booking added successfully!', id: result.insertId });
    } catch (err) {
        console.error('Error adding room booking:', err);
        res.status(500).json({ message: 'Failed to add room booking.' });
    }
});

// PUT (Update) a room booking
app.put('/api/bookings/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { room_id, client_id, check_in_date, check_out_date, total_price, status } = req.body;
    if (!room_id || !client_id || !check_in_date || !check_out_date || total_price === undefined || !status) {
        return res.status(400).json({ message: 'All booking fields are required for update.' });
    }
    try {
        const [result] = await pool.query(
            'UPDATE room_bookings SET room_id = ?, client_id = ?, check_in_date = ?, check_out_date = ?, total_price = ?, status = ? WHERE id = ?',
            [room_id, client_id, check_in_date, check_out_date, total_price, status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Room booking not found.' });
        }
        res.json({ message: 'Room booking updated successfully!' });
    } catch (err) {
        console.error(`Error updating room booking with ID ${id}:`, err);
        res.status(500).json({ message: 'Failed to update room booking.' });
    }
});

// DELETE a room booking
app.delete('/api/bookings/rooms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM room_bookings WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Room booking not found.' });
        }
        res.json({ message: 'Room booking deleted successfully!' });
    } catch (err) {
        console.error(`Error deleting room booking with ID ${id}:`, err);
        res.status(500).json({ message: 'Failed to delete room booking.' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log('API Endpoints for Inventory:');
    console.log('  GET /api/inventory - Get all inventory items');
    console.log('  GET /api/inventory/:id - Get a single inventory item');
    console.log('  POST /api/inventory - Add a new inventory item');
    console.log('  PUT /api/inventory/:id - Update an inventory item');
    console.log('  DELETE /api/inventory/:id - Delete an inventory item');
    console.log('API Endpoints for Categories:');
    console.log('  GET /api/categories - Get all categories');
    console.log('API Endpoints for Rooms:');
    console.log('  GET /api/rooms - Get all rooms');
    console.log('  POST /api/rooms - Add a new room');
    console.log('  PUT /api/rooms/:id - Update a room');
    console.log('  DELETE /api/rooms/:id - Delete a room');
    console.log('API Endpoints for Clients:'); // New console log for clients
    console.log('  GET /api/clients - Get all clients');
    console.log('  POST /api/clients - Add a new client');
    console.log('API Endpoints for Room Bookings:'); // New console log for bookings
    console.log('  GET /api/bookings/rooms - Get all room bookings');
    console.log('  POST /api/bookings/rooms - Add a new room booking');
    console.log('  PUT /api/bookings/rooms/:id - Update a room booking');
    console.log('  DELETE /api/bookings/rooms/:id - Delete a room booking');
});
