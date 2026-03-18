// ===============================
// ELEMENTOS DO DOM
// ===============================
const fileInput1 = document.getElementById('fileInput1');
const fileInput2 = document.getElementById('fileInput2');
const preloadedSelect1 = document.getElementById('preloadedSelect1');
const preloadedSelect2 = document.getElementById('preloadedSelect2');
const loadPreloaded1Btn = document.getElementById('loadPreloaded1Btn');
const loadPreloaded2Btn = document.getElementById('loadPreloaded2Btn');
const uploadBtn1 = document.getElementById('uploadBtn1');
const uploadBtn2 = document.getElementById('uploadBtn2');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const resultCanvas = document.getElementById('resultCanvas');
const ctx1 = canvas1.getContext('2d');
const ctx2 = canvas2.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

const imageInfoDiv = document.getElementById('imageInfo');
const info1Div = document.getElementById('info1');
const info2Div = document.getElementById('info2');
const resultInfoDiv = document.getElementById('resultInfo');

const kernelSizeSelect = document.getElementById('kernelSize');
const enhanceFactorInput = document.getElementById('enhanceFactor');
const enhanceValueSpan = document.getElementById('enhanceValue');

// Botões de filtros
const filterButtons = document.querySelectorAll('.btn-filter');
const operationButtons = document.querySelectorAll('.btn-operation');
const logicalButtons = document.querySelectorAll('.btn-logical');

// ===============================
// VARIÁVEIS GLOBAIS
// ===============================
let image1Data = null;
let image2Data = null;
let resultImageData = null;

// ===============================
// CLASSE DE IMAGEM
// ===============================
class ImageData2D {
    constructor(width, height, pixels = null) {
        this.width = width;
        this.height = height;
        this.pixels = pixels || new Array(height).fill(null).map(() => new Array(width).fill(0));
    }

    clone() {
        const newPixels = this.pixels.map(row => [...row]);
        return new ImageData2D(this.width, this.height, newPixels);
    }

    getPixel(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.pixels[y][x];
        }
        return 0;
    }

    setPixel(x, y, value) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.pixels[y][x] = Math.max(0, Math.min(255, Math.round(value)));
        }
    }
}


// ===============================
// PARSER DE ARQUIVO PGM
// ===============================
function parsePGM(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    let pos = 0;

    function skipWhitespace() {
        while (pos < uint8Array.length &&
            (uint8Array[pos] === 32 || uint8Array[pos] === 9 ||
                uint8Array[pos] === 10 || uint8Array[pos] === 13)) {
            pos++;
        }
    }

    function skipComments() {
        while (pos < uint8Array.length && uint8Array[pos] === 35) {
            while (pos < uint8Array.length && uint8Array[pos] !== 10) {
                pos++;
            }
            pos++;
            skipWhitespace();
        }
    }

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

    const magicNumber = readToken();
    const width = parseInt(readToken());
    const height = parseInt(readToken());
    const maxVal = parseInt(readToken());

    if (pos < uint8Array.length &&
        (uint8Array[pos] === 32 || uint8Array[pos] === 9 ||
            uint8Array[pos] === 10 || uint8Array[pos] === 13)) {
        pos++;
    }

    const imageData = new ImageData2D(width, height);

    if (magicNumber === 'P2') {
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
// RENDERIZAÇÃO
// ===============================
function renderImage(imageData, canvas, ctx, infoDiv, label) {
    if (!imageData) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        infoDiv.textContent = '';
        return;
    }

    canvas.width = imageData.width;
    canvas.height = imageData.height;

    const canvasImageData = ctx.createImageData(imageData.width, imageData.height);

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const value = imageData.getPixel(x, y);
            const idx = (y * imageData.width + x) * 4;
            canvasImageData.data[idx] = value;
            canvasImageData.data[idx + 1] = value;
            canvasImageData.data[idx + 2] = value;
            canvasImageData.data[idx + 3] = 255;
        }
    }

    ctx.putImageData(canvasImageData, 0, 0);
    infoDiv.textContent = `${label}: ${imageData.width} × ${imageData.height} pixels`;
}

