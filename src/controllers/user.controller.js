const User = require('../models/User');
const { 
  okResponse, 
  createdResponse, 
  notFoundResponse, 
  serverErrorResponse,
  paginatedResponse
} = require('../utils/response');

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    okResponse(res, 'Profile retrieved successfully', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Update current user profile
const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'phone',
      'bio',
      'dateOfBirth',
      'gender',
      'studentId',
      'department', 
      'yearOfStudy',
      'church',
      'position',
      'ordinationDate'
    ];

    // Filter allowed fields
    const updateData = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        // Handle nested profile fields
        if (['phone', 'bio', 'dateOfBirth', 'gender'].includes(key)) {
          if (!updateData.profile) updateData.profile = {};
          updateData.profile[key] = req.body[key];
        } else if (['studentId', 'department', 'yearOfStudy'].includes(key)) {
          if (!updateData.profile) updateData.profile = {};
          updateData.profile[key] = req.body[key];
        } else if (['church', 'position', 'ordinationDate'].includes(key)) {
          if (!updateData.profile) updateData.profile = {};
          updateData.profile[key] = req.body[key];
        } else {
          updateData[key] = req.body[key];
        }
      }
    });

    // Handle file upload for profile photo
    if (req.file) {
      if (!updateData.profile) updateData.profile = {};
      updateData.profile.photo = req.file.filename; // Store filename only
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    okResponse(res, 'Profile updated successfully', {
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profile: updatedUser.profile,
        isActive: updatedUser.isActive
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    serverErrorResponse(res, 'Internal server error during profile update');
  }
};

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      search,
      sort = 'createdAt:desc'
    } = req.query;

    // Build query
    let query = {};

    // Filter by role
    if (role && ['student', 'admin', 'clergy'].includes(role)) {
      query.role = role;
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Parse sort
    const sortBy = {};
    if (sort) {
      const parts = sort.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    // Execute query with pagination
    const users = await User.find(query)
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    // Get total count for pagination
    const total = await User.countDocuments(query);

    paginatedResponse(res, 'Users retrieved successfully', users, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get all users error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get user by ID (Admin only)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    okResponse(res, 'User retrieved successfully', { user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Update user by ID (Admin only)
const updateUserById = async (req, res) => {
  try {
    const {
      name,
      role,
      isActive,
      profile
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (role && ['student', 'admin', 'clergy'].includes(role)) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (profile) updateData.profile = { ...profile };

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!updatedUser) {
      return notFoundResponse(res, 'User not found');
    }

    okResponse(res, 'User updated successfully', { user: updatedUser });

  } catch (error) {
    console.error('Update user by ID error:', error);
    serverErrorResponse(res, 'Internal server error during user update');
  }
};

// Delete user (Admin only - soft delete)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    okResponse(res, 'User deactivated successfully');

  } catch (error) {
    console.error('Delete user error:', error);
    serverErrorResponse(res, 'Internal server error during user deletion');
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUser
};