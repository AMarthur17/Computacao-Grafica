// ===============================
// Seleção de elementos da interface (DOM)
// ===============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const liveCoords = document.getElementById("live-coords");
const clickedCoords = document.getElementById("clicked-coords");
const clearBtn = document.getElementById("clear-btn");
const drawLineBtn = document.getElementById("draw-line-btn");
const algorithmSelect = document.getElementById("algorithm-select");
const scrollContainer = document.querySelector(".scroll-container");

let lines = []; // Array para armazenar as retas desenhadas

// ===============================
// Inicialização do canvas
// ===============================
canvas.width = 500;
canvas.height = 500;

// ===============================
// Desenha os eixos do plano cartesiano
// ===============================
function desenharEixosCartesianos() {
    const largura = canvas.width;
    const altura = canvas.height;

    ctx.lineWidth = 0.3;

    // Linha vertical central
    ctx.beginPath();
    ctx.moveTo(largura / 2, 0);
    ctx.lineTo(largura / 2, altura);
    ctx.stroke();

    // Linha horizontal central
    ctx.beginPath();
    ctx.moveTo(0, altura / 2);
    ctx.lineTo(largura, altura / 2);
    ctx.stroke();
}

// ===============================
// Função para desenhar um pixel no canvas
// ===============================
function setPixel(x, y) {
    const canvasX = x + canvas.width / 2;
    const canvasY = canvas.height / 2 - y;

    ctx.fillStyle = "black";
    ctx.fillRect(canvasX, canvasY, 1, 1);
}

// ===============================
// Função para desenhar todas as retas armazenadas
// ===============================
function drawLines() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    desenharEixosCartesianos();
    scrollContainer.innerHTML = "";
    lines.forEach(line => {
        if (line.algorithm === "dda") {
            dda(line.x1, line.y1, line.x2, line.y2);
        } else if (line.algorithm === "ponto-medio") {
            pontoMedio(line.x1, line.y1, line.x2, line.y2);
        }
    });
}

// ===============================
// Evento para exibir as coordenadas do mouse e octante
// ===============================
canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left - canvas.width / 2);
    const y = Math.round(canvas.height / 2 - (event.clientY - rect.top));

    liveCoords.innerHTML = ` 
        <strong>Coordenada:</strong> (${x}, ${y})<br>
        <strong>Octante:</strong> ${atualizarOctante(x, y)}
    `;
});

// ===============================
// Evento para capturar cliques e desenhar retas
// ===============================
let clickCount = 0;
let x1, y1;

canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left - canvas.width / 2);
    const y = Math.round(canvas.height / 2 - (event.clientY - rect.top));

    if (clickCount === 0) {
        x1 = x;
        y1 = y;
        clickCount = 1;

        document.getElementById("x1").value = x1;
        document.getElementById("y1").value = y1;
    } else if (clickCount === 1) {
        lines.push({ x1, y1, x2: x, y2: y, algorithm: algorithmSelect.value });
        clickCount = 0;
        drawLines();
        atualizarPainelDireito();

        document.getElementById("x2").value = x;
        document.getElementById("y2").value = y;
    }
});

// ===============================
// Evento para limpar todas as retas e restaurar o canvas
// ===============================
clearBtn.addEventListener("click", () => {
    lines = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    desenharEixosCartesianos();
    drawLines();
    scrollContainer.innerHTML = "";

    document.getElementById("no-line-message").style.display = "block";
    document.getElementById("clicked-coords").style.display = "none";
    document.getElementById("x1").value = '';
    document.getElementById("y1").value = '';
    document.getElementById("x2").value = '';
    document.getElementById("y2").value = '';
});

// ===============================
// Evento para trocar o algoritmo de desenho de reta
// ===============================
algorithmSelect.addEventListener("change", () => {
    drawLines();
});

// ===============================
// Evento do botão "Desenhar" para criar uma reta via inputs
// ===============================
drawLineBtn.addEventListener("click", () => {
    const x1Value = parseInt(document.getElementById("x1").value);
    const y1Value = parseInt(document.getElementById("y1").value);
    const x2Value = parseInt(document.getElementById("x2").value);
    const y2Value = parseInt(document.getElementById("y2").value);

    if ([x1Value, y1Value, x2Value, y2Value].some(Number.isNaN)) {
        alert("Preencha coordenadas inteiras válidas para desenhar a reta.");
        return;
    }

    lines.push({
        x1: x1Value,
        y1: y1Value,
        x2: x2Value,
        y2: y2Value,
        algorithm: algorithmSelect.value
    });
    drawLines();
    atualizarPainelDireito();
});

// ===============================
// Atualiza painel direito com coordenadas da última reta
// ===============================
function atualizarPainelDireito() {
    if (lines.length === 0) return;

    const lastLine = lines[lines.length - 1];
    document.getElementById("x-initial").textContent = lastLine.x1;
    document.getElementById("y-initial").textContent = lastLine.y1;
    document.getElementById("x-final").textContent = lastLine.x2;
    document.getElementById("y-final").textContent = lastLine.y2;

    document.getElementById("clicked-coords").style.display = "block";
    document.getElementById("no-line-message").style.display = "none";
}

