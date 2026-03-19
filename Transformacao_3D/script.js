// ===============================
// Canvas e Contexto
// ===============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const viewportCanvas = document.getElementById("viewport-canvas");
const vpCtx = viewportCanvas.getContext("2d");

const clipInfo = document.getElementById("clip-info");
const sequenceInfo = document.getElementById("sequence-info");

// ===============================
// Definicoes de Objetos 3D
// ===============================
const objects = {
    cube: {
        vertices: [
            [0, 0, 0], [100, 0, 0], [100, 100, 0], [0, 100, 0],
            [0, 0, 100], [100, 0, 100], [100, 100, 100], [0, 100, 100]
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ],
        faces: [
            [0, 1, 2, 3],
            [4, 5, 6, 7],
            [0, 1, 5, 4],
            [1, 2, 6, 5],
            [2, 3, 7, 6],
            [3, 0, 4, 7]
        ]
    },
    pyramid: {
        vertices: [
            [0, 0, 0], [100, 0, 0], [100, 0, 100], [0, 0, 100],
            [50, 100, 50]
        ],
        edges: [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [0, 4], [1, 4], [2, 4], [3, 4]
        ],
        faces: [
            [0, 1, 2, 3],
            [0, 1, 4],
            [1, 2, 4],
            [2, 3, 4],
            [3, 0, 4]
        ]
    },
    prism: {
        vertices: [
            [0, 0, 0], [100, 0, 0], [50, 0, 80],
            [0, 100, 0], [100, 100, 0], [50, 100, 80]
        ],
        edges: [
            [0, 1], [1, 2], [2, 0],
            [3, 4], [4, 5], [5, 3],
            [0, 3], [1, 4], [2, 5]
        ],
        faces: [
            [0, 1, 2],
            [3, 4, 5],
            [0, 1, 4, 3],
            [1, 2, 5, 4],
            [2, 0, 3, 5]
        ]
    }
};

let originalVertices = [];
let currentVertices = [];
let edges = [];
let faces = [];
let currentObject = null;

let cameraRotationX = 0;
let cameraRotationY = 0;
let cameraRotationZ = 0;
let zoom = 100;

let transformationSequence = [];

// ===============================
// Matriz 4x4
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

function isIdentityMatrix(matrix, epsilon = 1e-8) {
    const identity = Matrix4x4.identity();
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (Math.abs(matrix[r][c] - identity[r][c]) > epsilon) {
                return false;
            }
        }
    }
    return true;
}

function formatMatrixLine(matrix) {
    return matrix.map(row => `[${row.map(v => v.toFixed(2).padStart(6)).join(" ")}]`).join("<br>");
}

// ===============================
// Projecao Isometrica
// ===============================
function applyCamera(point) {
    const camRotX = Matrix4x4.rotationX(cameraRotationX);
    const camRotY = Matrix4x4.rotationY(cameraRotationY);
    const camRotZ = Matrix4x4.rotationZ(cameraRotationZ);

    let cameraTransform = Matrix4x4.multiply(camRotY, camRotX);
    cameraTransform = Matrix4x4.multiply(camRotZ, cameraTransform);
    return Matrix4x4.multiplyVector(cameraTransform, point);
}

function projectIsometricPlane(x, y, z, applyCameraRotation = true) {
    let point = [x, y, z, 1];
    if (applyCameraRotation) {
        point = applyCamera(point);
    }

    const f = zoom / 100;
    return {
        x: (point[0] - point[2]) * f * 0.7071,
        y: (-point[1] + (point[0] + point[2]) * 0.5) * f * 0.7071
    };
}

function worldToMainCanvas(point) {
    return {
        x: point.x + canvas.width / 2,
        y: point.y + canvas.height / 2
    };
}

function worldToViewport(point, worldBounds, vpBounds) {
    return {
        x: ((point.x - worldBounds.xmin) / (worldBounds.xmax - worldBounds.xmin)) * (vpBounds.xmax - vpBounds.xmin) + vpBounds.xmin,
        y: ((point.y - worldBounds.ymin) / (worldBounds.ymax - worldBounds.ymin)) * (vpBounds.ymax - vpBounds.ymin) + vpBounds.ymin
    };
}

