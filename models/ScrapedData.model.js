const mongoose = require('mongoose');

const contentSchema = {
  text: { type: String },
  pdfUrl: { type: String },
  imageUrls: [{ type: String }],
};

const ScrapedDataSchema = new mongoose.Schema({
  board: { type: String, required: true },
  class: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String },
  subCategory: { type: String },
  title: { type: String, required: true },
  sourceUrl: { type: String },
  content: contentSchema,
}, { timestamps: true });

ScrapedDataSchema.index({ board: 1, class: 1, subject: 1, category: 1, subCategory: 1 });
ScrapedDataSchema.index({ sourceUrl: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ScrapedData', ScrapedDataSchema);
