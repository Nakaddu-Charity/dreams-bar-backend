// server.js - Node.js Express Backend for Dreams Bar & Guesthouse
// This version uses in-memory data for quick deployment and demonstration purposes.
// Data will reset when the server restarts.

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Required for cross-origin requests from frontend
const app = express();
const PORT = process.env.PORT || 5000; // Use environment port for deployment, default to 5000

// Middleware setup
app.use(cors()); // Enable CORS for all origins (important for frontend connection)
app.use(bodyParser.json()); // Parse incoming JSON requests

// --- TEMPORARY IN-MEMORY DATA STORAGE ---
// This data will be lost when the server restarts (e.g., on Render's free tier after inactivity).
// For persistent data, you would integrate a database like MariaDB, PostgreSQL, or MongoDB.

let inventoryItems = [
    { id: 1, name: 'Coca Cola 500ml', category_id: 1, quantity: 100, unit: 'bottles', cost_price: 1500.00, selling_price: 2000.00, reorder_level: 20 },
    { id: 2, name: 'Nile Special Beer', category_id: 1, quantity: 50, unit: 'bottles', cost_price: 3000.00, selling_price: 4000.00, reorder_level: 10 },
    { id: 3, name: 'Crisps (Salted)', category_id: 2, quantity: 75, unit: 'packs', cost_price: 800.00, selling_price: 1200.00, reorder_level: 15 }
];

let rooms = [
    { id: 1, room_number: '101', type: 'Standard', price_per_night: 50000.00, status: 'Available' },
    { id: 2, room_number: '102', type: 'Deluxe', price_per_night: 80000.00, status: 'Occupied' },
    { id: 3, room_number: '201', type: 'Suite', price_per_night: 120000.00, status: 'Available' }
];

let clients = [
    // Clients are needed for the bookings dropdown in the frontend
    { id: 1, name: 'John Doe', contact_info: 'john@example.com, 0771234567' },
    { id: 2, name: 'Jane Smith', contact_info: 'jane@example.com, 0772345678' }
];

let bookings = [
    // Sample bookings data
    { id: 1, room_id: 1, client_id: 1, check_in_date: '2025-08-01', check_out_date: '2025-08-05', total_price: 200000.00, status: 'Confirmed' },
    { id: 2, room_id: 2, client_id: 2, check_in_date: '2025-07-20', check_out_date: '2025-07-22', total_price: 160000.00, status: 'Completed' }
];

let categories = [
    // Categories for inventory dropdown
    { id: 1, name: 'Beverages' },
    { id: 2, name: 'Snacks' },
    { id: 3, name: 'Food' }
];

// Simple ID counters for new items
let nextInventoryId = Math.max(...inventoryItems.map(item => item.id)) + 1;
let nextRoomId = Math.max(...rooms.map(room => room.id)) + 1;
let nextClientId = Math.max(...clients.map(client => client.id)) + 1;
let nextBookingId = Math.max(...bookings.map(booking => booking.id)) + 1;

// Helper function to find an item by ID in an array
const getById = (arr, id) => arr.find(item => item.id === parseInt(id));

// --- API Routes ---

// Root endpoint for health check
app.get('/', (req, res) => {
    res.send('Dreams Bar Backend API is running!');
});

// Inventory Management Endpoints
app.get('/api/inventory', (req, res) => {
    res.json(inventoryItems);
});

app.post('/api/inventory', (req, res) => {
    const newItem = { id: nextInventoryId++, ...req.body };
    inventoryItems.push(newItem);
    res.status(201).json(newItem);
});

app.put('/api/inventory/:id', (req, res) => {
    const { id } = req.params;
    const index = inventoryItems.findIndex(item => item.id === parseInt(id));
    if (index !== -1) {
        inventoryItems[index] = { ...inventoryItems[index], ...req.body, id: parseInt(id) };
        res.json(inventoryItems[index]);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.delete('/api/inventory/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = inventoryItems.length;
    inventoryItems = inventoryItems.filter(item => item.id !== parseInt(id));
    if (inventoryItems.length < initialLength) {
        res.status(204).send(); // No Content
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

// Room Management Endpoints
app.get('/api/rooms', (req, res) => {
    res.json(rooms);
});

app.post('/api/rooms', (req, res) => {
    const newRoom = { id: nextRoomId++, ...req.body };
    rooms.push(newRoom);
    res.status(201).json(newRoom);
});

app.put('/api/rooms/:id', (req, res) => {
    const { id } = req.params;
    const index = rooms.findIndex(room => room.id === parseInt(id));
    if (index !== -1) {
        rooms[index] = { ...rooms[index], ...req.body, id: parseInt(id) };
        res.json(rooms[index]);
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
});

app.delete('/api/rooms/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = rooms.length;
    rooms = rooms.filter(room => room.id !== parseInt(id));
    if (rooms.length < initialLength) {
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
});

// Client Management Endpoints (for bookings dropdown)
app.get('/api/clients', (req, res) => {
    res.json(clients);
});

// Bookings Management Endpoints
// This endpoint joins booking data with room and client details for display
app.get('/api/bookings/rooms', (req, res) => {
    const detailedBookings = bookings.map(booking => {
        const room = getById(rooms, booking.room_id);
        const client = getById(clients, booking.client_id);
        return {
            ...booking,
            room_number: room ? room.room_number : 'N/A',
            room_type: room ? room.type : 'N/A',
            client_name: client ? client.name : 'N/A',
            client_contact_info: client ? client.contact_info : 'N/A'
        };
    });
    res.json(detailedBookings);
});

app.post('/api/bookings/rooms', (req, res) => {
    const newBooking = { id: nextBookingId++, ...req.body };
    bookings.push(newBooking);
    res.status(201).json(newBooking);
});

app.put('/api/bookings/rooms/:id', (req, res) => {
    const { id } = req.params;
    const index = bookings.findIndex(booking => booking.id === parseInt(id));
    if (index !== -1) {
        bookings[index] = { ...bookings[index], ...req.body, id: parseInt(id) };
        res.json(bookings[index]);
    } else {
        res.status(404).json({ message: 'Booking not found' });
    }
});

app.delete('/api/bookings/rooms/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = bookings.length;
    bookings = bookings.filter(booking => booking.id !== parseInt(id));
    if (bookings.length < initialLength) {
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Booking not found' });
    }
});

// Categories Endpoints (for inventory dropdown)
app.get('/api/categories', (req, res) => {
    res.json(categories);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