function loadImage(arrayBuffer, slotNumber) {
    try {
        const imageData = parsePGM(arrayBuffer);
        
        if (slotNumber === 1) {
            image1Data = imageData;
            renderImage(image1Data, canvas1, ctx1, info1Div, 'Imagem 1');
        } else {
            image2Data = imageData;
            renderImage(image2Data, canvas2, ctx2, info2Div, 'Imagem 2');
        }

        updateImageInfo();
    } catch (error) {
        console.error('Erro ao carregar:', error);
        alert(`Erro ao carregar imagem ${slotNumber}: ${error.message}`);
    }
}

// ===============================
// EVENTOS DE CARREGAMENTO
// ===============================
uploadBtn1.addEventListener('click', () => {
    const file = fileInput1.files[0];
    if (!file) {
        alert('Selecione um arquivo para a Imagem 1');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => loadImage(e.target.result, 1);
    reader.readAsArrayBuffer(file);
});

uploadBtn2.addEventListener('click', () => {
    const file = fileInput2.files[0];
    if (!file) {
        alert('Selecione um arquivo para a Imagem 2');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => loadImage(e.target.result, 2);
    reader.readAsArrayBuffer(file);
});

loadPreloaded1Btn.addEventListener('click', () => {
    const path = preloadedSelect1.value;
    if (!path) {
        alert('Selecione uma imagem');
        return;
    }
    fetch(path)
        .then(r => r.arrayBuffer())
        .then(ab => loadImage(ab, 1))
        .catch(e => alert(`Erro: ${e.message}`));
});

loadPreloaded2Btn.addEventListener('click', () => {
    const path = preloadedSelect2.value;
    if (!path) {
        alert('Selecione uma imagem');
        return;
    }
    fetch(path)
        .then(r => r.arrayBuffer())
        .then(ab => loadImage(ab, 2))
        .catch(e => alert(`Erro: ${e.message}`));
});

function updateImageInfo() {
    let info = '';
    if (image1Data) {
        info += `<strong>I1:</strong> ${image1Data.width}×${image1Data.height} pixels<br>`;
    }
    if (image2Data) {
        info += `<strong>I2:</strong> ${image2Data.width}×${image2Data.height} pixels<br>`;
    }
    if (resultImageData) {
        info += `<strong>Resultado:</strong> ${resultImageData.width}×${resultImageData.height} pixels`;
    }
    imageInfoDiv.innerHTML = info || 'Nenhuma imagem carregada';
}

// ===============================
// 8 FILTROS
// ===============================

// 1. FILTRO DE MEDIANA
function filterMedian(imageData) {
    const result = imageData.clone();
    const kernelSize = parseInt(kernelSizeSelect.value);
    const radius = Math.floor(kernelSize / 2);

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const values = [];
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    values.push(imageData.getPixel(x + dx, y + dy));
                }
            }
            values.sort((a, b) => a - b);
            const median = values[Math.floor(values.length / 2)];
            result.setPixel(x, y, median);
        }
    }
    return result;
}

// 2. FILTRO DE MÉDIA
function filterMean(imageData) {
    const result = imageData.clone();
    const kernelSize = parseInt(kernelSizeSelect.value);
    const radius = Math.floor(kernelSize / 2);

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            let sum = 0;
            let count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    sum += imageData.getPixel(x + dx, y + dy);
                    count++;
                }
            }
            result.setPixel(x, y, sum / count);
        }
    }
    return result;
}

// 3. FILTRO GAUSSIANO
function filterGaussian(imageData) {
    const result = imageData.clone();
    const kernelSize = parseInt(kernelSizeSelect.value);
    const sigma = kernelSize / 6;

    // Cria kernel gaussiano
    const kernel = [];
    const radius = Math.floor(kernelSize / 2);
    let sum = 0;

    for (let dy = -radius; dy <= radius; dy++) {
        const row = [];
        for (let dx = -radius; dx <= radius; dx++) {
            const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
            row.push(value);
            sum += value;
        }
        kernel.push(row);
    }

    // Normaliza kernel
    for (let i = 0; i < kernel.length; i++) {
        for (let j = 0; j < kernel[i].length; j++) {
            kernel[i][j] /= sum;
        }
    }

    // Aplica filtro
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            let value = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    value += imageData.getPixel(x + dx, y + dy) * kernel[dy + radius][dx + radius];
                }
            }
            result.setPixel(x, y, value);
        }
    }
    return result;
}

