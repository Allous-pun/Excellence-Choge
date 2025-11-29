const Book = require('../models/Book');
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

    // Process files
    let coverImageData = null;
    let pdfFileData = null;

    if (req.files) {
      // Process cover image
      if (req.files.coverImage) {
        const coverImage = req.files.coverImage[0];
        coverImageData = {
          data: coverImage.buffer,
          contentType: coverImage.mimetype,
          filename: coverImage.originalname
        };
      }

      // Process PDF file
      if (req.files.pdfFile) {
        const pdfFile = req.files.pdfFile[0];
        pdfFileData = {
          data: pdfFile.buffer,
          contentType: pdfFile.mimetype,
          filename: pdfFile.originalname,
          size: pdfFile.size
        };
      }
    }

    // Create book
    const book = await Book.create({
      title: title.replace(/"/g, ''),
      description: description.replace(/"/g, ''),
      authorName: authorName.replace(/"/g, ''),
      coverImage: coverImageData,
      pdfFile: pdfFileData,
      category: category ? category.replace(/"/g, '') : 'Spiritual',
      uploadedBy: req.user.id
    });

    // Populate uploader details
    await book.populate('uploadedBy', 'name email profile.photo');

    createdResponse(res, 'Book uploaded successfully', { book });

  } catch (error) {
    console.error('Create book error:', error);
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

    // Execute query with pagination - exclude file data for performance
    const books = await Book.find(query)
      .populate('uploadedBy', 'name profile.photo')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-coverImage.data -pdfFile.data'); // Don't send file data in list

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
      .populate('uploadedBy', 'name profile.photo')
      .select('-coverImage.data -pdfFile.data'); // Don't send file data in details

    if (!book) {
      return notFoundResponse(res, 'Book not found');
    }

    // Check if book is published or user is uploader/admin
    if (!book.isPublished && 
        (!req.user || (req.user.id !== book.uploadedBy._id.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Book not found');
    }

    okResponse(res, 'Book retrieved successfully', { book });

  } catch (error) {
    console.error('Get book by ID error:', error);
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
    if (!book.pdfFile || !book.pdfFile.data) {
      return notFoundResponse(res, 'PDF file not found');
    }

    // Increment download count
    book.numberOfDownloads += 1;
    await book.save();

    // Set headers and send PDF
    res.setHeader('Content-Type', book.pdfFile.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${book.title}.pdf"`);
    res.setHeader('Content-Length', book.pdfFile.data.length);

    res.send(book.pdfFile.data);

  } catch (error) {
    console.error('Download book error:', error);
    serverErrorResponse(res, 'Internal server error during download');
  }
};

// Get book cover image
const getBookCover = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book || !book.coverImage || !book.coverImage.data) {
      return notFoundResponse(res, 'Cover image not found');
    }

    res.setHeader('Content-Type', book.coverImage.contentType);
    res.send(book.coverImage.data);

  } catch (error) {
    console.error('Get book cover error:', error);
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

    // Process file updates
    if (req.files) {
      // Update cover image
      if (req.files.coverImage) {
        const coverImage = req.files.coverImage[0];
        book.coverImage = {
          data: coverImage.buffer,
          contentType: coverImage.mimetype,
          filename: coverImage.originalname
        };
      }

      // Update PDF file
      if (req.files.pdfFile) {
        const pdfFile = req.files.pdfFile[0];
        book.pdfFile = {
          data: pdfFile.buffer,
          contentType: pdfFile.mimetype,
          filename: pdfFile.originalname,
          size: pdfFile.size
        };
      }
    }

    // Update other fields
    if (title) book.title = title.replace(/"/g, '');
    if (description) book.description = description.replace(/"/g, '');
    if (authorName) book.authorName = authorName.replace(/"/g, '');
    if (category) book.category = category.replace(/"/g, '');
    if (isPublished !== undefined) book.isPublished = isPublished;

    await book.save();
    await book.populate('uploadedBy', 'name profile.photo');

    okResponse(res, 'Book updated successfully', { book });

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

    await Book.findByIdAndDelete(req.params.id);

    okResponse(res, 'Book deleted successfully');

  } catch (error) {
    console.error('Delete book error:', error);
    serverErrorResponse(res, 'Internal server error during book deletion');
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  downloadBook,
  getBookCover
};