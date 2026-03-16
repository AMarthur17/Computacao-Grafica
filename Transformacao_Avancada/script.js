// Canvas principal onde a janela, a reta e os poligonos sao desenhados.
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const matrixInfo = document.getElementById("matrix-info");
const lineStatus = document.getElementById("line-status");
const polygonStatus = document.getElementById("polygon-status");
const verticesInfo = document.getElementById("vertices-info");

const polygonAlgorithmSelect = document.getElementById("polygon-algorithm");
const lineSpeedInput = document.getElementById("line-speed");
const toggleAnimationBtn = document.getElementById("toggle-animation-btn");

// Tolerancia numerica para comparar pontos e evitar problemas de ponto flutuante.
const EPSILON = 1e-6;

// Formas simples usadas na demonstracao de recorte de poligonos.
const shapes = {
    triangle: [
        { x: 0, y: 160 },
        { x: -170, y: -80 },
        { x: 170, y: -80 }
    ],
    square: [
        { x: -170, y: -170 },
        { x: 170, y: -170 },
        { x: 170, y: 170 },
        { x: -170, y: 170 }
    ],
    pentagon: [
        { x: 0, y: 200 },
        { x: 180, y: 60 },
        { x: 110, y: -170 },
        { x: -110, y: -170 },
        { x: -180, y: 60 }
    ],
    house: [
        { x: -170, y: -170 },
        { x: 170, y: -170 },
        { x: 170, y: 40 },
        { x: 0, y: 210 },
        { x: -170, y: 40 }
    ]
};

// "originalVertices" guarda a forma base selecionada.
// "currentVertices" guarda o estado atual apos transformacoes.
// "lastTransformMatrix" e mostrada no painel direito para facilitar a explicacao.
let originalVertices = cloneVertices(shapes.square);
let currentVertices = cloneVertices(shapes.square);
let lastTransformMatrix = createIdentityMatrix();

// Estado da animacao da reta para Cohen-Sutherland.
const animationState = {
    active: true,
    angleDeg: 0
};

function cloneVertices(vertices) {
    return vertices.map(({ x, y }) => ({ x, y }));
}

// As matrizes abaixo usam coordenadas homogeneas 3x3 para transformacoes 2D.
function createIdentityMatrix() {
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ];
}

function createTranslationMatrix(tx, ty) {
    return [
        [1, 0, tx],
        [0, 1, ty],
        [0, 0, 1]
    ];
}

function createRotationMatrix(angleDeg) {
    const angleRad = angleDeg * Math.PI / 180;
    const cosine = Math.cos(angleRad);
    const sine = Math.sin(angleRad);
    return [
        [cosine, -sine, 0],
        [sine, cosine, 0],
        [0, 0, 1]
    ];
}

function createScalingMatrix(sx, sy) {
    return [
        [sx, 0, 0],
        [0, sy, 0],
        [0, 0, 1]
    ];
}

function createShearMatrix(shx, shy) {
    return [
        [1, shx, 0],
        [shy, 1, 0],
        [0, 0, 1]
    ];
}

function createReflectionMatrix(reflectX, reflectY) {
    return [
        [reflectY ? -1 : 1, 0, 0],
        [0, reflectX ? -1 : 1, 0],
        [0, 0, 1]
    ];
}

function multiplyMatrices(a, b) {
    const result = createIdentityMatrix();

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            result[row][col] = 0;
            for (let index = 0; index < 3; index++) {
                result[row][col] += a[row][index] * b[index][col];
            }
        }
    }

    return result;
}

function applyMatrixToVertex(matrix, vertex) {
    return {
        x: matrix[0][0] * vertex.x + matrix[0][1] * vertex.y + matrix[0][2],
        y: matrix[1][0] * vertex.x + matrix[1][1] * vertex.y + matrix[1][2]
    };
}

function getClipBounds() {
    let xmin = parseFloat(document.getElementById("clip-xmin").value);
    let xmax = parseFloat(document.getElementById("clip-xmax").value);
    let ymin = parseFloat(document.getElementById("clip-ymin").value);
    let ymax = parseFloat(document.getElementById("clip-ymax").value);

    // Corrige a ordem automaticamente caso o usuario informe minimo e maximo invertidos.
    if (xmin > xmax) [xmin, xmax] = [xmax, xmin];
    if (ymin > ymax) [ymin, ymax] = [ymax, ymin];

    document.getElementById("clip-xmin").value = xmin;
    document.getElementById("clip-xmax").value = xmax;
    document.getElementById("clip-ymin").value = ymin;
    document.getElementById("clip-ymax").value = ymax;

    return { xmin, xmax, ymin, ymax };
}