// ===============================
// Desenho DDA
// ===============================
function drawLineDDA(context, x1, y1, x2, y2, color = "#000") {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) return;

    const xInc = dx / steps;
    const yInc = dy / steps;

    let x = x1;
    let y = y1;

    context.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
        context.fillRect(Math.round(x), Math.round(y), 1, 1);
        x += xInc;
        y += yInc;
    }
}

function drawGridMain() {
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

function drawAxesMain() {
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const length = 150 * (zoom / 100);

    const xEndWorld = projectIsometricPlane(length, 0, 0, false);
    const yEndWorld = projectIsometricPlane(0, length, 0, false);
    const zEndWorld = projectIsometricPlane(0, 0, length, false);

    const xEnd = worldToMainCanvas(xEndWorld);
    const yEnd = worldToMainCanvas(yEndWorld);
    const zEnd = worldToMainCanvas(zEndWorld);

    drawLineDDA(ctx, center.x, center.y, xEnd.x, xEnd.y, "red");
    drawLineDDA(ctx, center.x, center.y, yEnd.x, yEnd.y, "green");
    drawLineDDA(ctx, center.x, center.y, zEnd.x, zEnd.y, "blue");

    ctx.fillStyle = "red";
    ctx.font = "12px Arial";
    ctx.fillText("X", xEnd.x + 10, xEnd.y);
    ctx.fillStyle = "green";
    ctx.fillText("Y", yEnd.x, yEnd.y - 10);
    ctx.fillStyle = "blue";
    ctx.fillText("Z", zEnd.x - 20, zEnd.y);
}

function drawViewportGrid() {
    vpCtx.fillStyle = "#ffffff";
    vpCtx.fillRect(0, 0, viewportCanvas.width, viewportCanvas.height);

    vpCtx.strokeStyle = "#ddd";
    vpCtx.lineWidth = 0.25;
    const step = 25;
    for (let i = 0; i <= viewportCanvas.width; i += step) {
        vpCtx.beginPath();
        vpCtx.moveTo(i, 0);
        vpCtx.lineTo(i, viewportCanvas.height);
        vpCtx.stroke();
    }
    for (let i = 0; i <= viewportCanvas.height; i += step) {
        vpCtx.beginPath();
        vpCtx.moveTo(0, i);
        vpCtx.lineTo(viewportCanvas.width, i);
        vpCtx.stroke();
    }
}

// ===============================
// Recorte Poligonal (Sutherland-Hodgman)
// ===============================
function insideEdge(point, edge, bounds) {
    switch (edge) {
        case "left":
            return point.x >= bounds.xmin;
        case "right":
            return point.x <= bounds.xmax;
        case "top":
            return point.y >= bounds.ymin;
        case "bottom":
            return point.y <= bounds.ymax;
        default:
            return false;
    }
}

function intersectEdge(start, end, edge, bounds) {
    let x = 0;
    let y = 0;

    if (edge === "left" || edge === "right") {
        x = edge === "left" ? bounds.xmin : bounds.xmax;
        const t = (x - start.x) / ((end.x - start.x) || 1e-9);
        y = start.y + t * (end.y - start.y);
    } else {
        y = edge === "top" ? bounds.ymin : bounds.ymax;
        const t = (y - start.y) / ((end.y - start.y) || 1e-9);
        x = start.x + t * (end.x - start.x);
    }

    return { x, y };
}

function clipPolygonSutherlandHodgman(vertices, bounds) {
    const edgesOrder = ["left", "right", "top", "bottom"];
    let output = vertices.map(v => ({ x: v.x, y: v.y }));

    for (const edge of edgesOrder) {
        const input = output;
        output = [];

        if (input.length === 0) break;

        let previous = input[input.length - 1];
        for (const current of input) {
            const currentInside = insideEdge(current, edge, bounds);
            const previousInside = insideEdge(previous, edge, bounds);

            if (currentInside) {
                if (!previousInside) {
                    output.push(intersectEdge(previous, current, edge, bounds));
                }
                output.push(current);
            } else if (previousInside) {
                output.push(intersectEdge(previous, current, edge, bounds));
            }

            previous = current;
        }
    }

    return output.length >= 3 ? output : [];
}

function drawPolygonOnViewport(vertices, fill, stroke) {
    if (!vertices || vertices.length < 3) return;

    vpCtx.beginPath();
    vpCtx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
        vpCtx.lineTo(vertices[i].x, vertices[i].y);
    }
    vpCtx.closePath();

    vpCtx.fillStyle = fill;
    vpCtx.fill();

    vpCtx.strokeStyle = stroke;
    vpCtx.lineWidth = 1.5;
    vpCtx.stroke();
}

