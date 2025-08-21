// ===============================
// Sele��o de elementos da interface (DOM)
// ===============================
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const liveCoords = document.getElementById("live-coords");
const clickedCoords = document.getElementById("clicked-coords");
let selectedPixel = null;

// ===============================
// Inicializa��o dos limites do sistema de coordenadas do mundo
// ===============================
let Xmax = 100.3;
let Xmin = 10.5;
let Ymax = 100.4;
let Ymin = 15.2;

// ===============================
// Atualiza��o dos valores dos limites na interface
// ===============================
document.getElementById("xmin").textContent = Xmin;
document.getElementById("xmax").textContent = Xmax;
document.getElementById("ymin").textContent = Ymin;
document.getElementById("ymax").textContent = Ymax;

// ===============================
// Evento para atualizar limites do mundo via interface
// ===============================
document.getElementById("set-coordinates-btn").addEventListener("click", () => {
    const inputXmax = parseFloat(document.getElementById("input-xmax").value);
    const inputXmin = parseFloat(document.getElementById("input-xmin").value);
    const inputYmax = parseFloat(document.getElementById("input-ymax").value);
    const inputYmin = parseFloat(document.getElementById("input-ymin").value);

    if (!isNaN(inputXmax) && !isNaN(inputXmin) && !isNaN(inputYmax) && !isNaN(inputYmin)) {
        Xmax = inputXmax;
        Xmin = inputXmin;
        Ymax = inputYmax;
        Ymin = inputYmin;

        document.getElementById("xmin").textContent = Xmin;
        document.getElementById("xmax").textContent = Xmax;
        document.getElementById("ymin").textContent = Ymin;
        document.getElementById("ymax").textContent = Ymax;
        
        // Redesenha o pixel selecionado se existir
        if (selectedPixel) {
            setPixel(selectedPixel.x, selectedPixel.y);
        }
    } else {
        alert("Por favor, insira valores v�lidos para as coordenadas.");
    }
});

// ===============================
// Fun��o para desenhar um pixel no canvas
// ===============================
function setPixel(x, y) {
    // Limpa apenas o pixel anterior (se existir)
    if (selectedPixel) {
        ctx.clearRect(selectedPixel.x - 2, canvas.height - selectedPixel.y - 2, 5, 5);
    }
    
    // Desenha o novo pixel
    ctx.fillStyle = "red";
    ctx.fillRect(x - 2, canvas.height - y - 2, 5, 5); // Desenha um quadrado 5x5 para ser mais vis�vel
    selectedPixel = { x, y };
}

// ===============================
// Evento para mostrar as coordenadas em tempo real ao mover o mouse
// ===============================
canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(canvas.height - (event.clientY - rect.top));

    // Calcula as convers�es entre os sistemas de coordenadas
    const { ndcx, ndcy } = inpToNdc(x, y, canvas.width, canvas.height);
    const world = ndcToWd(ndcx, ndcy, Xmax, Xmin, Ymax, Ymin);
    const ndcCentral = wdToNdcCentral(world.worldX, world.worldY, Xmax, Xmin, Ymax, Ymin);
    const device = ndcCentralToDc(ndcCentral.ndccx, ndcCentral.ndccy, canvas.width, canvas.height);

    // Atualiza o painel de coordenadas ao vivo
    liveCoords.innerHTML = `
        <strong>Coordenadas de Mundo:</strong><br> (${world.worldX.toFixed(3)}, ${world.worldY.toFixed(3)})<br><br>
        <strong>Coordenadas NDC:</strong><br> (${ndcx.toFixed(3)}, ${ndcy.toFixed(3)})<br><br>
        <strong>Coordenadas NDC Centralizada:</strong><br> (${ndcCentral.ndccx.toFixed(3)}, ${ndcCentral.ndccy.toFixed(3)})<br><br>
        <strong>Coordenadas de Dispositivo:</strong><br> (${x}, ${y})
    `;
});

// ===============================
// Evento para mostrar e desenhar o pixel clicado
// ===============================
canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(canvas.height - (event.clientY - rect.top));
    selectedPixel = { x, y };
    setPixel(x, y);

    // Calcula as convers�es entre os sistemas de coordenadas
    const { ndcx, ndcy } = inpToNdc(x, y, canvas.width, canvas.height);
    const world = ndcToWd(ndcx, ndcy, Xmax, Xmin, Ymax, Ymin);
    const ndcCentral = wdToNdcCentral(world.worldX, world.worldY, Xmax, Xmin, Ymax, Ymin);

    // Atualiza o painel de coordenadas do clique
    clickedCoords.innerHTML =
        `   <strong>Coordenadas de Mundo:</strong><br> (${world.worldX.toFixed(3)}, ${world.worldY.toFixed(3)})<br><br>
        <strong>Coordenadas NDC:</strong><br> (${ndcx.toFixed(3)}, ${ndcy.toFixed(3)})<br><br>
        <strong>Coordenadas NDC Centralizada:</strong><br> (${ndcCentral.ndccx.toFixed(3)}, ${ndcCentral.ndccy.toFixed(3)})<br><br>
        <strong>Coordenadas de Dispositivo:</strong><br> (${x}, ${y})
    `;
});

// ===============================
// Evento para definir um ponto do mundo e desenhar no canvas
// ===============================
document.getElementById("set-world-btn").addEventListener("click", () => {
    const inputX = parseFloat(document.getElementById("input-x").value);
    const inputY = parseFloat(document.getElementById("input-y").value);

    if (isNaN(inputX) || isNaN(inputY)) {
        alert("Por favor, insira coordenadas v�lidas.");
        return;
    }

    if (inputX < Xmin || inputX > Xmax || inputY < Ymin || inputY > Ymax) {
        alert(`As coordenadas est�o fora do intervalo permitido:\nX: [${Xmin}, ${Xmax}], Y: [${Ymin}, ${Ymax}]`);
        return;
    }

    // Converte coordenadas do mundo para NDC
    const ndcx = (inputX - Xmin) / (Xmax - Xmin);
    const ndcy = (inputY - Ymin) / (Ymax - Ymin);

    // Converte NDC para coordenadas de dispositivo (pixel)
    const pixelX = Math.round(ndcx * (canvas.width - 1));
    const pixelY = Math.round((1 - ndcy) * (canvas.height - 1)); // Inverte Y

    // Converte para NDC centralizada
    const ndccx = 2 * ndcx - 1;
    const ndccy = 2 * ndcy - 1;

    // Desenha o pixel no canvas
    setPixel(pixelX, pixelY);

    // Atualiza o painel de coordenadas do ponto inserido
    clickedCoords.innerHTML = `
        <strong>Coordenadas de Mundo:</strong><br> (${inputX.toFixed(3)}, ${inputY.toFixed(3)})<br><br>
        <strong>Coordenadas NDC:</strong><br> (${ndcx.toFixed(3)}, ${ndcy.toFixed(3)})<br><br>
        <strong>Coordenadas NDC Centralizada:</strong><br> (${ndccx.toFixed(3)}, ${ndccy.toFixed(3)})<br><br>
        <strong>Coordenadas de Dispositivo:</strong><br> (${pixelX}, ${pixelY}) 
    `;
});