function getClipRectangleVertices(bounds) {
    return [
        { x: bounds.xmin, y: bounds.ymax },
        { x: bounds.xmax, y: bounds.ymax },
        { x: bounds.xmax, y: bounds.ymin },
        { x: bounds.xmin, y: bounds.ymin }
    ];
}

function worldToCanvas(point) {
    return {
        x: canvas.width / 2 + point.x,
        y: canvas.height / 2 - point.y
    };
}

function pointsAlmostEqual(a, b, epsilon = EPSILON) {
    return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}

function pointInsideBounds(point, bounds) {
    return (
        point.x >= bounds.xmin - EPSILON &&
        point.x <= bounds.xmax + EPSILON &&
        point.y >= bounds.ymin - EPSILON &&
        point.y <= bounds.ymax + EPSILON
    );
}

function pointInPolygon(point, polygon) {
    let inside = false;

    // Ray casting: conta quantas vezes um raio horizontal cruza as arestas.
    // Quantidade impar indica ponto interno.
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const pi = polygon[i];
        const pj = polygon[j];
        const intersects = ((pi.y > point.y) !== (pj.y > point.y)) &&
            (point.x < ((pj.x - pi.x) * (point.y - pi.y)) / ((pj.y - pi.y) || EPSILON) + pi.x);

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}

// Desenha uma grade cartesiana para facilitar a visualizacao do recorte.
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fdfdf7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.strokeStyle = "#e6e0d2";
    ctx.lineWidth = 1;

    for (let x = -canvas.width / 2; x <= canvas.width / 2; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, -canvas.height / 2);
        ctx.lineTo(x, canvas.height / 2);
        ctx.stroke();
    }

    for (let y = -canvas.height / 2; y <= canvas.height / 2; y += 40) {
        ctx.beginPath();
        ctx.moveTo(-canvas.width / 2, y);
        ctx.lineTo(canvas.width / 2, y);
        ctx.stroke();
    }

    ctx.strokeStyle = "#adb5bd";
    ctx.lineWidth = 2;

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

function drawClipWindow(bounds) {
    const topLeft = worldToCanvas({ x: bounds.xmin, y: bounds.ymax });
    const width = bounds.xmax - bounds.xmin;
    const height = bounds.ymax - bounds.ymin;

    ctx.save();
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffb703";
    ctx.strokeRect(topLeft.x, topLeft.y, width, height);
    ctx.restore();
}

function drawPolygon(vertices, options) {
    if (!vertices || vertices.length === 0) {
        return;
    }

    const firstPoint = worldToCanvas(vertices[0]);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let index = 1; index < vertices.length; index++) {
        const point = worldToCanvas(vertices[index]);
        ctx.lineTo(point.x, point.y);
    }

    ctx.closePath();

    if (options.fillStyle) {
        ctx.fillStyle = options.fillStyle;
        ctx.fill();
    }

    ctx.strokeStyle = options.strokeStyle;
    ctx.lineWidth = options.lineWidth || 2;
    ctx.stroke();
    ctx.restore();
}

function drawLineSegment(segment, color, lineWidth) {
    if (!segment) {
        return;
    }

    const start = worldToCanvas({ x: segment.x1, y: segment.y1 });
    const end = worldToCanvas({ x: segment.x2, y: segment.y2 });

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
}

// Codigos de regiao usados pelo algoritmo de Cohen-Sutherland.
// Cada bit indica se o ponto esta fora da janela em alguma direcao.
const INSIDE = 0;
const LEFT = 1;
const RIGHT = 2;
const BOTTOM = 4;
const TOP = 8;

function computeRegionCode(x, y, bounds) {
    let code = INSIDE;

    if (x < bounds.xmin) code |= LEFT;
    if (x > bounds.xmax) code |= RIGHT;
    if (y < bounds.ymin) code |= BOTTOM;
    if (y > bounds.ymax) code |= TOP;

    return code;
}