function polygonChanged(original, clipped, epsilon = 0.2) {
    if (original.length !== clipped.length) return true;
    for (let i = 0; i < original.length; i++) {
        if (Math.abs(original[i].x - clipped[i].x) > epsilon || Math.abs(original[i].y - clipped[i].y) > epsilon) {
            return true;
        }
    }
    return false;
}

function lineOutCode(x, y, bounds) {
    let code = 0;
    if (x < bounds.xmin) code |= 1;
    else if (x > bounds.xmax) code |= 2;
    if (y < bounds.ymin) code |= 4;
    else if (y > bounds.ymax) code |= 8;
    return code;
}

function clipLineCohenSutherland(x1, y1, x2, y2, bounds) {
    let outCode1 = lineOutCode(x1, y1, bounds);
    let outCode2 = lineOutCode(x2, y2, bounds);

    let accepted = false;
    let clipped = false;

    while (true) {
        if (!(outCode1 | outCode2)) {
            accepted = true;
            break;
        }

        if (outCode1 & outCode2) {
            break;
        }

        let x;
        let y;
        const outCodeOut = outCode1 ? outCode1 : outCode2;

        if (outCodeOut & 8) {
            x = x1 + (x2 - x1) * (bounds.ymax - y1) / ((y2 - y1) || 1e-9);
            y = bounds.ymax;
        } else if (outCodeOut & 4) {
            x = x1 + (x2 - x1) * (bounds.ymin - y1) / ((y2 - y1) || 1e-9);
            y = bounds.ymin;
        } else if (outCodeOut & 2) {
            y = y1 + (y2 - y1) * (bounds.xmax - x1) / ((x2 - x1) || 1e-9);
            x = bounds.xmax;
        } else {
            y = y1 + (y2 - y1) * (bounds.xmin - x1) / ((x2 - x1) || 1e-9);
            x = bounds.xmin;
        }

        clipped = true;

        if (outCodeOut === outCode1) {
            x1 = x;
            y1 = y;
            outCode1 = lineOutCode(x1, y1, bounds);
        } else {
            x2 = x;
            y2 = y;
            outCode2 = lineOutCode(x2, y2, bounds);
        }
    }

    return { accepted, clipped, x1, y1, x2, y2 };
}

// ===============================
// Pipeline: projecao -> mundo/viewport -> recorte
// ===============================
function parsePipelineBounds() {
    let wxMin = parseFloat(document.getElementById("world-xmin").value);
    let wxMax = parseFloat(document.getElementById("world-xmax").value);
    let wyMin = parseFloat(document.getElementById("world-ymin").value);
    let wyMax = parseFloat(document.getElementById("world-ymax").value);

    let vxMin = parseFloat(document.getElementById("vp-xmin").value);
    let vxMax = parseFloat(document.getElementById("vp-xmax").value);
    let vyMin = parseFloat(document.getElementById("vp-ymin").value);
    let vyMax = parseFloat(document.getElementById("vp-ymax").value);

    if (wxMin > wxMax) [wxMin, wxMax] = [wxMax, wxMin];
    if (wyMin > wyMax) [wyMin, wyMax] = [wyMax, wyMin];
    if (vxMin > vxMax) [vxMin, vxMax] = [vxMax, vxMin];
    if (vyMin > vyMax) [vyMin, vyMax] = [vyMax, vyMin];

    return {
        worldBounds: { xmin: wxMin, xmax: wxMax, ymin: wyMin, ymax: wyMax },
        viewportBounds: { xmin: vxMin, xmax: vxMax, ymin: vyMin, ymax: vyMax }
    };
}

