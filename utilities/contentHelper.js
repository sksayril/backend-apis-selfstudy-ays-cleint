function isHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\//i.test(value.trim());
}

function parseUrlList(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => {
        if (typeof item !== 'string' || !item.trim()) return [];
        if (isHttpUrl(item)) return [item.trim()];
        try {
          const parsed = JSON.parse(item);
          return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [String(parsed)];
        } catch {
          return [item.trim()];
        }
      })
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (isHttpUrl(trimmed)) return [trimmed];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [String(parsed)];
    } catch {
      return [trimmed];
    }
  }
  return null;
}

function applyContentUpdates(doc, { text, pdfUrl, imageUrls, replaceImages = true }) {
  if (!doc.content) doc.content = {};
  if (text !== undefined && text !== null && text !== '') {
    doc.content.text = text;
  }
  if (pdfUrl) {
    doc.content.pdfUrl = pdfUrl;
  }
  if (imageUrls?.length) {
    doc.content.imageUrls = replaceImages
      ? imageUrls
      : [...(doc.content.imageUrls || []), ...imageUrls];
  }
  return doc;
}

/** pdf: file upload -> AWS S3 URL; string URL in form-data -> saved as-is */
function resolvePdfUrl(req) {
  const pdfFile = req.files?.pdf?.[0];
  if (pdfFile?.location) return pdfFile.location;

  const bodyPdf = req.body?.pdf;
  if (typeof bodyPdf === 'string' && isHttpUrl(bodyPdf)) {
    return bodyPdf.trim();
  }
  return null;
}

/** images: file upload(s) -> AWS; string URL or JSON array in form-data -> saved as-is */
function resolveImageUrls(req) {
  const imageFiles = req.files?.images;
  if (imageFiles?.length) {
    return imageFiles.map((img) => img.location);
  }
  return parseUrlList(req.body?.images);
}

module.exports = {
  applyContentUpdates,
  resolvePdfUrl,
  resolveImageUrls,
};
