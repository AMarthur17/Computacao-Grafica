const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const liveCoords = document.getElementById("live-coords");
const pointsList = document.getElementById("points-list");
const segmentsInput = document.getElementById("input-segments");
const showControlLinesCheckbox = document.getElementById("show-control-lines");
const showControlPointsCheckbox = document.getElementById("show-control-points");
const clearBtn = document.getElementById("btn-clear");
const resetDefaultBtn = document.getElementById("btn-reset-default");

let Xmax = 255;
let Xmin = -255;
let Ymax = 255;
let Ymin = -255;

// Array para armazenar os 4 pontos de controle
let controlPoints = [];
let draggedPointIndex = -1;
let hoveredPointIndex = -1;

const POINT_RADIUS = 8;
const CONTROL_POINT_COLOR = "#FF6B6B";
const CONTROL_LINE_COLOR = "#FFD93D";
const CURVE_COLOR = "#6BCB77";
const HOVER_COLOR = "#4ECDC4";

// Função para converter coordenadas do dispositivo para mundo
function deviceToWorld(dx, dy) {
    const ndcx = dx / (canvas.width - 1);
    const ndcy = 1 - dy / (canvas.height - 1);
    return {
        wx: ndcx * (Xmax - Xmin) + Xmin,
        wy: ndcy * (Ymax - Ymin) + Ymin
    };
}

// Função para converter coordenadas do mundo para dispositivo
function worldToDevice(wx, wy) {
    const ndcx = (wx - Xmin) / (Xmax - Xmin);
    const ndcy = (wy - Ymin) / (Ymax - Ymin);
    return {
        dx: Math.round(ndcx * (canvas.width - 1)),
        dy: Math.round((1 - ndcy) * (canvas.height - 1))
    };
}

// Calcula um ponto na curva de Bézier para um valor t (0 <= t <= 1)
// Fórmula: B(t) = (1-t)³·P₀ + 3(1-t)²t·P₁ + 3(1-t)t²·P₂ + t³·P₃
function bezierPoint(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    const x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x;
    const y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y;

    return { x, y };
}

// Desenha os eixos de coordenadas
function drawAxes() {
    const midX = canvas.width / 2;
    const midY = canvas.height / 2;
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 0.4;

    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, canvas.height);
    ctx.stroke();
}

// Desenha as linhas de controle (polígono de controle)
function drawControlLines() {
    if (controlPoints.length < 2) return;

    ctx.strokeStyle = CONTROL_LINE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    const firstPoint = worldToDevice(controlPoints[0].x, controlPoints[0].y);
    ctx.moveTo(firstPoint.dx, firstPoint.dy);

    for (let i = 1; i < controlPoints.length; i++) {
        const point = worldToDevice(controlPoints[i].x, controlPoints[i].y);
        ctx.lineTo(point.dx, point.dy);
    }

    ctx.stroke();
    ctx.setLineDash([]);
}

// Desenha os pontos de controle
function drawControlPoints() {
    controlPoints.forEach((point, index) => {
        const device = worldToDevice(point.x, point.y);

        // Determina a cor (destaque se houver)
        const color = hoveredPointIndex === index ? HOVER_COLOR : CONTROL_POINT_COLOR;

        // Desenha o ponto
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(device.dx, device.dy, POINT_RADIUS, 0, 2 * Math.PI);
        ctx.fill();

        // Desenha a borda
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Desenha o número do ponto
        ctx.fillStyle = "#333";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(index, device.dx, device.dy);
    });
}

// Desenha a curva de Bézier
function drawBezierCurve() {
    if (controlPoints.length !== 4) return;

    const segments = parseInt(segmentsInput.value);
    ctx.strokeStyle = CURVE_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();

    const firstPoint = bezierPoint(0, controlPoints[0], controlPoints[1], controlPoints[2], controlPoints[3]);
    const deviceFirst = worldToDevice(firstPoint.x, firstPoint.y);
    ctx.moveTo(deviceFirst.dx, deviceFirst.dy);

    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const point = bezierPoint(t, controlPoints[0], controlPoints[1], controlPoints[2], controlPoints[3]);
        const devicePoint = worldToDevice(point.x, point.y);
        ctx.lineTo(devicePoint.dx, devicePoint.dy);
    }

    ctx.stroke();
}

