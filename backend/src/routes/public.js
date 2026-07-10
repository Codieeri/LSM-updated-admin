import express from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Department from '../models/Department.js';
import NotificationSettings from '../models/NotificationSettings.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { sendNewCandidateNotificationEmail } from '../lib/mailer.js';
import { sendNewCandidatePersonalMessage } from '../lib/sms.js';
dotenv.config();

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const router = express.Router();

// 10 MB file size limit, memory storage for Cloudinary streaming
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only PDF and Word documents (.pdf, .doc, .docx) are allowed'));
  }
});

// ── Helper: stream buffer to Cloudinary ──────────────────────────────────────
const uploadToCloudinary = (buffer, originalName) => {
  return new Promise((resolve, reject) => {
    const safeName = (originalName || 'resume').replace(/\s+/g, '_');
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'resumes',
        use_filename: true,
        unique_filename: true,
        public_id: `resumes/${Date.now()}_${safeName}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ── GET /api/public/jobs ─ All open jobs ─────────────────────────────────────
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({ isOpen: true }).sort({ createdAt: -1 });

    // Fetch all departments to map their images to jobs
    const departments = await Department.find({});
    const deptImageMap = {};
    departments.forEach(dept => {
      if (dept.image) {
        deptImageMap[dept.name] = dept.image;
      }
    });

    const formattedJobs = jobs.map(j => {
      const obj = j.toJSON();
      obj.id = obj.id || obj._id.toString();
      obj.image = deptImageMap[obj.category] || '';
      return obj;
    });
    res.json(formattedJobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ── GET /api/public/jobs/:id ─ Single job details ────────────────────────────
router.get('/jobs/:id', async (req, res) => {
  try {
    const paramId = req.params.id;
    // Try custom string id first, then MongoDB _id
    let job = await Job.findOne({ id: paramId, isOpen: true });
    if (!job && mongoose.isValidObjectId(paramId)) {
      job = await Job.findById(paramId);
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// ── POST /api/public/apply ─ Submit application ───────────────────────────────
router.post('/apply', upload.single('resume'), async (req, res) => {
  try {
    const { 
      jobId, 
      name, 
      email, 
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

    // Validate required fields
    if (!jobId || !name || !email || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: jobId, name, email, and phone are required'
      });
    }

    // Look up the actual job to confirm it exists
    let job = null;
    if (mongoose.isValidObjectId(jobId)) {
      job = await Job.findById(jobId);
    }
    if (!job) {
      job = await Job.findOne({ id: jobId });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found. Please refresh and try again.' });
    }

    // Parse custom answers
    let parsedAnswers = [];
    if (customAnswers) {
      try {
        parsedAnswers = typeof customAnswers === 'string' ? JSON.parse(customAnswers) : customAnswers;
      } catch (e) {
        console.warn('Failed to parse customAnswers:', e.message);
      }
    }

    // Upload resume to Cloudinary
    let resumeUrl = '';
    let cloudinaryWarning = null;
    if (req.file) {
      try {
        console.log(`[Cloudinary] Uploading: ${req.file.originalname} (${req.file.size} bytes)`);
        const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        resumeUrl = result.secure_url;
        console.log(`[Cloudinary] Success: ${resumeUrl}`);
      } catch (uploadError) {
        // Non-fatal: save application but warn about missing resume
        cloudinaryWarning = `Resume upload failed (${uploadError.message}). Application saved without resume.`;
        console.error('[Cloudinary] Upload failed (non-fatal):', uploadError.message);
      }
    } else if (req.body.resumeUrl) {
      resumeUrl = req.body.resumeUrl;
    }

    // Create the application record
    const newApp = new Application({
      id: new mongoose.Types.ObjectId().toString(),
      jobId: job.id || job._id.toString(),
      userId: `public::${email}`,   // stable public identifier (no user account needed)
      applicantName: name,           // stored directly for admin panel display
      applicantEmail: email,
      phone,
      linkedin: linkedin || '',
      portfolio: portfolio || '',
      github: github || '',
      location: location || '',
      yearsExperience: yearsExperience || '',
      currentCompany: currentCompany || '',
      expectedSalary: expectedSalary || '',
      coverLetter: coverLetter || '',
      resume: resumeUrl,
      resumeFileUrl: resumeUrl,
      resumeFileName: req.file ? req.file.originalname : '',
      resumeMimeType: req.file ? req.file.mimetype : '',
      customAnswers: parsedAnswers,
      status: 'PENDING'
    });

    await newApp.save();

    console.log(`[Apply] Saved: ${newApp._id} | Job: "${job.title}" | ${name} <${email}>`);

    // ── Notify HR (email + personal message) about the new candidate ──────
    // This runs after the application is safely saved and never blocks or
    // fails the applicant's response, even if notifications are misconfigured.
    let notifyResult = { email: null, message: null };
    try {
      const settings = await NotificationSettings.getSettings();
      if (settings.enabled) {
        const candidatePayload = {
          name,
          email,
          phone,
          location,
          yearsExperience,
          currentCompany,
          expectedSalary,
          linkedin,
          github,
          portfolio,
          resumeUrl,
          coverLetter,
          customAnswers: parsedAnswers
        };

        if (settings.notifyByEmail) {
          notifyResult.email = await sendNewCandidateNotificationEmail({
            candidate: candidatePayload,
            jobTitle: job.title,
            hrEmail: settings.hrEmail
          });
        }

        if (settings.notifyByMessage) {
          notifyResult.message = await sendNewCandidatePersonalMessage({
            candidate: candidatePayload,
            jobTitle: job.title,
            hrPhone: settings.hrPhone
          });
        }
      }
    } catch (notifyError) {
      console.error('[Apply] HR notification dispatch failed (non-fatal):', notifyError.message);
    }

    res.status(201).json({
      success: true,
      message: cloudinaryWarning
        ? 'Application submitted! (Resume upload had an issue — please check Cloudinary config)'
        : 'Application submitted successfully!',
      applicationId: newApp._id,
      jobTitle: job.title,
      resumeUrl: resumeUrl || null,
      warning: cloudinaryWarning || undefined,
      hrNotified: {
        email: notifyResult.email?.success ?? false,
        message: notifyResult.message?.success ?? false
      }
    });
  } catch (error) {
    console.error('[Apply] Error:', error);
    res.status(500).json({ error: 'Failed to submit application', detail: error.message });
  }
});

export default router;
