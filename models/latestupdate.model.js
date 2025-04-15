const mongoose = require("mongoose");

const UpdateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    image: { type: String, required: true },
    date: { type: String, required: true },
    readTime: { type: String, required: true },
    content: { type: String, required: true }, // HTML content as string
    isTop: { type: Boolean, default: false },  // Added field for isTop

  },
  { timestamps: true }
);

module.exports = mongoose.model("Update", UpdateSchema);
