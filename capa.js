/* Capa do site: mapa em pixel art (estilo 32 bits) desenhado pixel a pixel num canvas.
   Uma estrada principal atravessa o mapa e cada desvio leva a um ponto turístico.
   Carro, moto e bicicleta entram nos desvios, contornam a rotatória e voltam. */
(function () {
  'use strict';

  var W = 416, H = 180;
  var tela = document.querySelector('.cena canvas');
  if (!tela) return;
  var ctx = tela.getContext('2d');

  // ---------------------------------------------------------------- paletas
  var PALETAS = {
    dia: {
      morro1: '#c3e2cf', morro2: '#a8d2bb', campo1: '#cfe9c4', campo2: '#b6dcaa', campo3: '#9bcb92',
      grama: '#86ba80', gramaLuz: '#e2f3d6', borda: '#f2dcbd', bordaEscura: '#d4b893',
      asfalto: '#2b3134', asfaltoLuz: '#3b4347', faixa: '#f2b705', faixaDesvio: '#8c9599',
      pedra: '#4f6158', pedraLuz: '#6f857a', mata: '#3f5a49', estatua: '#efe9db', estatuaSombra: '#bdb5a3',
      masp: '#cf3a2f', maspSombra: '#962219', vidro: '#2f444b', vidroLuz: '#6f9099',
      concreto: '#f3eee2', concretoSombra: '#c4bba6', contorno: '#6f7a72', forte: '#e6d3a8', forteSombra: '#c1aa7c',
      preto: '#1d2224', branco: '#f6f2e8', agua: '#6eb5dc', aguaLuz: '#c4e6f6', aguaFunda: '#4f97c0',
      arvore: '#3f9a5f', arvoreLuz: '#6cc183', arvoreSombra: '#26683d', tronco: '#7a5233', sombra: 'rgba(30,60,40,.22)',
      sol: '#ffd66b', solHalo: '#ffe8a6', nuvem: '#ffffff', nuvemSombra: '#dbe9f2',
      carro: '#2e9e68', carroLuz: '#63c48f', janela: '#cfe7f7', moto: '#f2b705', piloto: '#1f3a5f',
      bike: '#e5484d', ciclista: '#f28c28', capacete: '#f6f2e8', farol: '#fff3c4', lanterna: '#e5484d',
      flor1: '#e5484d', flor2: '#f2b705', flor3: '#ffffff', luzJanela: null, noite: false,
      parede: '#efe6d2', telhado: '#b5482f', caminhao: '#e9e4d6', cabine: '#c8322b', pele: ['#e0ac69', '#8d5524', '#f1c27d', '#c68642']
    },
    noite: {
      morro1: '#17392b', morro2: '#1d4535', campo1: '#183b2b', campo2: '#143223', campo3: '#10281c',
      grama: '#0d2117', gramaLuz: '#24503a', borda: '#4c4536', bordaEscura: '#3a3429',
      asfalto: '#1a1f21', asfaltoLuz: '#262d30', faixa: '#d9a404', faixaDesvio: '#4a5357',
      pedra: '#0f1915', pedraLuz: '#1d2c25', mata: '#13241c', estatua: '#f6f2e8', estatuaSombra: '#c9c2b0',
      masp: '#a52a22', maspSombra: '#6e1812', vidro: '#2a2a1c', vidroLuz: '#f2c94c',
      concreto: '#c9c2b0', concretoSombra: '#8e8776', contorno: '#070a09', forte: '#9c8b66', forteSombra: '#6f6247',
      preto: '#0b0e0f', branco: '#d8d2c2', agua: '#1d4f6e', aguaLuz: '#5b95b8', aguaFunda: '#143a52',
      arvore: '#16452c', arvoreLuz: '#215f3d', arvoreSombra: '#0d2e1c', tronco: '#3a281a', sombra: 'rgba(0,0,0,.3)',
      sol: '#f3efe6', solHalo: '#3a4a5c', nuvem: null, nuvemSombra: null,
      carro: '#46b985', carroLuz: '#7fd6aa', janela: '#9fc3d6', moto: '#f2b705', piloto: '#2c5282',
      bike: '#ff6166', ciclista: '#ff9f43', capacete: '#f6f2e8', farol: '#fff3c4', lanterna: '#ff5a5f',
      flor1: '#9e3a3d', flor2: '#9c7a10', flor3: '#7d8a83', luzJanela: '#f2c94c', noite: true,
      parede: '#8f8a7c', telhado: '#6e2a1c', caminhao: '#b9b4a6', cabine: '#a52a22', pele: ['#b98a55', '#6b4120', '#c9a066', '#9c6a35']
    }
  };
  var P;

  // ---------------------------------------------------------------- utilidades
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function limiar(x, y) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function sorteio(semente) {
    return function () {
      semente = (semente + 0x6D2B79F5) | 0;
      var t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var g; // contexto em que as primitivas desenham
  function px(x, y, c) { if (c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); } }
  function ret(x, y, w, h, c) { if (c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); } }
  function linha(x0, y0, x1, y1, c, passo) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy, i = 0;
    for (;;) {
      if (!passo || i % passo === 0) px(x0, y0, c);
      i++;
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  // Polígono preenchido por varredura; cor(x, y) decide a cor de cada pixel.
  function poligono(pts, cor) {
    var minY = Infinity, maxY = -Infinity;
    pts.forEach(function (p) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var yc = y + 0.5, xs = [];
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort(function (m, n) { return m - n; });
      for (var k = 0; k + 1 < xs.length; k += 2)
        for (var x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) px(x, y, cor(x, y));
    }
  }
  function disco(cx, cy, r, cor) {
    var R = Math.ceil(r), r2 = r * r + r * 0.6;
    for (var y = -R; y <= R; y++) for (var x = -R; x <= R; x++)
      if (x * x + y * y <= r2) px(Math.round(cx) + x, Math.round(cy) + y, typeof cor === 'function' ? cor(x, y) : cor);
  }

  // Catmull-Rom denso (um ponto a cada ~0,5 px) passando por todos os pontos.
  function curva(pts) {
    var out = [], marcas = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 2));
      marcas.push(out.length);
      for (var j = 0; j < n; j++) {
        var t = j / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(function (k) {
          return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        }));
      }
    }
    marcas.push(out.length);
    out.push(pts[pts.length - 1].slice());
    return { pts: out, marcas: marcas };
  }

  // ---------------------------------------------------------------- mapa
  var ANCORAS = [[-14, 168], [48, 165], [176, 161], [262, 135], [312, 101], [350, 64], [440, -22]];
  var PRINCIPAL = curva(ANCORAS);
  var ANEL = 7; // raio por onde os veículos contornam a rotatória
  var PONTOS = [ // âncora na principal, caminho do desvio (termina no centro da rotatória)
    { nome: 'floripa', ancora: 1, caminho: [[48, 165], [54, 140], [58, 114], [60, 101]] },
    { nome: 'rio', ancora: 2, caminho: [[176, 161], [204, 142], [207, 114], [196, 99]] },
    { nome: 'brasilia', ancora: 3, caminho: [[262, 135], [292, 149], [330, 157], [352, 158]] },
    { nome: 'masp', ancora: 4, caminho: [[312, 101], [290, 92], [264, 86], [249, 85]] },
    { nome: 'salvador', ancora: 5, caminho: [[350, 64], [366, 72], [380, 83]] }
  ];
  PONTOS.forEach(function (p) {
    var c = p.caminho[p.caminho.length - 1];
    p.centro = c;
    p.desvio = curva(p.caminho).pts.filter(function (q) { return Math.hypot(q[0] - c[0], q[1] - c[1]) >= ANEL; });
  });
  // Paradas de beira de estrada: um recuo que sai da principal pela esquerda e volta mais à frente.
  function indiceX(x) { for (var i = 0; i < PRINCIPAL.pts.length; i++) if (PRINCIPAL.pts[i][0] >= x) return i; return PRINCIPAL.pts.length - 1; }
  function direita(i) { // vetor para a direita de quem anda na principal
    var a = PRINCIPAL.pts[Math.max(0, i - 2)], b = PRINCIPAL.pts[Math.min(PRINCIPAL.pts.length - 1, i + 2)];
    var dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    return [-dy / n, dx / n];
  }
  var RECUOS = [
    { nome: 'posto', i0: indiceX(80), i1: indiceX(142), fundo: 21, predio: 11 },
    { nome: 'restaurante', i0: indiceX(314), i1: indiceX(348), fundo: 25, predio: 14 }
  ];
  RECUOS.forEach(function (r) {
    r.pts = [];
    for (var i = r.i0; i <= r.i1; i++) {
      var u = (i - r.i0) / (r.i1 - r.i0), o = r.fundo * Math.pow(Math.sin(Math.PI * u), 0.55), n = direita(i), p = PRINCIPAL.pts[i];
      r.pts.push([p[0] - n[0] * o, p[1] - n[1] * o]);
    }
    var nm = direita(Math.floor((r.i0 + r.i1) / 2));
    r.meio = r.pts[Math.floor(r.pts.length / 2)];
    r.esq = [-nm[0], -nm[1]];
    r.base = [Math.round(r.meio[0] + r.esq[0] * r.predio), Math.round(r.meio[1] + r.esq[1] * r.predio)];
    r.porta = r.nome === 'posto' ? [r.base[0] + 23, r.base[1] + 2] : [r.base[0], r.base[1] + 3]; // onde as pessoas entram
  });

  // ---------------------------------------------------------------- cenário estático
  function topoCampo(x) { return 40 + 3 * Math.sin(x / 37) + 2 * Math.sin(x / 13 + 1); }

  function ceuEMorros() {
    if (P.noite) {
      disco(338, 20, 6, function (x, y) { return (x + y > 3 && hash(x + 50, y + 50) > 0.6) ? P.estatuaSombra : P.sol; });
    } else {
      disco(330, 32, 13, function (x, y) { return limiar(x + 330, y + 32) > 0.5 ? P.solHalo : null; });
      disco(330, 32, 10, P.sol);
    }
    for (var x = 0; x < W; x++) {
      var h1 = 29 + 6 * Math.sin(x / 51 + 0.5) + 3 * Math.sin(x / 23);
      var h2 = 35 + 5 * Math.sin(x / 41 + 2) + 2 * Math.sin(x / 17);
      for (var y = Math.round(h1); y < 46; y++) px(x, y, P.morro1);
      for (y = Math.round(h2); y < 46; y++) px(x, y, (y === Math.round(h2) && limiar(x, y) > 0.5) ? P.morro1 : P.morro2);
    }
    for (x = 0; x < W; x++) {
      for (y = Math.round(topoCampo(x)); y < H; y++) {
        var t = (y - 40) / (H - 40), cor;
        if (t < 0.5) cor = t * 2 > limiar(x, y) ? P.campo2 : P.campo1;
        else cor = (t - 0.5) * 2 > limiar(x, y) ? P.campo3 : P.campo2;
        px(x, y, cor);
      }
    }
    var r = sorteio(7);
    for (var i = 0; i < 1400; i++) { // tufos de grama e flores
      var gx = Math.floor(r() * W), gy = Math.floor(44 + r() * (H - 44)), k = r();
      if (k < 0.55) { px(gx, gy, P.grama); px(gx + 1, gy - 1, P.grama); }
      else if (k < 0.9) px(gx, gy, P.gramaLuz);
      else px(gx, gy, [P.flor1, P.flor2, P.flor3][i % 3]);
    }
  }

  function ponte(bx, by) { // Ponte Hercílio Luz, Florianópolis
    for (var y = by - 5; y <= by; y++) {
      var m = 44 - Math.max(0, y - (by - 2)) * 3;
      for (var x = bx - m; x <= bx + m; x++) px(x, y, y === by - 5 ? P.aguaLuz : (limiar(x, y) > 0.7 ? P.aguaFunda : P.agua));
    }
    var topo = by - 34, deck = by - 12;
    [-17, 16].forEach(function (d) { ret(bx + d, topo, 2, by - topo, P.pedra); ret(bx + d + 1, topo, 1, by - topo, P.preto); ret(bx + d - 1, by - 3, 4, 3, P.pedra); });
    var cabo = function (x) { var u = (x - bx) / 17; return Math.abs(x - bx) <= 17 ? topo + (1 - u * u) * 18 : null; };
    for (var x2 = bx - 17; x2 <= bx + 17; x2++) {
      var cy = Math.round(cabo(x2));
      px(x2, cy, P.preto);
      if ((x2 - bx) % 3 === 0) for (var yy = cy + 1; yy < deck; yy++) px(x2, yy, P.pedraLuz);
    }
    linha(bx - 42, deck, bx - 17, topo, P.preto); linha(bx + 42, deck, bx + 17, topo, P.preto);
    for (var xs = bx - 39; xs < bx - 17; xs += 3) { var ys = deck - Math.round((xs - (bx - 42)) * (deck - topo) / 25); for (var y3 = ys + 1; y3 < deck; y3++) px(xs, y3, P.pedraLuz); }
    for (xs = bx + 20; xs <= bx + 40; xs += 3) { ys = deck - Math.round(((bx + 42) - xs) * (deck - topo) / 25); for (y3 = ys + 1; y3 < deck; y3++) px(xs, y3, P.pedraLuz); }
    ret(bx - 44, deck, 89, 2, P.pedra); ret(bx - 44, deck + 2, 89, 1, P.preto);
  }

  function rio(bx, by) { // Urca, Pão de Açúcar e Corcovado com o Cristo Redentor
    var tinta = function (pico) {
      return function (x, y) {
        if (hash(x, y) < 0.06) return P.mata;
        var d = pico - x; // lado esquerdo iluminado, com pontilhado só perto da crista
        if (d > 2) return P.pedraLuz;
        if (d > -1) return limiar(x, y) > 0.5 ? P.pedraLuz : P.pedra;
        return P.pedra;
      };
    };
    poligono([[bx - 47, by], [bx - 43, by - 9], [bx - 38, by - 12], [bx - 34, by - 10], [bx - 31, by]], tinta(bx - 38));
    poligono([[bx - 35, by], [bx - 32, by - 18], [bx - 28, by - 28], [bx - 23, by - 31], [bx - 18, by - 28], [bx - 14, by - 16], [bx - 11, by]], tinta(bx - 23));
    poligono([[bx - 12, by], [bx + 4, by - 22], [bx + 11, by - 38], [bx + 14, by - 41], [bx + 17, by - 40], [bx + 22, by - 26], [bx + 35, by]], tinta(bx + 14));
    linha(bx - 38, by - 13, bx - 23, by - 32, P.preto, 2); // cabo do bondinho
    ret(bx + 13, by - 49, 2, 8, P.estatua); ret(bx + 14, by - 49, 1, 8, P.estatuaSombra);
    ret(bx + 10, by - 47, 8, 1, P.estatua); ret(bx + 13, by - 51, 2, 2, P.estatua);
  }

  function masp(bx, by) { // MASP, São Paulo
    ret(bx - 20, by + 1, 40, 1, P.sombra);
    ret(bx - 17, by - 22, 34, 11, P.vidro);
    for (var y = by - 20; y < by - 11; y += 3) ret(bx - 16, y, 32, 1, P.vidroLuz);
    if (P.luzJanela) { var r = sorteio(3); for (var i = 0; i < 14; i++) px(bx - 16 + Math.floor(r() * 32), by - 21 + Math.floor(r() * 3) * 3, P.luzJanela); }
    [-20, 18].forEach(function (d) { ret(bx + d, by - 26, 2, 26, P.masp); ret(bx + d + 1, by - 24, 1, 24, P.maspSombra); });
    ret(bx - 20, by - 26, 40, 3, P.masp); ret(bx - 20, by - 24, 40, 1, P.maspSombra);
    ret(bx - 20, by - 11, 40, 2, P.masp); ret(bx - 20, by - 10, 40, 1, P.maspSombra);
  }

  function congresso(bx, by) { // Congresso Nacional, Brasília
    ret(bx - 26, by + 1, 54, 1, P.sombra);
    // contorno escuro primeiro, para o concreto claro não sumir no campo
    ret(bx - 27, by - 5, 54, 6, P.contorno);
    [-4, 1].forEach(function (d) { ret(bx + d - 1, by - 31, 5, 27, P.contorno); });
    for (var c = 0; c < 6; c++) { var mc = 10 - c; ret(bx + 14 - mc, by - 11 + c, 2 * mc, 1, P.contorno); }
    disco(bx - 14, by - 4, 7, function (x, y) { return y > 0 ? null : P.contorno; });
    ret(bx - 26, by - 4, 52, 4, P.concreto); ret(bx - 26, by - 1, 52, 1, P.concretoSombra);
    [-4, 1].forEach(function (d) { ret(bx + d, by - 30, 3, 26, P.concreto); ret(bx + d + 2, by - 30, 1, 26, P.concretoSombra); });
    ret(bx - 4, by - 19, 8, 2, P.concretoSombra);
    if (P.luzJanela) for (var y = by - 28; y < by - 6; y += 2) { if (hash(bx, y) > 0.4) px(bx - 3, y, P.luzJanela); if (hash(y, bx) > 0.5) px(bx + 2, y, P.luzJanela); }
    for (var i = 0; i < 6; i++) { var m = 9 - i; ret(bx + 14 - m, by - 10 + i, 2 * m, 1, i === 0 ? P.branco : (i > 3 ? P.concretoSombra : P.concreto)); }
    disco(bx - 14, by - 4, 6, function (x, y) { return y > 0 ? null : (x > 2 ? P.concretoSombra : P.concreto); });
  }

  function farolDaBarra(bx, by) { // Farol da Barra, Salvador
    ret(bx - 16, by + 1, 33, 1, P.sombra);
    for (var i = 0; i < 7; i++) {
      var m = 15 - Math.floor(i / 2);
      ret(bx - m - 1, by - i, 2 * m + 2, 1, P.contorno);
      ret(bx - m, by - i, 2 * m, 1, i < 2 ? P.forteSombra : P.forte);
    }
    ret(bx - 13, by - 7, 26, 1, P.contorno);
    for (var x = bx - 13; x <= bx + 12; x += 3) { px(x, by - 8, P.contorno); px(x, by - 7, P.forte); }
    for (var y = by - 27; y < by - 6; y++) {
      var w = y < by - 18 ? 3 : 4, faixa = Math.floor((by - y) / 3) % 2 ? P.preto : P.branco;
      ret(bx + 3, y, w, 1, faixa);
    }
    ret(bx + 3, by - 30, 4, 3, P.vidro); ret(bx + 4, by - 31, 2, 1, P.preto);
    linha(bx - 8, by - 7, bx - 9, by - 13, P.tronco); linha(bx - 9, by - 13, bx - 7, by - 19, P.tronco);
    [[-13, -17], [-12, -22], [-3, -22], [-2, -17], [-7, -23]].forEach(function (f) { linha(bx - 7, by - 19, bx + f[0], by + f[1], P.arvore); });
  }

  function estradas() {
    var borda = new Uint8Array(W * H), asf = new Uint8Array(W * H), faixa = new Uint8Array(W * H);
    function carimbo(m, cx, cy, r, v) {
      var R = Math.ceil(r), r2 = r * r + r * 0.6;
      for (var y = -R; y <= R; y++) for (var x = -R; x <= R; x++) {
        var X = Math.round(cx) + x, Y = Math.round(cy) + y;
        if (X >= 0 && Y >= 0 && X < W && Y < H && x * x + y * y <= r2) m[Y * W + X] = v || 1;
      }
    }
    PRINCIPAL.pts.forEach(function (p) { carimbo(borda, p[0], p[1], 12.5); carimbo(asf, p[0], p[1], 10.5); });
    RECUOS.forEach(function (r) {
      r.pts.forEach(function (p) { carimbo(borda, p[0], p[1], 7.5); carimbo(asf, p[0], p[1], 5.5); });
      carimbo(borda, r.meio[0], r.meio[1], 9.5); carimbo(asf, r.meio[0], r.meio[1], 7.5);
    });
    PONTOS.forEach(function (pt) {
      curva(pt.caminho).pts.forEach(function (p) { carimbo(borda, p[0], p[1], 7.5); carimbo(asf, p[0], p[1], 5.5); });
      carimbo(borda, pt.centro[0], pt.centro[1], 12.5); carimbo(asf, pt.centro[0], pt.centro[1], 10.5);
    });
    var d = 0;
    PRINCIPAL.pts.forEach(function (p, i) {
      if (i) d += Math.hypot(p[0] - PRINCIPAL.pts[i - 1][0], p[1] - PRINCIPAL.pts[i - 1][1]);
      if (d % 13 < 7) { carimbo(faixa, p[0], p[1], 0.6, 1); }
    });
    PONTOS.forEach(function (pt) {
      var dd = 0, c = curva(pt.caminho).pts;
      c.forEach(function (p, i) {
        if (i) dd += Math.hypot(p[0] - c[i - 1][0], p[1] - c[i - 1][1]);
        if (dd % 8 < 3 && Math.hypot(p[0] - pt.centro[0], p[1] - pt.centro[1]) > 11) carimbo(faixa, p[0], p[1], 0, 2);
      });
    });
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x;
      if (faixa[i]) px(x, y, faixa[i] === 1 ? P.faixa : P.faixaDesvio);
      else if (asf[i]) px(x, y, hash(x, y) < 0.07 ? P.asfaltoLuz : P.asfalto);
      else if (borda[i]) {
        var fora = !borda[i + W] || !borda[i - W] || !borda[i + 1] || !borda[i - 1];
        px(x, y, fora ? P.bordaEscura : P.borda);
      }
    }
    PONTOS.forEach(function (pt) { // canteiro no meio da rotatória
      disco(pt.centro[0], pt.centro[1], 4, function (x, y) { return (x === 0 && y === 0) ? P.flor2 : (x + y < 0 ? P.arvoreLuz : P.arvore); });
    });
    return asf;
  }

  function arvores(asf) {
    var lista = [[14, 104], [24, 120], [150, 112], [236, 118], [250, 132], [300, 152],
      [404, 112], [408, 127], [98, 62], [212, 68], [344, 172], [404, 174], [196, 178], [82, 178], [14, 70],
      [408, 96], [150, 176], [228, 152], [336, 122], [122, 98], [36, 140], [276, 64], [380, 110], [160, 128]];
    var SPRITE = ['..aaa..', '.aLLaa.', 'aLLaaaa', 'aLaaaas', 'aaaaass', '.aasss.', '...t...', '...t...'];
    lista.sort(function (m, n) { return m[1] - n[1]; }).forEach(function (a) {
      var x0 = a[0] - 3, y0 = a[1] - 8;
      for (var y = -3; y <= 3; y++) for (var x = -3; x <= 3; x++) {
        var X = a[0] + x, Y = a[1] + y;
        if (X >= 0 && X < W && Y >= 0 && Y < H && asf[Y * W + X]) return; // não planta em cima da estrada
      }
      ret(a[0] - 2, a[1], 7, 1, P.sombra); ret(a[0] - 1, a[1] + 1, 5, 1, P.sombra);
      SPRITE.forEach(function (l, y) {
        for (var x = 0; x < 7; x++) px(x0 + x, y0 + y, { a: P.arvore, L: P.arvoreLuz, s: P.arvoreSombra, t: P.tronco }[l[x]]);
      });
    });
  }

  var LUGARES = { floripa: [60, 88], rio: [165, 92], masp: [244, 72], brasilia: [384, 150], salvador: [398, 70] };
  var estatico = null;
  function montarEstatico() {
    estatico = document.createElement('canvas');
    estatico.width = W; estatico.height = H;
    g = estatico.getContext('2d');
    ceuEMorros();
    ponte(LUGARES.floripa[0], LUGARES.floripa[1]);
    rio(LUGARES.rio[0], LUGARES.rio[1]);
    masp(LUGARES.masp[0], LUGARES.masp[1]);
    congresso(LUGARES.brasilia[0], LUGARES.brasilia[1]);
    farolDaBarra(LUGARES.salvador[0], LUGARES.salvador[1]);
    var asf = estradas();
    posto(RECUOS[0]);
    restaurante(RECUOS[1]);
    arvores(asf);
  }

  function posto(r) { // cobertura listrada, duas bombas, loja e placa
    var bx = r.base[0], by = r.base[1];
    ret(bx - 13, by + 2, 27, 1, P.sombra);
    ret(bx - 11, by - 3, 1, 6, P.pedraLuz); ret(bx + 11, by - 3, 1, 6, P.pedraLuz);
    ret(bx - 6, by - 1, 2, 4, P.lanterna); ret(bx - 6, by - 1, 2, 1, P.branco);
    ret(bx + 4, by - 1, 2, 4, P.lanterna); ret(bx + 4, by - 1, 2, 1, P.branco);
    ret(bx - 14, by - 8, 29, 4, P.branco);
    for (var x = bx - 14; x < bx + 15; x++) px(x, by - 5, (x & 2) ? P.lanterna : P.branco);
    ret(bx - 14, by - 9, 29, 1, P.lanterna);
    if (P.noite) for (x = bx - 12; x < bx + 13; x += 4) px(x, by - 4, P.farol);
    ret(bx + 17, by - 9, 13, 10, P.parede); ret(bx + 16, by - 11, 15, 2, P.placa);
    ret(bx + 22, by - 4, 3, 5, P.tronco); ret(bx + 18, by - 7, 3, 2, P.luzJanela || P.vidro); ret(bx + 26, by - 7, 3, 2, P.luzJanela || P.vidro);
    ret(bx - 19, by - 13, 1, 13, P.preto); ret(bx - 23, by - 20, 9, 7, P.placa); ret(bx - 21, by - 18, 5, 3, P.faixa);
  }

  function restaurante(r) { // casa de telhado vermelho, toldo listrado e guarda-sóis
    var bx = r.base[0], by = r.base[1];
    ret(bx - 12, by + 2, 25, 1, P.sombra);
    ret(bx - 11, by - 8, 22, 10, P.parede);
    for (var i = 0; i < 4; i++) ret(bx - 13 + i, by - 12 + i, 26 - 2 * i, 1, P.telhado);
    ret(bx - 13, by - 9, 26, 1, P.telhado);
    for (var x = bx - 11; x < bx + 11; x++) px(x, by - 7, (x & 1) ? P.lanterna : P.branco);
    ret(bx - 1, by - 4, 3, 6, P.tronco);
    ret(bx - 8, by - 4, 4, 3, P.luzJanela || P.vidro); ret(bx + 5, by - 4, 4, 3, P.luzJanela || P.vidro);
    ret(bx - 5, by - 15, 10, 3, P.faixa); px(bx - 2, by - 14, P.preto); px(bx + 1, by - 14, P.preto);
    [[bx + 16, by - 3], [bx + 16, by + 5]].forEach(function (u) {
      disco(u[0], u[1], 2.4, function (dx, dy) { return dx + dy < 0 ? P.faixa : P.lanterna; });
      px(u[0], u[1] + 3, P.tronco);
    });
  }

  // ---------------------------------------------------------------- veículos e tráfego
  // Cada veículo anda pela própria rota (principal + desvios e recuos onde para). Na principal há duas
  // faixas no mesmo sentido: quem vê alguém mais lento na frente ultrapassa pela esquerda se ela estiver
  // livre; se não estiver, reduz e segue atrás. Ninguém passa por cima de ninguém.
  var DESENHOS = {
    carro: ['.BBBBBBBB.', 'RBJLLLBJBF', 'BBJLLLBJBB', 'RBJLLLBJBF', '.BBBBBBBB.'],
    moto: ['...P.K.', 'RMMCMMF', '...P.K.'],
    bike: ['...O.K', 'VVVCVV', '...O.K'],
    caminhao: ['.TTTTTTTTT..XX.', 'RTsTTsTTsTKXXJF', 'RTTTTTTTTTKXXJ.', 'RTsTTsTTsTKXXJF', '.TTTTTTTTT..XX.']
  };
  var FAIXA_L = 5; // do centro da principal ao meio de cada faixa
  var COMPRIMENTO = { carro: 10, moto: 7, bike: 6, caminhao: 15 };
  var FROTA = [
    { tipo: 'carro', cor: null, paradas: ['rio', 'restaurante', 'salvador'], vel: 36, ultrapassa: true },
    { tipo: 'carro', cor: '#d64541', paradas: ['posto', 'masp'], vel: 33, ultrapassa: true },
    { tipo: 'carro', cor: '#3b6fb6', paradas: ['restaurante', 'brasilia'], vel: 38, ultrapassa: true },
    { tipo: 'moto', cor: null, paradas: ['floripa', 'brasilia'], vel: 46, ultrapassa: true },
    { tipo: 'moto', cor: '#e5484d', paradas: ['posto'], vel: 50, ultrapassa: true },
    { tipo: 'bike', cor: null, paradas: ['masp'], vel: 14, ultrapassa: false },
    { tipo: 'caminhao', cor: null, paradas: ['posto'], vel: 22, ultrapassa: true },
    { tipo: 'caminhao', cor: '#2c6e8f', paradas: [], vel: 20, ultrapassa: true }
  ];
  var ALVOS = { floripa: [58, 90], rio: [180, 88], masp: [244, 76], brasilia: [368, 150], salvador: [392, 74] };
  var CAMISAS = ['#e5484d', '#3b6fb6', '#f2b705', '#ffffff', '#46b985', '#f28c28'];

  function montarRota(v) {
    var pts = [], meta = [], paradas = [], M = PRINCIPAL.pts, i = 0;
    function add(p, idx) { pts.push(p); meta.push(idx); }
    while (i < M.length) {
      var recuo = RECUOS.filter(function (r) { return r.i0 === i && v.paradas.indexOf(r.nome) >= 0; })[0];
      if (recuo) {
        var meio = Math.floor(recuo.pts.length / 2);
        recuo.pts.forEach(function (p, k) { add(p, -1); if (k === meio) paradas.push({ k: pts.length - 1, nome: recuo.nome }); });
        i = recuo.i1 + 1;
        continue;
      }
      add(M[i], i);
      PONTOS.forEach(function (pt) {
        if (v.paradas.indexOf(pt.nome) < 0 || PRINCIPAL.marcas[pt.ancora] !== i) return;
        var ida = pt.desvio, c = pt.centro, ult = ida[ida.length - 1], alvo = ALVOS[pt.nome];
        var a0 = Math.atan2(ult[1] - c[1], ult[0] - c[0]), melhor = -1, dm = 1e9;
        ida.forEach(function (p) { add(p, -1); });
        for (var k = 1; k <= 96; k++) {
          var a = a0 - k / 96 * Math.PI * 2, q = [c[0] + Math.cos(a) * ANEL, c[1] + Math.sin(a) * ANEL];
          add(q, -2);
          var dd = Math.hypot(q[0] - alvo[0], q[1] - alvo[1]);
          if (dd < dm) { dm = dd; melhor = pts.length - 1; }
        }
        paradas.push({ k: melhor, nome: pt.nome });
        ida.slice().reverse().forEach(function (p) { add(p, -1); });
      });
      i++;
    }
    var acc = [0];
    for (var j = 1; j < pts.length; j++) acc.push(acc[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]));
    v.pts = pts; v.meta = meta; v.acc = acc; v.total = acc[acc.length - 1];
    v.paradasD = paradas.map(function (p) { return { d: acc[p.k], nome: p.nome }; }).sort(function (a, b) { return a.d - b.d; });
  }

  function noPonto(v, d) {
    d = ((d % v.total) + v.total) % v.total;
    var a = v.acc, lo = 0, hi = a.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (a[mid] <= d) lo = mid; else hi = mid; }
    var t = (d - a[lo]) / ((a[hi] - a[lo]) || 1), p = v.pts[lo], q = v.pts[hi];
    return { x: p[0] + (q[0] - p[0]) * t, y: p[1] + (q[1] - p[1]) * t, lo: lo };
  }

  function estado(v) { // posição no mundo (com a faixa), direção e se está na principal
    var a = noPonto(v, v.d - 2.5), b = noPonto(v, v.d + 2.5), p = noPonto(v, v.d);
    var dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
    dx /= n; dy /= n;
    var off = v.faixa * FAIXA_L;
    return { x: p.x - dy * off, y: p.y + dx * off, dx: dx, dy: dy, rx: -dy, ry: dx, principal: v.meta[p.lo] >= 0, laco: v.meta[p.lo] === -2 };
  }

  var pessoas = [];
  function descer(v, nome, e) {
    var alvo = ALVOS[nome] || (nome === 'posto' ? RECUOS[0].porta : RECUOS[1].porta);
    var n = v.tipo === 'carro' ? (nome === 'posto' ? 1 : 2 + (Math.random() < 0.5 ? 1 : 0)) : 1;
    v.pessoas = [];
    for (var k = 0; k < n; k++) {
      var p = {
        x0: e.x + (k - 1) * 1.5, y0: e.y + 2, ax: alvo[0] + (k - 1) * 2, ay: alvo[1] + (k % 2), t: -0.35 * k - 0.3,
        vel: 7 + k, espera: nome === 'posto' ? 1.2 : 2.2, camisa: CAMISAS[Math.floor(Math.random() * CAMISAS.length)],
        pele: P.pele[Math.floor(Math.random() * P.pele.length)], fim: false
      };
      p.ida = Math.hypot(p.ax - p.x0, p.ay - p.y0) / p.vel;
      v.pessoas.push(p);
      pessoas.push(p);
    }
    v.parado = nome === 'posto' ? 1.4 : 0.6; // tempo parado depois que todo mundo voltou
  }

  function andarPessoas(dt) {
    pessoas.forEach(function (p) {
      p.t += dt;
      if (p.t > p.ida * 2 + p.espera) p.fim = true;
    });
    pessoas = pessoas.filter(function (p) { return !p.fim; });
  }

  function iniciarTrafego() {
    pessoas = [];
    FROTA.forEach(function (v, i) {
      montarRota(v);
      // cada um nasce num trecho diferente da principal, na sua faixa, sem sobrepor ninguém
      var alvoMain = Math.floor(PRINCIPAL.pts.length * (i + 0.5) / FROTA.length), k = v.meta.indexOf(alvoMain);
      v.d = v.acc[k >= 0 ? k : 0];
      v.v = v.vel; v.faixa = 1; v.alvoFaixa = 1; v.parado = 0; v.pessoas = null; v.passando = null;
      v.pi = 0;
      while (v.pi < v.paradasD.length && v.paradasD[v.pi].d <= v.d) v.pi++;
    });
  }

  function passo(dt) {
    var est = FROTA.map(estado);
    FROTA.forEach(function (v, i) {
      var e = est[i];
      if (v.pessoas && v.pessoas.some(function (p) { return !p.fim; })) return; // esperando o pessoal voltar
      if (v.parado > 0) { v.parado -= dt; v.v = 0; return; }
      var lider = null, gap = 1e9, folga = 0, livreEsq = true, livreDir = true, passou = !v.passando;
      est.forEach(function (o, j) {
        if (j === i) return;
        var rx = o.x - e.x, ry = o.y - e.y, p = rx * e.dx + ry * e.dy, q = rx * e.rx + ry * e.ry;
        var cos = o.dx * e.dx + o.dy * e.dy;
        var minimo = (COMPRIMENTO[v.tipo] + COMPRIMENTO[FROTA[j].tipo]) / 2 + 2; // para-choque a para-choque
        // Na principal: mesma faixa e mesmo sentido. Fora dela (desvios, rotatórias, recuos), qualquer um
        // logo à frente que não venha na contramão, inclusive quem está de lado parado no anel.
        var naFaixa = e.principal && cos > 0.3 && p < minimo + 14 && Math.abs(q) < 4.5; // inclui quem acabou de sair da pista
        var perto = !e.principal && !o.principal && cos > -0.3 && Math.hypot(rx, ry) < minimo + 12;
        if (perto && (-rx * o.dx - ry * o.dy) > 0 && i < j && FROTA[j].v > 0.5) perto = false; // os dois se veem na frente: só um espera
        if (p > 0 && (naFaixa || perto) && p < gap) { gap = p; lider = FROTA[j]; folga = minimo; }
        if (p > -14 && p < 26 && q < -5 && q > -15) livreEsq = false;
        if (p > -12 && p < 14 && q > 5 && q < 15) livreDir = false;
        if (FROTA[j] === v.passando && p < -12) passou = true;
      });
      var alvo = e.principal ? v.vel : v.vel * 0.6; // devagar em desvio, rotatória e recuo
      if (e.principal) {
        if (v.alvoFaixa !== 1 && v.alvoFaixa !== -1) v.alvoFaixa = 1;
        if (v.alvoFaixa === -1 && passou && livreDir) { v.alvoFaixa = 1; v.passando = null; }
        if (v.ultrapassa && lider && gap < folga + 12 && lider.v < v.vel * 0.9 && v.alvoFaixa === 1 && livreEsq) {
          v.alvoFaixa = -1; v.passando = lider;
        }
      } else {
        v.alvoFaixa = e.laco ? 0 : 0.55; v.passando = null;
      }
      if (!e.principal && v.meta[noPonto(v, v.d + 9).lo] >= 0) { // vai entrar na principal: dá a preferência
        est.forEach(function (o, j) {
          if (j === i || !o.principal || FROTA[j].v < 5) return;
          var rx = e.x - o.x, ry = e.y - o.y, pe = rx * o.dx + ry * o.dy; // onde eu estou visto por quem vem na pista
          if (pe > -6 && pe < 22 && Math.hypot(rx, ry) < 24) alvo = 0;
        });
      }
      if (lider) {
        if (gap < folga) alvo = 0;
        else if (gap < folga + 10) alvo = Math.min(alvo, lider.v + (gap - folga) * 1.5);
      }
      v.v += Math.max(-180 * dt, Math.min(40 * dt, alvo - v.v));
      v.d += Math.max(0, v.v) * dt;
      v.faixa += Math.max(-2.2 * dt, Math.min(2.2 * dt, v.alvoFaixa - v.faixa));
      if (v.pi < v.paradasD.length && v.d >= v.paradasD[v.pi].d) {
        descer(v, v.paradasD[v.pi].nome, e);
        v.v = 0;
        v.pi++;
      }
      if (v.d >= v.total) { v.d -= v.total; v.pi = 0; }
    });
    andarPessoas(dt);
  }

  function clarear(h, f) {
    var n = parseInt(h.slice(1), 16), r = n >> 16, g2 = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r + (255 - r) * f) + ',' + Math.round(g2 + (255 - g2) * f) + ',' + Math.round(b + (255 - b) * f) + ')';
  }
  function sprite(v, sombra) {
    var desenho = DESENHOS[v.tipo], c = document.createElement('canvas'), w = desenho[0].length, h = desenho.length;
    c.width = w + 2; c.height = h + 2;
    var gg = c.getContext('2d');
    var corCarro = v.tipo === 'carro' && v.cor ? v.cor : P.carro;
    var cores = {
      B: corCarro, L: v.tipo === 'carro' && v.cor ? clarear(v.cor, 0.3) : P.carroLuz, J: P.janela, R: P.lanterna, F: P.farol,
      M: v.tipo === 'moto' && v.cor ? v.cor : P.moto, P: P.piloto, C: P.capacete, K: P.preto, O: P.ciclista, V: P.bike,
      T: P.caminhao, s: clarear(P.caminhao.charAt(0) === '#' ? P.caminhao : '#b9b4a6', -0.0), X: v.tipo === 'caminhao' && v.cor ? v.cor : P.cabine
    };
    cores.s = P.noite ? '#8e897c' : '#cfc8b6';
    desenho.forEach(function (l, y) {
      for (var x = 0; x < w; x++) if (l[x] !== '.') { gg.fillStyle = sombra ? 'rgba(0,0,0,.28)' : cores[l[x]]; gg.fillRect(x + 1, y + 1, 1, 1); }
    });
    return c;
  }
  function montarSprites() {
    FROTA.forEach(function (v) { v.sp = { cor: sprite(v), sombra: sprite(v, true) }; });
  }

  function desenharTrafego() {
    var est = FROTA.map(estado);
    FROTA.map(function (v, i) { return [v, est[i]]; }).sort(function (a, b) { return a[1].y - b[1].y; }).forEach(function (par) {
      var v = par[0], e = par[1], sp = v.sp, X = Math.round(e.x), Y = Math.round(e.y);
      var ang = Math.round(Math.atan2(e.dy, e.dx) / (Math.PI / 16)) * (Math.PI / 16);
      if (P.noite) { // faróis acesos, em pontilhado
        var cx = Math.cos(ang), sy = Math.sin(ang), frente = (sp.cor.width - 2) / 2;
        ctx.globalAlpha = 0.5;
        for (var kk = 1; kk < 12; kk++) for (var ww = -Math.floor(kk / 3) - 1; ww <= Math.floor(kk / 3) + 1; ww++) {
          var qx = Math.round(X + cx * (frente + kk) - sy * ww), qy = Math.round(Y + sy * (frente + kk) + cx * ww);
          if (((qx + qy) & 1) === 0) px(qx, qy, P.farol);
        }
        ctx.globalAlpha = 1;
      }
      [['sombra', 1], ['cor', 0]].forEach(function (camada) {
        ctx.save();
        ctx.translate(X + camada[1], Y + camada[1]);
        ctx.rotate(ang);
        ctx.drawImage(sp[camada[0]], -Math.floor(sp.cor.width / 2), -Math.floor(sp.cor.height / 2));
        ctx.restore();
      });
    });
    pessoas.forEach(function (p) { // gente andando até o lugar e voltando
      if (p.t < 0) return;
      var u;
      if (p.t < p.ida) u = p.t / p.ida;
      else if (p.t < p.ida + p.espera) u = 1;
      else u = 1 - (p.t - p.ida - p.espera) / p.ida;
      var x = Math.round(p.x0 + (p.ax - p.x0) * u), y = Math.round(p.y0 + (p.ay - p.y0) * u);
      var passoPerna = (u > 0 && u < 1) ? Math.floor(p.t * 6) & 1 : 0;
      ret(x, y - 4, 2, 1, p.pele);                 // cabeça
      ret(x, y - 3, 2, 2, p.camisa);               // tronco
      px(x - passoPerna + 0, y - 1, P.preto); px(x + 1 + passoPerna, y - 1, P.preto); // pernas, alternando
      px(x - 1, y, 'rgba(0,0,0,.25)'); px(x + 2, y, 'rgba(0,0,0,.25)'); // sombrinha no chão
    });
  }

  // ---------------------------------------------------------------- quadro a quadro
  var NUVEM = ['....nnn......', '..nnnnnnn.nn.', '.nnnnnnnnnnnn', 'ssssssssssss.'];
  var ESTRELAS = (function () { var r = sorteio(11), l = []; for (var i = 0; i < 46; i++) l.push([Math.floor(r() * W), Math.floor(r() * 30), r()]); return l; })();

  var ultimoT = null;
  function quadro(t) {
    if (ultimoT !== null) passo(Math.min(0.05, Math.max(0, t - ultimoT)));
    ultimoT = t;
    g = ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    if (P.noite) {
      ESTRELAS.forEach(function (e, i) {
        if (e[1] > 26 + 4 * Math.sin(e[0] / 51)) return;
        if ((Math.floor(t * 2 + e[2] * 10) + i) % 7) px(e[0], e[1], e[2] > 0.8 ? '#ffffff' : '#9fb3c8');
      });
    }
    ctx.drawImage(estatico, 0, 0);
    if (!P.noite) {
      [[20, 6, 4], [180, 14, 3], [300, 4, 5]].forEach(function (n) {
        var x0 = Math.round(((n[0] + t * n[2]) % (W + 40)) - 20);
        NUVEM.forEach(function (l, y) { for (var x = 0; x < l.length; x++) if (l[x] !== '.') px(x0 + x, n[1] + y, l[x] === 'n' ? P.nuvem : P.nuvemSombra); });
      });
    }
    // água brilhando sob a ponte
    var f = LUGARES.floripa;
    for (var x = f[0] - 40; x <= f[0] + 40; x++) if ((x * 5 + Math.floor(t * 3)) % 11 === 0) px(x, f[1] - 3 + (x & 1), P.aguaLuz);
    // bondinho do Pão de Açúcar, indo e voltando
    var r = LUGARES.rio, u = (Math.sin(t * 0.7) + 1) / 2;
    ret(r[0] - 38 + 15 * u - 1, r[1] - 13 - 19 * u + 1, 2, 2, P.lanterna);
    // farol: pisca de dia, varre o céu à noite
    var s = LUGARES.salvador, lx = s[0] + 5, ly = s[1] - 29;
    if (P.noite) {
      var lado = Math.sin(t * 1.4) > 0 ? 1 : -1, abre = Math.abs(Math.sin(t * 1.4));
      ctx.globalAlpha = 0.35 + 0.3 * abre;
      for (var k = 2; k < 34; k++) for (var w = -Math.floor(k / 5); w <= Math.floor(k / 5); w++) if (((k + w) & 1) === 0) px(lx + lado * k, ly + w, P.farol);
      ctx.globalAlpha = 1;
      px(lx, ly, P.farol); px(lx + 1, ly, P.farol);
    } else if (Math.floor(t * 1.5) % 2) { px(lx, ly, P.faixa); px(lx + 1, ly, P.faixa); }

    desenharTrafego();
  }

  // ---------------------------------------------------------------- ciclo de vida
  var escuro = window.matchMedia('(prefers-color-scheme: dark)');
  var menos = window.matchMedia('(prefers-reduced-motion: reduce)');
  var visivel = true, rodando = false, t0 = performance.now();

  function preparar() {
    P = escuro.matches ? PALETAS.noite : PALETAS.dia;
    montarEstatico();
    if (!FROTA[0].pts) iniciarTrafego();
    montarSprites();
    if (menos.matches) { for (var k = 0; k < 420; k++) passo(1 / 30); ultimoT = null; }
    quadro((performance.now() - t0) / 1000);
  }
  function laco(agora) {
    if (!visivel || menos.matches) { rodando = false; return; }
    quadro((agora - t0) / 1000);
    requestAnimationFrame(laco);
  }
  function rodar() { if (!rodando && visivel && !menos.matches) { rodando = true; requestAnimationFrame(laco); } }

  preparar();
  rodar();
  escuro.addEventListener('change', preparar);
  menos.addEventListener('change', function () { preparar(); rodar(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; rodar(); }).observe(tela);
  }
})();
