const express = require('express');
const router = express.Router();
const controller = require('../controllers/booking.controller');

// GET /api/bookings
router.get('/', controller.getBookings);

// GET /api/bookings/:id
router.get('/:id', controller.getBookingById);

// POST /api/bookings
router.post('/', controller.createBooking);

// PATCH /api/bookings/:id/status
router.patch('/:id/status', controller.updateBookingStatus);

// PATCH /api/bookings/:id/kyc
router.patch('/:id/kyc', controller.updateKycStatus);

// PATCH /api/bookings/:id/second-payment
router.patch('/:id/second-payment', controller.updateSecondPaymentStatus);

// PATCH /api/bookings/:id/contract
router.patch('/:id/contract', controller.updateContractId);

module.exports = router;
