// ===============================
// ELEMENTOS DO DOM
// ===============================
const fileInput = document.getElementById('fileInput');
const loadBtn = document.getElementById('loadBtn');
const resetBtn = document.getElementById('resetBtn');
const clearBtn = document.getElementById('clearBtn');
const sampleSelect = document.getElementById('sampleSelect');
const loadSampleBtn = document.getElementById('loadSampleBtn');

const originalCanvas = document.getElementById('originalCanvas');
const transformedCanvas = document.getElementById('transformedCanvas');
const originalCtx = originalCanvas.getContext('2d');
const transformedCtx = transformedCanvas.getContext('2d');
const viewportCanvas = document.getElementById('viewportCanvas');
const viewportCtx = viewportCanvas.getContext('2d');
const viewportModeSelect = document.getElementById('viewportMode');
const viewportWidthInput = document.getElementById('viewportWidth');
const viewportHeightInput = document.getElementById('viewportHeight');
const viewportOffsetXInput = document.getElementById('viewportOffsetX');
const viewportOffsetYInput = document.getElementById('viewportOffsetY');
const applyViewportSizeBtn = document.getElementById('applyViewportSizeBtn');

const imageInfoDiv = document.getElementById('imageInfo');
const originalDimensionsDiv = document.getElementById('originalDimensions');
const transformedDimensionsDiv = document.getElementById('transformedDimensions');
const viewportDimensionsDiv = document.getElementById('viewportDimensions');
const historyList = document.getElementById('historyList');
const binaryThresholdInput = document.getElementById('binaryThreshold');

// Botões de transformação
const translateBtn = document.getElementById('translateBtn');
const resetPositionBtn = document.getElementById('resetPositionBtn');
const scaleBtn = document.getElementById('scaleBtn');
const rotateBtn = document.getElementById('rotateBtn');
const reflectBtn = document.getElementById('reflectBtn');
const shearBtn = document.getElementById('shearBtn');

// ===============================
// VARIÁVEIS GLOBAIS
// ===============================
let originalImageData = null; // Dados originais da imagem
let currentImageData = null;  // Dados atuais (após transformações)
let rawImageData = null;      // Dados em tons de cinza antes da binarização
let originalWidth = 0;
let originalHeight = 0;
let history = [];
let currentTransformMatrix = null;
let currentInterpolationMode = true;
let preserveOriginalFrame = false;

const BACKGROUND_PIXEL = 255;
const VIEWPORT_MIN_SIZE = 80;
const VIEWPORT_MAX_SIZE = 900;

// ===============================
// ESTRUTURA DE DADOS DA IMAGEM
// ===============================
class ImageData2D {
    constructor(width, height, pixels = null) {
        this.width = width;
        this.height = height;
        this.pixels = pixels || new Array(height).fill(null).map(() => new Array(width).fill(0));
    }

    getPixel(x, y, defaultValue = BACKGROUND_PIXEL) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.pixels[y][x];
        }
        return defaultValue;
    }

    setPixel(x, y, value) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.pixels[y][x] = Math.max(0, Math.min(255, Math.round(value)));
        }
    }
}

function cloneImageData2D(imageData) {
    const clone = new ImageData2D(imageData.width, imageData.height);

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            clone.setPixel(x, y, imageData.getPixel(x, y));
        }
    }

    return clone;
}

function binarizeImageData(imageData, threshold = 127) {
    const binary = new ImageData2D(imageData.width, imageData.height);

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const value = imageData.getPixel(x, y) <= threshold ? 0 : 255;
            binary.setPixel(x, y, value);
        }
    }

    return binary;
}

function countBinaryPixels(imageData) {
    let black = 0;
    let white = 0;

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            if (imageData.getPixel(x, y) === 0) {
                black++;
            } else {
                white++;
            }
        }
    }

    return { black, white };
}

