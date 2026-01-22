require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const modelsIdx = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-pro',
    'gemini-1.0-pro'
];

async function testHttp() {
    for (const model of modelsIdx) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        console.log(`Testing ${model}...`);

        const body = { contents: [{ parts: [{ text: "Hello" }] }] };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                console.log(`✅ SUCCESS: ${model} works!`);
                return; // Found one!
            } else {
                console.log(`❌ FAILED: ${model} (${response.status})`);
            }
        } catch (e) {
            console.error('Network Error:', e.message);
        }
    }
    console.log('All models failed.');
}

testHttp();
