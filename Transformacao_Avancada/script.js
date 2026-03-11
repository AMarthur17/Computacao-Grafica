// ===============================
// Canvas e Contexto
// ===============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ===============================
// Definição de formas na origem
// ===============================
const shapes = {
    triangle: [{ x: 0, y: 58 }, { x: -50, y: -29 }, { x: 50, y: -29 }],
    square: [{ x: -50, y: -50 }, { x: 50, y: -50 }, { x: 50, y: 50 }, { x: -50, y: 50 }],
    pentagon: [{ x: 0, y: 80 }, { x: 76, y: 25 }, { x: 47, y: -65 }, { x: -47, y: -65 }, { x: -76, y: 25 }],
    house: [{ x: -50, y: -50 }, { x: 50, y: -50 }, { x: 50, y: 50 }, { x: 0, y: 100 }, { x: -50, y: 50 }]
};

let originalVertices = [...shapes.square];
let currentVertices = [...originalVertices];
let transformationSequence = [];
let clippingStats = { accepted: 0, rejected: 0, clipped: 0 };

// ===============================
// Funções de Matriz 3x3
// ===============================
function createIdentityMatrix() {
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
}

function createTranslationMatrix(tx, ty) {
    return [[1, 0, tx], [0, 1, ty], [0, 0, 1]];
}

function createRotationMatrix(angleInDegrees) {
    const rad = angleInDegrees * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [[cos, -sin, 0], [sin, cos, 0], [0, 0, 1]];
}

function createScalingMatrix(sx, sy) {
    return [[sx, 0, 0], [0, sy, 0], [0, 0, 1]];
}

function createShearMatrix(shx, shy) {
    return [[1, shx, 0], [shy, 1, 0], [0, 0, 1]];
}

function createReflectionMatrix(reflectX, reflectY) {
    return [
        [reflectY ? -1 : 1, 0, 0],
        [0, reflectX ? -1 : 1, 0],
        [0, 0, 1]
    ];
}

