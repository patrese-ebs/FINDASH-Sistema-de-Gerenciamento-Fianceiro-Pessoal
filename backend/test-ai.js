require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log(`✅ Success with ${modelName}:`, response.text());
        return true;
    } catch (error) {
        console.log(`❌ Failed with ${modelName}:`, error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Status Text:', error.response.statusText);
            // Verify if error.response has json() or data
            console.log('Error Body:', JSON.stringify(error.response, null, 2));
        } else {
            console.log('Error Details:', error);
        }
        return false;
    }
}

async function run() {
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'gemini-1.0-pro'];
    for (const m of models) {
        if (await testModel(m)) break;
    }
}

run();
