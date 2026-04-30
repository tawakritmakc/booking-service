const bookingService = require('../services/booking.service');

// GET /api/bookings
const getBookings = async (req, res) => {
  try {
    const { customerId, propertyId, status } = req.query;
    const data = await bookingService.getBookings({ customerId, propertyId, status });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    const data = await bookingService.getBookingById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const data = await bookingService.createBooking(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bookings/:id/status
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });
    const data = await bookingService.updateBookingStatus(req.params.id, status);
    if (!data) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bookings/:id/kyc
const updateKycStatus = async (req, res) => {
  try {
    const { kycStatus } = req.body;
    if (!kycStatus) return res.status(400).json({ success: false, message: 'kycStatus is required' });
    const data = await bookingService.updateKycStatus(req.params.id, kycStatus);
    if (!data) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bookings/:id/second-payment
const updateSecondPaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!paymentStatus) return res.status(400).json({ success: false, message: 'paymentStatus is required' });
    const data = await bookingService.updateSecondPaymentStatus(req.params.id, paymentStatus);
    if (!data) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bookings/:id/contract
const updateContractId = async (req, res) => {
  try {
    const { contractId } = req.body;
    if (!contractId) return res.status(400).json({ success: false, message: 'contractId is required' });
    const data = await bookingService.updateContractId(req.params.id, contractId);
    if (!data) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  updateKycStatus,
  updateSecondPaymentStatus,
  updateContractId,
};