// ===============================
// PARSER DE ARQUIVO PGM
// ===============================
function parsePGM(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);

    // Função para ler o cabeçalho byte a byte
    let pos = 0;

    // Pula espaços em branco
    function skipWhitespace() {
        while (pos < uint8Array.length &&
            (uint8Array[pos] === 32 || uint8Array[pos] === 9 ||
                uint8Array[pos] === 10 || uint8Array[pos] === 13)) {
            pos++;
        }
    }

    // Pula comentários
    function skipComments() {
        while (pos < uint8Array.length && uint8Array[pos] === 35) { // '#'
            while (pos < uint8Array.length && uint8Array[pos] !== 10) { // até '\n'
                pos++;
            }
            pos++; // pula o '\n'
            skipWhitespace();
        }
    }

    // Lê um token (palavra)
    function readToken() {
        skipWhitespace();
        skipComments();
        let token = '';
        while (pos < uint8Array.length &&
            uint8Array[pos] !== 32 && uint8Array[pos] !== 9 &&
            uint8Array[pos] !== 10 && uint8Array[pos] !== 13 &&
            uint8Array[pos] !== 35) {
            token += String.fromCharCode(uint8Array[pos++]);
        }
        return token;
    }

    // Lê o tipo (P2 ou P5)
    const magicNumber = readToken();

    // Lê dimensões
    const width = parseInt(readToken());
    const height = parseInt(readToken());

    // Lê valor máximo
    const maxVal = parseInt(readToken());

    // Pula um único caractere de espaço em branco após maxVal
    if (pos < uint8Array.length &&
        (uint8Array[pos] === 32 || uint8Array[pos] === 9 ||
            uint8Array[pos] === 10 || uint8Array[pos] === 13)) {
        pos++;
    }

    console.log(`Formato: ${magicNumber}, Dimensões: ${width}x${height}, Max: ${maxVal}, DataStart: ${pos}`);

    const imageData = new ImageData2D(width, height);

    if (magicNumber === 'P2') {
        // Formato ASCII
        let values = [];
        while (pos < uint8Array.length) {
            const token = readToken();
            if (token) {
                const num = parseInt(token);
                if (!isNaN(num)) {
                    values.push(num);
                }
            }
            if (values.length >= width * height) break;
        }

        let idx = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                imageData.setPixel(x, y, values[idx++] || 0);
            }
        }
    } else if (magicNumber === 'P5') {
        // Formato binário
        let idx = pos;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (idx < uint8Array.length) {
                    imageData.setPixel(x, y, uint8Array[idx++]);
                }
            }
        }
    }

    return imageData;
}

// ===============================
// RENDERIZAÇÃO NO CANVAS
// ===============================
function renderImage(imageData, canvas, ctx, dimensionsDiv) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const canvasImageData = ctx.createImageData(imageData.width, imageData.height);

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const value = imageData.getPixel(x, y);
            const idx = (y * imageData.width + x) * 4;
            canvasImageData.data[idx] = value;     // R
            canvasImageData.data[idx + 1] = value; // G
            canvasImageData.data[idx + 2] = value; // B
            canvasImageData.data[idx + 3] = 255;   // A
        }
    }

    ctx.putImageData(canvasImageData, 0, 0);
    dimensionsDiv.textContent = `${imageData.width} x ${imageData.height} pixels`;
}

function parseViewportSize(value, fallbackValue) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallbackValue;
    return Math.max(VIEWPORT_MIN_SIZE, Math.min(VIEWPORT_MAX_SIZE, parsed));
}

function applyViewportSize() {
    const width = parseViewportSize(viewportWidthInput.value, viewportCanvas.width || 320);
    const height = parseViewportSize(viewportHeightInput.value, viewportCanvas.height || 220);

    viewportWidthInput.value = width;
    viewportHeightInput.value = height;

    viewportCanvas.width = width;
    viewportCanvas.height = height;
    viewportDimensionsDiv.textContent = `${width} x ${height} pixels`;

    renderViewport();
}