// Implementacao classica de Cohen-Sutherland para recorte de segmentos.
// A cada iteracao, um ponto fora da janela e trazido ate a fronteira adequada.
function clipLineCohenSutherland(line, bounds) {
    let { x1, y1, x2, y2 } = line;

    let code1 = computeRegionCode(x1, y1, bounds);
    let code2 = computeRegionCode(x2, y2, bounds);

    let accepted = false;
    let clipped = false;

    while (true) {
        if ((code1 | code2) === 0) {
            accepted = true;
            break;
        }

        if ((code1 & code2) !== 0) {
            break;
        }

        // Escolhe um dos extremos que esta fora da janela para ser ajustado.
        const codeOut = code1 !== 0 ? code1 : code2;
        let x = 0;
        let y = 0;

        if (codeOut & TOP) {
            x = x1 + ((x2 - x1) * (bounds.ymax - y1)) / (y2 - y1);
            y = bounds.ymax;
        } else if (codeOut & BOTTOM) {
            x = x1 + ((x2 - x1) * (bounds.ymin - y1)) / (y2 - y1);
            y = bounds.ymin;
        } else if (codeOut & RIGHT) {
            y = y1 + ((y2 - y1) * (bounds.xmax - x1)) / (x2 - x1);
            x = bounds.xmax;
        } else if (codeOut & LEFT) {
            y = y1 + ((y2 - y1) * (bounds.xmin - x1)) / (x2 - x1);
            x = bounds.xmin;
        }

        clipped = true;

        // Atualiza exatamente o extremo escolhido e recalcula seu codigo de regiao.
        if (codeOut === code1) {
            x1 = x;
            y1 = y;
            code1 = computeRegionCode(x1, y1, bounds);
        } else {
            x2 = x;
            y2 = y;
            code2 = computeRegionCode(x2, y2, bounds);
        }
    }

    return {
        accepted,
        clipped,
        x1,
        y1,
        x2,
        y2
    };
}

// Gera a reta animada pedida na atividade.
// O comprimento e maior que a diagonal da janela, e o ponto medio fica no centro da janela.
function getRotatingLine(bounds) {
    const center = {
        x: (bounds.xmin + bounds.xmax) / 2,
        y: (bounds.ymin + bounds.ymax) / 2
    };

    const diagonal = Math.hypot(bounds.xmax - bounds.xmin, bounds.ymax - bounds.ymin);
    const length = diagonal * 1.45;
    const halfLength = length / 2;
    const angleRad = animationState.angleDeg * Math.PI / 180;

    const dx = Math.cos(angleRad) * halfLength;
    const dy = Math.sin(angleRad) * halfLength;

    return {
        x1: center.x - dx,
        y1: center.y - dy,
        x2: center.x + dx,
        y2: center.y + dy,
        center,
        length,
        diagonal
    };
}

// Funcoes auxiliares do Sutherland-Hodgman.
// Cada fronteira da janela e tratada como um clipper independente.
function isInsideEdge(point, edge, bounds) {
    switch (edge) {
        case "left":
            return point.x >= bounds.xmin - EPSILON;
        case "right":
            return point.x <= bounds.xmax + EPSILON;
        case "bottom":
            return point.y >= bounds.ymin - EPSILON;
        case "top":
            return point.y <= bounds.ymax + EPSILON;
        default:
            return false;
    }
}

function intersectWithBoundary(start, end, edge, bounds) {
    let x = 0;
    let y = 0;

    if (edge === "left" || edge === "right") {
        x = edge === "left" ? bounds.xmin : bounds.xmax;
        const t = (x - start.x) / ((end.x - start.x) || EPSILON);
        y = start.y + t * (end.y - start.y);
    } else {
        y = edge === "bottom" ? bounds.ymin : bounds.ymax;
        const t = (y - start.y) / ((end.y - start.y) || EPSILON);
        x = start.x + t * (end.x - start.x);
    }

    return { x, y };
}