// Redesenha tudo
function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();

    if (showControlLinesCheckbox.checked) {
        drawControlLines();
    }

    if (controlPoints.length === 4) {
        drawBezierCurve();
    }

    if (showControlPointsCheckbox.checked) {
        drawControlPoints();
    }
}

// Atualiza a lista de pontos na sidebar
function updatePointsList() {
    if (controlPoints.length === 0) {
        pointsList.innerHTML = '<em style="color: #666;">Nenhum ponto adicionado</em>';
        return;
    }

    let html = `<strong style="color: #f0f0f0;">Total: ${controlPoints.length}/4</strong><br><br>`;
    controlPoints.forEach((point, index) => {
        const x = point.x.toFixed(2);
        const y = point.y.toFixed(2);
        html += `<div style="margin: 5px 0; padding: 5px; background: #2a2a2a; border-radius: 3px; border-left: 3px solid ${CONTROL_POINT_COLOR};">
            P${index}: (${x}, ${y})
        </div>`;
    });

    if (controlPoints.length === 4) {
        html += '<br><strong style="color: #6BCB77;">✓ Curva completa!</strong>';
    } else {
        html += `<br><em style="color: #FFD93D;">Faltam ${4 - controlPoints.length} ponto(s)</em>`;
    }

    pointsList.innerHTML = html;
}

// Encontra qual ponto está sob o cursor
function getPointAtPosition(px, py) {
    const tolerance = POINT_RADIUS + 5;

    for (let i = 0; i < controlPoints.length; i++) {
        const device = worldToDevice(controlPoints[i].x, controlPoints[i].y);
        const distance = Math.sqrt((device.dx - px) ** 2 + (device.dy - py) ** 2);

        if (distance <= tolerance) {
            return i;
        }
    }

    return -1;
}

// Manipuladores de eventos do canvas

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const world = deviceToWorld(px, py);
    liveCoords.innerHTML = `X: ${world.wx.toFixed(2)}, Y: ${world.wy.toFixed(2)}`;

    // Determina qual ponto está sendo destacado
    hoveredPointIndex = getPointAtPosition(px, py);
    canvas.style.cursor = hoveredPointIndex !== -1 ? "grab" : "crosshair";

    if (draggedPointIndex !== -1) {
        // Atualiza a posição do ponto que está sendo arrastado
        controlPoints[draggedPointIndex] = {
            x: Math.max(Xmin, Math.min(Xmax, world.wx)),
            y: Math.max(Ymin, Math.min(Ymax, world.wy))
        };
        updatePointsList();
        drawAll();
    }
});

canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    draggedPointIndex = getPointAtPosition(px, py);

    if (draggedPointIndex === -1 && controlPoints.length < 4) {
        // Adiciona um novo ponto se não estiver sobre um ponto existente e há espaço
        const world = deviceToWorld(px, py);
        controlPoints.push({
            x: Math.max(Xmin, Math.min(Xmax, world.wx)),
            y: Math.max(Ymin, Math.min(Ymax, world.wy))
        });
        updatePointsList();
        drawAll();
    }

    canvas.style.cursor = "grabbing";
});

canvas.addEventListener("mouseup", () => {
    draggedPointIndex = -1;
    canvas.style.cursor = hoveredPointIndex !== -1 ? "grab" : "crosshair";
});

canvas.addEventListener("mouseleave", () => {
    draggedPointIndex = -1;
    hoveredPointIndex = -1;
    canvas.style.cursor = "default";
});

// Manipuladores de controles

segmentsInput.addEventListener("change", drawAll);
showControlLinesCheckbox.addEventListener("change", drawAll);
showControlPointsCheckbox.addEventListener("change", drawAll);

clearBtn.addEventListener("click", () => {
    controlPoints = [];
    draggedPointIndex = -1;
    hoveredPointIndex = -1;
    updatePointsList();
    drawAll();
});

resetDefaultBtn.addEventListener("click", () => {
    // Define 4 pontos de controle padrão
    controlPoints = [
        { x: -100, y: -80 },
        { x: -50, y: 100 },
        { x: 50, y: -100 },
        { x: 120, y: 80 }
    ];
    draggedPointIndex = -1;
    hoveredPointIndex = -1;
    updatePointsList();
    drawAll();
});

// Inicialização
updatePointsList();
drawAll();