function renderViewport() {
    const w = viewportCanvas.width;
    const h = viewportCanvas.height;

    viewportCtx.fillStyle = '#ffffff';
    viewportCtx.fillRect(0, 0, w, h);

    if (!currentImageData) {
        return;
    }

    const srcW = currentImageData.width;
    const srcH = currentImageData.height;
    if (srcW <= 0 || srcH <= 0) {
        return;
    }

    const mode = viewportModeSelect ? viewportModeSelect.value : 'crop';
    const viewportOffsetX = parseInt(viewportOffsetXInput.value, 10) || 0;
    const viewportOffsetY = parseInt(viewportOffsetYInput.value, 10) || 0;

    const viewportImageData = viewportCtx.createImageData(w, h);

    if (mode === 'crop') {
        const srcCenterX = (srcW - 1) / 2 + viewportOffsetX;
        const srcCenterY = (srcH - 1) / 2 + viewportOffsetY;
        const startX = Math.round(srcCenterX - (w - 1) / 2);
        const startY = Math.round(srcCenterY - (h - 1) / 2);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const srcX = startX + x;
                const srcY = startY + y;
                const value = currentImageData.getPixel(srcX, srcY, BACKGROUND_PIXEL);
                const idx = (y * w + x) * 4;

                viewportImageData.data[idx] = value;
                viewportImageData.data[idx + 1] = value;
                viewportImageData.data[idx + 2] = value;
                viewportImageData.data[idx + 3] = 255;
            }
        }

        viewportCtx.putImageData(viewportImageData, 0, 0);
        return;
    }

    const scale = Math.min(w / srcW, h / srcH);
    const drawW = Math.max(1, Math.round(srcW * scale));
    const drawH = Math.max(1, Math.round(srcH * scale));
    const fitOffsetX = Math.floor((w - drawW) / 2);
    const fitOffsetY = Math.floor((h - drawH) / 2);
    const mapX = srcW / drawW;
    const mapY = srcH / drawH;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            let value = BACKGROUND_PIXEL;

            const insideDrawArea = x >= fitOffsetX && x < fitOffsetX + drawW && y >= fitOffsetY && y < fitOffsetY + drawH;
            if (insideDrawArea) {
                const localX = x - fitOffsetX;
                const localY = y - fitOffsetY;
                const srcX = Math.min(srcW - 1, Math.max(0, Math.round((localX + 0.5) * mapX - 0.5)));
                const srcY = Math.min(srcH - 1, Math.max(0, Math.round((localY + 0.5) * mapY - 0.5)));
                value = currentImageData.getPixel(srcX, srcY, BACKGROUND_PIXEL);
            }

            viewportImageData.data[idx] = value;
            viewportImageData.data[idx + 1] = value;
            viewportImageData.data[idx + 2] = value;
            viewportImageData.data[idx + 3] = 255;
        }
    }

    viewportCtx.putImageData(viewportImageData, 0, 0);
}

function resetTransformState() {
    currentTransformMatrix = new TransformMatrix();
}

function getCurrentImageCenter() {
    const centerX = (originalWidth - 1) / 2;
    const centerY = (originalHeight - 1) / 2;
    return currentTransformMatrix.transform(centerX, centerY);
}

function renderCurrentTransformation(useNearestNeighbor = currentInterpolationMode) {
    const corners = [
        { x: 0, y: 0 },
        { x: originalWidth - 1, y: 0 },
        { x: originalWidth - 1, y: originalHeight - 1 },
        { x: 0, y: originalHeight - 1 }
    ];

    const transformedCorners = corners.map(c => currentTransformMatrix.transform(c.x, c.y));

    const transformedBounds = {
        minX: Math.floor(Math.min(...transformedCorners.map(c => c.x))),
        maxX: Math.ceil(Math.max(...transformedCorners.map(c => c.x))),
        minY: Math.floor(Math.min(...transformedCorners.map(c => c.y))),
        maxY: Math.ceil(Math.max(...transformedCorners.map(c => c.y)))
    };

    const minX = preserveOriginalFrame ? Math.min(0, transformedBounds.minX) : transformedBounds.minX;
    const maxX = preserveOriginalFrame ? Math.max(originalWidth - 1, transformedBounds.maxX) : transformedBounds.maxX;
    const minY = preserveOriginalFrame ? Math.min(0, transformedBounds.minY) : transformedBounds.minY;
    const maxY = preserveOriginalFrame ? Math.max(originalHeight - 1, transformedBounds.maxY) : transformedBounds.maxY;

    const newWidth = maxX - minX + 1;
    const newHeight = maxY - minY + 1;

    console.log(`Nova dimensão: ${newWidth}x${newHeight}, Offset: (${minX}, ${minY})`);

    const newImageData = new ImageData2D(newWidth, newHeight);
    const invMatrix = invertMatrix(currentTransformMatrix.matrix);

    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            const worldX = x + minX;
            const worldY = y + minY;
            const srcX = invMatrix[0][0] * worldX + invMatrix[0][1] * worldY + invMatrix[0][2];
            const srcY = invMatrix[1][0] * worldX + invMatrix[1][1] * worldY + invMatrix[1][2];

            let pixelValue = 0;

            if (useNearestNeighbor) {
                const ix = Math.round(srcX);
                const iy = Math.round(srcY);
                pixelValue = originalImageData.getPixel(ix, iy, BACKGROUND_PIXEL);
            } else {
                pixelValue = bilinearInterpolation(originalImageData, srcX, srcY);
            }

            newImageData.setPixel(x, y, pixelValue);
        }
    }

    currentImageData = newImageData;
    renderImage(currentImageData, transformedCanvas, transformedCtx, transformedDimensionsDiv);
    renderViewport();
}

