const multer = require('multer');

// Use memory storage instead of disk storage for Render compatibility
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Check file type based on fieldname
  if (file.fieldname === 'image' || file.fieldname === 'photo' || file.fieldname === 'coverImage') {
    // Only allow images for image/photo/coverImage fields
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  } else if (file.fieldname === 'audio') {
    // Only allow audio files for audio field
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  } else if (file.fieldname === 'pdfFile') {
    // Only allow PDF files for pdfFile field
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for books!'), false);
    }
  } else if (file.fieldname === 'fileUrl') {
    // For assignment and submission files - allow documents, PDFs, images
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/vnd.ms-powerpoint' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only document, PDF, and image files are allowed for assignments!'), false);
    }
  } else {
    cb(new Error('Unexpected file field!'), false);
  }
};

// Create multer instance with memory storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Export specific upload methods
const uploadMiddleware = {
  // For user profile photos
  single: (fieldName) => upload.single(fieldName),
  
  // For sermons (multiple files: image + audio)
  fields: (fields) => upload.fields(fields),
  
  // For prayers (single image)
  prayerImage: () => upload.single('image'),
  
  // For books (cover image + PDF)
  bookFiles: () => upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 }
  ]),
  
  // For assignment files (single file upload)
  assignmentFile: () => upload.single('fileUrl'),
  
  // For submission files (single file upload)
  submissionFile: () => upload.single('fileUrl'),
  
  // For multiple files of same type
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  
  // For no file uploads
  none: () => upload.none()
};

module.exports = uploadMiddleware;