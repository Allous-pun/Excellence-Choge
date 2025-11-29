const mongoose = require('mongoose');

const prayerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Prayer title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Prayer content is required']
  },
  image: {
    type: String,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Prayer author is required']
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
prayerSchema.index({ author: 1 });
prayerSchema.index({ category: 1 });
prayerSchema.index({ createdAt: -1 });

const Prayer = mongoose.model('Prayer', prayerSchema);

module.exports = Prayer;