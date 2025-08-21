// Converte coordenadas de pixel para NDC (Normalized Device Coordinates)
function inpToNdc(x, y, width, height) {
    return {
        ndcx: x / (width - 1),
        ndcy: y / (height - 1)
    };
}

// Converte coordenadas NDC para coordenadas do mundo
function ndcToWd(ndcx, ndcy, Xmax, Xmin, Ymax, Ymin) {
    return {
        worldX: ndcx * (Xmax - Xmin) + Xmin,
        worldY: ndcy * (Ymax - Ymin) + Ymin
    };
}

// Converte coordenadas do mundo para NDC centralizada na origem
function wdToNdcCentral(x, y, Xmax, Xmin, Ymax, Ymin) {
    return {
        ndccx: 2 * ((x - Xmin) / (Xmax - Xmin)) - 1,
        ndccy: 2 * ((y - Ymin) / (Ymax - Ymin)) - 1
    };
}

// Converte NDC centralizada para coordenadas de dispositivo (pixel)
function ndcCentralToDc(ndcx, ndcy, width, height) {
    return {
        dcx: Math.round(ndcx * (width - 1)),
        dcy: Math.round((1 - ndcy) * (height - 1))  // Inverte a coordenada Y
    };
}