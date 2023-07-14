const mongoose = require('mongoose')

// wrap query selectors coming from user input in $eq (blocks { "$ne": null } style injection)
mongoose.set('sanitizeFilter', true)

const connectDB = (url) => mongoose.connect(url)

module.exports = connectDB
