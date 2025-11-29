const Prayer = require('../models/Prayer');
const fs = require('fs');
const { 
  createdResponse, 
  okResponse, 
  notFoundResponse, 
  serverErrorResponse,
  paginatedResponse,
  badRequestResponse
} = require('../utils/response');

// Create new prayer
const createPrayer = async (req, res) => {
  try {
    const {
      title,
      content,
      category
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return badRequestResponse(res, 'Title and content are required');
    }

    // Handle image upload
    let imagePath = '';
    if (req.file) {
      imagePath = req.file.path;
    }

    // Create prayer
    const prayer = await Prayer.create({
      title,
      content,
      image: imagePath,
      category: category || 'General',
      author: req.user.id
    });

    // Populate author details
    await prayer.populate('author', 'name email profile.photo');

    createdResponse(res, 'Prayer created successfully', { prayer });

  } catch (error) {
    console.error('Create prayer error:', error);
    
    // Clean up uploaded file if creation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    serverErrorResponse(res, 'Internal server error during prayer creation');
  }
};

// Get all prayers (public)
const getAllPrayers = async (req, res) => {
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

    // Search by title or content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Parse sort
    const sortBy = {};
    if (sort) {
      const parts = sort.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const prayers = await Prayer.find(query)
      .populate('author', 'name profile.photo')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content'); // Don't include full content in list

    // Get total count for pagination
    const total = await Prayer.countDocuments(query);

    paginatedResponse(res, 'Prayers retrieved successfully', prayers, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get all prayers error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get single prayer by ID (public)
const getPrayerById = async (req, res) => {
  try {
    const prayer = await Prayer.findById(req.params.id)
      .populate('author', 'name profile.photo');

    if (!prayer) {
      return notFoundResponse(res, 'Prayer not found');
    }

    // Check if prayer is published or user is author/admin
    if (!prayer.isPublished && 
        (!req.user || (req.user.id !== prayer.author._id.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Prayer not found');
    }

    okResponse(res, 'Prayer retrieved successfully', { prayer });

  } catch (error) {
    console.error('Get prayer by ID error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Update prayer
const updatePrayer = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      isPublished
    } = req.body;

    // Find prayer
    const prayer = await Prayer.findById(req.params.id);
    if (!prayer) {
      return notFoundResponse(res, 'Prayer not found');
    }

    // Check if user is author or admin
    if (prayer.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return notFoundResponse(res, 'Prayer not found');
    }

    // Handle image update and delete old image
    let imagePath = prayer.image;
    if (req.file) {
      // Delete old image if exists
      if (prayer.image && fs.existsSync(prayer.image)) {
        fs.unlinkSync(prayer.image);
      }
      imagePath = req.file.path;
    }

    // Update prayer
    const updatedPrayer = await Prayer.findByIdAndUpdate(
      req.params.id,
      {
        title: title || prayer.title,
        content: content || prayer.content,
        image: imagePath,
        category: category || prayer.category,
        isPublished: isPublished !== undefined ? isPublished : prayer.isPublished
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('author', 'name profile.photo');

    okResponse(res, 'Prayer updated successfully', { prayer: updatedPrayer });

  } catch (error) {
    console.error('Update prayer error:', error);
    serverErrorResponse(res, 'Internal server error during prayer update');
  }
};

// Delete prayer
const deletePrayer = async (req, res) => {
  try {
    const prayer = await Prayer.findById(req.params.id);
    
    if (!prayer) {
      return notFoundResponse(res, 'Prayer not found');
    }

    // Check if user is author or admin
    if (prayer.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return notFoundResponse(res, 'Prayer not found');
    }

    // Delete associated image
    if (prayer.image && fs.existsSync(prayer.image)) {
      fs.unlinkSync(prayer.image);
    }

    // Delete prayer from database
    await Prayer.findByIdAndDelete(req.params.id);

    okResponse(res, 'Prayer deleted successfully');

  } catch (error) {
    console.error('Delete prayer error:', error);
    serverErrorResponse(res, 'Internal server error during prayer deletion');
  }
};

// Get prayers by author
const getPrayersByAuthor = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;

    const prayers = await Prayer.find({ author: req.params.authorId })
      .populate('author', 'name profile.photo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content');

    const total = await Prayer.countDocuments({ author: req.params.authorId });

    paginatedResponse(res, 'Prayers retrieved successfully', prayers, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get prayers by author error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

module.exports = {
  createPrayer,
  getAllPrayers,
  getPrayerById,
  updatePrayer,
  deletePrayer,
  getPrayersByAuthor
};