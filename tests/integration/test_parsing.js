
const testAnalyzeImageLocal = () => {
    // Simulate the response from callMoondreamApi (which wraps the stream result)
    const mockStreamedResponse = JSON.stringify({
        caption: "```json\n" + JSON.stringify({
            keywords: ["dog", "sitting", "grass"],
            recreationPrompt: "A dog sitting on the grass."
        }) + "\n```",
        _stats: { tokens_per_sec: 15.5 }
    });

    console.log("Mock Response from callMoondreamApi:", mockStreamedResponse);

    // Logic from analyzeImageLocal
    try {
        let result;
        try {
            result = JSON.parse(mockStreamedResponse);
        } catch (e) {
            const cleanedString = mockStreamedResponse.replace(/```json\s*|```/g, '').trim();
            result = JSON.parse(cleanedString);
        }

        // The fix logic
        if (result.caption && typeof result.caption === 'string') {
            try {
                const innerCleaned = result.caption.replace(/```json\s*|```/g, '').trim();
                console.log("DEBUG: result.caption:", JSON.stringify(result.caption));
                console.log("DEBUG: innerCleaned:", JSON.stringify(innerCleaned));
                const innerResult = JSON.parse(innerCleaned);
                if (innerResult.keywords || innerResult.recreationPrompt) {
                    if (result._stats) {
                        innerResult._stats = result._stats;
                    }
                    result = innerResult;
                }
            } catch (e) {
                console.warn("Could not parse inner JSON:", e);
            }
        }

        if (Array.isArray(result.keywords) && typeof result.recreationPrompt === 'string') {
            if (result._stats && result._stats.tokens_per_sec) {
                const tps = result._stats.tokens_per_sec;
                const device = tps > 5 ? 'GPU' : 'CPU';
                result.recreationPrompt += `\n\n(Processed on ${device} at ${tps.toFixed(1)} t/s)`;
            }
            console.log("SUCCESS: Parsed Result:", JSON.stringify(result, null, 2));
        } else {
            console.log("FAILURE: Invalid structure after parsing.");
        }

    } catch (e) {
        console.error("FAILURE: Exception during parsing:", e);
    }
};

testAnalyzeImageLocal();
