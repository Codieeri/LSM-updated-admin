import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    id: { type: String },
    title: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    salary: { type: String, required: true },
    experience: { type: String, required: true },
    employmentType: { type: String, required: true },
    skills: { type: [String], default: [] },
    customQuestions: { type: [String], default: [] },
    openings: { type: Number, default: 1 },
    isOpen: { type: Boolean, default: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true, collection: 'job' }
);

export default mongoose.model('Job', jobSchema);