// Implementacao do recorte de poligonos de Sutherland-Hodgman.
// O poligono e recortado sequencialmente contra esquerda, direita, base e topo.
function clipPolygonSutherlandHodgman(vertices, bounds) {
    const clipEdges = ["left", "right", "bottom", "top"];
    let output = cloneVertices(vertices);

    clipEdges.forEach((edge) => {
        const input = output;
        output = [];

        if (input.length === 0) {
            return;
        }

        let previous = input[input.length - 1];

        input.forEach((current) => {
            const currentInside = isInsideEdge(current, edge, bounds);
            const previousInside = isInsideEdge(previous, edge, bounds);

            // Casos classicos:
            // dentro->dentro: adiciona o ponto atual
            // fora->dentro: adiciona intersecao e ponto atual
            // dentro->fora: adiciona so a intersecao
            // fora->fora: nao adiciona nada
            if (currentInside) {
                if (!previousInside) {
                    output.push(intersectWithBoundary(previous, current, edge, bounds));
                }
                output.push(current);
            } else if (previousInside) {
                output.push(intersectWithBoundary(previous, current, edge, bounds));
            }

            previous = current;
        });
    });

    return output.length >= 3 ? [cleanupPolygon(output)] : [];
}

function computeSegmentIntersection(p1, p2, p3, p4) {
    const r = { x: p2.x - p1.x, y: p2.y - p1.y };
    const s = { x: p4.x - p3.x, y: p4.y - p3.y };
    const denominator = r.x * s.y - r.y * s.x;

    if (Math.abs(denominator) < EPSILON) {
        return null;
    }

    const qp = { x: p3.x - p1.x, y: p3.y - p1.y };
    const t = (qp.x * s.y - qp.y * s.x) / denominator;
    const u = (qp.x * r.y - qp.y * r.x) / denominator;

    if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) {
        return null;
    }

    return {
        x: p1.x + t * r.x,
        y: p1.y + t * r.y,
        tSubject: t,
        tClip: u
    };
}

function createListNode(point, intersection = false, entry = false) {
    return {
        x: point.x,
        y: point.y,
        intersection,
        entry,
        visited: false,
        pair: null,
        next: null
    };
}

function linkCircular(nodes) {
    if (nodes.length === 0) {
        return;
    }

    for (let index = 0; index < nodes.length; index++) {
        nodes[index].next = nodes[(index + 1) % nodes.length];
    }
}

function cleanupPolygon(vertices) {
    const cleaned = [];

    vertices.forEach((point) => {
        if (cleaned.length === 0 || !pointsAlmostEqual(cleaned[cleaned.length - 1], point, 0.5)) {
            cleaned.push({ x: point.x, y: point.y });
        }
    });

    if (cleaned.length > 1 && pointsAlmostEqual(cleaned[0], cleaned[cleaned.length - 1], 0.5)) {
        cleaned.pop();
    }

    return cleaned;
}

function buildIntersectionRecords(subjectPolygon, clipPolygon, bounds) {
    const subjectIntersections = Array.from({ length: subjectPolygon.length }, () => []);
    const clipIntersections = Array.from({ length: clipPolygon.length }, () => []);
    const records = [];

    // Primeiro, localizamos todas as intersecoes entre as arestas do poligono
    // e as arestas da janela de recorte.
    for (let i = 0; i < subjectPolygon.length; i++) {
        const s1 = subjectPolygon[i];
        const s2 = subjectPolygon[(i + 1) % subjectPolygon.length];

        for (let j = 0; j < clipPolygon.length; j++) {
            const c1 = clipPolygon[j];
            const c2 = clipPolygon[(j + 1) % clipPolygon.length];
            const intersection = computeSegmentIntersection(s1, s2, c1, c2);

            if (!intersection) {
                continue;
            }

            const duplicate = records.some((record) =>
                record.subjectEdge === i &&
                pointsAlmostEqual(record.point, intersection, 0.5)
            );

            if (duplicate) {
                continue;
            }

            const record = {
                point: { x: intersection.x, y: intersection.y },
                subjectEdge: i,
                clipEdge: j,
                tSubject: intersection.tSubject,
                tClip: intersection.tClip,
                entry: false,
                subjectNode: null,
                clipNode: null
            };

            subjectIntersections[i].push(record);
            clipIntersections[j].push(record);
            records.push(record);
        }
    }

    // Depois, classificamos cada intersecao como entrada ou saida.
    subjectIntersections.forEach((edgeRecords, edgeIndex) => {
        edgeRecords.sort((a, b) => a.tSubject - b.tSubject);

        let currentlyInside = pointInsideBounds(subjectPolygon[edgeIndex], bounds);

        edgeRecords.forEach((record) => {
            record.entry = !currentlyInside;
            currentlyInside = !currentlyInside;
        });
    });

    clipIntersections.forEach((edgeRecords) => {
        edgeRecords.sort((a, b) => a.tClip - b.tClip);
    });

    return { records, subjectIntersections, clipIntersections };
}

