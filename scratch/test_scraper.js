const scraper = require('./utilities/scraper');
const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected.');

        const testSub = {
            name: 'JEE Toppers Notes',
            url: 'https://www.selfstudys.com/books/jee-toppers-notes', // Guessed URL based on pattern
            board: 'CBSE',
            class: 'Class 12',
            mainCategory: 'CBSE'
        };

        console.log('Starting test scrape for JEE Toppers Notes...');
        await scraper.scrapeSubject(testSub);
        console.log('Test completed successfully.');
    } catch (err) {
        console.error('Test failed with error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
