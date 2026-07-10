import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String, default: '' },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    settings: {
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      defaultShiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
      allowRemoteCheckin: { type: Boolean, default: true },
      geofenceEnabled: { type: Boolean, default: false },
      geofenceRadius: { type: Number, default: 200 },
      geofenceCenter: { lat: Number, lng: Number },
      autoCheckoutTime: { type: String, default: '22:00' },
      overtimeThreshold: { type: Number, default: 480 },
      lateThreshold: { type: Number, default: 15 },
      halfDayThreshold: { type: Number, default: 240 },
    },
    subscription: {
      plan: { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
      expiresAt: Date,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

organizationSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

export default mongoose.model('Organization', organizationSchema);