// 4. FILTRO SOBEL
function filterSobel(imageData) {
    const result = new ImageData2D(imageData.width, imageData.height);
    const Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const Gy = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < imageData.height - 1; y++) {
        for (let x = 1; x < imageData.width - 1; x++) {
            let px = 0, py = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const pixel = imageData.getPixel(x + dx, y + dy);
                    px += pixel * Gx[dy + 1][dx + 1];
                    py += pixel * Gy[dy + 1][dx + 1];
                }
            }
            const magnitude = Math.sqrt(px * px + py * py) / 8;
            result.setPixel(x, y, magnitude);
        }
    }
    return result;
}

// 5. FILTRO LAPLACIANO
function filterLaplacian(imageData) {
    const result = new ImageData2D(imageData.width, imageData.height);
    const kernel = [[0, -1, 0], [-1, 4, -1], [0, -1, 0]];

    for (let y = 1; y < imageData.height - 1; y++) {
        for (let x = 1; x < imageData.width - 1; x++) {
            let value = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    value += imageData.getPixel(x + dx, y + dy) * kernel[dy + 1][dx + 1];
                }
            }
            result.setPixel(x, y, Math.abs(value));
        }
    }
    return result;
}

// 6. FILTRO PASSA ALTA
function filterHighPass(imageData) {
    const result = new ImageData2D(imageData.width, imageData.height);
    const kernel = [[0, -1, 0], [-1, 5, -1], [0, -1, 0]];

    for (let y = 1; y < imageData.height - 1; y++) {
        for (let x = 1; x < imageData.width - 1; x++) {
            let value = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    value += imageData.getPixel(x + dx, y + dy) * kernel[dy + 1][dx + 1];
                }
            }
            result.setPixel(x, y, value);
        }
    }
    return result;
}

// 7. FILTRO DE REALCE
function filterEnhance(imageData) {
    const factor = parseFloat(enhanceFactorInput.value) || 1.5;
    const result = imageData.clone();

    // Calcular média
    const blurred = filterMean(imageData);

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const original = imageData.getPixel(x, y);
            const smooth = blurred.getPixel(x, y);
            const enhanced = original + factor * (original - smooth);
            result.setPixel(x, y, enhanced);
        }
    }
    return result;
}

// 8. FILTRO DE DETECÇÃO DE BORDAS
function filterEdgeDetection(imageData) {
    const result = new ImageData2D(imageData.width, imageData.height);
    
    for (let y = 1; y < imageData.height - 1; y++) {
        for (let x = 1; x < imageData.width - 1; x++) {
            const gx = -imageData.getPixel(x-1, y-1) - 2*imageData.getPixel(x-1, y) - imageData.getPixel(x-1, y+1) +
                       imageData.getPixel(x+1, y-1) + 2*imageData.getPixel(x+1, y) + imageData.getPixel(x+1, y+1);
            
            const gy = imageData.getPixel(x-1, y-1) + 2*imageData.getPixel(x, y-1) + imageData.getPixel(x+1, y-1) -
                       imageData.getPixel(x-1, y+1) - 2*imageData.getPixel(x, y+1) - imageData.getPixel(x+1, y+1);
            
            const magnitude = Math.sqrt(gx*gx + gy*gy) / 8;
            result.setPixel(x, y, magnitude > 50 ? 255 : 0);
        }
    }
    return result;
}

// ===============================
// OPERAÇÕES ARITMÉTICAS
// ===============================
function operationAdd(img1, img2) {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const result = new ImageData2D(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const sum = img1.getPixel(x, y) + img2.getPixel(x, y);
            result.setPixel(x, y, sum / 2);
        }
    }
    return result;
}

function operationSubtract(img1, img2) {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const result = new ImageData2D(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const diff = img1.getPixel(x, y) - img2.getPixel(x, y);
            result.setPixel(x, y, Math.abs(diff));
        }
    }
    return result;
}

function operationMultiply(img1, img2) {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const result = new ImageData2D(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const mul = (img1.getPixel(x, y) * img2.getPixel(x, y)) / 255;
            result.setPixel(x, y, mul);
        }
    }
    return result;
}

function operationDivide(img1, img2) {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const result = new ImageData2D(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p2 = img2.getPixel(x, y);
            const div = p2 !== 0 ? (img1.getPixel(x, y) / p2) * 255 : 0;
            result.setPixel(x, y, div);
        }
    }
    return result;
}

