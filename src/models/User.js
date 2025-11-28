const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'clergy'],
    default: 'student'
  },
  profile: {
    photo: String,
    phone: String,
    bio: String,
    dateOfBirth: Date,
    gender: String,
    studentId: String,
    department: String,
    yearOfStudy: String,
    church: String,
    position: String,
    ordinationDate: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: Date,
  passwordChangedAt: Date
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

module.exports = User;