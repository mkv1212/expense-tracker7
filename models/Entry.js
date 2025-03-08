const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    expenseItem: {
        type: String,
        default: '-',
    },
    expenseAmount: {
        type: Number,
        default: 0,
    },
    expenseDate: {
        type: Date,
        default: Date.now,
    },
    savingOption: {
        type: String,
        default: '-',
    },
    savingAmount: {
        type: Number,
        default: 0,
    },
    savingDate: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

module.exports = mongoose.model('Entry', entrySchema);