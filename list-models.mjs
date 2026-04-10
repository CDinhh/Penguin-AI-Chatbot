import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error('Missing GEMINI_API_KEY or GOOGLE_API_KEY in .env');
    process.exit(1);
}

async function listAllModels() {
    const allModels = [];
    let pageToken = '';

    do {
        const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
        url.searchParams.set('key', apiKey);
        if (pageToken) {
            url.searchParams.set('pageToken', pageToken);
        }

        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ListModels failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const payload = await response.json();
        if (Array.isArray(payload.models)) {
            allModels.push(...payload.models);
        }

        pageToken = payload.nextPageToken || '';
    } while (pageToken);

    const generateContentModels = allModels
        .filter((model) => (model.supportedGenerationMethods || []).includes('generateContent'))
        .map((model) => ({
            name: model.name,
            displayName: model.displayName || '',
            methods: (model.supportedGenerationMethods || []).join(','),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`TOTAL_MODELS=${allModels.length}`);
    console.log(`GENERATE_CONTENT_MODELS=${generateContentModels.length}`);
    console.log('---');
    for (const model of generateContentModels) {
        console.log(`${model.name}\t${model.displayName}\t${model.methods}`);
    }
}

listAllModels().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
