const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  verificationCode: {
    type: String,
    required: false, // Temporary code for verification
  },
  isVerified: {
    type: Boolean,
    default: false, // Default to false until verified
  },
});

module.exports = mongoose.model('User', userSchema);
