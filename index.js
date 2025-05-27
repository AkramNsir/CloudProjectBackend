const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const axios = require('axios');
const os = require('os');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3306;

// Middleware
app.use(cors());
app.use(express.json());

// First connection (without database) to create the database
const tempConnection = mysql.createConnection({
  host: process.env.DB_HOST || 'mydb.cj0j9ganohni.us-east-1.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'barcabarca123.A%'
});

tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'mydb'}`, (err) => {
  if (err) {
    console.error('❌ Error creating database:', err);
    return;
  }
  console.log('✅ Database ensured');

  tempConnection.end();
  
// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'databasetest.cysrpetj7pax.us-east-1.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'alaadmin',
  database: process.env.DB_NAME || 'databasetest'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to MySQL database');
  // Run SQL script on startup
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const insertUsersQuery = `
    INSERT IGNORE INTO users (name, email) VALUES
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com'),
    ('Bob Johnson', 'bob@example.com');
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) console.error('❌ Error creating table:', err);
    else console.log('✅ Users table ready');

    // Insert data after table creation
    db.query(insertUsersQuery, (err, result) => {
      if (err) console.error('❌ Error inserting users:', err);
      else console.log('✅ Sample users inserted');
    });
  });
});



// Routes
app.get('/server-info', async (req, res) => {
  try {
    // Get instance ID from EC2 metadata service
    var meta  = new AWS.MetadataService();
    let instanceId = 'unknown';
    let availabilityZone = 'unknown';

    try {
      // EC2 metadata is available at a special IP address from within EC2
      instanceId = await axios.get('http://169.254.169.254/latest/meta-data/instance-id');

      availabilityZone = await axios.get('http://169.254.169.254/latest/meta-data/placement/availability-zone');
      
      
    } catch (error) {
      console.log('Not running on EC2 or metadata service not available');
    }

    // Return server info
    res.json({
      instanceId: instanceId.data,
      availabilityZone: availabilityZone.data,
      hostname: os.hostname(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching server info:', error);
    res.status(500).json({ error: 'Failed to get server information' });
  }
});

app.get('/', (req, res) => {
  res.status(200).json('Hello from Backend app!');
});

app.get('/', (req, res) => {
  res.status(200).json('Hello from Backend app!');
});

app.get('/api/users', (req, res) => {
  const query = 'SELECT * FROM users';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(results);
  });
});

app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'SELECT * FROM users WHERE id = ?';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(results[0]);
  });
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const query = 'INSERT INTO users (name, email) VALUES (?, ?)';

  db.query(query, [name, email], (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({ id: result.insertId, name, email });
  });
});

app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const query = 'UPDATE users SET name = ?, email = ? WHERE id = ?';

  db.query(query, [name, email, userId], (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: userId, name, email });
  });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'DELETE FROM users WHERE id = ?';

  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
