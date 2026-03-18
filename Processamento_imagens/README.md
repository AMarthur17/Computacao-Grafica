# Processamento de Imagens - Filtros e Operações

## 📋 Descrição do Projeto

Este projeto implementa **8 Filtros**, **Operações Aritméticas** e **Operadores Lógicos** para processamento de imagens em formato PGM, cumprindo os requisitos da **Aula 9**.

## 🎯 Funcionalidades Implementadas

### 1️⃣ **8 Filtros**

- ✅ **Filtro de Mediana** - Remove ruído preservando bordas
- ✅ **Filtro de Média** - Suavização por convolução
- ✅ **Filtro Gaussiano** - Suavização gaussiana customizável
- ✅ **Filtro Sobel** - Detecção de bordas com gradiente
- ✅ **Filtro Laplaciano** - Detecção de mudanças abruptas
- ✅ **Filtro Passa Alta** - Realce de detalhes
- ✅ **Filtro de Realce** - Aumento de contraste
- ✅ **Detecção de Bordas** - Identificação de contornos

### 2️⃣ **Operações Aritméticas entre Imagens**

- ✅ **Adição**: I1 + I2
- ✅ **Subtração**: I1 - I2 (com valor absoluto)
- ✅ **Multiplicação**: I1 × I2
- ✅ **Divisão**: I1 ÷ I2 (com proteção contra divisão por zero)

### 3️⃣ **Operadores Lógicos entre Imagens**

- ✅ **OR**: I1 | I2
- ✅ **AND**: I1 & I2
- ✅ **XOR**: I1 ^ I2

## 🖼️ Imagens de Teste

### Testadas com:
- **lena.pgm** - Imagem padrão
- **lenag.pgm** - Versão em tons de cinza (para filtro de média)
- **lenasalp.pgm** - Versão com ruído Salt & Pepper (para filtro de mediana)
- **Airplane.pgm** - Imagem alternativa

## 🚀 Como Usar

### 1. **Carregamento de Imagens**
- Use o seletor na sidebar esquerda para escolher imagens pré-carregadas
- Ou faça upload de arquivos PGM do seu computador

### 2. **Aplicar Filtros**
- Selecione a **Imagem 1** e clique em um dos 8 botões de filtro
- O resultado aparecerá no canvas central

### 3. **Operações entre Imagens**
- Carregue **Imagem 1** e **Imagem 2**
- Clique em um botão de operação (Adição, Subtração, etc.)
- O resultado será exibido

### 4. **Operadores Lógicos**
- Carregue **Imagem 1** e **Imagem 2**
- Clique em OR, AND ou XOR
- Veja a imagem binária resultado

## ⚙️ Parâmetros Ajustáveis

- **Tamanho do Kernel**: 3x3, 5x5 ou 7x7 (para filtros convolucionais)
- **Fator de Realce**: 0.5 a 3.0 (controla intensidade do realce)

## 📊 Características Técnicas

- **Parser PGM**: Suporta formatos P2 (ASCII) e P5 (binário)
- **Processamento em Tempo Real**: Aplicação instantânea de filtros
- **Interpolação**: Nearest Neighbor para eficiência
- **Conversão Automática**: Normalização de valores entre 0-255
- **Tratamento de Bordas**: Extrapolação zero para pixels fora dos limites

## 🎨 Interface

- **Layout em 3 Colunas**: Imagem 1, Imagem 2 e Resultado
- **Tema Escuro**: Reduz fadiga visual
- **Botões Coloridos**: Cada categoria tem cor diferente
  - 🟢 Verde: Filtros
  - 🟠 Laranja: Operações Aritméticas
  - 🟣 Roxo: Operadores Lógicos

## 📝 Notas de Implementação

- Filtros aplicados apenas na Imagem 1
- Operações requerem ambas as imagens
- Imagens são redimensionadas para o menor tamanho comum em operações
- Valores de pixel limitados automaticamente ao intervalo [0, 255]

## 🏆 Requisitos Atendidos

✅ Item 5 - Aula 9  
✅ 8 Filtros implementados  
✅ Operações aritméticas completas  
✅ Operadores lógicos com 3 tipos  
✅ Interface web interativa  
✅ Suporte a imagens PGM  


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
