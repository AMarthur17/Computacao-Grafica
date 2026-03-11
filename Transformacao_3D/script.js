// ===============================
// Canvas e Contexto
// ===============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ===============================
// Definições de Objetos 3D
// ===============================
const objects = {
    cube: {
        vertices: [
            [0, 0, 0], [100, 0, 0], [100, 100, 0], [0, 100, 0],
            [0, 0, 100], [100, 0, 100], [100, 100, 100], [0, 100, 100]
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 0],  // Face inferior
            [4, 5], [5, 6], [6, 7], [7, 4],  // Face superior
            [0, 4], [1, 5], [2, 6], [3, 7]   // Arestas laterais
        ]
    },
    pyramid: {
        vertices: [
            [0, 0, 0], [100, 0, 0], [100, 0, 100], [0, 0, 100],  // Base
            [50, 100, 50]  // Ápice
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 0],  // Base
            [0, 4], [1, 4], [2, 4], [3, 4]   // Laterais
        ]
    },
    prism: {
        vertices: [
            [0, 0, 0], [100, 0, 0], [50, 0, 80],     // Base inferior
            [0, 100, 0], [100, 100, 0], [50, 100, 80]  // Base superior
        ],
        edges: [
            [0, 1], [1, 2], [2, 0],  // Base inferior
            [3, 4], [4, 5], [5, 3],  // Base superior
            [0, 3], [1, 4], [2, 5]   // Arestas laterais
        ]
    }
};

let originalVertices = [];
let currentVertices = [];
let edges = [];
let currentObject = null;

// Parâmetros de visualização
let cameraRotationX = 20;
let cameraRotationY = 25;
let cameraRotationZ = 0;
let zoom = 100;

// ===============================
// Funções de Matriz 4x4
// ===============================
class Matrix4x4 {
    static identity() {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }

    static translation(tx, ty, tz) {
        return [
            [1, 0, 0, tx],
            [0, 1, 0, ty],
            [0, 0, 1, tz],
            [0, 0, 0, 1]
        ];
    }

    static scaling(sx, sy, sz) {
        return [
            [sx, 0, 0, 0],
            [0, sy, 0, 0],
            [0, 0, sz, 0],
            [0, 0, 0, 1]
        ];
    }

    static rotationX(angle) {
        const rad = angle * Math.PI / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [
            [1, 0, 0, 0],
            [0, c, -s, 0],
            [0, s, c, 0],
            [0, 0, 0, 1]
        ];
    }

    static rotationY(angle) {
        const rad = angle * Math.PI / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [
            [c, 0, s, 0],
            [0, 1, 0, 0],
            [-s, 0, c, 0],
            [0, 0, 0, 1]
        ];
    }

    static rotationZ(angle) {
        const rad = angle * Math.PI / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [
            [c, -s, 0, 0],
            [s, c, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }

    static shear(shXY, shXZ, shYZ) {
        return [
            [1, shXY, shXZ, 0],
            [0, 1, shYZ, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }

    static reflectionXY() {
        return [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, -1, 0],
            [0, 0, 0, 1]
        ];
    }

    static reflectionXZ() {
        return [
            [1, 0, 0, 0],
            [0, -1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }

    static reflectionYZ() {
        return [
            [-1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];
    }

    static multiply(a, b) {
        const result = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ];

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    result[i][j] += a[i][k] * b[k][j];
                }
            }
        }
        return result;
    }

    static multiplyVector(matrix, vector) {
        const result = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i] += matrix[i][j] * vector[j];
            }
        }
        return result;
    }
}

// ===============================
// Projeção Isométrica
// ===============================
function projectIsometric(x, y, z, applyCamera = true) {
    let point = [x, y, z, 1];

    if (applyCamera) {
        // Aplica rotação da câmera
        const camRotX = Matrix4x4.rotationX(cameraRotationX);
        const camRotY = Matrix4x4.rotationY(cameraRotationY);
        const camRotZ = Matrix4x4.rotationZ(cameraRotationZ);

        let cameraTransform = Matrix4x4.multiply(camRotY, camRotX);
        cameraTransform = Matrix4x4.multiply(camRotZ, cameraTransform);
        point = Matrix4x4.multiplyVector(cameraTransform, point);
    }

    // Fórmula de Projeção Isométrica Paralela
    // Os eixos X, Y, Z são projetados com ângulos de 120° entre si
    const f = zoom / 100;
    const px = (point[0] - point[2]) * f * 0.7071 + canvas.width / 2;
    const py = (-point[1] + (point[0] + point[2]) * 0.5) * f * 0.7071 + canvas.height / 2;

    return { x: px, y: py };
}

