// models/AssignmentSubmission.js
const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment ID is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  message: {
    type: String,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  fileUrl: {
    data: Buffer,
    contentType: String,
    filename: String,
    size: Number
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  graded: {
    type: Boolean,
    default: false
  },
  grade: {
    type: String,
    enum: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'Pending'],
    default: 'Pending'
  },
  feedback: {
    type: String,
    maxlength: [1000, 'Feedback cannot exceed 1000 characters']
  },
  gradedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index to ensure one submission per student per assignment
assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

// Indexes for better query performance
assignmentSubmissionSchema.index({ studentId: 1 });
assignmentSubmissionSchema.index({ assignmentId: 1 });
assignmentSubmissionSchema.index({ graded: 1 });
assignmentSubmissionSchema.index({ submittedAt: -1 });

// Virtual for checking if submission has file
assignmentSubmissionSchema.virtual('hasFile').get(function() {
  return !!(this.fileUrl && this.fileUrl.data);
});

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);

module.exports = AssignmentSubmission;