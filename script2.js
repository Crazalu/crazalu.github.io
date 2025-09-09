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

    if (typeof gifler === 'undefined') {
        console.error("CRITICAL ERROR: 'gifler' library is not defined. This means 'gifler.min.js' was NOT loaded or parsed by the browser.");
        messagesDiv.innerHTML = '<p style="color: red;"><strong>CRITICAL ERROR: GIF parsing library not loaded.</strong><br>Please check your browser\'s Developer Console (F12 -> Console/Network/Sources tabs). Ensure `gifler.min.js` is in the same folder as `conv.html` and `script2.js`, and that the `conv.html` `<script src="gifler.min.js"></script>` tag is correct.</p>';
        convertButton.disabled = true;
        return;
    } else {
        console.log("'gifler' library successfully detected.");
        // Added more checks to see what gifler exposes
        console.log("Type of gifler:", typeof gifler);
        try {
            // Attempt to call gifler with a dummy object to see its return structure without triggering a fetch
            const dummyGifler = gifler({ src: '' }); 
            console.log("gifler returns object with 'get' method:", typeof dummyGifler.get === 'function');
        } catch (e) {
            console.error("Error probing gifler API:", e);
        }
    }

    function updateConvertButtonAndMessageState() {
        const hasFile = gifInput.files.length > 0;
        const hasName = spriteNameInput.value.trim() !== '';

        console.log(`[UI State] Has File: ${hasFile}, Has Name: ${hasName}`);
        convertButton.disabled = !(hasFile && hasName);
        console.log(`[UI State] Convert Button Disabled: ${convertButton.disabled}`);

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

    gifInput.addEventListener('change', () => {
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
        updateConvertButtonAndMessageState();
    });

    spriteNameInput.addEventListener('input', updateConvertButtonAndMessageState);
    suffixRadios.forEach(radio => radio.addEventListener('change', updateConvertButtonAndMessageState));

    updateConvertButtonAndMessageState();

    convertButton.addEventListener('click', async () => {
        console.log('Convert Button Clicked!');

        const file = gifInput.files[0];
        const baseName = spriteNameInput.value.trim();
        const selectedSuffix = document.querySelector('input[name="spriteSuffix"]:checked').value;

        console.log(`File: ${file ? file.name : 'None'}, Base Name: "${baseName}", Suffix: "${selectedSuffix}"`);

        if (!file || !file.type.startsWith('image/gif')) {
            messagesDiv.innerHTML = '<p style="color: red;">Please select a GIF file.</p>';
            updateConvertButtonAndMessageState();
            return;
        }
        if (!baseName) {
            messagesDiv.innerHTML = '<p style="color: red;">Please enter a base name for the sprite.</p>';
            updateConvertButtonAndMessageState();
            return;
        }

        convertButton.disabled = true;
        messagesDiv.innerHTML = '<p>Processing GIF... This may take a moment for larger GIFs.</p>';
        downloadLinksDiv.innerHTML = '';
        spritesheetPreview.style.display = 'none';
        spritesheetPreview.src = '';

        try {
            console.log('Reading GIF file as ArrayBuffer...');
            const arrayBuffer = await file.arrayBuffer();
            
            // --- NEW DEBUGGING LOGS ---
            console.log('ArrayBuffer created. Size:', arrayBuffer.byteLength, 'bytes');
            console.log('Type of arrayBuffer:', typeof arrayBuffer, arrayBuffer.constructor.name);
            if (arrayBuffer.byteLength === 0) {
                throw new Error("Uploaded GIF file resulted in an empty ArrayBuffer.");
            }
            console.log('Attempting to parse GIF with gifler, passing object:', { arrayBuffer: arrayBuffer });
            // --- END NEW DEBUGGING LOGS ---

            const gif = await gifler({ arrayBuffer: arrayBuffer }).get();
            console.log('GIF parsed by gifler.');

            const frames = gif.frames;
            if (!frames || frames.length === 0) {
                throw new Error("No frames found in GIF.");
            }
            console.log('Number of GIF frames:', frames.length);

            const frameWidth = frames[0].width;
            const frameHeight = frames[0].height;
            const numFrames = frames.length;

            const maxFramesPerRow = 10;
            const horizontalFrames = Math.min(numFrames, maxFramesPerRow);
            const verticalFrames = Math.ceil(numFrames / horizontalFrames);

            const spritesheetWidth = horizontalFrames * frameWidth;
            const spritesheetHeight = verticalFrames * frameHeight;

            const spritesheetCanvas = document.createElement('canvas');
            spritesheetCanvas.width = spritesheetWidth;
            spritesheetCanvas.height = spritesheetHeight;
            const ctx = spritesheetCanvas.getContext('2d');

            let finalName = baseName;
            if (selectedSuffix !== 'neither') {
                finalName += selectedSuffix;
            }

            const animationLength = numFrames;
            const loops = 1;

            const pywrightTxtLines = [];
            pywrightTxtLines.push(`NAME=${finalName}`);
            pywrightTxtLines.push(`horizontal ${horizontalFrames}`);
            pywrightTxtLines.push(`vertical ${verticalFrames}`);
            pywrightTxtLines.push(`length ${animationLength}`);
            pywrightTxtLines.push(`loops ${loops}`);

            for (let i = 0; i < numFrames; i++) {
                const frame = frames[i];

                const col = i % horizontalFrames;
                const row = Math.floor(i / horizontalFrames);

                const drawX = col * frameWidth;
                const drawY = row * frameHeight;

                const imageData = new ImageData(
                    new Uint8ClampedArray(frame.patch),
                    frame.width,
                    frame.height
                );
                const imageBitmap = await createImageBitmap(imageData);

                ctx.drawImage(imageBitmap, drawX, drawY);

                const gifDelayMs = frame.delay;
                const pywrightDelay = Math.max(1, Math.round((gifDelayMs / 1000) * 60));

                pywrightTxtLines.push(`framedelay ${i} ${pywrightDelay}`);
            }

            const spritesheetFilename = `${finalName}.png`;
            const pywrightTxtFilename = `${finalName}.txt`;

            const pywrightOutput = pywrightTxtLines.join('\n');

            spritesheetCanvas.toBlob(blob => {
                const spritesheetUrl = URL.createObjectURL(blob);
                downloadLinksDiv.innerHTML += `
                    <a href="${spritesheetUrl}" download="${spritesheetFilename}">Download Sprite Sheet (${spritesheetFilename})</a>
                `;
                spritesheetPreview.src = spritesheetUrl;
                spritesheetPreview.style.display = 'block';
                console.log('Sprite sheet URL created.');
            }, 'image/png');

            const txtBlob = new Blob([pywrightOutput], { type: 'text/plain' });
            const txtUrl = URL.createObjectURL(txtBlob);
            downloadLinksDiv.innerHTML += `
                <a href="${txtUrl}" download="${pywrightTxtFilename}">Download PyWright TXT (${pywrightTxtFilename})</a>
            `;
            console.log('PyWright TXT URL created.');

            messagesDiv.innerHTML = '<p style="color: green;">Conversion complete! Download your files below.</p>';
            console.log('Conversion successful!');

        } catch (error) {
            messagesDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            console.error('Client-side error during conversion:', error);
        } finally {
            updateConvertButtonAndMessageState();
        }
    });
});
