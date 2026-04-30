const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id VARCHAR(50) UNIQUE NOT NULL,
        reservation_id VARCHAR(50),
        contract_id VARCHAR(100),
        customer_id VARCHAR(100) NOT NULL,
        property_id VARCHAR(100) NOT NULL,
        project_name VARCHAR(255),
        location VARCHAR(255),
        area_unit_layout VARCHAR(100),
        room_type VARCHAR(100),
        room_number VARCHAR(50),
        price NUMERIC(15, 2),
        price_per_unit NUMERIC(15, 2),
        promotion VARCHAR(255),
        status_kyc VARCHAR(50) DEFAULT 'PENDING',
        payment_second_status VARCHAR(50) DEFAULT 'PENDING',
        property_status VARCHAR(50) DEFAULT 'Booked',
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database initialized');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
