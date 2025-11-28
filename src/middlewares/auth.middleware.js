const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { unauthorizedResponse, serverErrorResponse } = require('../utils/response');

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return unauthorizedResponse(res, 'You are not logged in. Please log in to get access.');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return unauthorizedResponse(res, 'The user belonging to this token no longer exists.');
    }

    // Check if user is active
    if (!currentUser.isActive) {
      return unauthorizedResponse(res, 'Your account has been deactivated. Please contact support.');
    }

    // Grant access to protected route
    req.user = currentUser;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return unauthorizedResponse(res, 'Invalid token. Please log in again.');
    }
    
    if (error.name === 'TokenExpiredError') {
      return unauthorizedResponse(res, 'Your token has expired. Please log in again.');
    }

    return serverErrorResponse(res, 'Internal server error in authentication');
  }
};

module.exports = authMiddleware;