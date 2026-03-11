const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const liveCoords = document.getElementById("live-coords");
const clickedCoords = document.getElementById("clicked-coords");
const quadrantInfo = document.getElementById("quadrant-info");

let Xmax = 255;
let Xmin = -255;
let Ymax = 255;
let Ymin = -255;

let ellipses = [];

const setEllipseBtn = document.getElementById("set-ellipse-btn");
const clearEllipsesBtn = document.getElementById("clear-ellipses-btn");

// ===============================
// Conversões de coordenadas
// ===============================
function deviceToWorld(dx, dy) {
    const ndcx = dx / (canvas.width - 1);
    const ndcy = 1 - dy / (canvas.height - 1);
    return {
        wx: ndcx * (Xmax - Xmin) + Xmin,
        wy: ndcy * (Ymax - Ymin) + Ymin
    };
}

function worldToDevice(wx, wy) {
    const ndcx = (wx - Xmin) / (Xmax - Xmin);
    const ndcy = (wy - Ymin) / (Ymax - Ymin);
    return {
        dx: Math.round(ndcx * (canvas.width - 1)),
        dy: Math.round((1 - ndcy) * (canvas.height - 1))
    };
}

function getQuadrant(wx, wy) {
    if (wx > 0 && wy > 0) return "Quadrante I";
    if (wx < 0 && wy > 0) return "Quadrante II";
    if (wx < 0 && wy < 0) return "Quadrante III";
    if (wx > 0 && wy < 0) return "Quadrante IV";
    if (wx === 0 && wy !== 0) return "Sobre o eixo Y";
    if (wy === 0 && wx !== 0) return "Sobre o eixo X";
    return "Na origem";
}

// ===============================
// Desenha os eixos
// ===============================
function drawAxes() {
    const midX = canvas.width / 2;
    const midY = canvas.height / 2;
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 0.5;

    // Eixo X
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();

    // Eixo Y
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, canvas.height);
    ctx.stroke();
}

// ===============================
// Redesenha tudo
// ===============================
function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();
    ellipses.forEach(e => drawEllipse(e));
}

// ===============================
// Algoritmo do Ponto Médio para Elipse
// ===============================
function drawEllipse(ellipse) {
    const { cx, cy, rx, ry } = ellipse;
    const points = [];
    ctx.fillStyle = "#2196F3"; // Azul

    // Função auxiliar para plotar 4 pontos simétricos
    function plotEllipsePoints(x, y) {
        const pts = [
            [cx + x, cy + y],
            [cx - x, cy + y],
            [cx + x, cy - y],
            [cx - x, cy - y]
        ];
        pts.forEach(([wx, wy]) => {
            const { dx, dy } = worldToDevice(Math.round(wx), Math.round(wy));
            ctx.fillRect(dx, dy, 1, 1);
            points.push({ x: wx, y: wy });
        });
    }

    // Variáveis para o algoritmo do ponto médio da elipse
    const rx2 = rx * rx;
    const ry2 = ry * ry;
    const twoRx2 = 2 * rx2;
    const twoRy2 = 2 * ry2;

    let x = 0;
    let y = ry;
    let px = 0;
    let py = twoRx2 * y;

    // Região 1: onde a inclinação é menor que -1
    plotEllipsePoints(x, y);

    let p1 = Math.round(ry2 - (rx2 * ry) + (0.25 * rx2));

    while (px < py) {
        x++;
        px += twoRy2;

        if (p1 < 0) {
            p1 += ry2 + px;
        } else {
            y--;
            py -= twoRx2;
            p1 += ry2 + px - py;
        }

        plotEllipsePoints(x, y);
    }

    // Região 2: onde a inclinação é maior que -1
    let p2 = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);

    while (y > 0) {
        y--;
        py -= twoRx2;

        if (p2 > 0) {
            p2 += rx2 - py;
        } else {
            x++;
            px += twoRy2;
            p2 += rx2 - py + px;
        }

        plotEllipsePoints(x, y);
    }

    ellipse.points = points;
}

