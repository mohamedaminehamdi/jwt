const mongoose = require('mongoose')

const JobSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Please provide company name'],
      trim: true,
      maxlength: 50,
    },
    position: {
      type: String,
      required: [true, 'Please provide position'],
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ['interview', 'declined', 'pending'],
      default: 'pending',
    },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'remote', 'internship'],
      default: 'full-time',
    },
    jobLocation: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    salaryMin: {
      type: Number,
      min: 0,
    },
    salaryMax: {
      type: Number,
      min: 0,
    },
    // http(s) only: the UI renders it as a link, so javascript: URLs must never get in
    link: {
      type: String,
      trim: true,
      maxlength: 500,
      validate: {
        validator: (value) => !value || /^https?:\/\/\S+$/i.test(value),
        message: 'Please provide a valid http or https link',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user'],
    },
  },
  { timestamps: true }
)

// checked here rather than on a field so changing either side re-validates the pair
JobSchema.pre('validate', function () {
  if (this.salaryMin != null && this.salaryMax != null && this.salaryMin > this.salaryMax) {
    this.invalidate('salaryMax', 'Maximum salary must be at least the minimum salary')
  }
})

// every job query is scoped to one user, usually sorted by date or filtered by status
JobSchema.index({ createdBy: 1, createdAt: -1 })
JobSchema.index({ createdBy: 1, status: 1 })

module.exports = mongoose.model('Job', JobSchema)