function traverseWeilerPolygon(startNode, maxSteps) {
    const polygon = [{ x: startNode.x, y: startNode.y }];
    let current = startNode.next;
    let guard = 0;

    // Percorre alternando entre a lista do poligono e a lista da janela
    // sempre que encontra um no de intersecao.
    while (current && guard < maxSteps) {
        guard++;

        if (current === startNode) {
            break;
        }

        polygon.push({ x: current.x, y: current.y });

        if (current.intersection) {
            current.visited = true;
            current.pair.visited = true;
            current = current.pair.next;
            continue;
        }

        current = current.next;
    }

    if (guard >= maxSteps) {
        return null;
    }

    return cleanupPolygon(polygon);
}

// Implementacao de Weiler-Atherton usando listas circulares para o poligono e para a janela.
// Esse algoritmo e mais flexivel que Sutherland-Hodgman para casos gerais de recorte.
function clipPolygonWeilerAtherton(vertices, bounds) {
    const clipPolygon = getClipRectangleVertices(bounds);
    const { records, subjectIntersections, clipIntersections } = buildIntersectionRecords(vertices, clipPolygon, bounds);

    if (records.length === 0) {
        if (vertices.every((vertex) => pointInsideBounds(vertex, bounds))) {
            return [cleanupPolygon(vertices)];
        }

        if (clipPolygon.every((corner) => pointInPolygon(corner, vertices))) {
            return [clipPolygon];
        }

        return [];
    }

    // Cada intersecao gera um par de nos: um na lista do poligono e outro na lista da janela.
    records.forEach((record) => {
        record.subjectNode = createListNode(record.point, true, record.entry);
        record.clipNode = createListNode(record.point, true, record.entry);
        record.subjectNode.pair = record.clipNode;
        record.clipNode.pair = record.subjectNode;
    });

    // Monta a lista circular do poligono original com as intersecoes inseridas em ordem.
    const subjectNodes = [];
    for (let index = 0; index < vertices.length; index++) {
        subjectNodes.push(createListNode(vertices[index]));
        subjectIntersections[index].forEach((record) => {
            subjectNodes.push(record.subjectNode);
        });
    }
    linkCircular(subjectNodes);

    // Monta a lista circular da janela com as intersecoes inseridas em ordem.
    const clipNodes = [];
    for (let index = 0; index < clipPolygon.length; index++) {
        clipNodes.push(createListNode(clipPolygon[index]));
        clipIntersections[index].forEach((record) => {
            clipNodes.push(record.clipNode);
        });
    }
    linkCircular(clipNodes);

    const resultPolygons = [];
    const maxTraversalSteps = vertices.length + clipPolygon.length + records.length * 4 + 12;

    // Cada ponto de entrada ainda nao visitado inicia um novo poligono de saida.
    records
        .map((record) => record.subjectNode)
        .filter((node) => node.entry)
        .forEach((entryNode) => {
            if (entryNode.visited) {
                return;
            }

            entryNode.visited = true;
            entryNode.pair.visited = true;

            const clippedPolygon = traverseWeilerPolygon(entryNode, maxTraversalSteps);
            if (clippedPolygon && clippedPolygon.length >= 3) {
                resultPolygons.push(clippedPolygon);
            }
        });

    // Em casos degenerados por coincidencia numerica na borda, usa a outra rotina
    // como fallback para manter a demonstracao executavel e estavel.
    if (
        resultPolygons.length === 0 ||
        resultPolygons.some((polygon) => polygon === null || polygon.length > maxTraversalSteps)
    ) {
        return clipPolygonSutherlandHodgman(vertices, bounds);
    }

    return resultPolygons;
}