// ===============================
// OPERADORES LÓGICOS
// ===============================
function logicalOr(img1, img2) {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const result = new ImageData2D(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p1 = img1.getPixel(x, y) > 127 ? 255 : 0;
            const p2 = img2.getPixel(x, y) > 127 ? 255 : 0;
            result.setPixel(x, y, p1 | p2);
        }
    }
    return result;
}

function logicalAnd(img1, img2) {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const result = new ImageData2D(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p1 = img1.getPixel(x, y) > 127 ? 255 : 0;
            const p2 = img2.getPixel(x, y) > 127 ? 255 : 0;
            result.setPixel(x, y, p1 & p2);
        }
    }
    return result;
}

function logicalXor(img1, img2) {
    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const result = new ImageData2D(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p1 = img1.getPixel(x, y) > 127 ? 255 : 0;
            const p2 = img2.getPixel(x, y) > 127 ? 255 : 0;
            result.setPixel(x, y, p1 ^ p2);
        }
    }
    return result;
}

// ===============================
// EVENTOS DOS BOTÕES
// ===============================

// Filtros
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!image1Data) {
            alert('Carregue a Imagem 1');
            return;
        }

        const filter = btn.dataset.filter;
        let result;

        switch (filter) {
            case 'median': result = filterMedian(image1Data); break;
            case 'mean': result = filterMean(image1Data); break;
            case 'gaussian': result = filterGaussian(image1Data); break;
            case 'sobel': result = filterSobel(image1Data); break;
            case 'laplacian': result = filterLaplacian(image1Data); break;
            case 'highpass': result = filterHighPass(image1Data); break;
            case 'enhance': result = filterEnhance(image1Data); break;
            case 'edge': result = filterEdgeDetection(image1Data); break;
        }

        resultImageData = result;
        renderImage(resultImageData, resultCanvas, resultCtx, resultInfoDiv, 'Resultado');
        updateImageInfo();
    });
});

// Operações
operationButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!image1Data || !image2Data) {
            alert('Carregue as duas imagens');
            return;
        }

        const op = btn.dataset.op;
        let result;

        switch (op) {
            case 'add': result = operationAdd(image1Data, image2Data); break;
            case 'subtract': result = operationSubtract(image1Data, image2Data); break;
            case 'multiply': result = operationMultiply(image1Data, image2Data); break;
            case 'divide': result = operationDivide(image1Data, image2Data); break;
        }

        resultImageData = result;
        renderImage(resultImageData, resultCanvas, resultCtx, resultInfoDiv, 'Resultado');
        updateImageInfo();
    });
});

// Operadores Lógicos
logicalButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!image1Data || !image2Data) {
            alert('Carregue as duas imagens');
            return;
        }

        const logic = btn.dataset.logic;
        let result;

        switch (logic) {
            case 'or': result = logicalOr(image1Data, image2Data); break;
            case 'and': result = logicalAnd(image1Data, image2Data); break;
            case 'xor': result = logicalXor(image1Data, image2Data); break;
        }

        resultImageData = result;
        renderImage(resultImageData, resultCanvas, resultCtx, resultInfoDiv, 'Resultado');
        updateImageInfo();
    });
});

// Parâmetros
enhanceFactorInput.addEventListener('input', () => {
    enhanceValueSpan.textContent = enhanceFactorInput.value;
});

// Botões gerais
clearBtn.addEventListener('click', () => {
    image1Data = null;
    image2Data = null;
    resultImageData = null;
    document.querySelectorAll('canvas').forEach(c => {
        c.width = 0;
        c.height = 0;
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
    });
    imageInfoDiv.innerHTML = 'Nenhuma imagem carregada';
    info1Div.textContent = '';
    info2Div.textContent = '';
    resultInfoDiv.textContent = '';
    fileInput1.value = '';
    fileInput2.value = '';
});

resetBtn.addEventListener('click', () => {
    resultImageData = null;
    renderImage(resultImageData, resultCanvas, resultCtx, resultInfoDiv, 'Resultado');
    updateImageInfo();
});

saveBtn.addEventListener('click', () => {
    if (!resultImageData) {
        alert('Nenhum resultado para salvar');
        return;
    }
    alert('Funcionalidade de salvamento disponível na versão desktop');
});