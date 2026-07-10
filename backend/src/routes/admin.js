import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { sendShortlistedEmail, sendNewCandidateNotificationEmail } from '../lib/mailer.js';
import { sendNewCandidatePersonalMessage } from '../lib/sms.js';
import NotificationSettings from '../models/NotificationSettings.js';
import EmployeeProgress from '../models/EmployeeProgress.js';
import Department from '../models/Department.js';
import AboutStat from '../models/AboutStat.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const router = express.Router();

// Configure multer for image uploads (memory storage)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper: stream image buffer to Cloudinary
const uploadImageToCloudinary = (buffer, originalName) => {
  return new Promise((resolve, reject) => {
    const safeName = (originalName || 'image').replace(/\s+/g, '_');
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'about_stats',
        use_filename: true,
        unique_filename: true,
        public_id: `stat_${Date.now()}_${safeName.split('.')[0]}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// Helper: resolve a job by MongoDB _id OR custom string id field
const findJobByAnyId = async (paramId, session = null) => {
  const opts = session ? { session } : {};
  // Try MongoDB ObjectId first
  if (/^[0-9a-fA-F]{24}$/.test(paramId)) {
    try {
      const byMongoId = await Job.findById(paramId, null, opts);
      if (byMongoId) return byMongoId;
    } catch (e) {}
  }
  // Fall back to custom string id field
  return Job.findOne({ id: paramId }, null, opts);
};

// Helper: resolve an application by MongoDB _id OR custom string id field
const findApplicationByAnyId = async (paramId, session = null) => {
  const opts = session ? { session } : {};
  if (/^[0-9a-fA-F]{24}$/.test(paramId)) {
    try {
      const byMongoId = await Application.findById(paramId, null, opts);
      if (byMongoId) return byMongoId;
    } catch (e) {}
  }
  return Application.findOne({ id: paramId }, null, opts);
};

// GET /api/admin/jobs - Get all jobs ordered newest first
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({}).sort({ createdAt: -1 });
    // Ensure every job has an `id` field for the frontend, falling back to _id
    const formattedJobs = jobs.map(j => {
      const obj = j.toJSON();
      obj.id = obj.id || obj._id.toString();
      return obj;
    });
    res.json(formattedJobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /api/admin/jobs - Create a new job (useful for testing/seeding)
router.post('/jobs', async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      location,
      salary,
      experience,
      employmentType,
      skills,
      customQuestions,
      openings,
      isOpen
    } = req.body;

    const job = new Job({
      id: req.body.id || new mongoose.Types.ObjectId().toString(),
      title,
      category,
      description,
      location,
      salary,
      experience,
      employmentType,
      skills: skills || [],
      customQuestions: customQuestions || [],
      openings: openings || 1,
      isOpen: isOpen !== undefined ? isOpen : true
    });

    await job.save();

    // Auto-sync department
    if (category) {
      await Department.findOneAndUpdate(
        { name: category.trim() },
        { name: category.trim() },
        { upsert: true }
      );
    }

    const jobObj = job.toJSON();
    jobObj.id = jobObj.id || jobObj._id.toString();
    res.status(201).json(jobObj);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET /api/admin/applications - Get all applications ordered newest first
router.get('/applications', async (req, res) => {
  try {
    // Populate user and job
    const applications = await Application.find({})
      .populate('user', 'name email role')
      .populate('job', 'title category')
      .sort({ createdAt: -1 });

    // Format output to match client expectation (user and job objects directly populated)
    const formatted = applications.map(app => {
      const appObj = app.toJSON();
      appObj.id = appObj.id || appObj._id.toString();
      // For public applicants, user won't populate — use stored applicantName/Email instead
      const displayUser = appObj.user || {
        name: appObj.applicantName || 'Public Applicant',
        email: appObj.applicantEmail || 'N/A'
      };
      return {
        ...appObj,
        user: displayUser,
        job: appObj.job || { title: 'Unknown Job', category: 'General' }
      };
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/admin/applications - Create a new application (useful for testing/seeding)
router.post('/applications', async (req, res) => {
  try {
    const {
      userId,
      jobId,
      resume,
      linkedin,
      github,
      portfolio,
      phone,
      location,
      yearsExperience,
      currentCompany,
      expectedSalary,
      coverLetter,
      status
    } = req.body;

    // Verify user and job exist
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const jobExists = await findJobByAnyId(jobId);
    if (!jobExists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const application = new Application({
      userId,
      jobId,
      resume: resume || '',
      linkedin: linkedin || '',
      github: github || '',
      portfolio,
      phone,
      location,
      yearsExperience,
      currentCompany,
      expectedSalary,
      coverLetter,
      status: status || 'PENDING'
    });

    await application.save();
    res.status(201).json(application);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// PATCH /api/admin/jobs/:id - Update an existing job
router.patch('/jobs/:id', async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      location,
      salary,
      experience,
      employmentType,
      skills,
      customQuestions,
      openings,
      isOpen
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) {
      updateData.category = category;
      await Department.findOneAndUpdate(
        { name: category.trim() },
        { name: category.trim() },
        { upsert: true }
      );
    }
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (salary !== undefined) updateData.salary = salary;
    if (experience !== undefined) updateData.experience = experience;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (skills !== undefined) {
      updateData.skills = Array.isArray(skills) ? skills.map(s => String(s || '').trim()).filter(Boolean) : [];
    }
    if (customQuestions !== undefined) {
      updateData.customQuestions = Array.isArray(customQuestions) 
        ? Array.from(new Set(customQuestions.map(q => String(q || '').trim()).filter(Boolean)))
        : [];
    }
    if (openings !== undefined) {
      const openingsVal = Number(openings);
      updateData.openings = Number.isFinite(openingsVal) && openingsVal > 0 ? Math.floor(openingsVal) : 1;
    }
    if (isOpen !== undefined) updateData.isOpen = !!isOpen;

    // Support both MongoDB _id and custom string id from client
    let job = await findJobByAnyId(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    job = await Job.findByIdAndUpdate(
      job._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!job) {
      return res.status(404).json({ error: 'Job not found after update' });
    }

    const jobObj = job.toJSON();
    jobObj.id = jobObj.id || jobObj._id.toString();
    res.json(jobObj);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE /api/admin/jobs/:id - Delete a job and its applications
router.delete('/jobs/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const paramId = req.params.id;

    // Resolve by either MongoDB _id or custom string id (client sends custom string id)
    const job = await findJobByAnyId(paramId, session);
    if (!job) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Job not found' });
    }

    const mongoId = job._id;
    const customStringId = job.id || mongoId.toString();

    // 1. Delete all applications — they store either form of id
    await Application.deleteMany({
      $or: [{ jobId: customStringId }, { jobId: mongoId.toString() }]
    }).session(session);

    // 2. Delete the job by its real MongoDB _id
    await Job.findByIdAndDelete(mongoId).session(session);

    await session.commitTransaction();
    session.endSession();
    res.json({ ok: true });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// PATCH /api/admin/applications/:id - Update application status / add notes
router.patch('/applications/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { 
      status, 
      note,
      applicantName,
      applicantEmail,
      phone,
      linkedin,
      portfolio,
      github,
      location,
      yearsExperience,
      currentCompany,
      expectedSalary,
      coverLetter,
      customAnswers 
    } = req.body;
    const appId = req.params.id;

    // Retrieve application
    const app = await findApplicationByAnyId(appId, session);
    if (!app) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Application not found' });
    }

    // Mode A: Only adding a note, or updating applicant details (no status change)
    if (status === undefined) {
      const trimmedNote = note !== undefined ? String(note || '').trim() : '';

      const isDetailsUpdate = [
        applicantName, applicantEmail, phone, linkedin, portfolio, github,
        location, yearsExperience, currentCompany, expectedSalary, coverLetter, customAnswers
      ].some(val => val !== undefined);

      if (!isDetailsUpdate && !trimmedNote && note !== undefined) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'Note content cannot be empty' });
      }

      if (trimmedNote) {
        app.notes.push({ note: trimmedNote });
      }

      // Update fields if provided
      if (applicantName !== undefined) app.applicantName = applicantName;
      if (applicantEmail !== undefined) app.applicantEmail = applicantEmail;
      if (phone !== undefined) app.phone = phone;
      if (linkedin !== undefined) app.linkedin = linkedin;
      if (portfolio !== undefined) app.portfolio = portfolio;
      if (github !== undefined) app.github = github;
      if (location !== undefined) app.location = location;
      if (yearsExperience !== undefined) app.yearsExperience = yearsExperience ? Number(yearsExperience) : null;
      if (currentCompany !== undefined) app.currentCompany = currentCompany;
      if (expectedSalary !== undefined) app.expectedSalary = expectedSalary;
      if (coverLetter !== undefined) app.coverLetter = coverLetter;
      if (customAnswers !== undefined) {
         try {
           app.customAnswers = typeof customAnswers === 'string' ? JSON.parse(customAnswers) : customAnswers;
         } catch(e) {}
      }

      await app.save({ session });
      await session.commitTransaction();
      session.endSession();

      const createdNote = trimmedNote ? app.notes[app.notes.length - 1] : undefined;
      return res.json({ ok: true, app, note: createdNote });
    }

    // Mode B: Updating status (and optional note)
    const validStatuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'];
    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Invalid application status' });
    }

    const previousStatus = app.status;
    const nextStatus = status;

    let mailWarning = null;
    let mailReport = null;

    if (previousStatus !== nextStatus) {
      const delta =
        previousStatus !== 'SHORTLISTED' && nextStatus === 'SHORTLISTED'
          ? -1
          : previousStatus === 'SHORTLISTED' && nextStatus !== 'SHORTLISTED'
            ? 1
            : 0;

      if (delta !== 0) {
        const job = await findJobByAnyId(app.jobId, session);
        if (!job) {
          await session.abortTransaction();
          session.endSession();
          return res.status(404).json({ error: 'Associated job not found' });
        }

        if (delta === -1 && job.openings <= 0) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ error: 'No openings left for this job. Increase openings before shortlisting.' });
        }

        // Adjust job openings
        job.openings += delta;
        await job.save({ session });
      }

      app.status = nextStatus;
    }

    if (note !== undefined) {
      const trimmedNote = String(note || '').trim();
      if (trimmedNote) {
        app.notes.push({ note: trimmedNote });
      }
    }

    await app.save({ session, validateModifiedOnly: true });
    await session.commitTransaction();
    session.endSession();

    // Side effect: send email (outside database transaction)
    if (previousStatus !== 'SHORTLISTED' && nextStatus === 'SHORTLISTED') {
      try {
        const baseApp = await findApplicationByAnyId(appId);
        let populatedApp = null;
        if (baseApp) {
          populatedApp = await Application.findById(baseApp._id).populate('user', 'name email role').populate('job', 'title');
        }

        if (populatedApp && populatedApp.user) {
          const mailResult = await sendShortlistedEmail({
            candidateName: populatedApp.user.name || 'Candidate',
            candidateEmail: populatedApp.user.email || '',
            jobRole: populatedApp.job?.title || 'the role'
          });

          if (!mailResult.success) {
            mailWarning = 'Status updated, but shortlist email failed to send.';
          }
          mailReport = { ok: mailResult.success, provider: mailResult.provider, attempts: mailResult.attempts };
        }
      } catch (emailError) {
        console.error('Failed to send shortlist email:', emailError);
        mailWarning = 'Status updated, but shortlist email failed to send.';
      }
    }

    res.json({
      id: app._id,
      status: app.status,
      mailWarning,
      mailReport
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating application:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// DELETE /api/admin/applications/:id - Delete an application
router.delete('/applications/:id', async (req, res) => {
  try {
    const appId = req.params.id;
    const app = await findApplicationByAnyId(appId);
    
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    await Application.findByIdAndDelete(app._id);
    await EmployeeProgress.deleteOne({ applicationId: app._id });

    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// GET /api/admin/applications/:id/resume - Serves candidate resume
router.get('/applications/:id/resume', async (req, res) => {
  try {
    const app = await findApplicationByAnyId(req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const legacyResume = (app.resume || '').trim();

    // 1. Redirect if it's an external web URL
    if (legacyResume.startsWith('http://') || legacyResume.startsWith('https://')) {
      // Check if it's a Cloudinary URL
      if (legacyResume.includes('res.cloudinary.com')) {
        try {
          const regex = /res\.cloudinary\.com\/[^\/]+\/(raw|image|video)\/upload\/(?:v\d+\/)?(.+)$/;
          const match = legacyResume.match(regex);
          
          if (match) {
            const resourceType = match[1]; // 'raw' or 'image' or 'video'
            let publicId = decodeURIComponent(match[2]);
            
            // For images and videos, the public_id doesn't include the extension
            // For raw, the public_id DOES include the extension
            const extIndex = publicId.lastIndexOf('.');
            if (resourceType !== 'raw' && extIndex !== -1) {
              // Strip extension for image/video
              publicId = publicId.substring(0, extIndex);
            }
            
            // Generate private download URL (bypass ACL issues)
            const options = { 
              resource_type: resourceType, 
              type: 'upload' 
            };
            
            // If download requested, force attachment
            if (req.query.download === '1') {
              options.attachment = true;
            }
            
            const secureUrl = cloudinary.utils.private_download_url(publicId, '', options);
            return res.redirect(secureUrl);
          }
        } catch (err) {
          console.error('Error generating Cloudinary secure URL:', err);
        }
      }

      // Non-Cloudinary URL, or fallback
      if (req.query.download === '1') {
        try {
          const response = await fetch(legacyResume);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = response.headers.get('content-type') || 'application/pdf';
            const filename = app.resumeFileName || 'resume.pdf';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(buffer);
          }
        } catch (err) {
          console.error('Failed to proxy resume download:', err);
          // Fallback to redirect if proxy fails
        }
      }
      return res.redirect(legacyResume);
    }

    // 2. Decode legacy data URL
    if (legacyResume.startsWith('data:')) {
      const matches = legacyResume.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = app.resumeFileName || 'resume.pdf';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Resume-Storage', 'legacy-inline');
        return res.send(buffer);
      }
    }

    // 3. Fallback: Check resumeAsset collection directly in MongoDB for legacy resumes
    if (app.id) {
      try {
        const db = mongoose.connection.db;
        const resumeAsset = await db.collection('resumeAsset').findOne({ applicationId: app.id });
        if (resumeAsset && resumeAsset.data) {
          const contentType = resumeAsset.contentType || resumeAsset.mimeType || 'application/pdf';
          const filename = resumeAsset.fileName || app.resumeFileName || 'resume.pdf';
          // MongoDB Binary has a .buffer property which is the actual Node.js Buffer
          const buffer = resumeAsset.data.buffer ? Buffer.from(resumeAsset.data.buffer) : Buffer.from(resumeAsset.data);
          
          res.setHeader('Content-Type', contentType);
          const disposition = req.query.download === '1' ? 'attachment' : 'inline';
          res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
          res.setHeader('Cache-Control', 'private, no-store');
          res.setHeader('X-Resume-Storage', 'legacy-resumeAsset');
          return res.send(buffer);
        }
      } catch (assetErr) {
        console.error('Error fetching from resumeAsset collection:', assetErr);
      }
    }

    res.status(404).json({ error: 'Resume is not available for this application' });
  } catch (error) {
    console.error('Error serving resume:', error);
    res.status(500).json({ error: 'Failed to serve resume' });
  }
});

// GET /api/admin/employees/progress - Get hired employees with project/task progress
router.get('/employees/progress', async (req, res) => {
  try {
    // 1. Get all applications where status is 'HIRED'
    const hiredApplications = await Application.find({ status: 'HIRED' })
      .populate('user', 'name email role')
      .populate('job', 'title category')
      .sort({ updatedAt: -1 });

    const formattedEmployees = [];

    for (const app of hiredApplications) {
      // 2. Find or create EmployeeProgress record
      let progress = await EmployeeProgress.findOne({ applicationId: app._id });
      
      if (!progress) {
        progress = new EmployeeProgress({
          applicationId: app._id,
          currentProject: 'Onboarding & Training',
          tasks: [
            { text: 'Complete code of conduct and document submission', completed: true, completedAt: new Date() },
            { text: 'Set up local development environment and database connections', completed: false },
            { text: 'Review architecture layout guidelines and components structure', completed: false }
          ]
        });
        await progress.save();
      }

      const appObj = app.toJSON();
      formattedEmployees.push({
        applicationId: app._id,
        user: appObj.user || { name: 'Unknown Candidate', email: 'unknown@localsm.com' },
        job: {
          title: progress.role || (appObj.job ? appObj.job.title : 'Hired Employee'),
          category: progress.department || (appObj.job ? appObj.job.category : 'Web Development')
        },
        currentProject: progress.currentProject,
        tasks: progress.tasks,
        phone: app.phone,
        location: app.location || 'Remote',
        createdAt: app.createdAt,
        dbDepartment: progress.department || '',
        dbRole: progress.role || ''
      });
    }

    res.json(formattedEmployees);
  } catch (error) {
    console.error('Error fetching employee progress:', error);
    res.status(500).json({ error: 'Failed to fetch employee progress' });
  }
});

// POST /api/admin/employees/progress - Update current project, custom department/role, or manage tasks
router.post('/employees/progress', async (req, res) => {
  try {
    const { applicationId, currentProject, department, role, newTaskText, toggleTaskId, deleteTaskId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId is required' });
    }

    let progress = await EmployeeProgress.findOne({ applicationId });

    if (!progress) {
      progress = new EmployeeProgress({ applicationId });
    }

    // 1. Update current project name
    if (currentProject !== undefined) {
      progress.currentProject = String(currentProject).trim() || 'Onboarding & Training';
    }

    // 2. Update custom department override
    if (department !== undefined) {
      progress.department = String(department).trim() || undefined;
    }

    // 3. Update custom role override
    if (role !== undefined) {
      progress.role = String(role).trim() || undefined;
    }

    // 4. Add a new task
    if (newTaskText !== undefined) {
      const text = String(newTaskText).trim();
      if (text) {
        progress.tasks.push({ text, completed: false });
      }
    }

    // 5. Toggle a task completion status
    if (toggleTaskId !== undefined) {
      const task = progress.tasks.id(toggleTaskId);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date() : undefined;
      }
    }

    // 6. Delete a task
    if (deleteTaskId !== undefined) {
      progress.tasks.pull({ _id: deleteTaskId });
    }

    await progress.save();
    res.json(progress);
  } catch (error) {
    console.error('Error updating employee progress:', error);
    res.status(500).json({ error: 'Failed to update employee progress' });
  }
});

// GET /api/admin/departments - Get all departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.json(departments.map(d => d.name));
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// ── GET /api/admin/departments/all ─ Get all department objects ─────────────
router.get('/departments/all', async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments objects:', error);
    res.status(500).json({ error: 'Failed to fetch departments objects' });
  }
});

// ── POST /api/admin/departments/:name/image ─ Upload category image ─────────
router.post('/departments/:name/image', imageUpload.single('image'), async (req, res) => {
  try {
    const { name } = req.params;
    let department = await Department.findOne({ name });
    
    if (!department) {
      department = new Department({ name });
    }

    if (req.file) {
      const result = await uploadImageToCloudinary(req.file.buffer, req.file.originalname);
      department.image = result.secure_url;
      await department.save();
      return res.json({ success: true, image: department.image });
    }
    
    return res.status(400).json({ error: 'No image provided' });
  } catch (error) {
    console.error('Error uploading category image:', error);
    res.status(500).json({ error: 'Failed to upload category image' });
  }
});

// ── DELETE /api/admin/departments/:name/image ─ Delete category image ───────
router.delete('/departments/:name/image', async (req, res) => {
  try {
    const { name } = req.params;
    const department = await Department.findOne({ name });
    
    if (department && department.image) {
      department.image = '';
      await department.save();
      return res.json({ success: true });
    }
    
    return res.status(404).json({ error: 'Image or department not found' });
  } catch (error) {
    console.error('Error deleting category image:', error);
    res.status(500).json({ error: 'Failed to delete category image' });
  }
});

// POST /api/admin/departments/manage - Manage departments (add, edit, delete)
router.post('/departments/manage', async (req, res) => {
  try {
    const { action, oldName, newName } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }

    if (action === 'add') {
      if (!newName) return res.status(400).json({ error: 'newName is required for add action' });
      await Department.findOneAndUpdate(
        { name: newName },
        { name: newName },
        { upsert: true, new: true }
      );
      return res.json({ success: true, message: `Added department "${newName}"` });
    }

    if (!oldName) {
      return res.status(400).json({ error: 'oldName is required for edit/delete actions' });
    }

    if (action === 'edit') {
      if (!newName) return res.status(400).json({ error: 'newName is required for edit action' });
      
      // Update Department model
      await Department.findOneAndUpdate({ name: oldName }, { name: newName }, { upsert: true });

      // Update Job categories
      await Job.updateMany({ category: oldName }, { $set: { category: newName } });
      // Update custom department overrides
      await EmployeeProgress.updateMany({ department: oldName }, { $set: { department: newName } });
      
      return res.json({ success: true, message: `Renamed department "${oldName}" to "${newName}"` });
    }

    if (action === 'delete') {
      // Delete from Department model
      await Department.deleteOne({ name: oldName });

      // Clear custom overrides that match oldName
      await EmployeeProgress.updateMany({ department: oldName }, { $unset: { department: 1 } });
      // Update jobs in this category to general fallback category
      await Job.updateMany({ category: oldName }, { $set: { category: 'Web Development' } });
      
      return res.json({ success: true, message: `Deleted department "${oldName}"` });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Error managing department:', error);
    res.status(500).json({ error: 'Failed to manage department' });
  }
});

// POST /api/admin/employees/manual - Manually onboard employees
router.post('/employees/manual', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, email, phone, location, department, role, currentProject } = req.body;
    if (!name || !email || !phone) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    // 1. Find or create User
    let user = await User.findOne({ email }).session(session);
    if (!user) {
      const org = await mongoose.model('Organization').findOne({}).session(session);
      const orgId = org ? org._id : new mongoose.Types.ObjectId();
      
      const newId = new mongoose.Types.ObjectId().toString();
      user = new User({
        id: newId,
        email,
        name,
        passwordHash: await bcrypt.hash('welcome123', 12),
        role: 'employee',
        organizationId: orgId
      });
      await user.save({ session });
    }

    // 2. Find associated job or retrieve first available
    let job = await Job.findOne({ category: department }).session(session);
    if (!job) {
      job = await Job.findOne({}).session(session);
    }
    if (!job) {
      job = new Job({
        id: new mongoose.Types.ObjectId().toString(),
        title: role || 'Hired Intern',
        category: department || 'Web Development',
        description: 'Manual hire position',
        location: location || 'Remote',
        salary: 'TBD',
        experience: 'Fresher',
        employmentType: 'Full Time'
      });
      await job.save({ session });
    }

    // 3. Create Application
    const app = new Application({
      id: new mongoose.Types.ObjectId().toString(),
      userId: user.id || user._id.toString(),
      jobId: job.id || job._id.toString(),
      phone,
      location: location || 'Remote',
      status: 'HIRED',
      resume: 'db-asset://manual-hire',
      linkedin: 'https://linkedin.com',
      github: 'https://github'
    });
    await app.save({ session });

    // 4. Create EmployeeProgress with custom overrides
    const progress = new EmployeeProgress({
      applicationId: app._id,
      department: department || 'Web Development',
      role: role || 'Hired Intern',
      currentProject: currentProject || 'Onboarding & Training',
      tasks: [
        { text: 'Complete code of conduct and document submission', completed: true, completedAt: new Date() },
        { text: 'Set up local development environment and database connections', completed: false },
        { text: 'Review architecture layout guidelines and components structure', completed: false }
      ]
    });
    await progress.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      applicationId: app._id,
      user: { name, email, role: 'employee' },
      job: { title: role, category: department },
      currentProject: progress.currentProject,
      tasks: progress.tasks,
      phone,
      location: location || 'Remote',
      createdAt: app.createdAt
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating manual employee:', error);
    res.status(500).json({ error: 'Failed to create manual employee record' });
  }
});

// POST /api/admin/system/sync - Maintenance route to auto-fix and sync jobs, departments, and employee progress
router.post('/system/sync', async (req, res) => {
  try {
    const logs = [];

    // 1. Fix Job categories
    const jobs = await Job.find({});
    for (const job of jobs) {
      let newCat = job.category;
      if (job.title.includes('Data Analyst')) newCat = 'Data Analyst';
      else if (job.title.includes('Product Management')) newCat = 'Product Management';
      else if (job.title.includes('UI/UX')) newCat = 'UI/UX Design';
      
      if (newCat !== job.category) {
        logs.push(`Fixed Job Category: ${job.title} from '${job.category}' to '${newCat}'`);
        job.category = newCat;
        await job.save();
      }
    }

    // 2. Sync Departments
    const jobCategories = await Job.distinct('category');
    for (const name of jobCategories) {
      const trimmedName = name.trim();
      await Department.findOneAndUpdate(
        { name: trimmedName },
        { name: trimmedName },
        { upsert: true, new: true }
      );
    }
    logs.push('Departments synced with all current job categories.');

    // 3. Update EmployeeProgress
    const hiredApplications = await Application.find({ status: 'HIRED' }).populate('job');
    let updatedCount = 0;

    for (const app of hiredApplications) {
      if (!app.job) continue;

      const progress = await EmployeeProgress.findOne({ applicationId: app._id });
      if (progress) {
        const correctCategory = app.job.category;
        const correctTitle = app.job.title;

        if (progress.department !== correctCategory || progress.role !== correctTitle) {
          progress.department = correctCategory;
          progress.role = correctTitle;
          await progress.save();
          updatedCount++;
        }
      }
    }
    logs.push(`Successfully updated ${updatedCount} employee progress records to match correct categories.`);

    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error in system sync:', error);
    res.status(500).json({ error: 'Failed to sync system data' });
  }
});

// ── GET /api/admin/about-stats ─ Get all stats ─────────────────────────────────────
router.get('/about-stats', async (req, res) => {
  try {
    const stats = await AboutStat.find({}).sort({ order: 1 });
    res.json(stats);
  } catch (error) {
    console.error('Error fetching about stats:', error);
    res.status(500).json({ error: 'Failed to fetch about stats' });
  }
});

// ── POST /api/admin/about-stats ─ Create a new stat ─────────────────────────────────
router.post('/about-stats', imageUpload.single('image'), async (req, res) => {
  try {
    const { value, label, imageHeight, imagePosition, order } = req.body;
    let imageUrl = '';

    if (req.file) {
      const result = await uploadImageToCloudinary(req.file.buffer, req.file.originalname);
      imageUrl = result.secure_url;
    } else {
      return res.status(400).json({ error: 'Image is required' });
    }

    const newStat = new AboutStat({
      value,
      label,
      image: imageUrl,
      imageHeight: imageHeight || '',
      imagePosition: imagePosition || '',
      order: order ? parseInt(order, 10) : 0,
    });

    await newStat.save();
    res.status(201).json(newStat);
  } catch (error) {
    console.error('Error creating about stat:', error);
    res.status(500).json({ error: 'Failed to create about stat' });
  }
});

// ── PUT /api/admin/about-stats/:id ─ Update a stat ──────────────────────────────────
router.put('/about-stats/:id', imageUpload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { value, label, imageHeight, imagePosition, order } = req.body;

    const stat = await AboutStat.findById(id);
    if (!stat) return res.status(404).json({ error: 'Stat not found' });

    stat.value = value || stat.value;
    stat.label = label || stat.label;
    if (imageHeight !== undefined) stat.imageHeight = imageHeight;
    if (imagePosition !== undefined) stat.imagePosition = imagePosition;
    if (order !== undefined) stat.order = parseInt(order, 10);

    // If there's a new file, upload it and update image URL
    if (req.file) {
      const result = await uploadImageToCloudinary(req.file.buffer, req.file.originalname);
      stat.image = result.secure_url;
      // Optional: Delete old image from Cloudinary here to save space
    }

    await stat.save();
    res.json(stat);
  } catch (error) {
    console.error('Error updating about stat:', error);
    res.status(500).json({ error: 'Failed to update about stat' });
  }
});

// ── DELETE /api/admin/about-stats/:id ─ Delete a stat ───────────────────────────────
router.delete('/about-stats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const stat = await AboutStat.findByIdAndDelete(id);
    if (!stat) return res.status(404).json({ error: 'Stat not found' });
    
    // Optional: Delete image from Cloudinary here

    res.json({ success: true, message: 'Stat deleted successfully' });
  } catch (error) {
    console.error('Error deleting about stat:', error);
    res.status(500).json({ error: 'Failed to delete about stat' });
  }
});

// ── GET /api/admin/notification-settings ─ Fetch HR notification preferences ────────
router.get('/notification-settings', async (req, res) => {
  try {
    const settings = await NotificationSettings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// ── PUT /api/admin/notification-settings ─ Update HR notification preferences ───────
router.put('/notification-settings', async (req, res) => {
  try {
    const { enabled, hrEmail, hrPhone, notifyByEmail, notifyByMessage, updatedBy } = req.body;

    const settings = await NotificationSettings.getSettings();

    if (enabled !== undefined) settings.enabled = enabled;
    if (hrEmail !== undefined) settings.hrEmail = hrEmail;
    if (hrPhone !== undefined) settings.hrPhone = hrPhone;
    if (notifyByEmail !== undefined) settings.notifyByEmail = notifyByEmail;
    if (notifyByMessage !== undefined) settings.notifyByMessage = notifyByMessage;
    if (updatedBy !== undefined) settings.updatedBy = updatedBy;

    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// ── POST /api/admin/notification-settings/test ─ Send a test HR notification ────────
router.post('/notification-settings/test', async (req, res) => {
  try {
    const settings = await NotificationSettings.getSettings();
    const testCandidate = {
      name: 'Test Candidate',
      email: 'test.candidate@example.com',
      phone: '9999999999',
      location: 'Ahmedabad, India',
      yearsExperience: '2',
      currentCompany: 'N/A',
      expectedSalary: 'N/A',
      linkedin: '',
      github: '',
      portfolio: '',
      resumeUrl: '',
      coverLetter: 'This is a test notification triggered from the Admin Panel.',
      customAnswers: []
    };

    const emailResult = await sendNewCandidateNotificationEmail({
      candidate: testCandidate,
      jobTitle: 'Sample Job Role',
      hrEmail: settings.hrEmail
    });
    const messageResult = await sendNewCandidatePersonalMessage({
      candidate: testCandidate,
      jobTitle: 'Sample Job Role',
      hrPhone: settings.hrPhone
    });

    res.json({
      success: true,
      email: { ok: emailResult.success, provider: emailResult.provider },
      message: { ok: messageResult.success, provider: messageResult.provider }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
