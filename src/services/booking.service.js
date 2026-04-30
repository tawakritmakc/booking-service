const dayjs = require('dayjs');
const { pool } = require('../db');
const { publishEvent } = require('../kafka');
const axios = require('axios');

// Generate Booking ID เช่น BK-20260430-0001
const generateBookingId = async () => {
  const dateStr = dayjs().format('YYYYMMDD');
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM bookings WHERE booking_id LIKE $1`,
    [`BK-${dateStr}-%`]
  );
  const seq = String(Number(result.rows[0].count) + 1).padStart(4, '0');
  return `BK-${dateStr}-${seq}`;
};

// แจ้ง inventory service ว่า property ถูก Booked (Sold)
const updateInventoryStatus = async (propertyId, bookingId, status = 'Booked') => {
  try {
    await axios.patch(`${process.env.INVENTORY_SERVICE_URL}/api/inventory/${propertyId}/status`, {
      status,
      bookingId,
    });
    console.log(`📦 Inventory updated: ${propertyId} → ${status}`);
  } catch (err) {
    console.error('❌ Failed to update inventory:', err.message);
  }
};

// แจ้ง legal service ให้เริ่ม draft contract
const notifyLegal = async (bookingId, customerId, propertyId) => {
  try {
    await axios.post(`${process.env.LEGAL_SERVICE_URL}/api/legal/notify`, {
      bookingId,
      customerId,
      propertyId,
      action: 'DRAFT_CONTRACT',
    });
    console.log(`⚖️ Legal notified for booking: ${bookingId}`);
  } catch (err) {
    console.error('❌ Failed to notify legal:', err.message);
  }
};

// สร้าง Booking
const createBooking = async (data) => {
  const {
    reservationId,
    customerId,
    propertyId,
    projectName,
    location,
    areaUnitLayout,
    roomType,
    roomNumber,
    price,
    pricePerUnit,
    promotion,
  } = data;

  const bookingId = await generateBookingId();

  const result = await pool.query(
    `INSERT INTO bookings
      (booking_id, reservation_id, customer_id, property_id, project_name, location,
       area_unit_layout, room_type, room_number, price, price_per_unit, promotion,
       property_status, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Booked','ACTIVE')
     RETURNING *`,
    [
      bookingId, reservationId, customerId, propertyId, projectName, location,
      areaUnitLayout, roomType, roomNumber, price, pricePerUnit, promotion,
    ]
  );

  return result.rows[0];
};

// ดึง Booking ทั้งหมด
const getBookings = async ({ customerId, propertyId, status } = {}) => {
  let query = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];

  if (customerId) { params.push(customerId); query += ` AND customer_id = $${params.length}`; }
  if (propertyId) { params.push(propertyId); query += ` AND property_id = $${params.length}`; }
  if (status)     { params.push(status);     query += ` AND status = $${params.length}`; }

  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

// ดึง Booking by ID
const getBookingById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM bookings WHERE id = $1 OR booking_id = $1',
    [id]
  );
  return result.rows[0] || null;
};

// อัปเดต status
const updateBookingStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE bookings SET status = $1, updated_at = NOW()
     WHERE id = $2 OR booking_id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] || null;
};

// อัปเดต KYC status
const updateKycStatus = async (id, kycStatus) => {
  const result = await pool.query(
    `UPDATE bookings SET status_kyc = $1, updated_at = NOW()
     WHERE id = $2 OR booking_id = $2 RETURNING *`,
    [kycStatus, id]
  );
  return result.rows[0] || null;
};

// อัปเดต second payment status + property status → Sold
const updateSecondPaymentStatus = async (id, paymentStatus) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE bookings
       SET payment_second_status = $1,
           property_status = CASE WHEN $1 = 'CONFIRMED' THEN 'Sold' ELSE property_status END,
           updated_at = NOW()
       WHERE id = $2 OR booking_id = $2
       RETURNING *`,
      [paymentStatus, id]
    );

    const booking = result.rows[0];
    await client.query('COMMIT');

    // ถ้า payment confirmed → update inventory เป็น Sold
    if (booking && paymentStatus === 'CONFIRMED') {
      await updateInventoryStatus(booking.property_id, booking.booking_id, 'Sold');

      // Publish sale.booked.complete
      await publishEvent('sale.booked.complete', {
        bookingId: booking.booking_id,
        customerId: booking.customer_id,
        propertyId: booking.property_id,
        propertyStatus: 'Sold',
        status: booking.status,
        updatedAt: booking.updated_at,
      });
    }

    return booking;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// อัปเดต contract ID
const updateContractId = async (id, contractId) => {
  const result = await pool.query(
    `UPDATE bookings SET contract_id = $1, updated_at = NOW()
     WHERE id = $2 OR booking_id = $2 RETURNING *`,
    [contractId, id]
  );
  return result.rows[0] || null;
};

// Handle Kafka: sale.reservationcreated.complete → สร้าง booking อัตโนมัติ
const handleReservationCreated = async (payload) => {
  const {
    reservationId, customerId, propertyId, projectName,
    location, price, promotion,
  } = payload;

  const booking = await createBooking({
    reservationId,
    customerId,
    propertyId,
    projectName,
    location,
    price,
    promotion,
  });

  // แจ้ง inventory lock เป็น Booked
  await updateInventoryStatus(propertyId, booking.booking_id, 'Booked');

  // แจ้ง legal ให้ draft contract
  await notifyLegal(booking.booking_id, customerId, propertyId);

  // Publish event
  await publishEvent('sale.booked.complete', {
    bookingId: booking.booking_id,
    reservationId: booking.reservation_id,
    customerId: booking.customer_id,
    propertyId: booking.property_id,
    propertyStatus: booking.property_status,
    status: booking.status,
    createdAt: booking.created_at,
  });

  return booking;
};

// Handle Kafka: payment.firstpayment.completed
const handleFirstPaymentCompleted = async (payload) => {
  const { reservationId, status } = payload;
  // หา booking จาก reservationId
  const result = await pool.query(
    'SELECT * FROM bookings WHERE reservation_id = $1',
    [reservationId]
  );
  const booking = result.rows[0];
  if (!booking) return console.warn('⚠️ Booking not found for reservation:', reservationId);

  await updateKycStatus(booking.booking_id, status === 'CONFIRMED' ? 'PENDING' : 'FAILED');
  console.log(`💳 First payment processed for booking: ${booking.booking_id}`);
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  updateKycStatus,
  updateSecondPaymentStatus,
  updateContractId,
  handleReservationCreated,
  handleFirstPaymentCompleted,
};