// ===============================
// CARREGAMENTO DE IMAGEM
// ===============================
function loadImage(arrayBuffer) {
    try {
        const parsedImage = parsePGM(arrayBuffer);
        const threshold = parseInt(binaryThresholdInput.value, 10);
        rawImageData = parsedImage;
        originalImageData = binarizeImageData(rawImageData, Number.isNaN(threshold) ? 127 : threshold);
        currentImageData = cloneImageData2D(originalImageData);

        originalWidth = originalImageData.width;
        originalHeight = originalImageData.height;
        resetTransformState();
        currentInterpolationMode = true;

        renderImage(originalImageData, originalCanvas, originalCtx, originalDimensionsDiv);
        renderImage(currentImageData, transformedCanvas, transformedCtx, transformedDimensionsDiv);
        renderViewport();

        updateImageInfo();
        history = [];
        updateHistory();

        enableTransformButtons();

        alert('Imagem carregada com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        alert('Erro ao carregar imagem PGM. Verifique o formato do arquivo.');
    }
}

function reloadBinaryFromThreshold() {
    if (!rawImageData) {
        return;
    }

    const threshold = parseInt(binaryThresholdInput.value, 10);
    originalImageData = binarizeImageData(rawImageData, Number.isNaN(threshold) ? 127 : threshold);
    currentImageData = cloneImageData2D(originalImageData);

    originalWidth = originalImageData.width;
    originalHeight = originalImageData.height;
    resetTransformState();
    currentInterpolationMode = true;
    preserveOriginalFrame = false;

    renderImage(originalImageData, originalCanvas, originalCtx, originalDimensionsDiv);
    renderImage(currentImageData, transformedCanvas, transformedCtx, transformedDimensionsDiv);
    renderViewport();
    updateImageInfo();

    history.push(`Limiar atualizado para ${binaryThresholdInput.value}`);
    updateHistory();
}

loadBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) {
        alert('Por favor, selecione um arquivo primeiro.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => loadImage(e.target.result);
    reader.readAsArrayBuffer(file);
});

loadSampleBtn.addEventListener('click', async () => {
    const selected = sampleSelect.value;
    if (!selected) {
        alert('Selecione uma imagem de exemplo primeiro.');
        return;
    }

    try {
        const response = await fetch(selected);
        if (!response.ok) {
            throw new Error(`Falha ao carregar ${selected}`);
        }
        const buffer = await response.arrayBuffer();
        loadImage(buffer);
    } catch (error) {
        console.error(error);
        alert('Não foi possível carregar o exemplo selecionado.');
    }
});

binaryThresholdInput.addEventListener('change', reloadBinaryFromThreshold);

// ===============================
// ATUALIZAÇÃO DA INTERFACE
// ===============================
function updateImageInfo() {
    const counts = originalImageData ? countBinaryPixels(originalImageData) : { black: 0, white: 0 };
    imageInfoDiv.innerHTML = `
        <strong>Largura:</strong> ${originalWidth} px<br>
        <strong>Altura:</strong> ${originalHeight} px<br>
        <strong>Total de Pixels:</strong> ${originalWidth * originalHeight}<br>
        <strong>Formato:</strong> PGM binarizado<br>
        <strong>Limiar:</strong> ${binaryThresholdInput.value}<br>
        <strong>Pretos:</strong> ${counts.black}<br>
        <strong>Brancos:</strong> ${counts.white}
    `;
}

