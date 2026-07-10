import mongoose from 'mongoose';

const aboutStatSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    imageHeight: {
      type: String,
      default: '',
    },
    imagePosition: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const AboutStat = mongoose.model('AboutStat', aboutStatSchema);

export default AboutStat;
