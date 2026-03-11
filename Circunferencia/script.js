const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const liveCoords = document.getElementById("live-coords");
const clickedCoords = document.getElementById("clicked-coords");
const quadrantInfo = document.getElementById("quadrant-info");

let Xmax = 255;
let Xmin = -255;
let Ymax = 255;
let Ymin = -255;

let circles = [];
let activeMethod = "trig"; // padrão

const colors = {
    trig: "red",
    poly: "blue",
    mid: "green"
};

// seleciona os botões
const btnTrig = document.getElementById("btn-trig");
const btnPoly = document.getElementById("btn-poly");
const btnMid = document.getElementById("btn-mid");
const setCircleBtn = document.getElementById("set-circle-btn");

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
    if (wx > 0 && wy > 0) return "I";
    if (wx < 0 && wy > 0) return "II";
    if (wx < 0 && wy < 0) return "III";
    if (wx > 0 && wy < 0) return "IV";
    if (wx === 0 && wy !== 0) return "Sobre o eixo Y";
    if (wy === 0 && wx !== 0) return "Sobre o eixo X";
    return "Na origem";
}

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

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();
    circles.forEach(c => drawCircle(c));
}

// ===============================
// Desenha um círculo
// ===============================
function drawCircle(circle) {
    const { cx, cy, r, method } = circle;
    const points = [];
    ctx.fillStyle = colors[method];

    // função auxiliar para aplicar simetria de 8
    function plotCirclePoints(x, y) {
        const pts = [
            [cx + x, cy + y], [cx - x, cy + y],
            [cx + x, cy - y], [cx - x, cy - y],
            [cx + y, cy + x], [cx - y, cy + x],
            [cx + y, cy - x], [cx - y, cy - x]
        ];
        pts.forEach(([wx, wy]) => {
            const { dx, dy } = worldToDevice(Math.round(wx), Math.round(wy));
            ctx.fillRect(dx, dy, 1, 1);
            points.push({ x: wx, y: wy });
        });
    }

    // método trigonométrico
    if (method === "trig") {
        const step = 1 / r;
        const thetaEnd = Math.PI / 4;

        for (let theta = 0; theta <= thetaEnd; theta += step) {
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            plotCirclePoints(x, y);
        }
    }

    // método polinomial
    else if (method === "poly") {
        const step = 1;
        const xend = r / Math.sqrt(2);

        for (let x = 0; x <= xend; x += step) {
            const y = Math.sqrt(r * r - x * x);
            plotCirclePoints(x, y);
        }
    }

    // método ponto médio
    else if (method === "mid") {
        let x = 0, y = r;
        let d = 1 - r;

        plotCirclePoints(x, y);

        while (x < y) {
            x++;
            if (d < 0) {
                d += 2 * x + 1; // pixel E
            } else {
                y--;            // pixel SE
                d += 2 * (x - y) + 1;
            }
            plotCirclePoints(x, y);
        }
    }

    circle.points = points;
}

// ===============================
// Atualiza painel do último círculo
// ===============================
function updateCircleInfo() {
    if (circles.length === 0) return;
    const c = circles[circles.length - 1];
    clickedCoords.innerHTML = "";

    const div = document.createElement("div");
    div.style.border = "1px solid #000";
    div.style.padding = "10px";
    div.style.marginBottom = "5px";
    div.style.width = "450px";
    div.style.height = "250px";
    div.style.overflow = "auto";
    div.style.fontSize = "14px";
    div.style.color = "#ccc";

    const rows = c.points.map((p, idx) => `
        <tr>
            <td style="width: 20px;">P${idx + 1}</td>
            <td style="width: 60px;">${p.x.toFixed(2)}</td>
            <td style="width: 60px;">${p.y.toFixed(2)}</td>
        </tr>
    `).join("");

    div.innerHTML = `
        <strong>Centro:</strong> (X: ${c.cx.toFixed(2)}, Y: ${c.cy.toFixed(2)})<br>
        <strong>Raio:</strong> ${c.r}<br>
        <strong>Tipo:</strong> ${c.method}<br>
        <strong>Quadrante:</strong> ${getQuadrant(c.cx, c.cy)}<br><br>
        <strong>Coordenadas:</strong><br>
        <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; font-size: 14px; width: 100%;">
            <thead>
                <tr>
                    <th style="width: 60px;">Ponto</th>
                    <th style="width: 100px;">X</th>
                    <th style="width: 100px;">Y</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
    clickedCoords.appendChild(div);
}

// ===============================
// Clique no canvas para desenhar
// ===============================
canvas.addEventListener("click", (event) => {
    const { wx, wy } = deviceToWorld(event.clientX - canvas.getBoundingClientRect().left,
        event.clientY - canvas.getBoundingClientRect().top);
    const r = parseFloat(document.getElementById("input-r").value);
    const circle = { cx: wx, cy: wy, r, method: activeMethod, points: [] };
    circles.push(circle);
    drawAll();
    updateCircleInfo();
});

// ===============================
// Controle dos botões ativos
// ===============================
function setActiveButton(activeBtn) {
    [btnTrig, btnPoly, btnMid].forEach(btn => btn.classList.remove("active"));
    activeBtn.classList.add("active");
    if (activeBtn === btnTrig) activeMethod = "trig";
    if (activeBtn === btnPoly) activeMethod = "poly";
    if (activeBtn === btnMid) activeMethod = "mid";
}

// eventos
btnTrig.addEventListener("click", () => setActiveButton(btnTrig));
btnPoly.addEventListener("click", () => setActiveButton(btnPoly));
btnMid.addEventListener("click", () => setActiveButton(btnMid));

// ===============================
// Botão Inserir Círculo
// ===============================
setCircleBtn.addEventListener("click", () => {
    const cx = parseFloat(document.getElementById("input-cx").value);
    const cy = parseFloat(document.getElementById("input-cy").value);
    const r = parseFloat(document.getElementById("input-r").value);
    const circle = { cx, cy, r, method: activeMethod, points: [] };
    circles.push(circle);
    drawAll();
    updateCircleInfo();
});

// inicializa com trig ativo
setActiveButton(btnTrig);

// ===============================
// Mousemove para coordenadas do pixel
// ===============================
canvas.addEventListener("mousemove", (event) => {
    const { wx, wy } = deviceToWorld(event.clientX - canvas.getBoundingClientRect().left,
        event.clientY - canvas.getBoundingClientRect().top);

    drawAll();
    const { dx: px, dy: py } = worldToDevice(wx, wy);
    ctx.fillStyle = "red";
    ctx.fillRect(px, py, 1, 1);

    liveCoords.innerHTML = `<strong>Coordenadas:</strong> X: (${wx.toFixed(2)}), Y: (${wy.toFixed(2)})`;
    quadrantInfo.innerHTML = `<strong>Quadrante:</strong> ${getQuadrant(wx, wy)}`;
});

const clearCirclesBtn = document.getElementById("clear-circles-btn");

clearCirclesBtn.addEventListener("click", () => {
    circles = [];
    clickedCoords.innerHTML = "";
    drawAll();
});

drawAll();