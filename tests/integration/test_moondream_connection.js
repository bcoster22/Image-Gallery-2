
import fetch from 'node-fetch';

const ENDPOINT = 'http://localhost:2021';

async function testConnection() {
    console.log(`Testing connection to ${ENDPOINT}...`);

    try {
        // Test 1: Basic Connectivity (v1/models)
        console.log('1. Testing /v1/models...');
        try {
            const response = await fetch(`${ENDPOINT}/v1/models`);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            if (response.ok) {
                const data = await response.json();
                console.log('   Response:', JSON.stringify(data, null, 2));
            } else {
                console.log('   Response Text:', await response.text());
            }
        } catch (e) {
            console.log('   Failed to connect to /v1/models:', e.message);
        }

        // Test 2: Basic Connectivity (Root)
        console.log('\n2. Testing Root / ...');
        try {
            const response = await fetch(`${ENDPOINT}/`);
            console.log(`   Status: ${response.status} ${response.statusText}`);
            console.log('   Response Text:', await response.text());
        } catch (e) {
            console.log('   Failed to connect to root:', e.message);
        }


        // Test 3: Probe potential endpoints
        const dummyImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        const endpointsToTest = [
            { path: '/answer', body: { image_url: dummyImage, question: "Describe this", stream: false } },
            { path: '/caption', body: { image_url: dummyImage, stream: false } },
            { path: '/v1/caption', body: { image_url: dummyImage, stream: false } },
            { path: '/query', body: { image_url: dummyImage, question: "Describe this", stream: false } },
            { path: '/v1/query', body: { image_url: dummyImage, question: "Describe this", stream: false } },
            {
                path: '/v1/chat/completions', body: {
                    model: "moondream-2",
                    messages: [
                        {
                            role: "user", content: [
                                { type: "text", text: "Describe this image" },
                                { type: "image_url", image_url: { url: dummyImage } }
                            ]
                        }
                    ]
                }
            }
        ];

        console.log('\n3. Probing potential endpoints...');

        for (const test of endpointsToTest) {
            console.log(`\n   Testing ${test.path}...`);
            try {
                const response = await fetch(`${ENDPOINT}${test.path}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(test.body)
                });

                console.log(`   Status: ${response.status} ${response.statusText}`);
                if (response.ok) {
                    const text = await response.text();
                    console.log('   SUCCESS! Response:', text.substring(0, 200));
                } else {
                    // console.log('   Error Response:', await response.text());
                    console.log('   Failed (Status code)');
                }
            } catch (e) {
                console.log(`   Connection failed: ${e.message}`);
            }
        }


    } catch (error) {
        console.error('Unexpected error during test:', error);
    }
}

testConnection();