function updateHistory() {
    if (history.length === 0) {
        historyList.innerHTML = 'Nenhuma transformação aplicada';
    } else {
        historyList.innerHTML = history.map((item, idx) =>
            `<div class="history-item">${idx + 1}. ${item}</div>`
        ).join('');
    }
}

function enableTransformButtons() {
    translateBtn.disabled = false;
    resetPositionBtn.disabled = false;
    scaleBtn.disabled = false;
    rotateBtn.disabled = false;
    reflectBtn.disabled = false;
    shearBtn.disabled = false;
}

// ===============================
// TRANSFORMAÇÕES GEOMÉTRICAS
// ===============================

// MATRIZ DE TRANSFORMAÇÃO 3x3 (Coordenadas Homogêneas)
class TransformMatrix {
    constructor() {
        // Matriz identidade
        this.matrix = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }

    multiply(other) {
        const result = new TransformMatrix();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                result.matrix[i][j] = 0;
                for (let k = 0; k < 3; k++) {
                    result.matrix[i][j] += this.matrix[i][k] * other.matrix[k][j];
                }
            }
        }
        return result;
    }

    transform(x, y) {
        const newX = this.matrix[0][0] * x + this.matrix[0][1] * y + this.matrix[0][2];
        const newY = this.matrix[1][0] * x + this.matrix[1][1] * y + this.matrix[1][2];
        return { x: newX, y: newY };
    }

    static translation(dx, dy) {
        const m = new TransformMatrix();
        m.matrix[0][2] = dx;
        m.matrix[1][2] = dy;
        return m;
    }

    static scale(sx, sy) {
        const m = new TransformMatrix();
        m.matrix[0][0] = sx;
        m.matrix[1][1] = sy;
        return m;
    }

    static rotation(angleRadians) {
        const m = new TransformMatrix();
        const cos = Math.cos(angleRadians);
        const sin = Math.sin(angleRadians);
        m.matrix[0][0] = cos;
        m.matrix[0][1] = -sin;
        m.matrix[1][0] = sin;
        m.matrix[1][1] = cos;
        return m;
    }

    static reflection(reflectX, reflectY) {
        const m = new TransformMatrix();
        if (reflectX) m.matrix[1][1] = -1; // Espelha verticalmente
        if (reflectY) m.matrix[0][0] = -1; // Espelha horizontalmente
        return m;
    }

    static shear(shx, shy) {
        const m = new TransformMatrix();
        m.matrix[0][1] = shx;
        m.matrix[1][0] = shy;
        return m;
    }
}

// APLICAR TRANSFORMAÇÃO NA IMAGEM
function applyTransformation(matrix, useNearestNeighbor = true) {
    if (!originalImageData) {
        alert('Carregue uma imagem primeiro!');
        return;
    }

    currentTransformMatrix = matrix.multiply(currentTransformMatrix);
    currentInterpolationMode = useNearestNeighbor;
    preserveOriginalFrame = false;
    renderCurrentTransformation(useNearestNeighbor);
}

// INTERPOLAÇÃO BILINEAR
function bilinearInterpolation(imageData, x, y) {
    const x1 = Math.floor(x);
    const x2 = x1 + 1;
    const y1 = Math.floor(y);
    const y2 = y1 + 1;

    const Q11 = imageData.getPixel(x1, y1);
    const Q21 = imageData.getPixel(x2, y1);
    const Q12 = imageData.getPixel(x1, y2);
    const Q22 = imageData.getPixel(x2, y2);

    const dx = x - x1;
    const dy = y - y1;

    const R1 = Q11 * (1 - dx) + Q21 * dx;
    const R2 = Q12 * (1 - dx) + Q22 * dx;

    const interpolated = Math.round(R1 * (1 - dy) + R2 * dy);
    const threshold = parseInt(binaryThresholdInput.value, 10);
    return interpolated <= (Number.isNaN(threshold) ? 127 : threshold) ? 0 : 255;
}

