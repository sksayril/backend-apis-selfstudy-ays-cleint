const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const ScrapedData = require('../models/ScrapedData.model');
const http = require('http');
const https = require('https');

/**
 * Scraper for SelfStudys.com
 * Navigation: Board -> Class -> Subject -> Category -> Subcategory -> PDF
 */
class SelfStudysScraper {
    constructor() {
        this.baseUrl = 'https://www.selfstudys.com';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.timeout = 10000; // 10 seconds timeout to prevent hanging sockets
        this.maxContentLength = 5 * 1024 * 1024; // 5MB limit to prevent OOM
        this.httpAgent = new http.Agent({ keepAlive: false });
        this.httpsAgent = new https.Agent({ keepAlive: false });
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async init() {
        // Assume mongoose is connected externally or connect here
        // mongoose.connect(process.env.MONGODB_URI);
    }

    async scrapeAll() {
        try {
            console.log('Starting full site scrape...');
            const boards = await this.getBoards();
            if (!boards || boards.length === 0) {
                console.log('No boards found to scrape.');
                return;
            }
            for (const board of boards) {
                console.log(`Scraping Board: ${board.name}`);
                await this.scrapeBoard(board);
                await this.delay(1000); // 1 second delay between boards
            }
            console.log('Full site scrape completed.');
        } catch (error) {
            console.error('FATAL ERROR during scrapeAll:', error.message);
        }
    }

    async getBoards() {
        try {
            console.log('Fetching main page to identify categories...');
            const { data } = await axios.get(this.baseUrl, {
                headers: { 'User-Agent': this.userAgent },
                timeout: this.timeout,
                maxContentLength: this.maxContentLength,
                httpAgent: this.httpAgent,
                httpsAgent: this.httpsAgent
            });
            let $ = cheerio.load(data);
            const boards = [];

            // Updated selector based on actual site structure
            $('li.nav-item.sub').each((i, el) => {
                const mainCategory = $(el).find('a.nav-link').text().trim();
                console.log(`Found main category: "${mainCategory}"`);
                
                if (['State Books', 'NCERT', 'CBSE', 'Books & Sol'].includes(mainCategory)) {
                    $(el).find('.dropdown-item, a[href*="/state-wise/"], a[href*="/ncert-books/"]').each((j, item) => {
                        const boardName = $(item).text().trim();
                        const boardUrl = $(item).attr('href');
                        
                        if (boardUrl && boardName) {
                            boards.push({
                                name: boardName,
                                url: boardUrl.startsWith('http') ? boardUrl : this.baseUrl + boardUrl,
                                mainCategory: mainCategory
                            });
                        }
                    });
                }
            });

            console.log(`Found ${boards.length} boards/categories to scrape.`);
            $ = null; // Free memory
            return boards;
        } catch (error) {
            console.error('Error fetching boards:', error.message);
            return [];
        }
    }

    async scrapeBoard(board) {
        try {
            console.log(`  Accessing board URL: ${board.url}`);
            const { data } = await axios.get(board.url, {
                headers: { 'User-Agent': this.userAgent },
                timeout: this.timeout,
                maxContentLength: this.maxContentLength,
                httpAgent: this.httpAgent,
                httpsAgent: this.httpsAgent
            });
            let $ = cheerio.load(data);
            const classes = [];

            // Look for class links in the board page
            $('a[href*="/class-"], a[href*="/10th"], a[href*="/12th"], .class-btn').each((i, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                
                if (href && (href.includes('/class-') || /\d+(th|st|nd|rd)/i.test(text))) {
                    classes.push({
                        name: text || href.split('/').pop(),
                        url: href.startsWith('http') ? href : this.baseUrl + href,
                        board: board.name,
                        mainCategory: board.mainCategory
                    });
                }
            });

            console.log(`    Found ${classes.length} classes for board ${board.name}.`);
            for (const cls of classes) {
                console.log(`    Scraping Class: ${cls.name}`);
                await this.scrapeClass(cls);
                await this.delay(500); // 0.5s delay between classes
            }
            $ = null; // Free memory
        } catch (error) {
            console.error(`  Error scraping board ${board.name}:`, error.message);
        }
    }

    async scrapeClass(cls) {
        try {
            const { data } = await axios.get(cls.url, {
                headers: { 'User-Agent': this.userAgent },
                timeout: this.timeout,
                maxContentLength: this.maxContentLength,
                httpAgent: this.httpAgent,
                httpsAgent: this.httpsAgent
            });
            let $ = cheerio.load(data);
            const subjects = [];

            // Find subject links (often in lists or grid)
            $('a[href*="/books/"], .subject-card a').each((i, el) => {
                const url = $(el).attr('href');
                const text = $(el).text().trim();
                
                if (url && url.split('/').length > 4) { 
                    subjects.push({
                        name: text || url.split('/').pop(),
                        url: url.startsWith('http') ? url : this.baseUrl + url,
                        board: cls.board,
                        class: cls.name,
                        mainCategory: cls.mainCategory
                    });
                }
            });

            console.log(`      Found ${subjects.length} subjects for class ${cls.name}.`);
            for (const sub of subjects) {
            console.log(`      Scraping Subject: ${sub.name} (URL: ${sub.url})`);
            await this.scrapeSubject(sub);
            await this.delay(500); // 0.5s delay between subjects
            }
            $ = null; // Free memory
        } catch (error) {
            console.error(`      Error scraping class ${cls.name}:`, error.message);
        }
    }

    async scrapeSubject(sub) {
        try {
            const { data } = await axios.get(sub.url, {
                headers: { 'User-Agent': this.userAgent },
                timeout: this.timeout,
                maxContentLength: this.maxContentLength,
                httpAgent: this.httpAgent,
                httpsAgent: this.httpsAgent
            });
            let $ = cheerio.load(data);
            if (!$) {
                console.log(`        ⚠️ Failed to load cheerio for ${sub.name}`);
                return;
            }

            // Check for "Coming Soon" placeholder
            const pageText = $('body').text().toLowerCase();
            if (pageText.includes('coming soon') || pageText.includes('data will be added soon')) {
                console.log(`        ℹ️ Subject ${sub.name} is marked as "Coming Soon".`);
                
                // Try singular URL if current is plural
                if (sub.url.endsWith('s') && !sub.url.endsWith('ss')) {
                    const singularUrl = sub.url.slice(0, -1);
                    console.log(`        🔍 Retrying with singular URL: ${singularUrl}`);
                    return this.scrapeSubject({ ...sub, url: singularUrl });
                }
                return;
            }

            const items = [];

            // Find chapters or specific paper links
            try {
                // Updated selectors based on site changes
                $('a.bg-blue, a.bg-red, .chapter-link, a.gotopdfpage, a[href*="/sitepdfs/"]').each((i, el) => {
                    const url = $(el).attr('href');
                    const text = $(el).text().trim();
                    
                    if (url && !url.includes('javascript:void(0)')) {
                        items.push({
                            title: text || 'Untitled Document',
                            url: url.startsWith('http') ? url : this.baseUrl + url,
                            board: sub.board,
                            class: sub.class,
                            subject: sub.name,
                            mainCategory: sub.mainCategory
                        });
                    }
                });
            } catch (innerError) {
                console.error(`        Error parsing items for subject ${sub.name}:`, innerError.message);
            }

            console.log(`        Found ${items.length} PDF items for subject ${sub.name}.`);
            for (const item of items) {
                await this.scrapePdfPage(item);
                await this.delay(200); // 0.2s delay between items
            }
            $ = null; // Free memory
        } catch (error) {
            console.error(`        Error scraping subject ${sub.name}:`, error.message);
        }
    }

    async scrapePdfPage(item) {
        try {
            let pdfUrl = null;

            // If the URL is already a direct PDF link, do not download/parse it as HTML!
            if (item.url.toLowerCase().endsWith('.pdf') || item.url.includes('/sitepdfs/')) {
                pdfUrl = item.url;
            } else {
                const { data } = await axios.get(item.url, {
                    headers: { 'User-Agent': this.userAgent },
                    timeout: this.timeout,
                    maxContentLength: this.maxContentLength,
                    httpAgent: this.httpAgent,
                    httpsAgent: this.httpsAgent
                });
                let $ = cheerio.load(data);
                
                pdfUrl = $('.PDFFlip').attr('source');

                if (!pdfUrl) {
                    const scriptContent = $('script').text();
                    const match = scriptContent.match(/source:\s*["'](https:\/\/www\.selfstudys\.com\/sitepdfs\/[^"']+)["']/);
                    if (match) pdfUrl = match[1];
                }
            }

            if (pdfUrl) {
                const scrapedItem = {
                    board: item.board,
                    class: item.class,
                    subject: item.subject,
                    category: item.category || item.mainCategory || null,
                    subCategory: item.subCategory || item.title,
                    title: item.title,
                    sourceUrl: item.url,
                    content: {
                        text: item.title,
                        pdfUrl,
                        imageUrls: item.imageUrls || [],
                    },
                };

                // Check database connection before saving
                if (mongoose.connection.readyState !== 1) {
                    console.error('      Database not connected! Cannot save data.');
                    return;
                }

                await ScrapedData.findOneAndUpdate(
                    { sourceUrl: item.url },
                    scrapedItem,
                    { upsert: true, new: true }
                );
                console.log(`        ✅ Saved: ${item.title} -> ${pdfUrl}`);
            } else {
                console.log(`        ⚠️ No PDF link found for: ${item.title}`);
            }
        } catch (error) {
            console.error(`        ❌ Error scraping PDF page ${item.url}:`, error.message);
        }
    }


}

module.exports = new SelfStudysScraper();

// If this script is run directly from the terminal (e.g., `node utilities/scraper.js`)
if (require.main === module) {
    require('dotenv').config(); // Load .env file from root
    
    if (!process.env.DATABASE_URL) {
        console.error("❌ ERROR: DATABASE_URL is missing in .env");
        process.exit(1);
    }

    console.log("🔌 Connecting to Database...");
    mongoose.connect(process.env.DATABASE_URL)
        .then(async () => {
            console.log("✅ Database connected! Starting Standalone Scraper...");
            const scraper = new SelfStudysScraper();
            await scraper.scrapeAll();
            console.log("🎉 Standalone scraping fully completed!");
            process.exit(0);
        })
        .catch(err => {
            console.error("❌ Database connection failed:", err.message);
            process.exit(1);
        });
}
