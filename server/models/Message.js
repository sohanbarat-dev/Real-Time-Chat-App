const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  room: {
    type: String,
    required: true,
    default: 'general'
  },
  avatar: {
    type: String,  // color hex for avatar
    default: '#6366f1'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