function setWorldBoundsFromProjectedPoints(projectedPoints) {
    if (!projectedPoints || projectedPoints.length === 0) {
        return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    projectedPoints.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const maxSpan = Math.max(width, height);
    const margin = maxSpan * 0.35;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const half = (maxSpan / 2) + margin;

    document.getElementById("world-xmin").value = Math.round(cx - half);
    document.getElementById("world-xmax").value = Math.round(cx + half);
    document.getElementById("world-ymin").value = Math.round(cy - half);
    document.getElementById("world-ymax").value = Math.round(cy + half);
}

function drawViewportScene() {
    drawViewportGrid();

    const { worldBounds, viewportBounds } = parsePipelineBounds();
    const viewportEnabled = document.getElementById("enable-viewport").checked;
    const clippingEnabled = document.getElementById("enable-poly-clipping").checked;

    if (currentObject === null) {
        clipInfo.innerHTML = "<em>Aguardando objeto</em>";
        return;
    }

    if (!viewportEnabled) {
        clipInfo.innerHTML = "<em>Mapeamento para viewport desabilitado</em>";
        return;
    }

    // Na viewport exibimos o objeto projetado no plano XY, para que a saida
    // represente a forma 2D mapeada e nao a aparencia isometrica do canvas principal.
    const mappedVertices = currentVertices.map((vertex) =>
        worldToViewport({ x: vertex[0], y: vertex[1] }, worldBounds, viewportBounds)
    );

    // Mostra as arestas mapeadas sem recorte em tracejado, como referencia visual.
    vpCtx.save();
    vpCtx.strokeStyle = "#aaaaaa";
    vpCtx.lineWidth = 1;
    vpCtx.setLineDash([4, 3]);
    edges.forEach(edge => {
        const p1 = mappedVertices[edge[0]];
        const p2 = mappedVertices[edge[1]];
        drawLineDDA(vpCtx, p1.x, p1.y, p2.x, p2.y, "#aaaaaa");
    });
    vpCtx.restore();

    if (!clippingEnabled) {
        clipInfo.innerHTML = `
            <div><strong>Arestas totais:</strong> ${edges.length}</div>
            <div><strong>Arestas visiveis:</strong> ${edges.length}</div>
            <div><strong>Projecao da viewport:</strong> plano XY</div>
            <div><strong>Recorte:</strong> desabilitado</div>
        `;
        return;
    }

    let acceptedEdges = 0;
    let clippedEdges = 0;
    let rejectedEdges = 0;

    edges.forEach(edge => {
        const p1 = mappedVertices[edge[0]];
        const p2 = mappedVertices[edge[1]];
        const result = clipLineCohenSutherland(p1.x, p1.y, p2.x, p2.y, viewportBounds);

        if (!result.accepted) {
            rejectedEdges++;
            return;
        }

        acceptedEdges++;
        if (result.clipped) {
            clippedEdges++;
        }

        drawLineDDA(vpCtx, result.x1, result.y1, result.x2, result.y2, "#111");
    });

    clipInfo.innerHTML = `
        <div><strong>Arestas totais:</strong> ${edges.length}</div>
        <div><strong>Arestas visiveis:</strong> ${acceptedEdges}</div>
        <div><strong>Arestas recortadas:</strong> ${clippedEdges}</div>
        <div><strong>Arestas rejeitadas:</strong> ${rejectedEdges}</div>
        <div><strong>Projecao da viewport:</strong> plano XY</div>
        <div><strong>Algoritmo:</strong> Cohen-Sutherland</div>
    `;
}

// ===============================
// Atualizacao de Displays
// ===============================
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

    let cx = 0;
    let cy = 0;
    let cz = 0;
    currentVertices.forEach(v => {
        cx += v[0];
        cy += v[1];
        cz += v[2];
    });
    cx /= currentVertices.length;
    cy /= currentVertices.length;
    cz /= currentVertices.length;

    document.getElementById("center-coords").textContent = `(${cx.toFixed(1)}, ${cy.toFixed(1)}, ${cz.toFixed(1)})`;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    currentVertices.forEach(v => {
        minX = Math.min(minX, v[0]);
        maxX = Math.max(maxX, v[0]);
        minY = Math.min(minY, v[1]);
        maxY = Math.max(maxY, v[1]);
        minZ = Math.min(minZ, v[2]);
        maxZ = Math.max(maxZ, v[2]);
    });

    document.getElementById("dimensions").textContent =
        `${(maxX - minX).toFixed(1)} x ${(maxY - minY).toFixed(1)} x ${(maxZ - minZ).toFixed(1)}`;

    document.getElementById("vertex-count").textContent = currentVertices.length;
    document.getElementById("edge-count").textContent = edges.length;
}

