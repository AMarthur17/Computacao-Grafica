// --- Formas na origem ---
const shapes = {
    triangle: [{ x: 0, y: 58 }, { x: -50, y: -29 }, { x: 50, y: -29 }],
    square: [{ x: -50, y: -50 }, { x: 50, y: -50 }, { x: 50, y: 50 }, { x: -50, y: 50 }],
    pentagon: [{ x: 0, y: 80 }, { x: 76, y: 25 }, { x: 47, y: -65 }, { x: -47, y: -65 }, { x: -76, y: 25 }],
    house: [{ x: -50, y: -50 }, { x: 50, y: -50 }, { x: 50, y: 50 }, { x: 0, y: 100 }, { x: -50, y: 50 }]
};

let originalShapeVertices = [...shapes.square];
let currentShapeVertices = [...originalShapeVertices];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const originalDiv = document.getElementById("original-vertices");
const matrixDiv = document.getElementById("matrix-info");
const transformedDiv = document.getElementById("transformed-vertices");

// --- Div para quadrante ---
const quadrantInfo = document.createElement("div");
quadrantInfo.style.marginTop = "10px";
quadrantInfo.style.fontWeight = "bold";
quadrantInfo.style.color = "#4CAF50";
document.getElementById("left-bar").appendChild(quadrantInfo);

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
    const result = [[0,0,0],[0,0,0],[0,0,0]];
    for(let i=0;i<3;i++){
        for(let j=0;j<3;j++){
            for(let k=0;k<3;k++){
                result[i][j] += A[i][k]*B[k][j];
            }
        }
    }
    return result;
}
function multiplyMatrixVector(matrix, vector) {
    const [x, y] = [vector.x, vector.y];
    const res = [0,0,0];
    for(let i=0;i<3;i++){
        res[i] = matrix[i][0]*x + matrix[i][1]*y + matrix[i][2]*1;
    }
    return {x: res[0], y: res[1]};
}

// --- Aplicação TRSH ---
function applyTRS(tx=0, ty=0, angle=0, sx=1, sy=1, shx=0, shy=0){
    const startX = parseFloat(document.getElementById("startX").value);
    const startY = parseFloat(document.getElementById("startY").value);

    const Tstart = createTranslationMatrix(startX, startY);
    const T = createTranslationMatrix(tx, ty);
    const R = createRotationMatrix(angle);
    const S = createScalingMatrix(sx, sy);
    const H = createShearMatrix(shx, shy);

    // Ordem: posição inicial * T * R * S * H
    const M = multiplyMatrices(Tstart, multiplyMatrices(T, multiplyMatrices(R, multiplyMatrices(S, H))));

    currentShapeVertices = originalShapeVertices.map(v => multiplyMatrixVector(M, v));
    draw();
    showInfo(M);
}

// --- Desenho ---
function draw() {
    // Fundo branco
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);

    // Desenhar eixos X e Y
    ctx.strokeStyle = "#ff0000"; // vermelho para destaque
    ctx.lineWidth = 1.5;
    // Eixo X
    ctx.beginPath();
    ctx.moveTo(-canvas.width/2, 0);
    ctx.lineTo(canvas.width/2, 0);
    ctx.stroke();
    // Eixo Y
    ctx.beginPath();
    ctx.moveTo(0, -canvas.height/2);
    ctx.lineTo(0, canvas.height/2);
    ctx.stroke();

    // Desenhar forma
    ctx.beginPath();
    ctx.moveTo(currentShapeVertices[0].x, -currentShapeVertices[0].y);
    for (let i=1;i<currentShapeVertices.length;i++) {
        ctx.lineTo(currentShapeVertices[i].x, -currentShapeVertices[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = "#000"; // cor da forma
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
    detectQuadrant();
}

// --- Quadrante ---
function detectQuadrant() {
    const cx = currentShapeVertices.reduce((acc,v) => acc+v.x, 0) / currentShapeVertices.length;
    const cy = currentShapeVertices.reduce((acc,v) => acc+v.y, 0) / currentShapeVertices.length;

    let text = "⚪ Sobre os eixos";
    if (cx > 0 && cy > 0) text = "🟩 Quadrante I (x>0, y>0)";
    else if (cx < 0 && cy > 0) text = "🟦 Quadrante II (x<0, y>0)";
    else if (cx < 0 && cy < 0) text = "🟨 Quadrante III (x<0, y<0)";
    else if (cx > 0 && cy < 0) text = "🟥 Quadrante IV (x>0, y<0)";
    quadrantInfo.textContent = "Posição da forma: " + text;
}

// --- Info ---
function formatVertices(vertices) {
    return vertices.map((v, i) => {
        return `x${i} = ${v.x.toFixed(2)} | y${i} = ${v.y.toFixed(2)}`;
    }).join("\n");
}

function showInfo(matrix) {
    originalDiv.textContent = formatVertices(originalShapeVertices);
    matrixDiv.textContent = matrix.map(row => row.map(v => v.toFixed(2)).join("  ")).join("\n");
    transformedDiv.textContent = formatVertices(currentShapeVertices);
    detectQuadrant();
}

// --- Eventos ---
document.getElementById("btnApplyTransform").addEventListener("click", () => {
    const tx = parseFloat(document.getElementById("translateX").value);
    const ty = parseFloat(document.getElementById("translateY").value);
    const angle = parseFloat(document.getElementById("rotationAngle").value);
    const sx = parseFloat(document.getElementById("scaleX").value);
    const sy = parseFloat(document.getElementById("scaleY").value);
    const shx = parseFloat(document.getElementById("shearX").value);
    const shy = parseFloat(document.getElementById("shearY").value);

    applyTRS(tx, ty, angle, sx, sy, shx, shy);
});

document.getElementById("btnResetShape").addEventListener("click", () => {
    currentShapeVertices = [...originalShapeVertices];
    draw();
    showInfo([[1,0,0],[0,1,0],[0,0,1]]);
});

document.getElementById("shapeSelector").addEventListener("change", (e) => {
    originalShapeVertices = [...shapes[e.target.value]];
    currentShapeVertices = [...originalShapeVertices];
    draw();
    showInfo([[1,0,0],[0,1,0],[0,0,1]]);
});

// --- Inicialização ---
draw();
showInfo([[1,0,0],[0,1,0],[0,0,1]]);
