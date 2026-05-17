# Admin API Guide

Base URL (local): `http://localhost:3301`

Admin routes: `/admin`  
Category write routes and content upload require **admin token**.

Add to `.env` (for first-time setup only):
```
ADMIN_SETUP_SECRET=your-secret-key-here
```

---

## 1. Admin account

### 1.1 Create the first admin (one time)

When no admin exists yet:

```http
POST /admin/register
Content-Type: application/json
```

**Body**
```json
{
  "email": "miniadmin@gmail.com",
  "password": "Miniadmin123@",
  "setupSecret": "your-secret-key-here"
}
```

`setupSecret` must match `ADMIN_SETUP_SECRET` in `.env`.

**Response**
```json
{
  "message": "Admin account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "...",
    "email": "miniadmin@gmail.com",
    "role": "admin"
  }
}
```

**Or use the CLI script** (no setup secret needed):
```bash
node scripts/createAdmin.js miniadmin@gmail.com Miniadmin123@
```

---

### 1.2 Admin login

```http
POST /admin/login
Content-Type: application/json
```

**Body**
```json
{
  "email": "miniadmin@gmail.com",
  "password": "Miniadmin123@"
}
```

**Response**
```json
{
  "message": "Admin login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "...",
    "email": "miniadmin@gmail.com",
    "role": "admin"
  }
}
```

Regular users use `POST /users/login` — that token **cannot** call admin APIs.

---

### 1.3 Create another admin (logged-in admin only)

```http
POST /admin/create
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body**
```json
{
  "email": "admin2@gmail.com",
  "password": "SecurePass123@"
}
```

---

### 1.4 Get current admin profile

```http
GET /admin/me
Authorization: Bearer <admin_token>
```

---

### 1.5 Use token on protected APIs

All admin write calls need this header:
```
Authorization: Bearer <admin_token>
```

**Protected routes**

| Method | Route |
|--------|--------|
| POST | `/api/categories` |
| POST | `/api/categories/content` |
| DELETE | `/api/categories/:id` |
| POST | `/scrape/content` |

---

## 2. Category tree (find `categoryid`)

### 2.1 List top-level categories

```http
GET /api/categories/parents
```

### 2.2 List children of a category

```http
GET /api/categories/subcategories/:parentId
```

Replace `:parentId` with the parent category `_id`.

### 2.3 Get one category (check if it is a leaf)

```http
GET /api/categories/:id
```

**Leaf category** = category that has **no child categories**.  
Only on a leaf you can upload **text + PDF + images in one request**.

To confirm a category is a leaf, call subcategories with its id — if the list is empty, it is a leaf.

### 2.4 Create a category

```http
POST /api/categories
Content-Type: application/json
```

**Body**
```json
{
  "name": "Chapter 1",
  "parentId": "PARENT_CATEGORY_OBJECT_ID",
  "type": "category"
}
```

Omit `parentId` for a top-level category.

---

## 3. Upload content — `POST /api/categories/content`

**Method:** `POST`  
**URL:** `/api/categories/content`  
**Auth:** `Authorization: Bearer <admin_token>`  
**Content-Type:** `multipart/form-data`

### 3.1 Content keys (same for all saves)

Data is stored under:

| Key | Type | Description |
|-----|------|-------------|
| `content.text` | string | Notes / description |
| `content.pdfUrl` | string | PDF link (from file upload or direct URL) |
| `content.imageUrls` | string[] | Image links (from file upload or direct URLs) |

### 3.2 Form fields

Use **one field name** for each type. The API decides from the value:

| Field | Required | Postman type | Value | Result |
|-------|----------|--------------|-------|--------|
| `categoryid` | Yes | Text | Category `_id` | — |
| `text` | No | Text | Notes / description | Saved to `content.text` |
| `pdf` | No | **File** or **Text** | `.pdf` file **or** `https://...` URL string | File → **AWS S3** → `content.pdfUrl`; URL string → saved **as-is** in DB |
| `images` | No | **File** or **Text** | Image file(s) **or** URL string / JSON array | File(s) → **AWS S3** → `content.imageUrls`; URL(s) → saved **as-is** in DB |

> **Important:** There is no separate `pdfUrl` or `imageUrls` form field. Always use `pdf` and `images`.

**Rules**

- **Leaf category (final subcategory):** send any combination of `text`, `pdf`, and `images` in one request.
- **Non-leaf category:** only **one** type per request (text **or** pdf **or** images).

---

### 3.3 Example A — Leaf: text + PDF URL + image URLs (strings in form-data)

**Postman**

1. Method: `POST`
2. URL: `http://localhost:3301/api/categories/content`
3. Body → **form-data**

| Key | Type | Value |
|-----|------|--------|
| `categoryid` | Text | `674a1b2c3d4e5f6789012345` |
| `text` | Text | `Chapter 1 – Motion` |
| `pdf` | Text | `https://example.com/notes/chapter1.pdf` |
| `images` | Text | `["https://example.com/thumb1.jpg","https://example.com/thumb2.jpg"]` |

**cURL**
```bash
curl -X POST "http://localhost:3301/api/categories/content" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "categoryid=674a1b2c3d4e5f6789012345" \
  -F "text=Chapter 1 – Motion" \
  -F "pdf=https://example.com/notes/chapter1.pdf" \
  -F 'images=["https://example.com/thumb1.jpg","https://example.com/thumb2.jpg"]'
```

**Success response**
```json
{
  "message": "Final subcategory content updated successfully.",
  "content": {
    "text": "Chapter 1 – Motion",
    "pdfUrl": "https://example.com/notes/chapter1.pdf",
    "imageUrls": [
      "https://example.com/thumb1.jpg",
      "https://example.com/thumb2.jpg"
    ]
  }
}
```

