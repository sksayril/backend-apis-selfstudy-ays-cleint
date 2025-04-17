const mongoose = require("mongoose");

const SponsorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contextColor: { type: String, required: true },
    url: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sponsor", SponsorSchema);