function updateMatrixDisplay(matrix) {
    const matrixInfo = document.getElementById("matrix-info");
    matrixInfo.innerHTML = `<code>${formatMatrixLine(matrix)}</code>`;
}

function updateSequenceDisplay() {
    if (transformationSequence.length === 0) {
        sequenceInfo.innerHTML = "<em>Nenhuma transformação na sequência</em>";
        return;
    }

    sequenceInfo.innerHTML = transformationSequence
        .map((item, idx) => `<div class="seq-row">${idx + 1}. ${item.description}</div>`)
        .join("");
}

function updateDisplay() {
    updateVerticesDisplay();
    updateStatsDisplay();
    updateSequenceDisplay();
}

// ===============================
// Transformacoes
// ===============================
function getTransformDataFromInputs() {
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

    let M = Matrix4x4.identity();
    const descriptionParts = [];

    if (tx !== 0 || ty !== 0 || tz !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.translation(tx, ty, tz));
        descriptionParts.push(`T(${tx}, ${ty}, ${tz})`);
    }
    if (rx !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.rotationX(rx));
        descriptionParts.push(`Rx(${rx})`);
    }
    if (ry !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.rotationY(ry));
        descriptionParts.push(`Ry(${ry})`);
    }
    if (rz !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.rotationZ(rz));
        descriptionParts.push(`Rz(${rz})`);
    }
    if (sx !== 1 || sy !== 1 || sz !== 1) {
        M = Matrix4x4.multiply(M, Matrix4x4.scaling(sx, sy, sz));
        descriptionParts.push(`S(${sx}, ${sy}, ${sz})`);
    }
    if (shXY !== 0 || shXZ !== 0 || shYZ !== 0) {
        M = Matrix4x4.multiply(M, Matrix4x4.shear(shXY, shXZ, shYZ));
        descriptionParts.push(`Sh(${shXY}, ${shXZ}, ${shYZ})`);
    }
    if (reflectXY) {
        M = Matrix4x4.multiply(M, Matrix4x4.reflectionXY());
        descriptionParts.push("Ref(XY)");
    }
    if (reflectXZ) {
        M = Matrix4x4.multiply(M, Matrix4x4.reflectionXZ());
        descriptionParts.push("Ref(XZ)");
    }
    if (reflectYZ) {
        M = Matrix4x4.multiply(M, Matrix4x4.reflectionYZ());
        descriptionParts.push("Ref(YZ)");
    }

    const description = descriptionParts.length > 0
        ? descriptionParts.join(" * ")
        : "Identidade";

    return { matrix: M, description };
}

function applyMatrixToObject(matrix) {
    currentVertices = currentVertices.map(v => {
        const transformed = Matrix4x4.multiplyVector(matrix, [...v, 1]);
        return [transformed[0], transformed[1], transformed[2]];
    });
}

function applyTransformation() {
    if (currentObject === null) {
        alert("Gere um objeto primeiro!");
        return;
    }

    const { matrix } = getTransformDataFromInputs();
    applyMatrixToObject(matrix);
    updateMatrixDisplay(matrix);
    draw();
}

function addToSequence() {
    const { matrix, description } = getTransformDataFromInputs();
    if (isIdentityMatrix(matrix)) {
        alert("Configure uma transformação diferente da identidade para adicionar.");
        return;
    }

    transformationSequence.push({ matrix, description });
    updateSequenceDisplay();
}

