# Processamento de Imagens - Transformações Geométricas

## 📋 Descrição do Projeto

Este projeto implementa transformações geométricas em imagens binárias (formato PGM), cumprindo os requisitos do **Item 4** do trabalho de Computação Gráfica.

## 🎯 Requisitos Atendidos

✅ **Translação** - Desloca a imagem em X e Y  
✅ **Escala** - Redimensiona a imagem (aumenta/diminui)  
✅ **Rotação** - Gira a imagem em torno de um ponto  
✅ **Reflexão** - Espelha a imagem horizontal e/ou verticalmente  
✅ **Cisalhamento** - Distorce a imagem (shear)

## 🚀 Funcionalidades

### Carregamento de Imagens

- **Upload manual**: Selecione qualquer arquivo `.pgm` do seu computador
- **Imagens pré-carregadas**: Escolha entre as imagens da pasta `assets/`
  - Lena (original)
  - Lena Gray
  - Lena com Salt & Pepper
  - Airplane

### Transformações Disponíveis

#### 1. 🔄 Translação

Desloca a imagem no plano cartesiano.

- **Parâmetros**: Δx (deslocamento horizontal), Δy (deslocamento vertical)
- **Efeito**: Move toda a imagem sem deformá-la

#### 2. 📏 Escala

Redimensiona a imagem proporcionalmente ou não.

- **Parâmetros**: Sx (escala em X), Sy (escala em Y)
- **Opções**: Nearest Neighbor (mais rápido) ou Bilinear (mais suave)
- **Efeito**: Aumenta ou diminui o tamanho da imagem

#### 3. 🔁 Rotação

Gira a imagem em torno de um ponto.

- **Parâmetros**: Ângulo (em graus), Centro X, Centro Y
- **Efeito**: Rotaciona a imagem, ajustando automaticamente as dimensões

#### 4. 🪞 Reflexão

Espelha a imagem nos eixos.

- **Parâmetros**: Reflexão em X (vertical), Reflexão em Y (horizontal)
- **Efeito**: Inverte a imagem como um espelho

#### 5. ✂️ Cisalhamento

Distorce a imagem inclinando-a.

- **Parâmetros**: Shear X, Shear Y
- **Efeito**: Cria um efeito de "inclinação" na imagem

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura da interface
- **CSS3** - Estilização com gradientes e responsividade
- **JavaScript (Vanilla)** - Toda a lógica de processamento
- **Canvas API** - Renderização de imagens

## 📐 Algoritmos Implementados

### Matrizes de Transformação Homogênea (3x3)

Todas as transformações utilizam **coordenadas homogêneas** para permitir composição de transformações.

```
Translação:        Escala:           Rotação:
[1  0  dx]        [sx  0  0]        [cos -sin  0]
[0  1  dy]        [0  sy  0]        [sin  cos  0]
[0  0   1]        [0   0  1]        [0    0    1]

Reflexão:         Cisalhamento:
[±1  0  0]        [1  shx  0]
[0  ±1  0]        [shy  1  0]
[0   0  1]        [0    0  1]
```

### Interpolação de Pixels

- **Nearest Neighbor**: Mais rápido, seleciona o pixel mais próximo
- **Bilinear**: Mais suave, calcula média ponderada de 4 pixels vizinhos

### Mapeamento Reverso

Para cada pixel da imagem transformada, aplica-se a **transformação inversa** para encontrar o pixel correspondente na imagem original. Isso evita "buracos" na imagem resultante.

## 🎨 Mudanças Espaciais

Conforme solicitado no requisito, o sistema **automaticamente ajusta as dimensões** da imagem após transformações que alteram o espaço:

- **Rotação**: Calcula novo bounding box para não cortar a imagem
- **Cisalhamento**: Expande canvas para acomodar a distorção
- **Escala**: Redimensiona conforme fatores Sx e Sy
- **Translação**: Adiciona espaço nas bordas conforme deslocamento

As dimensões são exibidas em tempo real abaixo de cada canvas.

## 📂 Estrutura de Arquivos

```
Processamento_imagens/
├── index.html          # Interface principal
├── script.js           # Lógica de processamento
├── style.css           # Estilização
├── README.md           # Esta documentação
└── assets/             # Imagens de teste
    ├── lena.pgm
    ├── Lenag.pgm
    ├── Lenasalp.pgm
    └── Airplane.pgm
```

## 🎓 Como Usar

1. **Abra o arquivo `index.html`** em um navegador moderno (Chrome, Firefox, Edge)

2. **Carregue uma imagem**:
   - Método 1: Clique em "Escolher arquivo" e selecione um `.pgm`
   - Método 2: Selecione uma imagem pré-carregada no dropdown

3. **Aplique transformações**:
   - Ajuste os parâmetros na sidebar direita
   - Clique no botão "Aplicar [Transformação]"
   - Veja o resultado no canvas direito

4. **Acompanhe**:
   - Histórico de transformações aplicadas
   - Dimensões originais vs. transformadas
   - Informações da imagem carregada

5. **Controles**:
   - **Resetar**: Volta para a imagem original
   - **Limpar**: Remove tudo e recomeça

## 🧮 Conceitos Teóricos (Referência: Ogê, pág. 42)

### Transformação Afim

Combinação de transformações lineares (rotação, escala, cisalhamento) com translação:

```
[ x' ]   [ a  b  tx ] [ x ]
[ y' ] = [ c  d  ty ] [ y ]
[ 1  ]   [ 0  0   1 ] [ 1 ]
```

### Composição de Transformações

Múltiplas transformações podem ser combinadas multiplicando suas matrizes:

```
T_final = T3 × T2 × T1
```

### Preservação de Informação

- Transformações rígidas (translação, rotação, reflexão): **sem perda**
- Transformações não-rígidas (escala, cisalhamento): **possível aliasing**

## ⚙️ Detalhes de Implementação

### Parser PGM

Suporta dois formatos:

- **P2 (ASCII)**: Valores em texto
- **P5 (Binário)**: Valores em bytes

### Estrutura de Dados

```javascript
class ImageData2D {
    width: número de colunas
    height: número de linhas
    pixels: matriz 2D de valores [0-255]
}
```

### Pipeline de Transformação

1. Usuário define parâmetros
2. Cria matriz de transformação
3. Calcula novo bounding box
4. Para cada pixel destino:
   - Aplica matriz inversa
   - Obtém coordenadas na origem
   - Interpola valor do pixel
5. Renderiza resultado

## 🐛 Tratamento de Erros

- Verifica se imagem foi carregada antes de transformar
- Valida formato PGM (P2/P5)
- Pixels fora dos limites retornam preto (0)
- Matrizes não-inversíveis usam identidade

## 👥 Autores

**Equipe**:

- Arthur Marques
- Rodrigo Gomes
- Vitor Jesus
- Vítor Raimundo

**Professor**: Robson Pequeno de Sousa  
**Disciplina**: Computação Gráfica  
**Instituição**: UEPB

## 📚 Referências

- Marques Filho, Ogê; Vieira Neto, Hugo. **Processamento Digital de Imagens**. Página 42.
- Livro texto: Capítulos sobre transformações geométricas
- Especificação PGM: http://netpbm.sourceforge.net/doc/pgm.html

---

**Pontuação**: Item 4 = 1.0 ponto ✅
