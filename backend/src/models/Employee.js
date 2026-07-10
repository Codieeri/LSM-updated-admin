import mongoose from 'mongoose';
import { EMPLOYMENT_TYPES, EMPLOYEE_STATUS, ONBOARDING_STATUS } from '../config/constants.js';

const employeeSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    personalInfo: {
      dob: Date,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      bloodGroup: String,
      address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
      },
      emergencyContact: {
        name: String,
        phone: String,
        relation: String,
      },
    },
    employmentInfo: {
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
      positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
      managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'full_time' },
      joinDate: { type: Date, default: Date.now },
      probationEndDate: Date,
      confirmationDate: Date,
      currentShiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
      salary: {
        base: { type: Number, default: 0 },
        allowances: { type: Number, default: 0 },
        deductions: { type: Number, default: 0 },
      },
    },
    documents: [
      {
        type: { type: String },
        name: String,
        url: String,
        verified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    onboardingStatus: { type: String, enum: ONBOARDING_STATUS, default: 'pending' },
    onboardingChecklist: [
      {
        task: String,
        completed: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],
    status: { type: String, enum: EMPLOYEE_STATUS, default: 'active' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  },
  { timestamps: true }
);

// Indexes
employeeSchema.index({ organizationId: 1, status: 1 });
employeeSchema.index({ employeeCode: 1 }, { unique: true });
employeeSchema.index({ 'employmentInfo.departmentId': 1 });
employeeSchema.index({ 'employmentInfo.managerId': 1 });

// Virtual: full name
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

export default mongoose.model('Employee', employeeSchema);
