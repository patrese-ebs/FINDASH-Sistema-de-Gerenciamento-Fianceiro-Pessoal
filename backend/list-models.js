require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log('Fetching available models...');
        // Note: SDK doesn't always expose listModels directly on the main class in all versions,
        // but let's try via the model manager if available or just try a known working one.
        // Actually, for this SDK version, we might not have listModels helper easily.
        // Let's try a standard generation with a very safe model name first to confirm connection.

        // Better yet, let's just log the API Key first few chars to confirm env load
        console.log('Key loaded:', apiKey ? apiKey.substring(0, 5) + '...' : 'NO KEY');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('Attempting basic generation with gemini-1.5-flash...');
        const result = await model.generateContent('Hi');
        console.log('Success!', result.response.text());

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response, null, 2));
        }
    }
}

listModels();
