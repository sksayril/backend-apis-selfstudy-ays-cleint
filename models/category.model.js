const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['category', 'content'], default: 'category' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    path: [String],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: {
      text: String,
      pdfUrl: String,
      imageUrls: [String],
    },
  }, { timestamps: true });
  
  module.exports = mongoose.model('Category', categorySchema);
  