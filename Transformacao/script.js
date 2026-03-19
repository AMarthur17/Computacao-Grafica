// --- Formas com canto inferior esquerdo na origem ---
const shapes = {
    triangle: [{ x: 50, y: 87 }, { x: 0, y: 0 }, { x: 100, y: 0 }],
    square: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    pentagon: [{ x: 76, y: 145 }, { x: 152, y: 90 }, { x: 123, y: 0 }, { x: 29, y: 0 }, { x: 0, y: 90 }],
    house: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 150 }, { x: 0, y: 100 }]
};

let originalShapeVertices = [...shapes.square];
let currentShapeVertices = [...originalShapeVertices];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const originalDiv = document.getElementById("original-vertices");
const matrixDiv = document.getElementById("matrix-info");
const transformedDiv = document.getElementById("transformed-vertices");

// --- Adiciona uma div para mostrar o octante ---
const octantInfo = document.createElement("div");
octantInfo.style.marginTop = "10px";
octantInfo.style.fontWeight = "bold";
octantInfo.style.color = "#4CAF50";
document.getElementById("left-bar").appendChild(octantInfo);

// --- Matrizes ---
function createTranslationMatrix(tx, ty) {
    return [[1, 0, tx], [0, 1, ty], [0, 0, 1]];
}
function createRotationMatrix(angleInDegrees) {
    const rad = angleInDegrees * Math.PI / 180;
    return [[Math.cos(rad), -Math.sin(rad), 0], [Math.sin(rad), Math.cos(rad), 0], [0, 0, 1]];
}
function createScalingMatrix(sx, sy) {
    return [[sx, 0, 0], [0, sy, 0], [0, 0, 1]];
}
function createShearMatrix(shx, shy) {
    return [[1, shx, 0], [shy, 1, 0], [0, 0, 1]];
}
function multiplyMatrices(A, B) {
    const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                result[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return result;
}
function multiplyMatrixVector(matrix, vector) {
    const [x, y] = [vector.x, vector.y];
    const res = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
        res[i] = matrix[i][0] * x + matrix[i][1] * y + matrix[i][2] * 1;
    }
    return { x: res[0], y: res[1] };
}

// --- Aplicação TRS ---
function applyTRS(tx = 0, ty = 0, angle = 0, sx = 1, sy = 1, shx = 0, shy = 0) {
    const T = createTranslationMatrix(tx, ty);
    const R = createRotationMatrix(angle);
    const S = createScalingMatrix(sx, sy);
    const Sh = createShearMatrix(shx, shy);
    const M = multiplyMatrices(T, multiplyMatrices(R, multiplyMatrices(Sh, S)));

    currentShapeVertices = currentShapeVertices.map(v => multiplyMatrixVector(M, v));
    draw();
    showInfo(M);
}

// --- Desenho ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    ctx.beginPath();
    ctx.moveTo(currentShapeVertices[0].x, -currentShapeVertices[0].y);
    for (let i = 1; i < currentShapeVertices.length; i++) {
        ctx.lineTo(currentShapeVertices[i].x, -currentShapeVertices[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    detectOctant();
}

// --- Desenhar Grid e Eixos ---
function drawGrid() {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.5;

    // Linhas de grade a cada 50px
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

    // Eixos X e Y em destaque
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 1.5;
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

// --- Detectar Octante ---
function detectOctant() {
    const cx = currentShapeVertices.reduce((acc, v) => acc + v.x, 0) / currentShapeVertices.length;
    const cy = currentShapeVertices.reduce((acc, v) => acc + v.y, 0) / currentShapeVertices.length;
    const absX = Math.abs(cx);
    const absY = Math.abs(cy);

    let text = "Sobre os eixos";
    if (cx > 0 && cy > 0) text = absX >= absY ? "1o octante (0° a 45°)" : "2o octante (45° a 90°)";
    else if (cx < 0 && cy > 0) text = absX < absY ? "3o octante (90° a 135°)" : "4o octante (135° a 180°)";
    else if (cx < 0 && cy < 0) text = absX >= absY ? "5o octante (180° a 225°)" : "6o octante (225° a 270°)";
    else if (cx > 0 && cy < 0) text = absX < absY ? "7o octante (270° a 315°)" : "8o octante (315° a 360°)";
    octantInfo.textContent = "Posicao da forma: " + text;
}

// --- Mostrar Info ---
function formatVertices(vertices) {
    return vertices.map((v, i) => {
        return `x${i} = ${v.x.toFixed(2)} | y${i} = ${v.y.toFixed(2)}`;
    }).join("\n");
}

function showInfo(matrix) {
    originalDiv.textContent = formatVertices(originalShapeVertices);
    matrixDiv.textContent = matrix.map(row => row.map(v => v.toFixed(2)).join("  ")).join("\n");
    transformedDiv.textContent = formatVertices(currentShapeVertices);
    detectOctant();
}


// --- Eventos ---
document.getElementById("btnApplyTransform").addEventListener("click", () => {
    const tx = parseFloat(document.getElementById("translateX").value) || 0;
    const ty = parseFloat(document.getElementById("translateY").value) || 0;
    const angle = parseFloat(document.getElementById("rotationAngle").value) || 0;
    const sx = parseFloat(document.getElementById("scaleX").value) || 1;
    const sy = parseFloat(document.getElementById("scaleY").value) || 1;
    const shx = parseFloat(document.getElementById("shearX").value) || 0;
    const shy = parseFloat(document.getElementById("shearY").value) || 0;
    applyTRS(tx, ty, angle, sx, sy, shx, shy);
});

document.getElementById("btnResetShape").addEventListener("click", () => {
    currentShapeVertices = [...originalShapeVertices];
    draw();
    showInfo([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
});

document.getElementById("shapeSelector").addEventListener("change", (e) => {
    originalShapeVertices = [...shapes[e.target.value]];
    currentShapeVertices = [...originalShapeVertices];
    draw();
    showInfo([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
});

// --- Inicialização ---
draw();
showInfo([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
