// models/Material.js
const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Bible Studies',
      'Youth Ministry',
      'Sunday School',
      'Theology',
      'Church History',
      'Christian Living',
      'Leadership',
      'Worship',
      'Evangelism',
      'Discipleship',
      'Marriage & Family',
      'Children Ministry',
      'Teen Ministry',
      'Adult Education',
      'Seminary',
      'Spiritual Growth',
      'Apologetics',
      'Missions',
      'Pastoral Care',
      'Biblical Languages'
    ],
    default: 'Bible Studies'
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['pdf', 'video', 'note', 'image'],
    default: 'pdf'
  },
  fileUrl: {
    data: Buffer,
    contentType: String,
    filename: String,
    size: Number
  },
  externalLink: {
    type: String,
    trim: true
  },
  thumbnailUrl: {
    data: Buffer,
    contentType: String,
    filename: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader information is required']
  },
  tags: [{
    type: String,
    trim: true
  }],
  numberOfDownloads: {
    type: Number,
    default: 0
  },
  numberOfViews: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
materialSchema.index({ createdBy: 1 });
materialSchema.index({ category: 1 });
materialSchema.index({ type: 1 });
materialSchema.index({ tags: 1 });
materialSchema.index({ createdAt: -1 });
materialSchema.index({ title: 'text', description: 'text' });

// Virtual for checking if material has file
materialSchema.virtual('hasFile').get(function() {
  return !!(this.fileUrl && this.fileUrl.data);
});

// Virtual for checking if material has thumbnail
materialSchema.virtual('hasThumbnail').get(function() {
  return !!(this.thumbnailUrl && this.thumbnailUrl.data);
});

const Material = mongoose.model('Material', materialSchema);

module.exports = Material;