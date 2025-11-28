const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/generateToken');
const { 
  createdResponse, 
  okResponse, 
  badRequestResponse, 
  unauthorizedResponse, 
  serverErrorResponse 
} = require('../utils/response');

// Register new user
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      bio,
      dateOfBirth,
      gender,
      studentId,
      department,
      yearOfStudy,
      church,
      position,
      ordinationDate,
      adminKey,
      clergyKey
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return badRequestResponse(res, 'User already exists with this email');
    }

    // Determine role based on secret keys
    let role = 'student';
    if (adminKey && adminKey === process.env.ADMIN_SECRET_KEY) {
      role = 'admin';
    } else if (clergyKey && clergyKey === process.env.CLERGY_SECRET_KEY) {
      role = 'clergy';
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user object
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      profile: {
        phone: phone || '',
        bio: bio || '',
        dateOfBirth: dateOfBirth || null,
        gender: gender || '',
        studentId: studentId || '',
        department: department || '',
        yearOfStudy: yearOfStudy || '',
        church: church || '',
        position: position || '',
        ordinationDate: ordinationDate || null
      }
    };

    // Create user
    const user = await User.create(userData);

    // Generate JWT token
    const token = generateToken({ id: user._id, role: user.role });

    // Remove password from output
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      isActive: user.isActive,
      createdAt: user.createdAt
    };

    createdResponse(res, 'User registered successfully', {
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    serverErrorResponse(res, 'Internal server error during registration');
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return badRequestResponse(res, 'Please provide email and password');
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      return unauthorizedResponse(res, 'Invalid email or password');
    }

    // Check if password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return unauthorizedResponse(res, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      return unauthorizedResponse(res, 'Your account has been deactivated. Please contact support.');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate JWT token
    const token = generateToken({ id: user._id, role: user.role });

    // Remove password from output
    user.password = undefined;

    okResponse(res, 'Login successful', {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    serverErrorResponse(res, 'Internal server error during login');
  }
};

// Change password (logged in users)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return badRequestResponse(res, 'Current password and new password are required');
    }

    // Find user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check if current password is correct
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordCorrect) {
      return unauthorizedResponse(res, 'Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    user.password = hashedNewPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Generate new JWT token
    const newToken = generateToken({ id: user._id, role: user.role });

    okResponse(res, 'Password changed successfully', {
      token: newToken
    });

  } catch (error) {
    console.error('Change password error:', error);
    serverErrorResponse(res, 'Internal server error during password change');
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    okResponse(res, 'User retrieved successfully', {
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
    console.error('Get me error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

module.exports = {
  register,
  login,
  changePassword,
  getMe
};