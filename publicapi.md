# Public API Documentation

## Base URL

`http://localhost:3300`

All routes below are relative to this base URL.

---

## Auth APIs

### Register User
- **Method:** `POST`
- **URL:** `/users/register`

**Request (JSON)**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

**Response (201)**
```json
{
  "message": "User registered successfully"
}
```

### Login User
- **Method:** `POST`
- **URL:** `/users/login`

**Request (JSON)**
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

**Response (200)**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here"
}
```

---

## Category APIs

### Create Category
- **Method:** `POST`
- **URL:** `/api/categories`

**Request (JSON)**
```json
{
  "name": "Programming",
  "parentId": null,
  "type": "folder"
}
```

**Response (201)**
```json
{
  "_id": "661111111111111111111111",
  "name": "Programming",
  "parentId": null,
  "path": ["Programming"],
  "type": "folder"
}
```

### Add Category Content (text/pdf/images)
- **Method:** `POST`
- **URL:** `/api/categories/content`
- **Content-Type:** `multipart/form-data`

**Request (form-data)**
- `categoryid` (string, required)
- `text` (string, optional)
- `pdf` (file, optional)
- `images` (files[], optional)

Only one of `text`, `pdf`, or `images` should be sent in one request.

**Response (200)**
```json
{
  "message": "Successfully updated text content.",
  "content": {
    "text": "Category content here"
  }
}
```

### Get Parent Categories
- **Method:** `GET`
- **URL:** `/api/categories/parents`

**Response (200)**
```json
[
  {
    "parents": [
      {
        "_id": "661111111111111111111111",
        "name": "Programming",
        "path": ["Programming"]
      }
    ]
  }
]
```

### Get Subcategories by Parent
- **Method:** `GET`
- **URL:** `/api/categories/subcategories/:parentId`

**Response (200)**
```json
[
  {
    "subcategories": [
      {
        "_id": "662222222222222222222222",
        "name": "JavaScript",
        "parentId": "661111111111111111111111"
      }
    ]
  }
]
```

### Get Category by ID
- **Method:** `GET`
- **URL:** `/api/categories/:id`

**Response (200)**
```json
{
  "_id": "661111111111111111111111",
  "name": "Programming",
  "parentId": null,
  "path": ["Programming"],
  "type": "folder",
  "content": {}
}
```

### Get Full Category Tree
- **Method:** `GET`
- **URL:** `/api/categories/tree`

**Response (200)**
```json
[
  {
    "_id": "661111111111111111111111",
    "name": "Programming",
    "children": [
      {
        "_id": "662222222222222222222222",
        "name": "JavaScript",
        "children": []
      }
    ]
  }
]
```

### Delete Category (Recursive)
- **Method:** `DELETE`
- **URL:** `/api/categories/:id`

**Response (200)**
```json
{
  "success": true
}
```

---

## Hero Banner APIs

### Upload Hero Banner
- **Method:** `POST`
- **URL:** `/api/upload-hero-banner`
- **Content-Type:** `multipart/form-data`

**Request (form-data)**
- `title` (string, required)
- `url` (string, optional)
- `desktop` (file, required)
- `mobile` (file, required)

**Response (201)**
```json
{
  "message": "Banner uploaded and saved to database successfully",
  "data": {
    "_id": "663333333333333333333333",
    "title": "Main Banner",
    "desktop": "https://bucket.s3.amazonaws.com/desktop.jpg",
    "mobile": "https://bucket.s3.amazonaws.com/mobile.jpg",
    "url": "https://example.com"
  }
}
```

### Delete Hero Banner
- **Method:** `POST`
- **URL:** `/api/delete-hero-banner`

**Request (JSON)**
```json
{
  "id": "663333333333333333333333"
}
```

**Response (200)**
```json
{
  "message": "Banner deleted successfully",
  "data": {
    "_id": "663333333333333333333333"
  }
}
```

### Get Hero Banners
- **Method:** `GET`
- **URL:** `/api/get/hero-banners`

**Response (200)**
```json
{
  "data": [
    {
      "_id": "663333333333333333333333",
      "title": "Main Banner",
      "desktop": "https://bucket.s3.amazonaws.com/desktop.jpg",
      "mobile": "https://bucket.s3.amazonaws.com/mobile.jpg",
      "url": "https://example.com"
    }
  ]
}
```

---

## Latest Update APIs

### Upload Latest Update
- **Method:** `POST`
- **URL:** `/api/latest/upload-update`
- **Content-Type:** `multipart/form-data`

**Request (form-data)**
- `title`, `subtitle`, `date`, `readTime`, `content`, `isTop`
- `image` (file, required)

**Response (201)**
```json
{
  "message": "Update uploaded successfully",
  "data": {
    "_id": "664444444444444444444444",
    "title": "New Update",
    "image": "https://bucket.s3.amazonaws.com/update.jpg",
    "isTop": true
  }
}
```

### Update Latest Content
- **Method:** `POST`
- **URL:** `/api/latest/update-content`

**Request (JSON)**
```json
{
  "id": "664444444444444444444444",
  "content": "Updated full content..."
}
```

**Response (200)**
```json
{
  "message": "Content updated successfully",
  "data": {
    "_id": "664444444444444444444444",
    "content": "Updated full content..."
  }
}
```

### Update isTop Flag
- **Method:** `POST`
- **URL:** `/api/latest/update-isTop`

**Request (JSON)**
```json
{
  "id": "664444444444444444444444",
  "isTop": true
}
```

**Response (200)**
```json
{
  "message": "Update status updated successfully",
  "data": {
    "_id": "664444444444444444444444",
    "isTop": true
  }
}
```

### Delete Latest Update
- **Method:** `POST`
- **URL:** `/api/latest/delete-update`

**Request (JSON)**
```json
{
  "id": "664444444444444444444444"
}
```

**Response (200)**
```json
{
  "message": "Update deleted successfully",
  "data": {
    "_id": "664444444444444444444444"
  }
}
```

### Get Latest Updates
- **Method:** `GET`
- **URL:** `/api/latest-updates`

**Response (200)**
```json
{
  "data": [
    {
      "_id": "664444444444444444444444",
      "title": "New Update",
      "subtitle": "Update subtitle",
      "image": "https://bucket.s3.amazonaws.com/update.jpg"
    }
  ]
}
```

---

## Blog APIs

### Upload Blog
- **Method:** `POST`
- **URL:** `/api/upload-blog`
- **Content-Type:** `multipart/form-data`

**Request (form-data)**
- `title`, `excerpt`, `content`, `category`, `readTime`, `date`
- `image` (file, optional)
- `gallery` (files[], optional)

**Response (201)**
```json
{
  "message": "Blog uploaded successfully",
  "blog": {
    "_id": "665555555555555555555555",
    "title": "Blog Title",
    "image": "https://bucket.s3.amazonaws.com/blog.jpg",
    "gallery": ["https://bucket.s3.amazonaws.com/g1.jpg"]
  }
}
```

### Delete Blog
- **Method:** `POST`
- **URL:** `/api/delete-blog`

**Request (JSON)**
```json
{
  "id": "665555555555555555555555"
}
```

**Response (200)**
```json
{
  "message": "Blog deleted successfully",
  "blog": {
    "_id": "665555555555555555555555"
  }
}
```

### Get Blogs
- **Method:** `GET`
- **URL:** `/api/get/blogs`

**Response (200)**
```json
[
  {
    "_id": "665555555555555555555555",
    "title": "Blog Title",
    "category": "Tech"
  }
]
```

### Update Blog
- **Method:** `POST`
- **URL:** `/api/update-blog`
- **Content-Type:** `multipart/form-data`

**Request (form-data)**
- `_id` (required)
- `title`, `excerpt`, `content`, `category`, `readTime`, `date` (optional)
- `image` (file, optional)
- `gallery` (files[], optional)

**Response (200)**
```json
{
  "message": "Blog updated successfully",
  "blog": {
    "_id": "665555555555555555555555",
    "title": "Updated Blog Title"
  }
}
```

---

## Quiz APIs

### Create Quiz
- **Method:** `POST`
- **URL:** `/api/create/quiz`

**Request (JSON)**
```json
{
  "title": "JavaScript Basics",
  "questions": [
    {
      "question": "What is closure?",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}
```

**Response (201)**
```json
{
  "_id": "666666666666666666666666",
  "title": "JavaScript Basics",
  "questions": [
    {
      "question": "What is closure?",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }
  ]
}
```

### Delete Quiz
- **Method:** `POST`
- **URL:** `/api/delete/quiz`

**Request (JSON)**
```json
{
  "id": "666666666666666666666666"
}
```

**Response (200)**
```json
{
  "message": "Quiz deleted successfully",
  "data": {
    "_id": "666666666666666666666666"
  }
}
```

### Get All Quizzes
- **Method:** `GET`
- **URL:** `/api/getall/quiz`

**Response (200)**
```json
[
  {
    "_id": "666666666666666666666666",
    "title": "JavaScript Basics"
  }
]
```

### Get Quiz by ID
- **Method:** `GET`
- **URL:** `/api/getquizbyid/:id`

**Response (200)**
```json
{
  "_id": "666666666666666666666666",
  "title": "JavaScript Basics",
  "questions": []
}
```

---

## Sponsor APIs

### Add Sponsor
- **Method:** `POST`
- **URL:** `/api/addsponser`

**Request (JSON)**
```json
{
  "name": "Sponsor Name",
  "contextColor": "#ffffff",
  "url": "https://sponsor.com"
}
```

**Response (201)**
```json
{
  "_id": "667777777777777777777777",
  "name": "Sponsor Name",
  "contextColor": "#ffffff",
  "url": "https://sponsor.com"
}
```

### Get Sponsors
- **Method:** `GET`
- **URL:** `/api/getsponser`

**Response (200)**
```json
[
  {
    "_id": "667777777777777777777777",
    "name": "Sponsor Name",
    "contextColor": "#ffffff",
    "url": "https://sponsor.com"
  }
]
```

### Update Sponsor
- **Method:** `POST`
- **URL:** `/api/update/sponser`

**Request (JSON)**
```json
{
  "id": "667777777777777777777777",
  "name": "Updated Sponsor",
  "contextColor": "#000000",
  "url": "https://newsponsor.com"
}
```

**Response (200)**
```json
{
  "_id": "667777777777777777777777",
  "name": "Updated Sponsor",
  "contextColor": "#000000",
  "url": "https://newsponsor.com"
}
```

### Delete Sponsor
- **Method:** `POST`
- **URL:** `/api/delete/sponser`

**Request (JSON)**
```json
{
  "_id": "667777777777777777777777"
}
```

**Response (200)**
```json
{
  "message": "Sponsor deleted successfully"
}
```
