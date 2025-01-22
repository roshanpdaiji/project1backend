import mongoose from 'mongoose';

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true }, // Changed to String to avoid NaN errors
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
});

const appointmentModel =
    mongoose.models.appointment || mongoose.model('appointment', appointmentSchema);

export default appointmentModel;