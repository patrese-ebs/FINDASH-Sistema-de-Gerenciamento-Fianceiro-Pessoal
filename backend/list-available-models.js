require('dotenv').config();
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    console.log('Fetching models from:', url.replace(apiKey, 'HIDDEN'));

    try {
        const response = await fetch(url);
        const data = await response.json();

        fs.writeFileSync(path.join(__dirname, 'models.json'), JSON.stringify(data, null, 2));
        console.log('Models saved to models.json');

    } catch (e) {
        console.error('Network Error:', e.message);
    }
}

listModels();
