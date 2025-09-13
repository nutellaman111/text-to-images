function fitText(ctx, text, maxWidth, maxHeight, fontName) {
    let fontSize = maxHeight; // start large
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
            if (width > maxWidth && line) { //if cant fit another word to the line
                lines.push(line); //push the line as it is
                line = word; //create a new line with the word that couldnt fit
                const { width } = ctx.measureText(line);
                if (width > maxWidth && line) { //if that word cant fit even by itself
                    fontTooBig = true; //then the font is too big
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

document.getElementById("exportBtn").addEventListener("click", () => {
    const input = document.getElementById("listInput").value;
    const items = input.split("\n").map(x => x.replace(/^-+\s*/, "").trim()).filter(Boolean);

    const width = parseInt(document.getElementById("width").value, 10);
    const height = parseInt(document.getElementById("height").value, 10);
    const font = document.getElementById("font").value || "Arial";
    const textColor = document.getElementById("textColor").value;
    const bgColor = document.getElementById("bgColor").value;

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    const zip = new JSZip();

    items.forEach((text, idx) => {
        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        // Fit text to canvas
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

        // Sanitize file name
        let safeName = sanitizeFileName(`${idx + 1}. ${text}`, `${idx + 1}. item`, `.png`);
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        zip.file(safeName, base64, { base64: true });
    });

    // Generate and download ZIP
    zip.generateAsync({ type: "blob" }).then(content => {
        saveAs(content, "items.zip");
    });
});

function sanitizeFileName(text, fallback = "item", ext = ".png") {
    // sanitize main name
    let name = text
        .trim()
        .replace(/[/\\?%*:|"<>]/g, "_") // replace invalid chars
        .slice(0, 100);                 // optional max length

    if (!name) name = fallback;

    return `${name}${ext}`;
}
