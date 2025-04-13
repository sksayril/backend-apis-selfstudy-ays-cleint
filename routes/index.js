var express = require('express');
var router = express.Router();
const upload = require('../middleware/s3');

let  Category = require('../models/category.model');
const HeroBanner = require("../models/herobanner.models");
const LatestUpdate = require("../models/latestupdate.model");
const Blog = require("../models/blog.mdel");
const Quiz = require("../models/quiz.model");

/* GET home page. */
// router.get('/', function(req, res, next) {
 
// });
router.post('/api/categories', async (req, res) => {
  try {
    const { name, parentId,  type } = req.body;
    let path = [name];

    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) return res.status(404).json({ error: 'Parent not found' });
      path = [...parent.path, name];
    }

    const newCategory = new Category({ name, parentId, path, type });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/api/categories/content', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    const { text,categoryid } = req.body;
    const pdf = req.files?.pdf;
    const images = req.files?.images;

    // Validate only one content type is passed
    const typesProvided = [
      text ? 'text' : null,
      pdf?.length ? 'pdf' : null,
      images?.length ? 'images' : null
    ].filter(Boolean);

    if (typesProvided.length !== 1) {
      return res.status(400).json({
        error: 'Please provide only one type of content at a time: pdf, images, or text.'
      });
    }

    // Fetch existing category
    const category = await Category.findById({_id: categoryid});
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // Initialize content object if missing
    if (!category.content) category.content = {};

    // Update content based on type
    if (text) {
      category.content.text = text;
    } else if (pdf && pdf.length) {
      category.content.pdfUrl = pdf[0].location;
    } else if (images && images.length) {
      const imageUrls = images.map(img => img.location);
      category.content.imageUrls = imageUrls;
    }

    category.type = 'content'; // ensure it's marked as content
    await category.save();

    res.json({
      message: `Successfully updated ${typesProvided[0]} content.`,
      content: category.content,
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/categories/parents', async (req, res) => {
  try {
    const parents = await Category.find({ parentId: null }).select('name _id path');
   let data = [{parents}]
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get children of a category
router.get('/api/categories/subcategories/:parentId', async (req, res) => {
  try {
    const subcategories = await Category.find({ parentId: req.params.parentId });
    let data = [{subcategories}]
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get a Specific Category (by ID)
router.get('/api/categories/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// router.get('/api/categories/:parentId/children', async (req, res) => {
//   try {
//     const categories = await Category.find({ parentId: req.params.parentId });
//     res.json(categories);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


// Get full category tree (recursive)
const buildTree = async (parentId = null) => {
  const nodes = await Category.find({ parentId });
  const tree = await Promise.all(
    nodes.map(async (node) => {
      const children = await buildTree(node._id);
      return {
        ...node.toObject(),
        children,
      };
    })
  );
  return tree;
};

router.get('/api/categories/tree', async (req, res) => {
  try {
    const tree = await buildTree();
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete category and all children recursively
const deleteCategoryRecursively = async (id) => {
  const children = await Category.find({ parentId: id });
  for (const child of children) {
    await deleteCategoryRecursively(child._id);
  }
  await Category.findByIdAndDelete(id);
};

router.delete('/api/categories/:id', async (req, res) => {
  try {
    await deleteCategoryRecursively(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
);


//Hero Banner Routes
const heroUpload = upload.fields([
  { name: "desktop", maxCount: 1 },
  { name: "mobile", maxCount: 1 },
]);

router.post("/api/upload-hero-banner", heroUpload, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !req.files.desktop || !req.files.mobile) {
      return res.status(400).json({ error: "Title, desktop, and mobile images are required" });
    }

    const desktopUrl = req.files.desktop[0].location;
    const mobileUrl = req.files.mobile[0].location;

    const banner = new HeroBanner({
      title,
      desktop: desktopUrl,
      mobile: mobileUrl,
    });

    await banner.save();

    res.status(201).json({
      message: "Banner uploaded and saved to database successfully",
      data: banner,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get All Hero Banners
router.get("/api/get/hero-banners", async (req, res) => {
  try {
    const banners = await HeroBanner.find().sort({ createdAt: -1 });
    res.status(200).json({ data: banners });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch banners" });
  }
});


//Latest Updates

router.post("/api/latest/upload-update", upload.single("image"), async (req, res) => {
  try {
    const { title, subtitle, date, readTime, content } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const imageUrl = req.file.location; // S3 URL

    const newUpdate = new LatestUpdate({
      title,
      subtitle,
      image: imageUrl,
      date,
      readTime,
      content,
    });

    await newUpdate.save();

    res.status(201).json({ message: "Update uploaded successfully", data: newUpdate });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get latest updates
router.get("/api/latest-updates", async (req, res) => {
  try {
    const updates = await LatestUpdate.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json({ data: updates });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch updates" });
  }
});

//Blog API
router.post(
  "/api/upload-blog",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const {
        title,
        excerpt,
        content,
        category,
        readTime,
        date,
      } = req.body;

      const imageUrl = req.files?.image?.[0]?.location || "";
      const galleryUrls = req.files?.gallery?.map((file) => file.location) || [];

      const blog = new Blog({
        title,
        excerpt,
        content,
        image: imageUrl,
        gallery: galleryUrls,
        category,
        readTime,
        date,
      });

      await blog.save();
      res.status(201).json({ message: "Blog uploaded successfully", blog });
    } catch (error) {
      console.error("Upload Blog Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

router.get("/api/get/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ date: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

//Update Blogs

router.post(
  "/api/update-blog",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const {
        _id,
        title,
        excerpt,
        content,
        category,
        readTime,
        date,
      } = req.body;

      if (!_id) {
        return res.status(400).json({ error: "blogId (_id) is required" });
      }

      const blog = await Blog.findById(_id);
      if (!blog) {
        return res.status(404).json({ error: "Blog not found" });
      }

      // Update text fields only if present
      if (title) blog.title = title;
      if (excerpt) blog.excerpt = excerpt;
      if (content) blog.content = content;
      if (category) blog.category = category;
      if (readTime) blog.readTime = readTime;
      if (date) blog.date = date;

      // Optional image
      if (req.files && req.files.image && req.files.image.length > 0) {
        blog.image = req.files.image[0].location;
      }

      // Optional gallery
      if (req.files && req.files.gallery && req.files.gallery.length > 0) {
        blog.gallery = req.files.gallery.map((file) => file.location);
      }

      await blog.save();

      return res.status(200).json({
        message: "Blog updated successfully",
        blog,
      });
    } catch (err) {
      console.error("Update Blog Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


//QUIZ APIS
router.post("/api/create/quiz", async (req, res) => {
  try {
    const { title, questions } = req.body;

    const newQuiz = new Quiz({ title, questions });
    const savedQuiz = await newQuiz.save();

    res.status(201).json(savedQuiz);
  } catch (err) {
    res.status(500).json({ message: "Error creating quiz", error: err.message });
  }
});

// Get all quizzes
router.get("/api/getall/quiz", async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching quizzes" });
  }
});

// Get a specific quiz by ID
router.get("/api/getquizbyid/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: "Error fetching quiz" });
  }
});

module.exports = router;
