const fs = require('fs');

async function test() {
    try {
        if (!fs.existsSync('test_eye_gen_0.png')) {
            console.error("test_eye_gen_0.png not found. Run previous test first.");
            // Just use a dummy 1x1 pixel png for test if missing
            // iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==
            const dummy = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
            var base64Image = dummy;
        } else {
            const imageBuffer = fs.readFileSync('test_eye_gen_0.png');
            var base64Image = 'data:image/png;base64,' + imageBuffer.toString('base64');
        }

        const body = {
            prompt: "make it blue, high quality",
            model: "sdxl-realism",
            steps: 8,
            guidance_scale: 2.0,
            image: base64Image,
            strength: 0.3
        };

        console.log("Sending request with image length:", base64Image.length);

        const response = await fetch('http://127.0.0.1:2020/v1/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.result && data.result[0]) {
            // Save output
            let outData = data.result[0];
            // clean prefix if present
            if (outData.startsWith('data:')) outData = outData.split(',')[1];

            const outBuffer = Buffer.from(outData, 'base64');
            fs.writeFileSync('test_eye_img2img.png', outBuffer);
            console.log("Saved test_eye_img2img.png");
        } else {
            console.log("No result image found", data);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
