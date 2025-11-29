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
  } else {
    cb(new Error('Unexpected file field!'), false);
  }
};

// Create multer instance with memory storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for books
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
  
  // For multiple files of same type
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  
  // For no file uploads
  none: () => upload.none()
};

module.exports = uploadMiddleware;