function multiplyMatrices(A, B) {
    const result = [[0, 0, 0], [0, 0, 0], [0, 0, 1]];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            result[i][j] = 0;
            for (let k = 0; k < 3; k++) {
                result[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return result;
}

function applyMatrixToVertex(matrix, vertex) {
    const x = vertex.x;
    const y = vertex.y;
    return {
        x: matrix[0][0] * x + matrix[0][1] * y + matrix[0][2],
        y: matrix[1][0] * x + matrix[1][1] * y + matrix[1][2]
    };
}

// ===============================
// Viewport Mapping
// ===============================
function worldToViewport(wx, wy, worldBounds, viewportBounds) {
    const { xmin: wxMin, xmax: wxMax, ymin: wyMin, ymax: wyMax } = worldBounds;
    const { xmin: vxMin, xmax: vxMax, ymin: vyMin, ymax: vyMax } = viewportBounds;

    const vx = ((wx - wxMin) / (wxMax - wxMin)) * (vxMax - vxMin) + vxMin;
    const vy = ((wy - wyMin) / (wyMax - wyMin)) * (vyMax - vyMin) + vyMin;

    return { x: vx, y: vy };
}

// ===============================
// Cohen-Sutherland Clipping
// ===============================
const INSIDE = 0; // 0000
const LEFT = 1;   // 0001
const RIGHT = 2;  // 0010
const BOTTOM = 4; // 0100
const TOP = 8;    // 1000

function computeRegionCode(x, y, xmin, xmax, ymin, ymax) {
    let code = INSIDE;
    if (x < xmin) code |= LEFT;
    else if (x > xmax) code |= RIGHT;
    if (y < ymin) code |= BOTTOM;
    else if (y > ymax) code |= TOP;
    return code;
}

function cohenSutherlandClip(x1, y1, x2, y2, xmin, xmax, ymin, ymax) {
    let code1 = computeRegionCode(x1, y1, xmin, xmax, ymin, ymax);
    let code2 = computeRegionCode(x2, y2, xmin, xmax, ymin, ymax);
    let accept = false;

    while (true) {
        if ((code1 | code2) === 0) {
            // Ambos dentro
            accept = true;
            break;
        } else if ((code1 & code2) !== 0) {
            // Ambos fora na mesma região
            break;
        } else {
            // Linha parcialmente dentro
            let codeOut = code1 !== 0 ? code1 : code2;
            let x, y;

            if (codeOut & TOP) {
                x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
                y = ymax;
            } else if (codeOut & BOTTOM) {
                x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
                y = ymin;
            } else if (codeOut & RIGHT) {
                y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
                x = xmax;
            } else if (codeOut & LEFT) {
                y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
                x = xmin;
            }

            if (codeOut === code1) {
                x1 = x;
                y1 = y;
                code1 = computeRegionCode(x1, y1, xmin, xmax, ymin, ymax);
            } else {
                x2 = x;
                y2 = y;
                code2 = computeRegionCode(x2, y2, xmin, xmax, ymin, ymax);
            }
        }
    }

    if (accept) {
        return { accept: true, x1, y1, x2, y2 };
    }
    return { accept: false };
}

// ===============================
// Desenho
// ===============================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    const viewportEnabled = document.getElementById("enable-viewport").checked;
    const clippingEnabled = document.getElementById("enable-clipping").checked;

    clippingStats = { accepted: 0, rejected: 0, clipped: 0 };

    if (viewportEnabled) {
        // Desenha janela do mundo
        const wxMin = parseFloat(document.getElementById("world-xmin").value);
        const wxMax = parseFloat(document.getElementById("world-xmax").value);
        const wyMin = parseFloat(document.getElementById("world-ymin").value);
        const wyMax = parseFloat(document.getElementById("world-ymax").value);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.strokeStyle = "#FF9800";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(wxMin, -wyMax, wxMax - wxMin, wyMax - wyMin);
        ctx.setLineDash([]);
        ctx.restore();

        // Desenha viewport
        const vxMin = parseFloat(document.getElementById("vp-xmin").value);
        const vxMax = parseFloat(document.getElementById("vp-xmax").value);
        const vyMin = parseFloat(document.getElementById("vp-ymin").value);
        const vyMax = parseFloat(document.getElementById("vp-ymax").value);

        ctx.save();
        ctx.strokeStyle = "#4CAF50";
        ctx.lineWidth = 2;
        ctx.strokeRect(vxMin, vyMin, vxMax - vxMin, vyMax - vyMin);
        ctx.restore();

        // Mapeia vértices para viewport
        const worldBounds = { xmin: wxMin, xmax: wxMax, ymin: wyMin, ymax: wyMax };
        const viewportBounds = { xmin: vxMin, xmax: vxMax, ymin: vyMin, ymax: vyMax };

        const mappedVertices = currentVertices.map(v =>
            worldToViewport(v.x, v.y, worldBounds, viewportBounds)
        );

        // Desenha forma mapeada
        drawShape(mappedVertices, clippingEnabled, viewportBounds, false);
    } else {
        // Desenha forma normal (coordenadas do mundo)
        drawShape(currentVertices, false, null, true);
    }

    updateDisplay();
}

function drawShape(vertices, applyClipping, clipBounds, useWorldCoords) {
    ctx.save();

    if (useWorldCoords) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
    }

    for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];

        let x1 = v1.x;
        let y1 = useWorldCoords ? -v1.y : v1.y;
        let x2 = v2.x;
        let y2 = useWorldCoords ? -v2.y : v2.y;

        if (applyClipping && clipBounds) {
            const result = cohenSutherlandClip(
                x1, y1, x2, y2,
                clipBounds.xmin, clipBounds.xmax, clipBounds.ymin, clipBounds.ymax
            );

            if (result.accept) {
                ctx.strokeStyle = "#2196F3";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(result.x1, result.y1);
                ctx.lineTo(result.x2, result.y2);
                ctx.stroke();

                // Verifica se foi recortado
                if (Math.abs(x1 - result.x1) > 0.1 || Math.abs(y1 - result.y1) > 0.1 ||
                    Math.abs(x2 - result.x2) > 0.1 || Math.abs(y2 - result.y2) > 0.1) {
                    clippingStats.clipped++;
                } else {
                    clippingStats.accepted++;
                }
            } else {
                clippingStats.rejected++;
            }
        } else {
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    ctx.restore();
}

function drawGrid() {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.3;

    for (let x = -canvas.width / 2; x <= canvas.width / 2; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, -canvas.height / 2);
        ctx.lineTo(x, canvas.height / 2);
        ctx.stroke();
    }

    for (let y = -canvas.height / 2; y <= canvas.height / 2; y += 50) {
        ctx.beginPath();
        ctx.moveTo(-canvas.width / 2, y);
        ctx.lineTo(canvas.width / 2, y);
        ctx.stroke();
    }

    // Eixos principais
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -canvas.height / 2);
    ctx.lineTo(0, canvas.height / 2);
    ctx.stroke();

    ctx.restore();
}

// ===============================
// Atualização de Displays
// ===============================
function updateDisplay() {
    updateMatrixDisplay();
    updateVerticesDisplay();
    updateClippingDisplay();
}

function updateMatrixDisplay() {
    const matrixInfo = document.getElementById("matrix-info");
    // Mostra a última matriz aplicada ou identidade
    matrixInfo.innerHTML = `
        <p>Matriz Combinada (3×3)</p>
        <code>Ver sequência aplicada →</code>
    `;
}

function updateVerticesDisplay() {
    const verticesInfo = document.getElementById("vertices-info");
    let html = "<strong>Vértices Transformados:</strong><br>";
    currentVertices.forEach((v, i) => {
        html += `V${i + 1}: (${v.x.toFixed(2)}, ${v.y.toFixed(2)})<br>`;
    });
    verticesInfo.innerHTML = html;
}

function updateClippingDisplay() {
    const clipStats = document.getElementById("clip-stats");
    const clippingEnabled = document.getElementById("enable-clipping").checked;

    if (!clippingEnabled) {
        clipStats.innerHTML = "<em>Recorte desabilitado</em>";
    } else {
        clipStats.innerHTML = `
            <div class="clip-stat-line clip-accepted">✓ Aceitas: ${clippingStats.accepted}</div>
            <div class="clip-stat-line clip-clipped">✂ Recortadas: ${clippingStats.clipped}</div>
            <div class="clip-stat-line clip-rejected">✗ Rejeitadas: ${clippingStats.rejected}</div>
        `;
    }
}