// ===============================
// Atualiza painel da última elipse
// ===============================
function updateEllipseInfo() {
    if (ellipses.length === 0) return;
    const e = ellipses[ellipses.length - 1];
    clickedCoords.innerHTML = "";

    const div = document.createElement("div");
    div.style.border = "1px solid #444";
    div.style.padding = "10px";
    div.style.marginBottom = "5px";
    div.style.maxHeight = "250px";
    div.style.overflow = "auto";
    div.style.fontSize = "13px";
    div.style.color = "#ccc";
    div.style.background = "#2a2a2a";
    div.style.borderRadius = "5px";

    const pointSample = e.points.slice(0, 20); // Mostra apenas os primeiros 20 pontos
    const rows = pointSample.map((p, idx) => `
        <tr>
            <td>P${idx + 1}</td>
            <td>${p.x.toFixed(1)}</td>
            <td>${p.y.toFixed(1)}</td>
        </tr>
    `).join("");

    div.innerHTML = `
        <strong>Centro:</strong> (${e.cx.toFixed(1)}, ${e.cy.toFixed(1)})<br>
        <strong>Semi-eixo a:</strong> ${e.rx}<br>
        <strong>Semi-eixo b:</strong> ${e.ry}<br>
        <strong>Quadrante:</strong> ${getQuadrant(e.cx, e.cy)}<br>
        <strong>Total de pontos:</strong> ${e.points.length}<br><br>
        <strong>Primeiros pontos (amostra):</strong><br>
        <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">
            <thead>
                <tr>
                    <th>Ponto</th>
                    <th>X</th>
                    <th>Y</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
    clickedCoords.appendChild(div);
    quadrantInfo.textContent = getQuadrant(e.cx, e.cy);
}

// ===============================
// Event Listeners
// ===============================

// Clique no canvas para desenhar elipse
canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const { wx, wy } = deviceToWorld(
        event.clientX - rect.left,
        event.clientY - rect.top
    );

    const rx = parseFloat(document.getElementById("input-rx").value);
    const ry = parseFloat(document.getElementById("input-ry").value);

    if (rx > 0 && ry > 0) {
        ellipses.push({ cx: wx, cy: wy, rx, ry, points: [] });
        drawAll();
        updateEllipseInfo();
    }
});

// Botão para inserir elipse com valores dos inputs
setEllipseBtn.addEventListener("click", () => {
    const cx = parseFloat(document.getElementById("input-cx").value);
    const cy = parseFloat(document.getElementById("input-cy").value);
    const rx = parseFloat(document.getElementById("input-rx").value);
    const ry = parseFloat(document.getElementById("input-ry").value);

    if (!isNaN(cx) && !isNaN(cy) && rx > 0 && ry > 0) {
        ellipses.push({ cx, cy, rx, ry, points: [] });
        drawAll();
        updateEllipseInfo();
    } else {
        alert("Por favor, insira valores válidos para todos os campos.");
    }
});

// Botão para limpar o quadro
clearEllipsesBtn.addEventListener("click", () => {
    ellipses = [];
    drawAll();
    clickedCoords.innerHTML = "<em>Clique no canvas ou entre as informações para desenhar uma elipse.</em>";
    quadrantInfo.textContent = "";
});

// Movimento do mouse sobre o canvas
canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const dx = event.clientX - rect.left;
    const dy = event.clientY - rect.top;
    const { wx, wy } = deviceToWorld(dx, dy);

    liveCoords.innerHTML = `
        <strong>Device:</strong> (${Math.round(dx)}, ${Math.round(dy)})<br>
        <strong>World:</strong> (${wx.toFixed(2)}, ${wy.toFixed(2)})<br>
        <strong>Posição:</strong> ${getQuadrant(wx, wy)}
    `;
});

// Inicialização
drawAll();
