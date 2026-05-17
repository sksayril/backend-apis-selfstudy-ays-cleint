const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ScrapedData = require('../models/ScrapedData.model');
const upload = require('../middleware/s3');
const adminAuth = require('../middleware/adminAuth');
const {
    applyContentUpdates,
    resolvePdfUrl,
    resolveImageUrls,
} = require('../utilities/contentHelper');

// Define log file path
const logFilePath = path.join(__dirname, '../scraper.log');

router.all('/start', async (req, res) => {
    try {
        // Start scraping in an entirely separate background process!
        console.log('Scraping triggered... spawning background worker.');
        
        const { spawn } = require('child_process');
        const scraperPath = path.join(__dirname, '../utilities/scraper.js');
        
        // Open log file to pipe the output
        const logStream = fs.openSync(logFilePath, 'a');

        // Spawn a detached Node process to handle the heavy scraping
        const child = spawn('node', ['--max-old-space-size=4096', scraperPath], {
            detached: true,
            stdio: ['ignore', logStream, logStream] // Redirect stdout and stderr to the log file
        });
        
        // Unref the child so the Express server doesn't wait for it
        child.unref();

        res.json({ 
            message: 'Scraping started in a dedicated background worker process.',
            status: 'processing',
            pid: child.pid,
            logsApi: '/scrape/logs',
            statusApi: '/scrape/status'
        });
    } catch (error) {
        console.error('Error starting scraper:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to check how many items have been scraped
router.get('/status', async (req, res) => {
    try {
        const count = await ScrapedData.countDocuments();
        const latest = await ScrapedData.find().sort({ createdAt: -1 }).limit(3);

        res.json({
            message: 'Scraper status fetched successfully',
            completedCount: count,
            latestScrapedItems: latest
        });
    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to view the scraper logs
router.get('/logs', (req, res) => {
    try {
        if (!fs.existsSync(logFilePath)) {
            return res.json({ message: 'No logs available yet. Start the scraper first by calling /scrape/start' });
        }

        const logContent = fs.readFileSync(logFilePath, 'utf8');
        // Split and get last 100 lines to avoid sending a massive payload
        const lines = logContent.split('\n');
        const lastLines = lines.slice(-100).join('\n');

        res.send(`<pre>Showing last 100 log lines:\n\n${lastLines}</pre>`); // Return as preformatted text for easy viewing in browser
    } catch (error) {
        console.error('Error reading logs:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin: pdf/images — file -> AWS S3, URL string in form-data -> saved as-is
router.post('/content', adminAuth, upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'images', maxCount: 10 },
]), async (req, res) => {
    try {
        const {
            id,
            board,
            class: className,
            subject,
            category,
            subCategory,
            title,
            sourceUrl,
            text,
        } = req.body;

        let doc;
        let isCreate = false;
        if (id) {
            doc = await ScrapedData.findById(id);
            if (!doc) return res.status(404).json({ error: 'Scraped item not found' });
        } else if (sourceUrl) {
            doc = await ScrapedData.findOne({ sourceUrl });
        }

        const pdfUrl = resolvePdfUrl(req);
        const imageUrls = resolveImageUrls(req);

        if (!doc) {
            if (!board || !className || !subject || !title) {
                return res.status(400).json({
                    error: 'Provide id, sourceUrl, or board + class + subject + title to create a record.',
                });
            }
            if (!pdfUrl && !text && !imageUrls?.length) {
                return res.status(400).json({
                    error: 'Provide at least one of: text, pdf (file or URL string), or images (files or URL string).',
                });
            }
            isCreate = true;
            doc = new ScrapedData({
                board,
                class: className,
                subject,
                category: category || null,
                subCategory: subCategory || title,
                title,
                sourceUrl: sourceUrl || null,
                content: {},
            });
        }

        applyContentUpdates(doc, { text, pdfUrl, imageUrls });
        await doc.save();

        res.status(isCreate ? 201 : 200).json({
            message: 'Content saved successfully',
            data: doc,
        });
    } catch (error) {
        console.error('Error saving scraped content:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/content', async (req, res) => {
    try {
        const { board, class: className, subject, category, subCategory } = req.query;
        const filter = {};
        if (board) filter.board = board;
        if (className) filter.class = className;
        if (subject) filter.subject = subject;
        if (category) filter.category = category;
        if (subCategory) filter.subCategory = subCategory;

        const items = await ScrapedData.find(filter).sort({ updatedAt: -1 });
        res.json({ data: items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to clear logs
router.delete('/logs', (req, res) => {
    try {
        if (fs.existsSync(logFilePath)) {
            fs.unlinkSync(logFilePath);
        }
        res.json({ message: 'Logs cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
