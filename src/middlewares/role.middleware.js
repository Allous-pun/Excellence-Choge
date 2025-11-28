const { errorResponse } = require('../utils/response');

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res, 
        403, 
        `Access denied. Required roles: ${roles.join(', ')}`
      );
    }
    next();
  };
};

// Specific role middlewares for convenience
const adminOnly = restrictTo('admin');
const clergyOnly = restrictTo('clergy');
const adminOrClergy = restrictTo('admin', 'clergy');
const studentOnly = restrictTo('student');

module.exports = {
  restrictTo,
  adminOnly,
  clergyOnly,
  adminOrClergy,
  studentOnly
};