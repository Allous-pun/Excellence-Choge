const mongoose = require('mongoose');

const sermonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Sermon title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Sermon content is required']
  },
  summary: {
    type: String,
    maxlength: [500, 'Summary cannot exceed 500 characters'],
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  audioFile: {
    type: String,
    default: ''
  },
  videoLink: {
    type: String,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sermon author is required']
  },
  tags: [{
    type: String,
    trim: true
  }],
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
sermonSchema.index({ author: 1 });
sermonSchema.index({ category: 1 });
sermonSchema.index({ createdAt: -1 });

const Sermon = mongoose.model('Sermon', sermonSchema);

module.exports = Sermon;