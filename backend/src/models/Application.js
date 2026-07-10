import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    id: { type: String },
    applicantName: { type: String, default: '' },   // For public applicants (no account)
    applicantEmail: { type: String, default: '' },  // For public applicants (no account)
    userId: { type: String, required: true },
    jobId: { type: String, required: true },
    resume: { type: String, default: '' },
    resumeFileUrl: { type: String },
    resumeFileKey: { type: String },
    resumeFileName: { type: String },
    resumeMimeType: { type: String },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    portfolio: { type: String },
    phone: { type: String, required: true },
    location: { type: String },
    yearsExperience: { type: String },
    currentCompany: { type: String },
    expectedSalary: { type: String },
    coverLetter: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'],
      default: 'PENDING'
    },
    notes: [
      {
        note: String,
        createdAt: { type: Date, default: Date.now }
      }
    ],
    customAnswers: [
      {
        question: String,
        answer: String
      }
    ]
  },
  { timestamps: true, collection: 'application' }
);

// Virtuals to map to user/job for client consumption
applicationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'id',
  justOne: true
});

applicationSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: 'id',
  justOne: true
});

applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

export default mongoose.model('Application', applicationSchema);
