require('dotenv').config();
const express = require('express');
const { initDB } = require('./db');
const { connectKafka, subscribeToTopics } = require('./kafka');
const {
  handleReservationCreated,
  handleFirstPaymentCompleted,
} = require('./services/booking.service');
const bookingRoutes = require('./routes/booking.routes');

const app = express();
app.use(express.json());

// Routes
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'booking-service' }));

// Kafka event handler
const kafkaHandler = async (topic, payload) => {
  switch (topic) {
    case 'sale.reservationcreated.complete':
      await handleReservationCreated(payload);
      break;
    case 'payment.firstpayment.completed':
      await handleFirstPaymentCompleted(payload);
      break;
    default:
      console.warn(`⚠️ Unhandled topic: ${topic}`);
  }
};

const start = async () => {
  try {
    await initDB();

    await connectKafka();
    await subscribeToTopics(
      ['sale.reservationcreated.complete', 'payment.firstpayment.completed'],
      kafkaHandler
    );

    const PORT = process.env.PORT || 3003;
    app.listen(PORT, () => {
      console.log(`🚀 Booking Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start service:', err);
    process.exit(1);
  }
};

start();