function getSelectedPolygonResult(bounds) {
    return polygonAlgorithmSelect.value === "weiler-atherton"
        ? clipPolygonWeilerAtherton(currentVertices, bounds)
        : clipPolygonSutherlandHodgman(currentVertices, bounds);
}

function formatMatrix(matrix) {
    return matrix
        .map((row) => `[${row.map((value) => value.toFixed(2).padStart(7)).join(" ")}]`)
        .join("\n");
}

function formatVertices(vertices) {
    return vertices
        .map((vertex, index) => `V${index + 1}: (${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)})`)
        .join("\n");
}

function renderLineStatus(line, clippedLine) {
    const midpointX = (line.x1 + line.x2) / 2;
    const midpointY = (line.y1 + line.y2) / 2;

    if (!clippedLine.accepted) {
        lineStatus.innerHTML = `
            <strong>Original:</strong> (${line.x1.toFixed(1)}, ${line.y1.toFixed(1)}) ate (${line.x2.toFixed(1)}, ${line.y2.toFixed(1)})<br>
            <strong>Comprimento:</strong> ${line.length.toFixed(2)}<br>
            <strong>Diagonal da janela:</strong> ${line.diagonal.toFixed(2)}<br>
            <strong>Ponto médio:</strong> (${midpointX.toFixed(1)}, ${midpointY.toFixed(1)})<br>
            <strong>Status:</strong> rejeitada por Cohen-Sutherland
        `;
        return;
    }

    lineStatus.innerHTML = `
        <strong>Original:</strong> (${line.x1.toFixed(1)}, ${line.y1.toFixed(1)}) ate (${line.x2.toFixed(1)}, ${line.y2.toFixed(1)})<br>
        <strong>Recortada:</strong> (${clippedLine.x1.toFixed(1)}, ${clippedLine.y1.toFixed(1)}) ate (${clippedLine.x2.toFixed(1)}, ${clippedLine.y2.toFixed(1)})<br>
        <strong>Comprimento:</strong> ${line.length.toFixed(2)}<br>
        <strong>Diagonal da janela:</strong> ${line.diagonal.toFixed(2)}<br>
        <strong>Ponto médio:</strong> (${midpointX.toFixed(1)}, ${midpointY.toFixed(1)})<br>
        <strong>Status:</strong> ${clippedLine.clipped ? "reta parcialmente recortada" : "reta totalmente visivel"}
    `;
}

function renderPolygonStatus(bounds) {
    const sutherland = clipPolygonSutherlandHodgman(currentVertices, bounds);
    const weiler = clipPolygonWeilerAtherton(currentVertices, bounds);
    const selectedName = polygonAlgorithmSelect.value === "weiler-atherton"
        ? "Weiler-Atherton"
        : "Sutherland-Hodgman";
    const selectedPolygons = getSelectedPolygonResult(bounds);

    const selectedCount = selectedPolygons.reduce((sum, polygon) => sum + polygon.length, 0);
    const sutherlandCount = sutherland.reduce((sum, polygon) => sum + polygon.length, 0);
    const weilerCount = weiler.reduce((sum, polygon) => sum + polygon.length, 0);

    // Mostra no painel direito um resumo dos dois algoritmos e do resultado exibido.
    const selectedVerticesText = selectedPolygons.length === 0
        ? "Sem intersecao visivel."
        : selectedPolygons
            .map((polygon, polygonIndex) => {
                const formatted = polygon
                    .map((vertex) => `(${vertex.x.toFixed(1)}, ${vertex.y.toFixed(1)})`)
                    .join(" ");
                return `Resultado ${polygonIndex + 1}: ${formatted}`;
            })
            .join("<br>");

    polygonStatus.innerHTML = `
        <strong>Algoritmo exibido:</strong> ${selectedName}<br>
        <strong>Vértices originais:</strong> ${currentVertices.length}<br>
        <strong>Sutherland-Hodgman:</strong> ${sutherland.length} polígono(s), ${sutherlandCount} vértice(s)<br>
        <strong>Weiler-Atherton:</strong> ${weiler.length} polígono(s), ${weilerCount} vértice(s)<br>
        <strong>Resultado visível:</strong> ${selectedCount} vértice(s)<br><br>
        ${selectedVerticesText}
    `;
}

