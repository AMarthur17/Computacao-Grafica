const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const liveCoords = document.getElementById("live-coords");
const conicType = document.getElementById("conic-type");
const discriminantInfo = document.getElementById("discriminant-info");
const equationDisplay = document.getElementById("equation-display");

let Xmax = 200;
let Xmin = -200;
let Ymax = 200;
let Ymin = -200;

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

    // Grade
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.2;

    for (let i = -200; i <= 200; i += 20) {
        const { dx } = worldToDevice(i, 0);
        const { dy } = worldToDevice(0, i);

        // Linhas verticais
        ctx.beginPath();
        ctx.moveTo(dx, 0);
        ctx.lineTo(dx, canvas.height);
        ctx.stroke();

        // Linhas horizontais
        ctx.beginPath();
        ctx.moveTo(0, dy);
        ctx.lineTo(canvas.width, dy);
        ctx.stroke();
    }
}

// ===============================
// Classifica a cônica
// ===============================
function classifyConic(A, B, C, D, E, F) {
    const discriminant = B * B - 4 * A * C;

    let type = "";
    let color = "";

    if (Math.abs(discriminant) < 0.0001) {
        type = "PARÁBOLA";
        color = "#FF9800"; // Laranja
    } else if (discriminant < 0) {
        if (Math.abs(A - C) < 0.0001 && Math.abs(B) < 0.0001) {
            type = "CÍRCULO";
            color = "#4CAF50"; // Verde
        } else {
            type = "ELIPSE";
            color = "#2196F3"; // Azul
        }
    } else {
        type = "HIPÉRBOLE";
        color = "#F44336"; // Vermelho
    }

    return { type, discriminant, color };
}

// ===============================
// Desenha a cônica
// ===============================
function drawConic(A, B, C, D, E, F) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();

    const classification = classifyConic(A, B, C, D, E, F);

    // Atualiza display
    conicType.textContent = classification.type;
    conicType.style.color = classification.color;
    discriminantInfo.textContent = `Discriminante Δ = B² - 4AC = ${classification.discriminant.toFixed(4)}`;

    const eqParts = [];
    if (A !== 0) eqParts.push(`${A}x²`);
    if (B !== 0) eqParts.push(`${B >= 0 ? '+' : ''}${B}xy`);
    if (C !== 0) eqParts.push(`${C >= 0 ? '+' : ''}${C}y²`);
    if (D !== 0) eqParts.push(`${D >= 0 ? '+' : ''}${D}x`);
    if (E !== 0) eqParts.push(`${E >= 0 ? '+' : ''}${E}y`);
    if (F !== 0) eqParts.push(`${F >= 0 ? '+' : ''}${F}`);
    equationDisplay.textContent = eqParts.join(' ') + ' = 0';

    // Desenha a cônica
    ctx.fillStyle = classification.color;

    // Método de varredura: para cada x, calcula y usando a fórmula quadrática
    for (let wx = Xmin; wx <= Xmax; wx += 0.5) {
        // Resolve a equação quadrática em y: Cy² + (Bx + E)y + (Ax² + Dx + F) = 0

        if (Math.abs(C) > 0.0001) {
            // Equação quadrática padrão: ay² + by + c = 0
            const a = C;
            const b = B * wx + E;
            const c = A * wx * wx + D * wx + F;

            const delta = b * b - 4 * a * c;

            if (delta >= 0) {
                const y1 = (-b + Math.sqrt(delta)) / (2 * a);
                const y2 = (-b - Math.sqrt(delta)) / (2 * a);

                // Plota ambas as soluções se estiverem no range
                if (y1 >= Ymin && y1 <= Ymax) {
                    const { dx, dy } = worldToDevice(wx, y1);
                    ctx.fillRect(dx, dy, 2, 2);
                }

                if (Math.abs(y1 - y2) > 0.1 && y2 >= Ymin && y2 <= Ymax) {
                    const { dx, dy } = worldToDevice(wx, y2);
                    ctx.fillRect(dx, dy, 2, 2);
                }
            }
        } else if (Math.abs(A) > 0.0001) {
            // Se C = 0, resolver para x: Ax² + (Bwy + D)x + (Cy² + Ey + F) = 0
            // Mas nesse caso, varrer por y
        }
    }

    // Também varre em y para pegar casos onde C é muito pequeno
    for (let wy = Ymin; wy <= Ymax; wy += 0.5) {
        if (Math.abs(A) > 0.0001) {
            const a = A;
            const b = B * wy + D;
            const c = C * wy * wy + E * wy + F;

            const delta = b * b - 4 * a * c;

            if (delta >= 0) {
                const x1 = (-b + Math.sqrt(delta)) / (2 * a);
                const x2 = (-b - Math.sqrt(delta)) / (2 * a);

                if (x1 >= Xmin && x1 <= Xmax) {
                    const { dx, dy } = worldToDevice(x1, wy);
                    ctx.fillRect(dx, dy, 2, 2);
                }

                if (Math.abs(x1 - x2) > 0.1 && x2 >= Xmin && x2 <= Xmax) {
                    const { dx, dy } = worldToDevice(x2, wy);
                    ctx.fillRect(dx, dy, 2, 2);
                }
            }
        }
    }
}

// ===============================
// Exemplos pré-definidos
// ===============================
const presets = {
    circle: { A: 1, B: 0, C: 1, D: 0, E: 0, F: -2500 },
    ellipse: { A: 4, B: 0, C: 9, D: 0, E: 0, F: -3600 },
    parabola: { A: 1, B: 0, C: 0, D: 0, E: -100, F: 0 },
    hyperbola: { A: 1, B: 0, C: -1, D: 0, E: 0, F: -2500 }
};

// ===============================
// Event Listeners
// ===============================

document.getElementById("draw-conic-btn").addEventListener("click", () => {
    const A = parseFloat(document.getElementById("input-a").value);
    const B = parseFloat(document.getElementById("input-b").value);
    const C = parseFloat(document.getElementById("input-c").value);
    const D = parseFloat(document.getElementById("input-d").value);
    const E = parseFloat(document.getElementById("input-e").value);
    const F = parseFloat(document.getElementById("input-f").value);

    if (!isNaN(A) && !isNaN(B) && !isNaN(C) && !isNaN(D) && !isNaN(E) && !isNaN(F)) {
        drawConic(A, B, C, D, E, F);
    } else {
        alert("Por favor, insira valores válidos para todos os coeficientes.");
    }
});

document.getElementById("clear-btn").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();
    conicType.textContent = "-";
    discriminantInfo.textContent = "-";
    equationDisplay.textContent = "-";
});

document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const preset = presets[btn.dataset.preset];
        document.getElementById("input-a").value = preset.A;
        document.getElementById("input-b").value = preset.B;
        document.getElementById("input-c").value = preset.C;
        document.getElementById("input-d").value = preset.D;
        document.getElementById("input-e").value = preset.E;
        document.getElementById("input-f").value = preset.F;

        drawConic(preset.A, preset.B, preset.C, preset.D, preset.E, preset.F);
    });
});

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const dx = event.clientX - rect.left;
    const dy = event.clientY - rect.top;
    const { wx, wy } = deviceToWorld(dx, dy);

    liveCoords.innerHTML = `
        <strong>Device:</strong> (${Math.round(dx)}, ${Math.round(dy)})<br>
        <strong>World:</strong> (${wx.toFixed(1)}, ${wy.toFixed(1)})
    `;
});

// Inicialização
drawAxes();
