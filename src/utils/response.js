const successResponse = (res, statusCode, message, data = null, meta = null) => {
  const response = {
    status: 'success',
    message
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode, message, error = null) => {
  const response = {
    status: 'error',
    message
  };

  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

// Convenience methods for common responses
const createdResponse = (res, message, data) => {
  return successResponse(res, 201, message, data);
};

const okResponse = (res, message, data) => {
  return successResponse(res, 200, message, data);
};

const paginatedResponse = (res, message, data, pagination) => {
  return successResponse(res, 200, message, data, { pagination });
};

const badRequestResponse = (res, message) => {
  return errorResponse(res, 400, message);
};

const unauthorizedResponse = (res, message = 'Unauthorized') => {
  return errorResponse(res, 401, message);
};

const forbiddenResponse = (res, message = 'Forbidden') => {
  return errorResponse(res, 403, message);
};

const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, 404, message);
};

const serverErrorResponse = (res, message = 'Internal server error') => {
  return errorResponse(res, 500, message);
};

module.exports = {
  successResponse,
  errorResponse,
  createdResponse,
  okResponse,
  paginatedResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse
};