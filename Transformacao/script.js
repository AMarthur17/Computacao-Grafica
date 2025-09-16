// ========== TRANSFORMAÇÕES 2D COM COORDENADAS HOMOGÊNEAS ==========

// --- Quadrado como único objeto ---
let originalShapeVertices = [
    {x:-50, y:-50}, {x:50, y:-50}, {x:50, y:50}, {x:-50, y:50}
];
let currentShapeVertices = [...originalShapeVertices];

// --- Matrizes Homogêneas ---
function createTranslationMatrix(tx, ty){ return [[1,0,tx],[0,1,ty],[0,0,1]]; }
function createRotationMatrix(angle){
    const rad = angle * Math.PI/180;
    return [[Math.cos(rad),-Math.sin(rad),0],[Math.sin(rad),Math.cos(rad),0],[0,0,1]];
}
function createScalingMatrix(sx, sy){ return [[sx,0,0],[0,sy,0],[0,0,1]]; }
function createShearingMatrix(shx, shy){ return [[1,shx,0],[shy,1,0],[0,0,1]]; }
function createReflectionMatrix(axis){
    if(axis==='x') return [[1,0,0],[0,-1,0],[0,0,1]];
    if(axis==='y') return [[-1,0,0],[0,1,0],[0,0,1]];
    if(axis==='origin') return [[-1,0,0],[0,-1,0],[0,0,1]];
    return [[1,0,0],[0,1,0],[0,0,1]];
}

// --- Multiplicação ---
function multiplyMatrices(A,B){
    const res=[[0,0,0],[0,0,0],[0,0,0]];
    for(let i=0;i<3;i++) for(let j=0;j<3;j++) for(let k=0;k<3;k++)
        res[i][j]+=A[i][k]*B[k][j];
    return res;
}

function multiplyMatrixVector(M,v){
    const [x,y]=[v.x,v.y];
    return {x: M[0][0]*x+M[0][1]*y+M[0][2],
            y: M[1][0]*x+M[1][1]*y+M[1][2]};
}

// --- Aplicações ---
function applyTRS(tx=0,ty=0,angle=0,sx=1,sy=1){
    const M = multiplyMatrices(createTranslationMatrix(tx,ty),
        multiplyMatrices(createRotationMatrix(angle), createScalingMatrix(sx,sy)));
    currentShapeVertices = originalShapeVertices.map(v=>multiplyMatrixVector(M,v));
    updateDisplay();
}

function applyShear(shx=0, shy=0){
    const M = createShearingMatrix(shx, shy);
    currentShapeVertices = currentShapeVertices.map(v=>multiplyMatrixVector(M,v));
    updateDisplay();
}

function applyReflection(axis='x'){
    const M = createReflectionMatrix(axis);
    currentShapeVertices = currentShapeVertices.map(v=>multiplyMatrixVector(M,v));
    updateDisplay();
}

function resetShape(){
    currentShapeVertices = [...originalShapeVertices];
    updateDisplay();
}

// --- Exibir Vértices ---
function updateDisplay(){
    document.getElementById('original-vertices').textContent =
        JSON.stringify(originalShapeVertices);
    document.getElementById('transformed-vertices').textContent =
        JSON.stringify(currentShapeVertices);
    drawShape();
}

// --- Canvas ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
function drawShape(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2); // origem no centro
    ctx.beginPath();
    const verts = currentShapeVertices;
    ctx.moveTo(verts[0].x, -verts[0].y);
    for(let i=1;i<verts.length;i++) ctx.lineTo(verts[i].x,-verts[i].y);
    ctx.closePath();
    ctx.strokeStyle='red';
    ctx.lineWidth=2;
    ctx.stroke();
    ctx.restore();
}

// --- Eventos ---
document.getElementById('btnApplyTransform').onclick = ()=>{
    applyTRS(
        Number(document.getElementById('translateX').value),
        Number(document.getElementById('translateY').value),
        Number(document.getElementById('rotationAngle').value),
        Number(document.getElementById('scaleX').value),
        Number(document.getElementById('scaleY').value)
    );
};

document.getElementById('btnApplyShear').onclick = ()=>{
    applyShear(
        Number(document.getElementById('shearX').value),
        Number(document.getElementById('shearY').value)
    );
};

document.getElementById('btnReflectX').onclick = ()=>applyReflection('x');
document.getElementById('btnReflectY').onclick = ()=>applyReflection('y');
document.getElementById('btnReflectOrigin').onclick = ()=>applyReflection('origin');
document.getElementById('btnResetShape').onclick = resetShape;

// --- Inicial ---
updateDisplay();