function applySequence() {
    if (currentObject === null) {
        alert("Gere um objeto primeiro!");
        return;
    }
    if (transformationSequence.length === 0) {
        alert("A sequência está vazia.");
        return;
    }

    let combined = Matrix4x4.identity();
    transformationSequence.forEach(item => {
        combined = Matrix4x4.multiply(combined, item.matrix);
    });

    applyMatrixToObject(combined);
    updateMatrixDisplay(combined);
    draw();
}

function clearSequence() {
    transformationSequence = [];
    updateSequenceDisplay();
}

function generateObject() {
    const objectType = document.getElementById("object-select").value;
    currentObject = objectType;

    const obj = objects[objectType];
    originalVertices = obj.vertices.map(v => [...v]);
    currentVertices = obj.vertices.map(v => [...v]);
    edges = obj.edges;
    faces = obj.faces;

    draw();
}

function resetObject() {
    if (currentObject === null) {
        alert("Gere um objeto primeiro!");
        return;
    }

    currentVertices = originalVertices.map(v => [...v]);
    transformationSequence = [];
    updateMatrixDisplay(Matrix4x4.identity());
    updateSequenceDisplay();
    draw();
}

function updateView() {
    cameraRotationX = parseFloat(document.getElementById("cam-rx").value);
    cameraRotationY = parseFloat(document.getElementById("cam-ry").value);
    cameraRotationZ = parseFloat(document.getElementById("cam-rz").value);
    zoom = parseFloat(document.getElementById("zoom").value);

    document.getElementById("zoom-value").textContent = `${zoom}%`;

    draw();
}

function fitWorldWindowToObject() {
    if (currentObject === null) {
        alert("Gere um objeto primeiro!");
        return;
    }

    const projectedPoints = currentVertices.map(v => projectIsometricPlane(v[0], v[1], v[2], true));
    setWorldBoundsFromProjectedPoints(projectedPoints);
    draw();
}

// ===============================
// Desenho principal
// ===============================
function draw() {
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGridMain();
    drawAxesMain();

    const projectedWorldPoints = [];

    if (currentObject !== null) {
        currentVertices.forEach(vertex => {
            projectedWorldPoints.push(projectIsometricPlane(vertex[0], vertex[1], vertex[2], true));
        });

        edges.forEach(edge => {
            const p1 = worldToMainCanvas(projectedWorldPoints[edge[0]]);
            const p2 = worldToMainCanvas(projectedWorldPoints[edge[1]]);
            drawLineDDA(ctx, p1.x, p1.y, p2.x, p2.y, "#111");
        });

        ctx.fillStyle = "#F44336";
        currentVertices.forEach((_, idx) => {
            const p = worldToMainCanvas(projectedWorldPoints[idx]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    drawViewportScene();
    updateDisplay();
}

// ===============================
// Event Listeners
// ===============================
document.getElementById("generate-btn").addEventListener("click", generateObject);
document.getElementById("reset-btn").addEventListener("click", resetObject);

document.getElementById("apply-transform-btn").addEventListener("click", applyTransformation);
document.getElementById("add-sequence-btn").addEventListener("click", addToSequence);
document.getElementById("apply-sequence-btn").addEventListener("click", applySequence);
document.getElementById("clear-sequence-btn").addEventListener("click", clearSequence);

document.getElementById("update-view-btn").addEventListener("click", updateView);
document.getElementById("update-pipeline-btn").addEventListener("click", draw);
document.getElementById("fit-world-btn").addEventListener("click", fitWorldWindowToObject);

document.getElementById("zoom").addEventListener("input", (e) => {
    zoom = parseFloat(e.target.value);
    document.getElementById("zoom-value").textContent = `${zoom}%`;
    draw();
});

["cam-rx", "cam-ry", "cam-rz"].forEach(id => {
    document.getElementById(id).addEventListener("change", updateView);
});

["enable-viewport", "enable-poly-clipping"].forEach(id => {
    document.getElementById(id).addEventListener("change", draw);
});

// ===============================
// Inicializacao
// ===============================
draw();
updateMatrixDisplay(Matrix4x4.identity());
updateSequenceDisplay();
