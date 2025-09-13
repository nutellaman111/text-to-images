function fitText(ctx, text, maxWidth, maxHeight, fontName) {
    let fontSize = maxHeight;
    let lines = [];
    while (fontSize > 7) {
        ctx.font = `${fontSize}px ${fontName}`;
        const words = text.split(/\s+/);
        let line = "";
        lines = [];
        let fontTooBig = false;
        for (let word of words) {
            const testLine = line ? line + " " + word : word;
            const { width } = ctx.measureText(testLine);
            if (width > maxWidth) { //if cant fit another word to the line

                if (testLine.split(" ").length <= 1) {
                    fontTooBig = true;
                    break;
                }

                if (line) {
                    lines.push(line); //push the line as it is
                }

                line = word; //create a new line with the word that couldnt fit
                const { width } = ctx.measureText(line);
                if (width > maxWidth && line) {
                    fontTooBig = true;
                    break;
                }

            } else {
                line = testLine;
            }
        }
        if (!fontTooBig) {
            if (line) lines.push(line);
            const totalHeight = lines.length * fontSize * 1.2;
            if (totalHeight <= maxHeight) break;
        }
        fontSize -= 1;
    }
    return { fontSize, lines };
}

function sanitizeFileName(text, fallback = "item", ext = ".png") {
    let name = text.trim().replace(/[/\\?%*:|"<>]/g, "_").slice(0, 100);
    if (!name) name = fallback;
    return `${name}${ext}`;
}

function drawTextToCanvas(ctx, text, width, height, font, textColor, bgColor) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const { fontSize, lines } = fitText(ctx, text, width * 0.9, height * 0.9, font);
    ctx.font = `${fontSize}px ${font}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    let y = height / 2 - totalTextHeight / 2 + lineHeight / 2;

    for (let line of lines) {
        ctx.fillText(line, width / 2, y);
        y += lineHeight;
    }

    return ctx.canvas.toDataURL("image/png");
}


// Helper to get all current settings
function getSettings() {
    return {
        width: parseInt(document.getElementById("width").value, 10),
        height: parseInt(document.getElementById("height").value, 10),
        font: document.getElementById("font").value || "Arial",
        textColor: document.getElementById("textColor").value,
        bgColor: document.getElementById("bgColor").value
    };
}

// Helper to get the processed list of items
function getItems() {
    const input = document.getElementById("listInput").value;
    return input.split("\n").map(x => x.trim()).filter(Boolean);
}

// Efficient live previews
const imgMap = [];
const container = document.getElementById("imageContainer");

async function renderPreviews() {
    let items = getItems();
    let previewMode = "all";
    const previewAll = document.getElementById("previewAll");
    const previewSample = document.getElementById("previewSample");
    if (previewSample && previewSample.checked) previewMode = "sample";
    if (previewMode === "sample") {
        items = items.slice(-3);
    }
    const { width, height, font, textColor, bgColor } = getSettings();
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    for (let idx = 0; idx < items.length; idx++) {
        const text = items[idx];
        if (!imgMap[idx]) {
            const img = document.createElement("img");
            img.width = width;
            img.height = height;
            imgMap[idx] = img;
            container.appendChild(img);
        }
        const img = imgMap[idx];
        // regenerate only if content or settings changed
        if (img.dataset.text !== text || img.dataset.font !== font ||
            img.dataset.textColor !== textColor || img.dataset.bgColor !== bgColor ||
            img.dataset.width != width || img.dataset.height != height) {
            img.src = drawTextToCanvas(ctx, text, width, height, font, textColor, bgColor);
            img.dataset.text = text;
            img.dataset.font = font;
            img.dataset.textColor = textColor;
            img.dataset.bgColor = bgColor;
            img.dataset.width = width;
            img.dataset.height = height;
            img.width = width;
            img.height = height;
        }
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    // remove extra images if list shrank
    while (imgMap.length > items.length) {
        const removed = imgMap.pop();
        container.removeChild(removed);
    }
}


// Attach live preview events and always re-render on settings change


// Add preview controls to trigger re-render
["listInput", "width", "height", "font", "textColor", "bgColor", "previewAll", "previewSample"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === "number") {
        el.addEventListener("input", renderPreviews);
        el.addEventListener("change", renderPreviews);
    } else if (el.type === "radio") {
        el.addEventListener("change", renderPreviews);
    } else if (el.type === "color") {
        // Only trigger on final selection
        el.addEventListener("change", renderPreviews);
    } else if (el.tagName === "SELECT") {
        el.addEventListener("change", renderPreviews);
    } else {
        el.addEventListener("input", renderPreviews);
    }
});

// Initial render
renderPreviews();

// Export button
document.getElementById("exportBtn").addEventListener("click", () => {
    const items = getItems();
    const { width, height, font, textColor, bgColor } = getSettings();
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    const zip = new JSZip();
    items.forEach((text, idx) => {
        const dataUrl = drawTextToCanvas(ctx, text, width, height, font, textColor, bgColor);
        const base64 = dataUrl.split(",")[1];
        let safeName = sanitizeFileName(`${idx + 1}. ${text}`, `${idx + 1}. item`, ".png");
        zip.file(safeName, base64, { base64: true });
    });
    zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, "TextToImages.zip");
    });
});


textarea.addEventListener('paste', (e) => {
    e.preventDefault(); // prevent default paste
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    // insert plain text at cursor position
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    renderPreviews();

});

