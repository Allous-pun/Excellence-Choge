// controllers/assignment.controller.js
const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { 
  createdResponse, 
  okResponse, 
  notFoundResponse, 
  serverErrorResponse,
  paginatedResponse,
  badRequestResponse,
  forbiddenResponse
} = require('../utils/response');

// Create new assignment (Admin only)
const createAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      materials,
      dueDate
    } = req.body;

    // Validate required fields
    if (!title || !description || !dueDate) {
      return badRequestResponse(res, 'Title, description, and due date are required');
    }

    // Parse materials if provided - FIXED VERSION
    let materialsArray = [];
    if (materials) {
      try {
        // Handle both stringified array and actual array
        if (typeof materials === 'string') {
          // Try to parse as JSON first (for array strings)
          if (materials.startsWith('[') && materials.endsWith(']')) {
            materialsArray = JSON.parse(materials);
          } else {
            // Handle comma-separated string
            materialsArray = materials.split(',').map(id => id.trim()).filter(id => id);
          }
        } else if (Array.isArray(materials)) {
          materialsArray = materials;
        }
        
        // Validate that all materials are valid ObjectId strings
        materialsArray = materialsArray.filter(materialId => {
          if (mongoose.Types.ObjectId.isValid(materialId)) {
            return materialId;
          }
          console.warn(`Invalid material ID skipped: ${materialId}`);
          return false;
        });
      } catch (parseError) {
        console.warn('Error parsing materials:', parseError);
        // If parsing fails, treat as empty array
        materialsArray = [];
      }
    }

    // Process file if uploaded
    let fileUrlData = null;
    if (req.file) {
      fileUrlData = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size
      };
    }

    // Create assignment
    const assignment = await Assignment.create({
      title: title.replace(/"/g, ''),
      description: description.replace(/"/g, ''),
      materials: materialsArray,
      dueDate: new Date(dueDate),
      fileUrl: fileUrlData,
      createdBy: req.user.id
    });

    // Populate creator details
    await assignment.populate('createdBy', 'name profile.photo');
    await assignment.populate('materials', 'title type');

    createdResponse(res, 'Assignment created successfully', { assignment });

  } catch (error) {
    console.error('Create assignment error:', error);
    serverErrorResponse(res, 'Internal server error during assignment creation');
  }
};

