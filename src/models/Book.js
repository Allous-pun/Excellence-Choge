const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Book description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true
  },
  coverImage: {
    data: Buffer,
    contentType: String,
    filename: String
  },
  pdfFile: {
    data: Buffer,
    contentType: String,
    filename: String,
    size: Number
  },
  category: {
    type: String,
    default: 'Spiritual',
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader information is required']
  },
  numberOfDownloads: {
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

// Index for better query performance
bookSchema.index({ uploadedBy: 1 });
bookSchema.index({ category: 1 });
bookSchema.index({ createdAt: -1 });

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;