// ===============================
// Desenho DDA
// ===============================
function drawLineDDA(x1, y1, x2, y2, color = "#000") {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) return;

    const xInc = dx / steps;
    const yInc = dy / steps;

    let x = x1;
    let y = y1;

    ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        x += xInc;
        y += yInc;
    }
}

// ===============================
// Funções de Desenho
// ===============================
function drawAxes() {
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const length = 150 * (zoom / 100);

    // Eixo X (vermelho)
    const xEnd = projectIsometric(length, 0, 0, false);
    drawLineDDA(center.x, center.y, xEnd.x, xEnd.y, "red");
    ctx.fillStyle = "red";
    ctx.font = "12px Arial";
    ctx.fillText("X", xEnd.x + 10, xEnd.y);

    // Eixo Y (verde)
    const yEnd = projectIsometric(0, length, 0, false);
    drawLineDDA(center.x, center.y, yEnd.x, yEnd.y, "green");
    ctx.fillStyle = "green";
    ctx.fillText("Y", yEnd.x, yEnd.y - 10);

    // Eixo Z (azul)
    const zEnd = projectIsometric(0, 0, length, false);
    drawLineDDA(center.x, center.y, zEnd.x, zEnd.y, "blue");
    ctx.fillStyle = "blue";
    ctx.fillText("Z", zEnd.x - 20, zEnd.y);
}

function drawGrid() {
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 0.3;

    const gridSize = 50;
    for (let i = 0; i < canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }

    for (let i = 0; i < canvas.height; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}

function draw() {
    // Limpa canvas
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawAxes();

    if (currentObject === null) return;

    // Desenha arestas
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;

    edges.forEach(edge => {
        const v1 = currentVertices[edge[0]];
        const v2 = currentVertices[edge[1]];
        const p1 = projectIsometric(v1[0], v1[1], v1[2]);
        const p2 = projectIsometric(v2[0], v2[1], v2[2]);
        drawLineDDA(p1.x, p1.y, p2.x, p2.y, "#111");
    });

    // Desenha vértices
    ctx.fillStyle = "#F44336";
    currentVertices.forEach(vertex => {
        const p = projectIsometric(vertex[0], vertex[1], vertex[2]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });

    updateDisplay();
}

// ===============================
// Atualização de Displays
// ===============================
function updateDisplay() {
    updateVerticesDisplay();
    updateStatsDisplay();
}

function updateVerticesDisplay() {
    const verticesInfo = document.getElementById("vertices-info");

    if (currentObject === null) {
        verticesInfo.innerHTML = "<em>Nenhum objeto gerado</em>";
        return;
    }

    let html = "";
    currentVertices.forEach((v, i) => {
        html += `<div class="vertex-row">V${i + 1}: (${v[0].toFixed(1)}, ${v[1].toFixed(1)}, ${v[2].toFixed(1)})</div>`;
    });
    verticesInfo.innerHTML = html;
}

function updateStatsDisplay() {
    if (currentObject === null) {
        document.getElementById("center-coords").textContent = "-";
        document.getElementById("dimensions").textContent = "-";
        document.getElementById("vertex-count").textContent = "-";
        document.getElementById("edge-count").textContent = "-";
        return;
    }

    // Centro geométrico
    let cx = 0, cy = 0, cz = 0;
    currentVertices.forEach(v => {
        cx += v[0];
        cy += v[1];
        cz += v[2];
    });
    cx /= currentVertices.length;
    cy /= currentVertices.length;
    cz /= currentVertices.length;

    document.getElementById("center-coords").textContent = `(${cx.toFixed(1)}, ${cy.toFixed(1)}, ${cz.toFixed(1)})`;

    // Dimensões
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    currentVertices.forEach(v => {
        minX = Math.min(minX, v[0]);
        maxX = Math.max(maxX, v[0]);
        minY = Math.min(minY, v[1]);
        maxY = Math.max(maxY, v[1]);
        minZ = Math.min(minZ, v[2]);
        maxZ = Math.max(maxZ, v[2]);
    });

    document.getElementById("dimensions").textContent =
        `${(maxX - minX).toFixed(1)} × ${(maxY - minY).toFixed(1)} × ${(maxZ - minZ).toFixed(1)}`;

    document.getElementById("vertex-count").textContent = currentVertices.length;
    document.getElementById("edge-count").textContent = edges.length;
}

function updateMatrixDisplay(matrix) {
    const matrixInfo = document.getElementById("matrix-info");
    let html = "<code>";
    matrix.forEach(row => {
        html += `[${row.map(v => v.toFixed(2).padStart(6)).join(" ")}]<br>`;
    });
    html += "</code>";
    matrixInfo.innerHTML = html;
}

// ===============================
// Transformações
// ===============================
function applyTransformation() {
    if (currentObject === null) {
        alert("Gere um objeto primeiro!");
        return;
    }

    const tx = parseFloat(document.getElementById("tx").value) || 0;
    const ty = parseFloat(document.getElementById("ty").value) || 0;
    const tz = parseFloat(document.getElementById("tz").value) || 0;
    const rx = parseFloat(document.getElementById("rx").value) || 0;
    const ry = parseFloat(document.getElementById("ry").value) || 0;
    const rz = parseFloat(document.getElementById("rz").value) || 0;
    const sx = parseFloat(document.getElementById("sx").value) || 1;
    const sy = parseFloat(document.getElementById("sy").value) || 1;
    const sz = parseFloat(document.getElementById("sz").value) || 1;
    const shXY = parseFloat(document.getElementById("shxy").value) || 0;
    const shXZ = parseFloat(document.getElementById("shxz").value) || 0;
    const shYZ = parseFloat(document.getElementById("shyz").value) || 0;
    const reflectXY = document.getElementById("reflect-xy").checked;
    const reflectXZ = document.getElementById("reflect-xz").checked;
    const reflectYZ = document.getElementById("reflect-yz").checked;

    // Combina todas as transformações
    let M = Matrix4x4.identity();

    if (tx !== 0 || ty !== 0 || tz !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.translation(tx, ty, tz));
    }
    if (rx !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.rotationX(rx));
    }
    if (ry !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.rotationY(ry));
    }
    if (rz !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.rotationZ(rz));
    }
    if (sx !== 1 || sy !== 1 || sz !== 1) {
        M = Matrix4x4.multiply(M, Matrix4x4.scaling(sx, sy, sz));
    }
    if (shXY !== 0 || shXZ !== 0 || shYZ !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.shear(shXY, shXZ, shYZ));
    }
    if (reflectXY) {
        M = Matrix4x4.multiply(M, Matrix4x4.reflectionXY());
    }
    if (reflectXZ) {
        M = Matrix4x4.multiply(M, Matrix4x4.reflectionXZ());
    }
    if (reflectYZ) {
        M = Matrix4x4.multiply(M, Matrix4x4.reflectionYZ());
    }

    // Aplica transformação a todos os vértices
    currentVertices = currentVertices.map(v => {
        const transformed = Matrix4x4.multiplyVector(M, [...v, 1]);
        return [transformed[0], transformed[1], transformed[2]];
    });

    updateMatrixDisplay(M);
    draw();
}

