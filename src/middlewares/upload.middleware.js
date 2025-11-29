const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const uploadDirs = [
  'uploads/images',
  'uploads/audio',
  'uploads/profiles'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/images/'; // Default path
    
    // Determine upload path based on file type and route
    if (file.fieldname === 'audio') {
      uploadPath = 'uploads/audio/';
    } else if (file.fieldname === 'image') {
      uploadPath = 'uploads/images/';
    } else if (file.fieldname === 'photo') {
      uploadPath = 'uploads/profiles/';
    }
    
    // Additional logic based on route
    if (req.baseUrl.includes('users')) {
      uploadPath = 'uploads/profiles/';
    } else if (req.baseUrl.includes('sermons')) {
      if (file.fieldname === 'audio') {
        uploadPath = 'uploads/audio/';
      } else {
        uploadPath = 'uploads/images/';
      }
    } else if (req.baseUrl.includes('prayers')) {
      uploadPath = 'uploads/images/';
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    
    let prefix = 'file';
    if (file.fieldname === 'image') prefix = 'image';
    if (file.fieldname === 'audio') prefix = 'audio';
    if (file.fieldname === 'photo') prefix = 'profile';
    
    const fileName = prefix + '-' + uniqueSuffix + fileExtension;
    cb(null, fileName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Check file type based on fieldname
  if (file.fieldname === 'image' || file.fieldname === 'photo') {
    // Only allow images for image/photo fields
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
  } else {
    cb(new Error('Unexpected file field!'), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for all files
  }
});

// Export specific upload methods for different use cases
const uploadMiddleware = {
  // For user profile photos
  single: (fieldName) => upload.single(fieldName),
  
  // For sermons (multiple files: image + audio)
  fields: (fields) => upload.fields(fields),
  
  // For prayers (single image)
  prayerImage: () => upload.single('image'),
  
  // For multiple files of same type
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount),
  
  // For no file uploads
  none: () => upload.none()
};

module.exports = uploadMiddleware;