function applyTransformation() {
    const tx = parseFloat(document.getElementById("tx").value) || 0;
    const ty = parseFloat(document.getElementById("ty").value) || 0;
    const rotation = parseFloat(document.getElementById("rotation").value) || 0;
    const sx = parseFloat(document.getElementById("sx").value) || 1;
    const sy = parseFloat(document.getElementById("sy").value) || 1;
    const shx = parseFloat(document.getElementById("shx").value) || 0;
    const shy = parseFloat(document.getElementById("shy").value) || 0;
    const reflectX = document.getElementById("reflect-x").checked;
    const reflectY = document.getElementById("reflect-y").checked;

    // A matriz combinada e montada na ordem em que as transformacoes sao aplicadas.
    let matrix = createIdentityMatrix();
    matrix = multiplyMatrices(matrix, createTranslationMatrix(tx, ty));
    matrix = multiplyMatrices(matrix, createRotationMatrix(rotation));
    matrix = multiplyMatrices(matrix, createScalingMatrix(sx, sy));
    matrix = multiplyMatrices(matrix, createShearMatrix(shx, shy));
    matrix = multiplyMatrices(matrix, createReflectionMatrix(reflectX, reflectY));

    lastTransformMatrix = matrix;
    currentVertices = currentVertices.map((vertex) => applyMatrixToVertex(matrix, vertex));
    drawScene();
}

function resetShape() {
    const selectedShape = document.getElementById("shape-select").value;
    originalVertices = cloneVertices(shapes[selectedShape]);
    currentVertices = cloneVertices(shapes[selectedShape]);
    lastTransformMatrix = createIdentityMatrix();
    drawScene();
}

function resetLineAnimation() {
    animationState.angleDeg = 0;
    drawScene();
}

function updateInfoPanels(bounds, line, clippedLine) {
    matrixInfo.textContent = formatMatrix(lastTransformMatrix);
    verticesInfo.textContent = formatVertices(currentVertices);
    renderLineStatus(line, clippedLine);
    renderPolygonStatus(bounds);
}

function drawScene() {
    const bounds = getClipBounds();
    const line = getRotatingLine(bounds);
    const clippedLine = clipLineCohenSutherland(line, bounds);
    // Apenas um dos algoritmos de poligono e desenhado por vez no canvas,
    // mas ambos sao calculados para comparacao no painel lateral.
    const clippedPolygons = getSelectedPolygonResult(bounds);

    drawGrid();
    drawClipWindow(bounds);

    drawPolygon(currentVertices, {
        strokeStyle: "#264653",
        lineWidth: 2,
        fillStyle: "rgba(38, 70, 83, 0.10)"
    });

    clippedPolygons.forEach((polygon) => {
        drawPolygon(polygon, {
            strokeStyle: "#2a9d8f",
            lineWidth: 3,
            fillStyle: "rgba(42, 157, 143, 0.28)"
        });
    });

    // A reta original e desenhada primeiro; a parte visivel aparece por cima.
    drawLineSegment(line, "#b56576", 2);
    if (clippedLine.accepted) {
        drawLineSegment(clippedLine, "#d62828", 4);
    }

    updateInfoPanels(bounds, line, clippedLine);
}

function animationLoop() {
    if (animationState.active) {
        // Angulo negativo produz rotacao no sentido horario.
        const step = parseFloat(lineSpeedInput.value) || 2;
        animationState.angleDeg -= step;
        drawScene();
    }

    requestAnimationFrame(animationLoop);
}

document.getElementById("shape-select").addEventListener("change", resetShape);
document.getElementById("reset-shape-btn").addEventListener("click", resetShape);
document.getElementById("apply-transform-btn").addEventListener("click", applyTransformation);
document.getElementById("apply-window-btn").addEventListener("click", drawScene);
document.getElementById("reset-line-btn").addEventListener("click", resetLineAnimation);
polygonAlgorithmSelect.addEventListener("change", drawScene);

toggleAnimationBtn.addEventListener("click", () => {
    animationState.active = !animationState.active;
    toggleAnimationBtn.textContent = animationState.active ? "Pausar animação" : "Retomar animação";
    drawScene();
});

lineSpeedInput.addEventListener("change", drawScene);

drawScene();
requestAnimationFrame(animationLoop);