---

### 3.4 Example B — Leaf: upload PDF file + images to AWS S3

**Postman**

| Key | Type | Value |
|-----|------|--------|
| `categoryid` | Text | `674a1b2c3d4e5f6789012345` |
| `text` | Text | `NCERT Chapter 1` |
| `pdf` | File | Select a `.pdf` file |
| `images` | File | Select one or more images (field name must be `images`) |

**cURL**
```bash
curl -X POST "http://localhost:3301/api/categories/content" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "categoryid=674a1b2c3d4e5f6789012345" \
  -F "text=NCERT Chapter 1" \
  -F "pdf=@/path/to/chapter1.pdf" \
  -F "images=@/path/to/cover.jpg" \
  -F "images=@/path/to/diagram.png"
```

`pdf` and `images` are uploaded to S3. The API returns the S3 URLs in `content.pdfUrl` and `content.imageUrls`.

---

### 3.5 Example C — Leaf: PDF file (AWS) + image URL string

| Key | Type | Value |
|-----|------|--------|
| `categoryid` | Text | `...` |
| `pdf` | **File** | Select `.pdf` → uploads to S3 |
| `images` | **Text** | `https://cdn.example.com/preview.png` |

Or one image URL per row (same field name `images`):

| Key | Type | Value |
|-----|------|--------|
| `images` | Text | `https://cdn.example.com/a.jpg` |
| `images` | Text | `https://cdn.example.com/b.jpg` |

---

### 3.6 Example D — Non-leaf: only one content type

Parent/mid-level categories accept **one** type only.

**Text only**
```bash
curl -X POST "http://localhost:3301/api/categories/content" \
  -F "categoryid=PARENT_ID" \
  -F "text=Section overview"
```

**PDF URL only** (`pdf` as text, not file)
```bash
curl -X POST "http://localhost:3301/api/categories/content" \
  -F "categoryid=PARENT_ID" \
  -F "pdf=https://example.com/overview.pdf"
```

---

### 3.7 JavaScript (fetch)

```javascript
// PDF + images as URL strings (same field names as file upload)
const form = new FormData();
form.append('categoryid', '674a1b2c3d4e5f6789012345');
form.append('text', 'Chapter 1 – Motion');
form.append('pdf', 'https://example.com/chapter1.pdf');
form.append('images', JSON.stringify(['https://example.com/thumb1.jpg']));

const res = await fetch('http://localhost:3301/api/categories/content', {
  method: 'POST',
  body: form,
});
console.log(await res.json());
```

**PDF file upload (AWS S3)**
```javascript
const form = new FormData();
form.append('categoryid', '674a1b2c3d4e5f6789012345');
form.append('pdf', pdfFileInput.files[0]); // <input type="file" name="pdf">

await fetch('http://localhost:3301/api/categories/content', {
  method: 'POST',
  body: form,
});
```

---

### 3.8 Common errors

| Status | Message | Cause |
|--------|---------|--------|
| 401 | No token / Invalid token | Missing or expired `Authorization` header |
| 403 | Admin access required | Token is from a normal user, not admin |
| 404 | Category not found | Wrong `categoryid` |
| 400 | Please provide only one type... | Non-leaf category; sent more than one of text/pdf/images |
| 400 | Provide at least one of... | Leaf category; empty body |
| 500 | (S3 error) | AWS env vars missing or invalid |

**AWS env vars** (`.env`):
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=notes-market-bucket
AWS_S3_FOLDER_PREFIX=notesmarket/uploads
```

---

## 4. Scraper admin content — `POST /scrape/content`

Same content keys: `content.text`, `content.pdfUrl`, `content.imageUrls`.  
**Requires** `Authorization: Bearer <token>`.

### 4.1 Update existing scraped item by id

```http
POST /scrape/content
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Description |
|-------|-------------|
| `id` | ScrapedData document `_id` |
| `text`, `pdf`, `images` | Same rules as category content (`pdf` / `images` = file or URL string) |

**cURL**
```bash
curl -X POST "http://localhost:3301/scrape/content" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "id=SCRAPED_DOC_ID" \
  -F "text=Updated title" \
  -F "pdf=https://example.com/file.pdf"
```

### 4.2 Create new scraped record

```bash
curl -X POST "http://localhost:3301/scrape/content" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "board=CBSE" \
  -F "class=Class 12" \
  -F "subject=Physics" \
  -F "category=NCERT Books" \
  -F "subCategory=Chapter 1" \
  -F "title=Motion in a Straight Line" \
  -F "pdf=https://example.com/ch1.pdf"
```

### 4.3 List scraped content

```http
GET /scrape/content?board=CBSE&class=Class%2012&subject=Physics
```

No auth required for this GET.

---

## 5. Quick workflow (admin)

1. `POST /admin/login` → copy `token` (or run `node scripts/createAdmin.js` once).
2. `GET /api/categories/parents` → pick a parent `_id`.
3. `GET /api/categories/subcategories/:parentId` → drill down until you reach the **last** level.
4. Confirm leaf: `GET /api/categories/subcategories/:leafId` returns no children.
5. `POST /api/categories/content` with **admin token** + `categoryid` + `text` / `pdf` / `images`.
6. `GET /api/categories/:id` → verify `content` object.

---

## 6. Postman collection tips

1. Create an environment variable `baseUrl` = `http://localhost:3301`.
2. Create `adminToken` from `POST /admin/login` (Tests: `pm.environment.set("adminToken", pm.response.json().token)`).
3. On protected requests, header: `Authorization: Bearer {{adminToken}}`.
4. For `/api/categories/content`: Body → **form-data** (not raw JSON).
5. Field names: `categoryid`, `text`, `pdf`, `images` only.