// Get all assignments (Public/authenticated)
const getAllAssignments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sort = 'dueDate:asc'
    } = req.query;

    // Build query - show published assignments
    let query = { isPublished: true };

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Parse sort
    const sortBy = {};
    if (sort) {
      const parts = sort.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sortBy.dueDate = 1; // Default: sort by due date ascending
    }

    // Execute query with pagination - exclude file data for performance
    const assignments = await Assignment.find(query)
      .populate('createdBy', 'name profile.photo')
      .populate('materials', 'title type category')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-fileUrl.data'); // Don't send file data in list

    // Get total count for pagination
    const total = await Assignment.countDocuments(query);

    paginatedResponse(res, 'Assignments retrieved successfully', assignments, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get all assignments error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get single assignment by ID
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('createdBy', 'name profile.photo')
      .populate('materials', 'title type category description')
      .select('-fileUrl.data'); // Don't send file data in details

    if (!assignment) {
      return notFoundResponse(res, 'Assignment not found');
    }

    // Check if assignment is published or user is creator/admin
    if (!assignment.isPublished && 
        (!req.user || (req.user.id !== assignment.createdBy._id.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Assignment not found');
    }

    okResponse(res, 'Assignment retrieved successfully', { assignment });

  } catch (error) {
    console.error('Get assignment by ID error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Download assignment file
const downloadAssignmentFile = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return notFoundResponse(res, 'Assignment not found');
    }

    // Check if assignment is published
    if (!assignment.isPublished && 
        (!req.user || (req.user.id !== assignment.createdBy.toString() && req.user.role !== 'admin'))) {
      return notFoundResponse(res, 'Assignment not found');
    }

    // Check if file exists
    if (!assignment.fileUrl || !assignment.fileUrl.data) {
      return notFoundResponse(res, 'File not found');
    }

    // Set headers and send file
    res.setHeader('Content-Type', assignment.fileUrl.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.title}_${assignment.fileUrl.filename}"`);
    res.setHeader('Content-Length', assignment.fileUrl.data.length);

    res.send(assignment.fileUrl.data);

  } catch (error) {
    console.error('Download assignment file error:', error);
    serverErrorResponse(res, 'Internal server error during download');
  }
};

// Update assignment (Admin only)
const updateAssignment = async (req, res) => {
  try {
    const {
      title,
      description,
      materials,
      dueDate,
      isPublished
    } = req.body;

    // Find assignment
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return notFoundResponse(res, 'Assignment not found');
    }

    // Process file updates
    if (req.file) {
      assignment.fileUrl = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size
      };
    }

    // Update other fields
    if (title) assignment.title = title.replace(/"/g, '');
    if (description) assignment.description = description.replace(/"/g, '');
    if (dueDate) assignment.dueDate = new Date(dueDate);
    if (isPublished !== undefined) assignment.isPublished = isPublished;

    // Update materials if provided - FIXED VERSION
    if (materials) {
      let materialsArray = [];
      try {
        // Handle both stringified array and actual array
        if (typeof materials === 'string') {
          // Try to parse as JSON first (for array strings)
          if (materials.startsWith('[') && materials.endsWith(']')) {
            materialsArray = JSON.parse(materials);
          } else {
            // Handle comma-separated string
            materialsArray = materials.split(',').map(id => id.trim()).filter(id => id);
          }
        } else if (Array.isArray(materials)) {
          materialsArray = materials;
        }
        
        // Validate that all materials are valid ObjectId strings
        materialsArray = materialsArray.filter(materialId => {
          if (mongoose.Types.ObjectId.isValid(materialId)) {
            return materialId;
          }
          console.warn(`Invalid material ID skipped: ${materialId}`);
          return false;
        });
      } catch (parseError) {
        console.warn('Error parsing materials:', parseError);
        // If parsing fails, treat as empty array
        materialsArray = [];
      }
      assignment.materials = materialsArray;
    }

    await assignment.save();
    await assignment.populate('createdBy', 'name profile.photo');
    await assignment.populate('materials', 'title type');

    okResponse(res, 'Assignment updated successfully', { assignment });

  } catch (error) {
    console.error('Update assignment error:', error);
    serverErrorResponse(res, 'Internal server error during assignment update');
  }
};

// Delete assignment (Admin only)
const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return notFoundResponse(res, 'Assignment not found');
    }

    // Also delete all submissions for this assignment
    await AssignmentSubmission.deleteMany({ assignmentId: req.params.id });

    await Assignment.findByIdAndDelete(req.params.id);

    okResponse(res, 'Assignment deleted successfully');

  } catch (error) {
    console.error('Delete assignment error:', error);
    serverErrorResponse(res, 'Internal server error during assignment deletion');
  }
};

// Submit assignment (Student only)
const submitAssignment = async (req, res) => {
  try {
    const { message } = req.body;
    const assignmentId = req.params.id;
    const studentId = req.user.id;

    // Check if assignment exists and is published
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment || !assignment.isPublished) {
      return notFoundResponse(res, 'Assignment not found');
    }

    // Check if due date has passed
    if (new Date() > assignment.dueDate) {
      return badRequestResponse(res, 'Assignment submission deadline has passed');
    }

    // Check if student has already submitted
    const existingSubmission = await AssignmentSubmission.findOne({
      assignmentId,
      studentId
    });

    if (existingSubmission) {
      return badRequestResponse(res, 'You have already submitted this assignment');
    }

    // Process file if uploaded
    let fileUrlData = null;
    if (req.file) {
      fileUrlData = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size
      };
    }

    // Validate that either message or file is provided
    if (!message && !fileUrlData) {
      return badRequestResponse(res, 'Either message or file upload is required');
    }

    // Create submission
    const submission = await AssignmentSubmission.create({
      assignmentId,
      studentId,
      message: message ? message.replace(/"/g, '') : undefined,
      fileUrl: fileUrlData
    });

    // Populate submission details
    await submission.populate('assignmentId', 'title dueDate');
    await submission.populate('studentId', 'name email profile.photo');

    createdResponse(res, 'Assignment submitted successfully', { submission });

  } catch (error) {
    console.error('Submit assignment error:', error);
    serverErrorResponse(res, 'Internal server error during assignment submission');
  }
};

