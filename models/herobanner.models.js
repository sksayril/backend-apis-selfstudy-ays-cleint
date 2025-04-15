const mongoose = require("mongoose");

const HeroBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    desktop: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    bannerurl:{
      type: String,
    }
  },
  { timestamps: true,strict:false }
);

module.exports = mongoose.model("HeroBanner", HeroBannerSchema);
