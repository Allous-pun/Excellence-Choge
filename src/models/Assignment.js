// models/Assignment.js
const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  materials: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  }],
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  fileUrl: {
    data: Buffer,
    contentType: String,
    filename: String,
    size: Number
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator information is required']
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
assignmentSchema.index({ createdBy: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ isPublished: 1 });
assignmentSchema.index({ createdAt: -1 });

// Virtual for checking if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate;
});

// Virtual for checking if assignment has file
assignmentSchema.virtual('hasFile').get(function() {
  return !!(this.fileUrl && this.fileUrl.data);
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;