// Get assignment submissions (Admin only)
const getAssignmentSubmissions = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const {
      page = 1,
      limit = 10,
      graded
    } = req.query;

    // Check if assignment exists
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return notFoundResponse(res, 'Assignment not found');
    }

    // Build query
    let query = { assignmentId };
    if (graded !== undefined) {
      query.graded = graded === 'true';
    }

    // Execute query with pagination
    const submissions = await AssignmentSubmission.find(query)
      .populate('studentId', 'name email profile.photo')
      .populate('assignmentId', 'title dueDate')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-fileUrl.data'); // Don't send file data in list

    // Get total count for pagination
    const total = await AssignmentSubmission.countDocuments(query);

    paginatedResponse(res, 'Submissions retrieved successfully', submissions, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get assignment submissions error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Get my submissions (Student only)
const getMySubmissions = async (req, res) => {
  try {
    const studentId = req.user.id;
    const {
      page = 1,
      limit = 10
    } = req.query;

    // Execute query with pagination
    const submissions = await AssignmentSubmission.find({ studentId })
      .populate('assignmentId', 'title dueDate createdBy')
      .populate('assignmentId.createdBy', 'name')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-fileUrl.data'); // Don't send file data in list

    // Get total count for pagination
    const total = await AssignmentSubmission.countDocuments({ studentId });

    paginatedResponse(res, 'Your submissions retrieved successfully', submissions, {
      current: page * 1,
      pages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get my submissions error:', error);
    serverErrorResponse(res, 'Internal server error');
  }
};

// Grade submission (Admin only)
const gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const submissionId = req.params.id;

    // Validate required fields
    if (!grade) {
      return badRequestResponse(res, 'Grade is required');
    }

    // Valid grades
    const validGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    if (!validGrades.includes(grade)) {
      return badRequestResponse(res, 'Invalid grade');
    }

    // Find submission
    const submission = await AssignmentSubmission.findById(submissionId);
    if (!submission) {
      return notFoundResponse(res, 'Submission not found');
    }

    // Update submission
    submission.grade = grade;
    submission.feedback = feedback ? feedback.replace(/"/g, '') : undefined;
    submission.graded = true;
    submission.gradedAt = new Date();

    await submission.save();

    // Populate submission details
    await submission.populate('studentId', 'name email');
    await submission.populate('assignmentId', 'title');

    okResponse(res, 'Submission graded successfully', { submission });

  } catch (error) {
    console.error('Grade submission error:', error);
    serverErrorResponse(res, 'Internal server error during grading');
  }
};

// Download submission file
const downloadSubmissionFile = async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id)
      .populate('assignmentId')
      .populate('studentId');

    if (!submission) {
      return notFoundResponse(res, 'Submission not found');
    }

    // Check permissions: admin or the student who submitted
    const isAdmin = req.user.role === 'admin';
    const isOwner = submission.studentId._id.toString() === req.user.id;

    if (!isAdmin && !isOwner) {
      return forbiddenResponse(res, 'Access denied');
    }

    // Check if file exists
    if (!submission.fileUrl || !submission.fileUrl.data) {
      return notFoundResponse(res, 'File not found');
    }

    // Set headers and send file
    res.setHeader('Content-Type', submission.fileUrl.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="submission_${submission.assignmentId.title}_${submission.studentId.name}_${submission.fileUrl.filename}"`);
    res.setHeader('Content-Length', submission.fileUrl.data.length);

    res.send(submission.fileUrl.data);

  } catch (error) {
    console.error('Download submission file error:', error);
    serverErrorResponse(res, 'Internal server error during download');
  }
};

module.exports = {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  downloadAssignmentFile,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  getMySubmissions,
  gradeSubmission,
  downloadSubmissionFile
};