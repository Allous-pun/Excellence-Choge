const Sermon = require('../models/Sermon');
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

// Create new sermon
const createSermon = async (req, res) => {
  try {
    const {
      title,
      content,
      summary,
      videoLink,
      tags,
      category
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return badRequestResponse(res, 'Title and content are required');
    }

    // Parse tags if they're sent as string
    let parsedTags = [];
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    // Handle file uploads
    let imagePath = '';
    let audioPath = '';

    if (req.files) {
      if (req.files.image) {
        imagePath = req.files.image[0].path;
      }
      if (req.files.audio) {
        audioPath = req.files.audio[0].path;
      }
    }

    // Create sermon
    const sermon = await Sermon.create({
      title,
      content,
      summary: summary || '',
      image: imagePath,
      audioFile: audioPath,
      videoLink: videoLink || '',
      tags: parsedTags,
      category: category || 'General',
      author: req.user.id
    });

    // Populate author details
    await sermon.populate('author', 'name email profile.photo');

    createdResponse(res, 'Sermon created successfully', { sermon });

  } catch (error) {
    console.error('Create sermon error:', error);
    
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
    
    serverErrorResponse(res, 'Internal server error during sermon creation');
  }
};

// Get all sermons (public)
const getAllSermons = async (req, res) => {
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
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Parse sort
    const sortBy = {};
    if (sort) {
      const parts = sort.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const sermons = await Sermon.find(query)
      .populate('author', 'name profile.photo')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content'); // Don't include full content in list

    // Get total count for pagination
    const total = await Sermon.countDocuments(query);

    paginatedResponse(res, 'Sermons retrieved successfully', sermons, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get all sermons error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get single sermon by ID (public)
const getSermonById = async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id)
      .populate('author', 'name profile.photo');

    if (!sermon) {
      return notFoundResponse(res, 'Sermon not found');
    }

    // Check if sermon is published or user is author/admin
    if (!sermon.isPublished && 
        (!req.user || (req.user.id !== sermon.author._id.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Sermon not found');
    }

    okResponse(res, 'Sermon retrieved successfully', { sermon });

  } catch (error) {
    console.error('Get sermon by ID error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Update sermon
const updateSermon = async (req, res) => {
  try {
    const {
      title,
      content,
      summary,
      videoLink,
      tags,
      category,
      isPublished
    } = req.body;

    // Find sermon
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) {
      return notFoundResponse(res, 'Sermon not found');
    }

    // Check if user is author or admin
    if (sermon.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return notFoundResponse(res, 'Sermon not found');
    }

    // Parse tags
    let parsedTags = sermon.tags;
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    // Handle file uploads and delete old files
    let imagePath = sermon.image;
    let audioPath = sermon.audioFile;

    if (req.files) {
      // Handle image update
      if (req.files.image) {
        // Delete old image if exists
        if (sermon.image && fs.existsSync(sermon.image)) {
          fs.unlinkSync(sermon.image);
        }
        imagePath = req.files.image[0].path;
      }
      
      // Handle audio update
      if (req.files.audio) {
        // Delete old audio if exists
        if (sermon.audioFile && fs.existsSync(sermon.audioFile)) {
          fs.unlinkSync(sermon.audioFile);
        }
        audioPath = req.files.audio[0].path;
      }
    }

    // Update sermon
    const updatedSermon = await Sermon.findByIdAndUpdate(
      req.params.id,
      {
        title: title || sermon.title,
        content: content || sermon.content,
        summary: summary !== undefined ? summary : sermon.summary,
        image: imagePath,
        audioFile: audioPath,
        videoLink: videoLink !== undefined ? videoLink : sermon.videoLink,
        tags: parsedTags,
        category: category || sermon.category,
        isPublished: isPublished !== undefined ? isPublished : sermon.isPublished
      },
      {
        new: true,
        runValidators: true
      }
    ).populate('author', 'name profile.photo');

    okResponse(res, 'Sermon updated successfully', { sermon: updatedSermon });

  } catch (error) {
    console.error('Update sermon error:', error);
    serverErrorResponse(res, 'Internal server error during sermon update');
  }
};

// Delete sermon
const deleteSermon = async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    
    if (!sermon) {
      return notFoundResponse(res, 'Sermon not found');
    }

    // Check if user is author or admin
    if (sermon.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return notFoundResponse(res, 'Sermon not found');
    }

    // Delete associated files
    if (sermon.image && fs.existsSync(sermon.image)) {
      fs.unlinkSync(sermon.image);
    }
    if (sermon.audioFile && fs.existsSync(sermon.audioFile)) {
      fs.unlinkSync(sermon.audioFile);
    }

    // Delete sermon from database
    await Sermon.findByIdAndDelete(req.params.id);

    okResponse(res, 'Sermon deleted successfully');

  } catch (error) {
    console.error('Delete sermon error:', error);
    serverErrorResponse(res, 'Internal server error during sermon deletion');
  }
};

// Get sermons by author
const getSermonsByAuthor = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;

    const sermons = await Sermon.find({ author: req.params.authorId })
      .populate('author', 'name profile.photo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content');

    const total = await Sermon.countDocuments({ author: req.params.authorId });

    paginatedResponse(res, 'Sermons retrieved successfully', sermons, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get sermons by author error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

module.exports = {
  createSermon,
  getAllSermons,
  getSermonById,
  updateSermon,
  deleteSermon,
  getSermonsByAuthor
};