function updateSequenceDisplay() {
    const sequenceList = document.getElementById("sequence-list");
    if (transformationSequence.length === 0) {
        sequenceList.innerHTML = "<em>Nenhuma transformação na sequência</em>";
    } else {
        let html = "";
        transformationSequence.forEach((t, i) => {
            html += `<div class="sequence-item">${i + 1}. ${t.description}</div>`;
        });
        sequenceList.innerHTML = html;
    }
}

// ===============================
// Aplicar Transformações
// ===============================
function applySingleTransformation() {
    const tx = parseFloat(document.getElementById("tx").value) || 0;
    const ty = parseFloat(document.getElementById("ty").value) || 0;
    const rotation = parseFloat(document.getElementById("rotation").value) || 0;
    const sx = parseFloat(document.getElementById("sx").value) || 1;
    const sy = parseFloat(document.getElementById("sy").value) || 1;
    const shx = parseFloat(document.getElementById("shx").value) || 0;
    const shy = parseFloat(document.getElementById("shy").value) || 0;
    const reflectX = document.getElementById("reflect-x").checked;
    const reflectY = document.getElementById("reflect-y").checked;

    // Combina todas as transformações
    let M = createIdentityMatrix();

    if (tx !== 0 || ty !== 0) {
        M = multiplyMatrices(M, createTranslationMatrix(tx, ty));
    }
    if (rotation !== 0) {
        M = multiplyMatrices(M, createRotationMatrix(rotation));
    }
    if (sx !== 1 || sy !== 1) {
        M = multiplyMatrices(M, createScalingMatrix(sx, sy));
    }
    if (shx !== 0 || shy !== 0) {
        M = multiplyMatrices(M, createShearMatrix(shx, shy));
    }
    if (reflectX || reflectY) {
        M = multiplyMatrices(M, createReflectionMatrix(reflectX, reflectY));
    }

    currentVertices = currentVertices.map(v => applyMatrixToVertex(M, v));
    draw();
}

function addToSequence() {
    const transformType = document.getElementById("transform-type").value;

    let matrix, description;

    switch (transformType) {
        case "translation":
            const tx = parseFloat(document.getElementById("tx").value) || 0;
            const ty = parseFloat(document.getElementById("ty").value) || 0;
            matrix = createTranslationMatrix(tx, ty);
            description = `Translação(${tx}, ${ty})`;
            break;
        case "rotation":
            const angle = parseFloat(document.getElementById("rotation").value) || 0;
            matrix = createRotationMatrix(angle);
            description = `Rotação(${angle}°)`;
            break;
        case "scale":
            const sx = parseFloat(document.getElementById("sx").value) || 1;
            const sy = parseFloat(document.getElementById("sy").value) || 1;
            matrix = createScalingMatrix(sx, sy);
            description = `Escala(${sx}, ${sy})`;
            break;
        case "shear":
            const shx = parseFloat(document.getElementById("shx").value) || 0;
            const shy = parseFloat(document.getElementById("shy").value) || 0;
            matrix = createShearMatrix(shx, shy);
            description = `Cisalhamento(${shx}, ${shy})`;
            break;
        case "reflection":
            const reflectX = document.getElementById("reflect-x").checked;
            const reflectY = document.getElementById("reflect-y").checked;
            matrix = createReflectionMatrix(reflectX, reflectY);
            description = `Reflexão(X:${reflectX}, Y:${reflectY})`;
            break;
    }

    transformationSequence.push({ matrix, description });
    updateSequenceDisplay();
}

function applySequence() {
    if (transformationSequence.length === 0) {
        alert("A sequência está vazia!");
        return;
    }

    // Multiplica todas as matrizes da sequência
    let M = createIdentityMatrix();
    transformationSequence.forEach(t => {
        M = multiplyMatrices(M, t.matrix);
    });

    currentVertices = currentVertices.map(v => applyMatrixToVertex(M, v));
    draw();
}

function clearSequence() {
    transformationSequence = [];
    updateSequenceDisplay();
}

function resetShape() {
    const shapeType = document.getElementById("shape-select").value;
    originalVertices = [...shapes[shapeType]];
    currentVertices = [...originalVertices];
    draw();
}

// ===============================
// Event Listeners
// ===============================
document.getElementById("shape-select").addEventListener("change", resetShape);
document.getElementById("reset-btn").addEventListener("click", resetShape);
document.getElementById("apply-single-btn").addEventListener("click", applySingleTransformation);
document.getElementById("add-to-sequence-btn").addEventListener("click", addToSequence);
document.getElementById("apply-sequence-btn").addEventListener("click", applySequence);
document.getElementById("clear-sequence-btn").addEventListener("click", clearSequence);

document.getElementById("enable-viewport").addEventListener("change", draw);
document.getElementById("enable-clipping").addEventListener("change", draw);

// ===============================
// Inicialização
// ===============================
draw();
updateSequenceDisplay();
