import mongoose from 'mongoose';

// Singleton-style collection: there will only ever be one document here.
// It stores HR's contact details and whether automatic new-candidate
// notifications (email + personal/WhatsApp message) are enabled.
const notificationSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'hr-notifications', unique: true }, // fixed key so we always find the same doc
    enabled: { type: Boolean, default: true },
    hrEmail: { type: String, default: 'riyasonara079@gmail.com', trim: true },
    hrPhone: { type: String, default: '9512506193', trim: true }, // stored without country code; +91 applied when messaging
    notifyByEmail: { type: Boolean, default: true },
    notifyByMessage: { type: Boolean, default: true },
    updatedBy: { type: String, default: '' }
  },
  { timestamps: true, collection: 'notification_settings' }
);

notificationSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: 'hr-notifications' });
  if (!settings) {
    settings = await this.create({ key: 'hr-notifications' });
  }
  return settings;
};

export default mongoose.model('NotificationSettings', notificationSettingsSchema);
