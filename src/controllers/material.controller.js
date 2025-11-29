// controllers/material.controller.js
const Material = require('../models/Material');
const { 
  createdResponse, 
  okResponse, 
  notFoundResponse, 
  serverErrorResponse,
  paginatedResponse,
  badRequestResponse
} = require('../utils/response');

// Create new learning material (Admin only)
const createLearningMaterial = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      externalLink,
      tags
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !type) {
      return badRequestResponse(res, 'Title, description, category, and type are required');
    }

    // Validate type-specific requirements
    if (type === 'video' && !externalLink && (!req.files || !req.files.fileUrl)) {
      return badRequestResponse(res, 'Video materials require either a file upload or external link');
    }

    if (type !== 'video' && (!req.files || !req.files.fileUrl)) {
      return badRequestResponse(res, 'File upload is required for this material type');
    }

    if (type === 'video' && externalLink && req.files && req.files.fileUrl) {
      return badRequestResponse(res, 'Video materials should have either file upload OR external link, not both');
    }

    // Process files
    let fileUrlData = null;
    let thumbnailUrlData = null;

    if (req.files) {
      // Process main file
      if (req.files.fileUrl) {
        const file = req.files.fileUrl[0];
        fileUrlData = {
          data: file.buffer,
          contentType: file.mimetype,
          filename: file.originalname,
          size: file.size
        };
      }

      // Process thumbnail
      if (req.files.thumbnailUrl) {
        const thumbnail = req.files.thumbnailUrl[0];
        thumbnailUrlData = {
          data: thumbnail.buffer,
          contentType: thumbnail.mimetype,
          filename: thumbnail.originalname
        };
      }
    }

    // Parse tags if provided as string
    let tagsArray = [];
    if (tags) {
      if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    }

    // Create learning material
    const learningMaterial = await Material.create({
      title: title.replace(/"/g, ''),
      description: description.replace(/"/g, ''),
      category: category.replace(/"/g, ''),
      type: type.replace(/"/g, ''),
      fileUrl: fileUrlData,
      externalLink: externalLink ? externalLink.replace(/"/g, '') : undefined,
      thumbnailUrl: thumbnailUrlData,
      tags: tagsArray,
      createdBy: req.user.id
    });

    // Populate creator details
    await learningMaterial.populate('createdBy', 'name email profile.photo');

    createdResponse(res, 'Learning material uploaded successfully', { learningMaterial });

  } catch (error) {
    console.error('Create learning material error:', error);
    serverErrorResponse(res, 'Internal server error during material upload');
  }
};

// Get all learning materials (Public/authenticated)
const getAllLearningMaterials = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      type,
      tags,
      search,
      sort = 'createdAt:desc'
    } = req.query;

    // Build query
    let query = { isPublished: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by tags
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagsArray };
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Parse sort
    const sortBy = {};
    if (sort) {
      const parts = sort.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sortBy.createdAt = -1;
    }

    // Execute query with pagination - exclude file data for performance
    const learningMaterials = await Material.find(query)
      .populate('createdBy', 'name profile.photo')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-fileUrl.data -thumbnailUrl.data'); // Don't send file data in list

    // Get total count for pagination
    const total = await Material.countDocuments(query);

    paginatedResponse(res, 'Learning materials retrieved successfully', learningMaterials, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get all learning materials error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get single learning material by ID
const getLearningMaterialById = async (req, res) => {
  try {
    const learningMaterial = await Material.findById(req.params.id)
      .populate('createdBy', 'name profile.photo')
      .select('-fileUrl.data -thumbnailUrl.data'); // Don't send file data in details

    if (!learningMaterial) {
      return notFoundResponse(res, 'Learning material not found');
    }

    // Check if material is published or user is creator/admin
    if (!learningMaterial.isPublished && 
        (!req.user || (req.user.id !== learningMaterial.createdBy._id.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Learning material not found');
    }

    // Increment view count
    learningMaterial.numberOfViews += 1;
    await learningMaterial.save();

    okResponse(res, 'Learning material retrieved successfully', { learningMaterial });

  } catch (error) {
    console.error('Get learning material by ID error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Download learning material file
const downloadLearningMaterial = async (req, res) => {
  try {
    const learningMaterial = await Material.findById(req.params.id);

    if (!learningMaterial) {
      return notFoundResponse(res, 'Learning material not found');
    }

    // Check if material is published
    if (!learningMaterial.isPublished && 
        (!req.user || (req.user.id !== learningMaterial.createdBy.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Learning material not found');
    }

    // Check if external link exists (redirect instead of download)
    if (learningMaterial.externalLink) {
      return res.redirect(learningMaterial.externalLink);
    }

    // Check if file exists
    if (!learningMaterial.fileUrl || !learningMaterial.fileUrl.data) {
      return notFoundResponse(res, 'File not found');
    }

    // Increment download count
    learningMaterial.numberOfDownloads += 1;
    await learningMaterial.save();

    // Set headers and send file
    res.setHeader('Content-Type', learningMaterial.fileUrl.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${learningMaterial.title}_${learningMaterial.fileUrl.filename}"`);
    res.setHeader('Content-Length', learningMaterial.fileUrl.data.length);

    res.send(learningMaterial.fileUrl.data);

  } catch (error) {
    console.error('Download learning material error:', error);
    serverErrorResponse(res, 'Internal server error during download');
  }
};

// Get learning material thumbnail
const getLearningMaterialThumbnail = async (req, res) => {
  try {
    const learningMaterial = await Material.findById(req.params.id);

    if (!learningMaterial || !learningMaterial.thumbnailUrl || !learningMaterial.thumbnailUrl.data) {
      return notFoundResponse(res, 'Thumbnail not found');
    }

    res.setHeader('Content-Type', learningMaterial.thumbnailUrl.contentType);
    res.send(learningMaterial.thumbnailUrl.data);

  } catch (error) {
    console.error('Get learning material thumbnail error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get learning material file (stream without download)
const getLearningMaterialFile = async (req, res) => {
  try {
    const learningMaterial = await Material.findById(req.params.id);

    if (!learningMaterial) {
      return notFoundResponse(res, 'Learning material not found');
    }

    // Check if material is published
    if (!learningMaterial.isPublished && 
        (!req.user || (req.user.id !== learningMaterial.createdBy.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Learning material not found');
    }

    // For external links, redirect
    if (learningMaterial.externalLink) {
      return res.redirect(learningMaterial.externalLink);
    }

    // Check if file exists
    if (!learningMaterial.fileUrl || !learningMaterial.fileUrl.data) {
      return notFoundResponse(res, 'File not found');
    }

    // Set headers and send file (inline for viewing)
    res.setHeader('Content-Type', learningMaterial.fileUrl.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${learningMaterial.title}_${learningMaterial.fileUrl.filename}"`);
    res.setHeader('Content-Length', learningMaterial.fileUrl.data.length);

    res.send(learningMaterial.fileUrl.data);

  } catch (error) {
    console.error('Get learning material file error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Update learning material (Admin only)
const updateLearningMaterial = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      externalLink,
      tags,
      isPublished
    } = req.body;

    // Find learning material
    const learningMaterial = await Material.findById(req.params.id);
    if (!learningMaterial) {
      return notFoundResponse(res, 'Learning material not found');
    }

    // Process file updates
    if (req.files) {
      // Update main file
      if (req.files.fileUrl) {
        const file = req.files.fileUrl[0];
        learningMaterial.fileUrl = {
          data: file.buffer,
          contentType: file.mimetype,
          filename: file.originalname,
          size: file.size
        };
        // Clear external link if file is uploaded
        if (file) {
          learningMaterial.externalLink = undefined;
        }
      }

      // Update thumbnail
      if (req.files.thumbnailUrl) {
        const thumbnail = req.files.thumbnailUrl[0];
        learningMaterial.thumbnailUrl = {
          data: thumbnail.buffer,
          contentType: thumbnail.mimetype,
          filename: thumbnail.originalname
        };
      }
    }

    // Update other fields
    if (title) learningMaterial.title = title.replace(/"/g, '');
    if (description) learningMaterial.description = description.replace(/"/g, '');
    if (category) learningMaterial.category = category.replace(/"/g, '');
    if (type) learningMaterial.type = type.replace(/"/g, '');
    if (externalLink) {
      learningMaterial.externalLink = externalLink.replace(/"/g, '');
      // Clear file data if external link is provided
      learningMaterial.fileUrl = undefined;
    }
    if (tags) {
      const tagsArray = typeof tags === 'string' ? 
        tags.split(',').map(tag => tag.trim()).filter(tag => tag) : 
        tags;
      learningMaterial.tags = tagsArray;
    }
    if (isPublished !== undefined) learningMaterial.isPublished = isPublished;

    await learningMaterial.save();
    await learningMaterial.populate('createdBy', 'name profile.photo');

    okResponse(res, 'Learning material updated successfully', { learningMaterial });

  } catch (error) {
    console.error('Update learning material error:', error);
    serverErrorResponse(res, 'Internal server error during material update');
  }
};

// Delete learning material (Admin only)
const deleteLearningMaterial = async (req, res) => {
  try {
    const learningMaterial = await Material.findById(req.params.id);
    
    if (!learningMaterial) {
      return notFoundResponse(res, 'Learning material not found');
    }

    await Material.findByIdAndDelete(req.params.id);

    okResponse(res, 'Learning material deleted successfully');

  } catch (error) {
    console.error('Delete learning material error:', error);
    serverErrorResponse(res, 'Internal server error during material deletion');
  }
};

// Get categories (for frontend dropdowns) - ONLY ONE FUNCTION
const getCategories = async (req, res) => {
  try {
    const categories = [
      'Bible Studies',
      'Youth Ministry',
      'Sunday School',
      'Theology',
      'Church History',
      'Christian Living',
      'Leadership',
      'Worship',
      'Evangelism',
      'Discipleship',
      'Marriage & Family',
      'Children Ministry',
      'Teen Ministry',
      'Adult Education',
      'Seminary',
      'Spiritual Growth',
      'Apologetics',
      'Missions',
      'Pastoral Care',
      'Biblical Languages'
    ];
    
    okResponse(res, 'Categories retrieved successfully', { categories });
  } catch (error) {
    console.error('Get categories error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get tags (for frontend filtering)
const getTags = async (req, res) => {
  try {
    const tags = await Material.distinct('tags', { isPublished: true });
    okResponse(res, 'Tags retrieved successfully', { tags });
  } catch (error) {
    console.error('Get tags error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

module.exports = {
  createLearningMaterial,
  getAllLearningMaterials,
  getLearningMaterialById,
  updateLearningMaterial,
  deleteLearningMaterial,
  downloadLearningMaterial,
  getLearningMaterialThumbnail,
  getLearningMaterialFile,
  getCategories,
  getTags
};