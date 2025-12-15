
async function testParsing() {
    // Simulate callMoondreamApi behavior
    const mockCallMoondreamApi = async (shouldExtract: boolean) => {
        const mockResponse = {
            choices: [
                {
                    message: {
                        content: "This is the caption."
                    }
                }
            ]
        };

        if (shouldExtract) {
            // This matches callMoondreamApi logic when it finds the answer
            return mockResponse.choices[0].message.content;
        } else {
            // This matches callMoondreamApi logic when it falls back
            return JSON.stringify(mockResponse);
        }
    };

    // Simulate analyzeImageLocal logic
    try {
        console.log("--- Testing with Extracted Text (Expected Behavior of callMoondreamApi) ---");
        const response1 = await mockCallMoondreamApi(true);
        console.log("Response from API:", response1);

        // This is what analyzeImageLocal does:
        const result1 = JSON.parse(response1);
        console.log("Parsed Result:", result1.choices[0].message.content);
    } catch (e) {
        console.error("CRASHED as expected:", e.message);
    }

    try {
        console.log("\n--- Testing with Stringified JSON (Fallback Behavior) ---");
        const response2 = await mockCallMoondreamApi(false);
        console.log("Response from API:", response2);

        // This is what analyzeImageLocal does:
        const result2 = JSON.parse(response2);
        console.log("Parsed Result:", result2.choices[0].message.content);
    } catch (e) {
        console.error("CRASHED:", e.message);
    }
}

testParsing();