function generateObject() {
    const objectType = document.getElementById("object-select").value;
    currentObject = objectType;

    const obj = objects[objectType];
    originalVertices = obj.vertices.map(v => [...v]);
    currentVertices = obj.vertices.map(v => [...v]);
    edges = obj.edges;

    draw();
}

function resetObject() {
    if (currentObject === null) {
        alert("Gere um objeto primeiro!");
        return;
    }

    currentVertices = originalVertices.map(v => [...v]);
    updateMatrixDisplay(Matrix4x4.identity());
    draw();
}

function updateView() {
    cameraRotationX = parseFloat(document.getElementById("cam-rx").value);
    cameraRotationY = parseFloat(document.getElementById("cam-ry").value);
    cameraRotationZ = parseFloat(document.getElementById("cam-rz").value);
    zoom = parseFloat(document.getElementById("zoom").value);

    document.getElementById("zoom-value").textContent = zoom + "%";
    draw();
}

// ===============================
// Event Listeners
// ===============================
document.getElementById("generate-btn").addEventListener("click", generateObject);
document.getElementById("reset-btn").addEventListener("click", resetObject);
document.getElementById("apply-transform-btn").addEventListener("click", applyTransformation);
document.getElementById("update-view-btn").addEventListener("click", updateView);

document.getElementById("zoom").addEventListener("input", (e) => {
    zoom = parseFloat(e.target.value);
    document.getElementById("zoom-value").textContent = zoom + "%";
    draw();
});

// Atualiza visualização ao mudar rotação da câmera
["cam-rx", "cam-ry", "cam-rz"].forEach(id => {
    document.getElementById(id).addEventListener("change", updateView);
});

// ===============================
// Inicialização
// ===============================
draw();
updateMatrixDisplay(Matrix4x4.identity());