// INVERSÃO DE MATRIZ 3x3
function invertMatrix(m) {
    const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

    if (Math.abs(det) < 1e-10) {
        console.error('Matriz não inversível');
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    }

    const inv = [
        [
            (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det,
            (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det,
            (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det
        ],
        [
            (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det,
            (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det,
            (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det
        ],
        [
            (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det,
            (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det,
            (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det
        ]
    ];

    return inv;
}

// ===============================
// EVENTOS DOS BOTÕES DE TRANSFORMAÇÃO
// ===============================

// TRANSLAÇÃO
translateBtn.addEventListener('click', () => {
    const dx = parseFloat(document.getElementById('translateX').value) || 0;
    const dy = parseFloat(document.getElementById('translateY').value) || 0;

    const matrix = TransformMatrix.translation(dx, dy);
    currentTransformMatrix = matrix.multiply(currentTransformMatrix);
    currentInterpolationMode = true;
    preserveOriginalFrame = true;
    renderCurrentTransformation(true);

    history.push(`Translação: Δx=${dx}, Δy=${dy}`);
    updateHistory();
    console.log(`Aplicada translação: (${dx}, ${dy})`);
});

resetPositionBtn.addEventListener('click', () => {
    if (!originalImageData || !currentTransformMatrix) {
        alert('Carregue uma imagem primeiro!');
        return;
    }

    const originalCenter = {
        x: (originalWidth - 1) / 2,
        y: (originalHeight - 1) / 2
    };
    const currentCenter = getCurrentImageCenter();
    const deltaX = originalCenter.x - currentCenter.x;
    const deltaY = originalCenter.y - currentCenter.y;

    currentTransformMatrix = TransformMatrix.translation(deltaX, deltaY).multiply(currentTransformMatrix);
    preserveOriginalFrame = true;
    renderCurrentTransformation(currentInterpolationMode);

    history.push('Posição resetada');
    updateHistory();
    console.log(`Posição resetada: (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
});

// ESCALA
scaleBtn.addEventListener('click', () => {
    const sx = parseFloat(document.getElementById('scaleX').value) || 1;
    const sy = parseFloat(document.getElementById('scaleY').value) || 1;
    const useNN = document.getElementById('nearestNeighbor').checked;

    // Escala em torno do centro atual da imagem transformada
    const { x: cx, y: cy } = getCurrentImageCenter();

    const t1 = TransformMatrix.translation(-cx, -cy);
    const s = TransformMatrix.scale(sx, sy);
    const t2 = TransformMatrix.translation(cx, cy);

    const matrix = t2.multiply(s).multiply(t1);
    applyTransformation(matrix, useNN);

    history.push(`Escala: Sx=${sx}, Sy=${sy} (${useNN ? 'NN' : 'Bilinear'})`);
    updateHistory();
    console.log(`Aplicada escala: (${sx}, ${sy})`);
});

// ROTAÇÃO
rotateBtn.addEventListener('click', () => {
    const angle = parseFloat(document.getElementById('rotateAngle').value) || 0;
    const angleRad = angle * Math.PI / 180;

    let cx = parseFloat(document.getElementById('rotateCenterX').value);
    let cy = parseFloat(document.getElementById('rotateCenterY').value);

    // Se não especificado, usa centro atual da imagem transformada
    if (isNaN(cx) || isNaN(cy)) {
        const currentCenter = getCurrentImageCenter();
        if (isNaN(cx)) cx = currentCenter.x;
        if (isNaN(cy)) cy = currentCenter.y;
    }

    const t1 = TransformMatrix.translation(-cx, -cy);
    const r = TransformMatrix.rotation(angleRad);
    const t2 = TransformMatrix.translation(cx, cy);

    const matrix = t2.multiply(r).multiply(t1);
    applyTransformation(matrix, false); // Usa bilinear para rotação

    history.push(`Rotação: ${angle}° em torno de (${cx.toFixed(1)}, ${cy.toFixed(1)})`);
    updateHistory();
    console.log(`Aplicada rotação: ${angle}° `);
});

// REFLEXÃO
reflectBtn.addEventListener('click', () => {
    const reflectX = document.getElementById('reflectX').checked;
    const reflectY = document.getElementById('reflectY').checked;

    if (!reflectX && !reflectY) {
        alert('Selecione pelo menos uma direção de reflexão!');
        return;
    }

    const { x: cx, y: cy } = getCurrentImageCenter();
    const t1 = TransformMatrix.translation(-cx, -cy);
    const ref = TransformMatrix.reflection(reflectX, reflectY);
    const t2 = TransformMatrix.translation(cx, cy);

    applyTransformation(t2.multiply(ref).multiply(t1));

    const axis = [reflectX && 'X', reflectY && 'Y'].filter(Boolean).join(' e ');
    history.push(`Reflexão em ${axis}`);
    updateHistory();
    console.log(`Aplicada reflexão em ${axis}`);
});

// CISALHAMENTO
shearBtn.addEventListener('click', () => {
    const shx = parseFloat(document.getElementById('shearX').value) || 0;
    const shy = parseFloat(document.getElementById('shearY').value) || 0;

    const { x: cx, y: cy } = getCurrentImageCenter();
    const t1 = TransformMatrix.translation(-cx, -cy);
    const shear = TransformMatrix.shear(shx, shy);
    const t2 = TransformMatrix.translation(cx, cy);

    const matrix = t2.multiply(shear).multiply(t1);
    applyTransformation(matrix);

    history.push(`Cisalhamento: Shx=${shx}, Shy=${shy}`);
    updateHistory();
    console.log(`Aplicado cisalhamento: (${shx}, ${shy})`);
});

// ===============================
// CONTROLES GERAIS
// ===============================

// RESETAR
resetBtn.addEventListener('click', () => {
    if (!originalImageData) {
        alert('Nenhuma imagem carregada!');
        return;
    }

    resetTransformState();
    currentInterpolationMode = true;
    preserveOriginalFrame = false;
    currentImageData = cloneImageData2D(originalImageData);

    renderImage(currentImageData, transformedCanvas, transformedCtx, transformedDimensionsDiv);
    renderViewport();
    history = [];
    updateHistory();
    console.log('Imagem resetada para original');
});

// LIMPAR
clearBtn.addEventListener('click', () => {
    originalImageData = null;
    currentImageData = null;
    rawImageData = null;
    originalWidth = 0;
    originalHeight = 0;
    history = [];
    currentTransformMatrix = null;
    preserveOriginalFrame = false;

    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    transformedCtx.clearRect(0, 0, transformedCanvas.width, transformedCanvas.height);

    originalCanvas.width = 0;
    originalCanvas.height = 0;
    transformedCanvas.width = 0;
    transformedCanvas.height = 0;

    renderViewport();

    imageInfoDiv.innerHTML = 'Nenhuma imagem carregada';
    originalDimensionsDiv.textContent = '';
    transformedDimensionsDiv.textContent = '';
    updateHistory();

    translateBtn.disabled = true;
    resetPositionBtn.disabled = true;
    scaleBtn.disabled = true;
    rotateBtn.disabled = true;
    reflectBtn.disabled = true;
    shearBtn.disabled = true;

    fileInput.value = '';

    console.log('Tudo limpo');
});

// ===============================
// INICIALIZAÇÃO
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    translateBtn.disabled = true;
    resetPositionBtn.disabled = true;
    scaleBtn.disabled = true;
    rotateBtn.disabled = true;
    reflectBtn.disabled = true;
    shearBtn.disabled = true;

    applyViewportSizeBtn.addEventListener('click', applyViewportSize);
    viewportWidthInput.addEventListener('change', applyViewportSize);
    viewportHeightInput.addEventListener('change', applyViewportSize);
    viewportModeSelect.addEventListener('change', renderViewport);
    viewportOffsetXInput.addEventListener('change', renderViewport);
    viewportOffsetYInput.addEventListener('change', renderViewport);
    applyViewportSize();

    console.log('Sistema de Processamento de Imagens inicializado');
    console.log('Carregue uma imagem PGM para começar');
});
