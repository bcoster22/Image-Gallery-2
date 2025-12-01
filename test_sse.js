
const testSSEParsing = () => {
    const sampleStream = `data: {"chunk": "A"}
data: {"chunk": " dog"}
data: {"chunk": " sitting"}
data: {"stats": {"tokens": 3, "duration": 0.1, "tokens_per_sec": 30.0}}
data: {"completed": true}
`;

    let fullText = '';
    let stats = null;
    const lines = sampleStream.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

        if (trimmedLine.startsWith('data: ')) {
            try {
                const jsonStr = trimmedLine.slice(6);
                const data = JSON.parse(jsonStr);

                if (data.chunk) {
                    fullText += data.chunk;
                }
                if (data.stats) {
                    stats = data.stats;
                }
            } catch (e) {
                console.error('Failed to parse:', e);
            }
        }
    }

    console.log('Parsed Text:', fullText);
    console.log('Stats:', JSON.stringify(stats));

    if (fullText === "A dog sitting" && stats && stats.tokens === 3) {
        console.log("SUCCESS: SSE Parsing works correctly.");
    } else {
        console.log("FAILURE: Parsing logic is incorrect.");
    }
};

testSSEParsing();
