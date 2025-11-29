const Book = require('../models/Book');
const fs = require('fs');
const path = require('path');
const { 
  createdResponse, 
  okResponse, 
  notFoundResponse, 
  serverErrorResponse,
  paginatedResponse,
  badRequestResponse
} = require('../utils/response');

// Create new book (Admin only)
const createBook = async (req, res) => {
  try {
    const {
      title,
      description,
      authorName,
      category
    } = req.body;

    // Validate required fields
    if (!title || !description || !authorName) {
      return badRequestResponse(res, 'Title, description, and author name are required');
    }

    // Check if PDF file is uploaded
    if (!req.files || !req.files.pdfFile) {
      return badRequestResponse(res, 'PDF file is required');
    }

    // Handle file uploads
    let coverImagePath = '';
    let pdfFilePath = '';

    if (req.files) {
      if (req.files.coverImage) {
        coverImagePath = req.files.coverImage[0].path;
      }
      if (req.files.pdfFile) {
        pdfFilePath = req.files.pdfFile[0].path;
      }
    }

    // Create book
    const book = await Book.create({
      title,
      description,
      authorName,
      coverImage: coverImagePath,
      pdfFile: pdfFilePath,
      category: category || 'Spiritual',
      uploadedBy: req.user.id
    });

    // Populate uploader details
    await book.populate('uploadedBy', 'name email profile.photo');

    createdResponse(res, 'Book uploaded successfully', { book });

  } catch (error) {
    console.error('Create book error:', error);
    
    // Clean up uploaded files if creation failed
    if (req.files) {
      Object.values(req.files).forEach(files => {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      });
    }
    
    serverErrorResponse(res, 'Internal server error during book upload');
  }
};

// Get all books (public)
const getAllBooks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sort = 'createdAt:desc'
    } = req.query;

    // Build query
    let query = { isPublished: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Search by title, description, or author
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } }
      ];
    }

    // Parse sort
    const sortBy = {};
    if (sort) {
      const parts = sort.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const books = await Book.find(query)
      .populate('uploadedBy', 'name profile.photo')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Book.countDocuments(query);

    paginatedResponse(res, 'Books retrieved successfully', books, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get all books error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get single book by ID (public)
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('uploadedBy', 'name profile.photo');

    if (!book) {
      return notFoundResponse(res, 'Book not found');
    }

    // Check if book is published or user is uploader/admin
    if (!book.isPublished && 
        (!req.user || (req.user.id !== book.uploadedBy._id.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Book not found');
    }

    // Increment download count (optional - you can remove this if not needed)
    book.numberOfDownloads += 1;
    await book.save();

    okResponse(res, 'Book retrieved successfully', { book });

  } catch (error) {
    console.error('Get book by ID error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Update book (Admin only)
const updateBook = async (req, res) => {
  try {
    const {
      title,
      description,
      authorName,
      category,
      isPublished
    } = req.body;

    // Find book
    const book = await Book.findById(req.params.id);
    if (!book) {
      return notFoundResponse(res, 'Book not found');
    }

    // Handle file uploads and delete old files
    let coverImagePath = book.coverImage;
    let pdfFilePath = book.pdfFile;

    if (req.files) {
      // Handle cover image update
      if (req.files.coverImage) {
        // Delete old cover image if exists
        if (book.coverImage && fs.existsSync(book.coverImage)) {
          fs.unlinkSync(book.coverImage);
        }
        coverImagePath = req.files.coverImage[0].path;
      }
      
      // Handle PDF update
      if (req.files.pdfFile) {
        // Delete old PDF if exists
        if (book.pdfFile && fs.existsSync(book.pdfFile)) {
          fs.unlinkSync(book.pdfFile);
        }
        pdfFilePath = req.files.pdfFile[0].path;
      }
    }

    // Update book
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      {
        title: title || book.title,
        description: description || book.description,
        authorName: authorName || book.authorName,
        coverImage: coverImagePath,
        pdfFile: pdfFilePath,
        category: category || book.category,
        isPublished: isPublished !== undefined ? isPublished : book.isPublished
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('uploadedBy', 'name profile.photo');

    okResponse(res, 'Book updated successfully', { book: updatedBook });

  } catch (error) {
    console.error('Update book error:', error);
    serverErrorResponse(res, 'Internal server error during book update');
  }
};

// Delete book (Admin only)
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return notFoundResponse(res, 'Book not found');
    }

    // Delete associated files
    if (book.coverImage && fs.existsSync(book.coverImage)) {
      fs.unlinkSync(book.coverImage);
    }
    if (book.pdfFile && fs.existsSync(book.pdfFile)) {
      fs.unlinkSync(book.pdfFile);
    }

    // Delete book from database
    await Book.findByIdAndDelete(req.params.id);

    okResponse(res, 'Book deleted successfully');

  } catch (error) {
    console.error('Delete book error:', error);
    serverErrorResponse(res, 'Internal server error during book deletion');
  }
};

// Get books by uploader
const getBooksByUploader = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;

    const books = await Book.find({ uploadedBy: req.params.uploaderId })
      .populate('uploadedBy', 'name profile.photo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Book.countDocuments({ uploadedBy: req.params.uploaderId });

    paginatedResponse(res, 'Books retrieved successfully', books, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get books by uploader error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Download book PDF (public)
const downloadBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return notFoundResponse(res, 'Book not found');
    }

    // Check if book is published
    if (!book.isPublished && 
        (!req.user || (req.user.id !== book.uploadedBy.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Book not found');
    }

    // Check if PDF file exists
    if (!book.pdfFile || !fs.existsSync(book.pdfFile)) {
      return notFoundResponse(res, 'PDF file not found');
    }

    // Increment download count
    book.numberOfDownloads += 1;
    await book.save();

    // Send file for download
    res.download(book.pdfFile, `${book.title}.pdf`);

  } catch (error) {
    console.error('Download book error:', error);
    serverErrorResponse(res, 'Internal server error during download');
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getBooksByUploader,
  downloadBook
};