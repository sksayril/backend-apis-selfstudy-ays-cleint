// models/Blog.js
const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  title: String,
  excerpt: String,
  content: String,
  image: String, // main image
  gallery: [String], // gallery image URLs
  category: String,
  readTime: String,
  date: String,
});

module.exports = mongoose.model("Blog", blogSchema);
