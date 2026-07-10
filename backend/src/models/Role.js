import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
    isDefault: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  },
  { timestamps: true }
);

roleSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

export default mongoose.model('Role', roleSchema);
