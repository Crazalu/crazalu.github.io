document.addEventListener('DOMContentLoaded', () => {
    const gifInput = document.getElementById('gifInput');
    const spriteNameInput = document.getElementById('spriteName');
    const suffixRadios = document.querySelectorAll('input[name="spriteSuffix"]');
    const convertButton = document.getElementById('convertButton');
    const messagesDiv = document.getElementById('messages');
    const downloadLinksDiv = document.getElementById('download-links');
    const fileUploadLabel = document.getElementById('fileUploadLabel');
    const filenameDisplay = document.getElementById('filenameDisplay');
    const spritesheetPreview = document.getElementById('spritesheetPreview');

    // --- IMPORTANT DEBUGGING STEP ---
    // Check if gifler is available right after DOMContentLoaded
    // This message should now be very clear if the file isn't loaded correctly.
    if (typeof gifler === 'undefined') {
        console.error("CRITICAL ERROR: 'gifler' library is not defined. This means 'gifler.min.js' was NOT loaded or parsed by the browser.");
        messagesDiv.innerHTML = '<p style="color: red;"><strong>CRITICAL ERROR: GIF parsing library not loaded.</strong><br>Please check your browser\'s Developer Console (F12 -> Console/Network/Sources tabs). Ensure `gifler.min.js` is in the same folder as `conv.html` and `script2.js`, and that the `conv.html` `<script src="gifler.min.js"></script>` tag is correct.</p>';
        convertButton.disabled = true; // Keep button disabled if library is missing
        return; // Stop further execution as gifler is critical
    } else {
        console.log("'gifler' library successfully detected."); // Debugging: Confirm it's found
    }
    // --- END DEBUGGING STEP ---


    // Function to update the overall state of the convert button and main message
    function updateConvertButtonAndMessageState() {
        const hasFile = gifInput.files.length > 0;
        const hasName = spriteNameInput.value.trim() !== '';

        console.log(`[UI State] Has File: ${hasFile}, Has Name: ${hasName}`); // Debugging
        convertButton.disabled = !(hasFile && hasName);
        console.log(`[UI State] Convert Button Disabled: ${convertButton.disabled}`); // Debugging

        if (!hasFile && !hasName) {
            messagesDiv.innerHTML = '<p>Please upload a GIF and provide a base name.</p>';
        } else if (!hasFile) {
            messagesDiv.innerHTML = '<p style="color: red;">Please upload a GIF file.</p>';
        } else if (!hasName) {
            messagesDiv.innerHTML = '<p style="color: red;">Please enter a base name for the sprite.</p>';
        } else {
            messagesDiv.innerHTML = '<p>Ready to convert.</p>';
        }
    }

    // Event Listener for GIF file input changes
    gifInput.addEventListener('change', () => {
        // Clear previous outputs regardless of selection
        downloadLinksDiv.innerHTML = '';
        spritesheetPreview.style.display = 'none';
        spritesheetPreview.src = '';

        if (gifInput.files.length > 0) {
            filenameDisplay.textContent = `File: ${gifInput.files[0].name}`;
            fileUploadLabel.classList.add('has-file');
        } else {
            filenameDisplay.textContent = 'No file chosen';
            fileUploadLabel.classList.remove('has-file');
        }
        // Update button and message state after file-specific UI
        updateConvertButtonAndMessageState();
    });

    // Event Listeners for name input and suffix radio changes
    spriteNameInput.addEventListener('input', updateConvertButtonAndMessageState);
    suffixRadios.forEach(radio => radio.addEventListener('change', updateConvertButtonAndMessageState));

    // Initial state setup on page load
    updateConvertButtonAndMessageState();

    convertButton.addEventListener('click', async () => {
        console.log('Convert Button Clicked!'); // Debugging: Confirm click event fires

        const file = gifInput.files[0];
        const baseName = spriteNameInput.value.trim();
        const selectedSuffix = document.querySelector('input[name="spriteSuffix"]:checked').value;

        console.log(`File: ${file ? file.name : 'None'}, Base Name: "${baseName}", Suffix: "${selectedSuffix}"`); // Debugging inputs

        // Re-validate just before conversion in case state was manipulated
        if (!file || !file.type.startsWith('image/gif')) {
            messagesDiv.innerHTML = '<p style="color: red;">Please select a GIF file.</p>';
            updateConvertButtonAndMessageState(); // Re-enable button if invalid state
            return;
        }
        if (!baseName) {
            messagesDiv.innerHTML = '<p style="color: red;">Please enter a base name for the sprite.</p>';
            updateConvertButtonAndMessageState(); // Re-enable button if invalid state
            return;
        }

        convertButton.disabled = true; // Disable button immediately to prevent multiple clicks
        messagesDiv.innerHTML = '<p>Processing GIF... This may take a moment for larger GIFs.</p>';
        downloadLinksDiv.innerHTML = '';
        spritesheetPreview.style.display = 'none';
        spritesheetPreview.src = '';

        try {
            console.log('Reading GIF file as ArrayBuffer...'); // Debugging step
            const arrayBuffer = await file.arrayBuffer();
            console.log('ArrayBuffer created. Parsing GIF with gifler...'); // Debugging step

            // CORRECTED LINE HERE: gifler expects an object with an 'arrayBuffer' property
            const gif = await gifler({ arrayBuffer: arrayBuffer }).get(); 
            console.log('GIF parsed by gifler.'); // Debugging step

            const frames = gif.frames;
            if (!frames || frames.length === 0) {
                throw new Error("No frames found in GIF.");
            }

            const frameWidth = frames[0].width;
            const frameHeight = frames[0].height;
            const numFrames = frames.length;

            // --- Logic for calculating rows and columns (max 10 frames per row) ---
            const maxFramesPerRow = 10;
            const horizontalFrames = Math.min(numFrames, maxFramesPerRow); // Max 10 per row
            const verticalFrames = Math.ceil(numFrames / horizontalFrames); // Calculate required rows

            // Calculate sprite sheet dimensions
            const spritesheetWidth = horizontalFrames * frameWidth;
            const spritesheetHeight = verticalFrames * frameHeight;

            // Create an offscreen canvas for the sprite sheet
            const spritesheetCanvas = document.createElement('canvas');
            spritesheetCanvas.width = spritesheetWidth;
            spritesheetCanvas.height = spritesheetHeight;
            const ctx = spritesheetCanvas.getContext('2d');

            // --- Construct final filename ---
            let finalName = baseName;
            if (selectedSuffix !== 'neither') {
                finalName += selectedSuffix;
            }

            // --- PyWright .txt file parameters ---
            const animationLength = numFrames;
            const loops = 1; // As per the reference file `loops 1`

            const pywrightTxtLines = [];
            // Add NAME at the very beginning of the PyWright TXT output
            pywrightTxtLines.push(`NAME=${finalName}`);
            pywrightTxtLines.push(`horizontal ${horizontalFrames}`);
            pywrightTxtLines.push(`vertical ${verticalFrames}`);
            pywrightTxtLines.push(`length ${animationLength}`);
            pywrightTxtLines.push(`loops ${loops}`);

            // Process each frame and draw it onto the sprite sheet
            for (let i = 0; i < numFrames; i++) {
                const frame = frames[i];

                // Calculate current row and column for drawing
                const col = i % horizontalFrames;
                const row = Math.floor(i / horizontalFrames);

                const drawX = col * frameWidth;
                const drawY = row * frameHeight;

                // Create an ImageBitmap from the frame's pixel data
                // This assumes frame.patch is a Uint8ClampedArray or similar raw pixel data
                const imageData = new ImageData(
                    new Uint8ClampedArray(frame.patch),
                    frame.width,
                    frame.height
                );
                const imageBitmap = await createImageBitmap(imageData);

                ctx.drawImage(imageBitmap, drawX, drawY); // Draw frame onto spritesheet

                // PyWright framedelay calculation (60 FPS)
                const gifDelayMs = frame.delay;
                const pywrightDelay = Math.max(1, Math.round((gifDelayMs / 1000) * 60));

                pywrightTxtLines.push(`framedelay ${i} ${pywrightDelay}`);
            }

            // Generate PyWright .txt content
            const spritesheetFilename = `${finalName}.png`;
            const pywrightTxtFilename = `${finalName}.txt`;

            const pywrightOutput = pywrightTxtLines.join('\n');

            // Get Blob for Sprite Sheet
            spritesheetCanvas.toBlob(blob => {
                const spritesheetUrl = URL.createObjectURL(blob);
                downloadLinksDiv.innerHTML += `
                    <a href="${spritesheetUrl}" download="${spritesheetFilename}">Download Sprite Sheet (${spritesheetFilename})</a>
                `;
                spritesheetPreview.src = spritesheetUrl;
                spritesheetPreview.style.display = 'block';
                console.log('Sprite sheet URL created.'); // Debugging
            }, 'image/png');

            // Get Blob for PyWright TXT
            const txtBlob = new Blob([pywrightOutput], { type: 'text/plain' });
            const txtUrl = URL.createObjectURL(txtBlob);
            downloadLinksDiv.innerHTML += `
                <a href="${txtUrl}" download="${pywrightTxtFilename}">Download PyWright TXT (${pywrightTxtFilename})</a>
            `;
            console.log('PyWright TXT URL created.'); // Debugging

            messagesDiv.innerHTML = '<p style="color: green;">Conversion complete! Download your files below.</p>';
            console.log('Conversion successful!'); // Debugging

        } catch (error) {
            messagesDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            console.error('Client-side error during conversion:', error); // More specific error message
        } finally {
            // Ensure button is re-enabled and message updated, even if an error occurred
            updateConvertButtonAndMessageState();
        }
    });
});