// ===============================
// Inicializa o canvas com o plano cartesiano
// ===============================
desenharEixosCartesianos();

// ===============================
// Função para identificar o octante do ponto
// ===============================
function atualizarOctante(x, y) {
    if (x === 0 && y === 0) return 'Origem';
    if (x === 0 && y !== 0) return 'Eixo Y';
    if (y === 0 && x !== 0) return 'Eixo X';

    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (x > 0 && y > 0) return absX >= absY ? '1o octante' : '2o octante';
    if (x < 0 && y > 0) return absX < absY ? '3o octante' : '4o octante';
    if (x < 0 && y < 0) return absX >= absY ? '5o octante' : '6o octante';
    return absX < absY ? '7o octante' : '8o octante';
}

// ===============================
// Função auxiliar para adicionar coordenadas na barra lateral
// ===============================
function addCoordToSidebar(x, y, count) {
    let coordElement = document.createElement("div");
    coordElement.innerHTML = `<div style="justify-content: space-between; display: flex;"><strong>X${count}:</strong> ${x} <strong>Y${count}:</strong> ${y}</div><hr>`;
    scrollContainer.appendChild(coordElement);
}

// ===============================
// Algoritmo DDA para desenhar retas
// ===============================
function dda(x1, y1, x2, y2) {
    const length = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    const xinc = (x2 - x1) / length;
    const yinc = (y2 - y1) / length;

    let x = x1;
    let y = y1;
    let count = 0;

    setPixel(Math.round(x), Math.round(y));
    addCoordToSidebar(Math.round(x), Math.round(y), count);
    mostrarOitante(x1, y1, x2, y2);

    while (Math.abs(x - x2) > Math.abs(xinc) || Math.abs(y - y2) > Math.abs(yinc)) {
        x += xinc;
        y += yinc;
        count++;
        setPixel(Math.round(x), Math.round(y));
        addCoordToSidebar(Math.round(x), Math.round(y), count);
    }
}

// ===============================
// Algoritmo do Ponto Médio (Bresenham)
// ===============================
function pontoMedio(x1, y1, x2, y2) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let x = x1;
    let y = y1;
    let count = 0;

    const sx = dx >= 0 ? 1 : -1;
    const sy = dy >= 0 ? 1 : -1;

    dx = Math.abs(dx);
    dy = Math.abs(dy);

    mostrarOitante(x1, y1, x2, y2);

    setPixel(x, y);
    addCoordToSidebar(x, y, count);

    if (dx > dy) {
        let d = 2 * dy - dx;
        let incE = 2 * dy;
        let incNE = 2 * (dy - dx);

        for (let i = 0; i < dx; i++) {
            if (d <= 0) {
                d += incE;
                x += sx;
            } else {
                d += incNE;
                x += sx;
                y += sy;
            }
            count++;
            setPixel(x, y);
            addCoordToSidebar(x, y, count);
        }
    } else {
        let d = 2 * dx - dy;
        let incE = 2 * dx;
        let incNE = 2 * (dx - dy);

        for (let i = 0; i < dy; i++) {
            if (d <= 0) {
                d += incE;
                y += sy;
            } else {
                d += incNE;
                y += sy;
                x += sx;
            }
            count++;
            setPixel(x, y);
            addCoordToSidebar(x, y, count);
        }
    }
}

// ===============================
// Função para mostrar o oitante no scroll
// ===============================
function mostrarOitante(x1, y1, x2, y2) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let sx = dx >= 0 ? 1 : -1;
    let sy = dy >= 0 ? 1 : -1;

    dx = Math.abs(dx);
    dy = Math.abs(dy);

    let oitante = '';
    if (sx === 1 && sy === 1 && dx >= dy) oitante = '1º oitante (0° a 45°)';
    else if (sx === 1 && sy === 1 && dx < dy) oitante = '2º oitante (45° a 90°)';
    else if (sx === -1 && sy === 1 && dx < dy) oitante = '3º oitante (90° a 135°)';
    else if (sx === -1 && sy === 1 && dx >= dy) oitante = '4º oitante (135° a 180°)';
    else if (sx === -1 && sy === -1 && dx >= dy) oitante = '5º oitante (180° a 225°)';
    else if (sx === -1 && sy === -1 && dx < dy) oitante = '6º oitante (225° a 270°)';
    else if (sx === 1 && sy === -1 && dx < dy) oitante = '7º oitante (270° a 315°)';
    else if (sx === 1 && sy === -1 && dx >= dy) oitante = '8º oitante (315° a 360°)';

    let oitanteDiv = document.createElement("div");
    oitanteDiv.innerHTML = `<strong>Oitante:</strong> ${oitante}<hr>`;
    scrollContainer.appendChild(oitanteDiv);
}


