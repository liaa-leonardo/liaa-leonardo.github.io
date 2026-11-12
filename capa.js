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
      flor1: '#e5484d', flor2: '#f2b705', flor3: '#ffffff', luzJanela: null, noite: false
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
      flor1: '#9e3a3d', flor2: '#9c7a10', flor3: '#7d8a83', luzJanela: '#f2c94c', noite: true
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
  function ponto(nome) { return PONTOS.filter(function (p) { return p.nome === nome; })[0]; }

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
    PRINCIPAL.pts.forEach(function (p) { carimbo(borda, p[0], p[1], 9.5); carimbo(asf, p[0], p[1], 7.5); });
    PONTOS.forEach(function (pt) {
      curva(pt.caminho).pts.forEach(function (p) { carimbo(borda, p[0], p[1], 6.5); carimbo(asf, p[0], p[1], 4.5); });
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
    var lista = [[14, 104], [24, 120], [96, 128], [110, 114], [132, 142], [144, 118], [236, 118], [250, 132], [300, 152],
      [404, 112], [408, 127], [98, 62], [212, 68], [300, 52], [344, 172], [404, 174], [196, 178], [82, 178], [14, 70],
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
    arvores(estradas());
  }

  // ---------------------------------------------------------------- veículos
  var DESENHOS = {
    carro: ['.BBBBBBBB.', 'RBJLLLBJBF', 'BBJLLLBJBB', 'RBJLLLBJBF', '.BBBBBBBB.'],
    moto: ['...P.K.', 'RMMCMMF', '...P.K.'],
    bike: ['...O.K', 'VVVCVV', '...O.K']
  };
  function sprite(desenho, sombra) {
    var c = document.createElement('canvas'), w = desenho[0].length, h = desenho.length;
    c.width = w + 2; c.height = h + 2;
    var gg = c.getContext('2d');
    var cores = { B: P.carro, L: P.carroLuz, J: P.janela, R: P.lanterna, F: P.farol, M: P.moto, P: P.piloto, C: P.capacete, K: P.preto, O: P.ciclista, V: P.bike };
    desenho.forEach(function (l, y) {
      for (var x = 0; x < w; x++) if (l[x] !== '.') { gg.fillStyle = sombra ? 'rgba(0,0,0,.28)' : cores[l[x]]; gg.fillRect(x + 1, y + 1, 1, 1); }
    });
    return c;
  }
  var VEICULOS = [ // nome, desvios, velocidade (px/s), avanço inicial (s)
    { nome: 'bike', paradas: ['masp'], vel: 15, ini: 30 },
    { nome: 'carro', paradas: ['rio', 'salvador'], vel: 36, ini: 0 },
    { nome: 'moto', paradas: ['floripa', 'brasilia'], vel: 46, ini: 9 }
  ];
  VEICULOS.forEach(function (v) {
    var pts = [], m = PRINCIPAL.marcas;
    for (var i = 0; i < PRINCIPAL.pts.length; i++) {
      pts.push(PRINCIPAL.pts[i]);
      PONTOS.forEach(function (pt) {
        if (v.paradas.indexOf(pt.nome) < 0 || m[pt.ancora] !== i) return;
        var ida = pt.desvio, c = pt.centro, ult = ida[ida.length - 1];
        var a0 = Math.atan2(ult[1] - c[1], ult[0] - c[0]);
        pts = pts.concat(ida);
        for (var k = 1; k <= 96; k++) { var a = a0 - k / 96 * Math.PI * 2; pts.push([c[0] + Math.cos(a) * ANEL, c[1] + Math.sin(a) * ANEL]); }
        pts = pts.concat(ida.slice().reverse());
      });
    }
    var acc = [0];
    for (i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    v.pts = pts; v.acc = acc; v.total = acc[acc.length - 1];
  });
  function posicao(v, d) {
    d = ((d % v.total) + v.total) % v.total;
    var a = v.acc, lo = 0, hi = a.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (a[mid] <= d) lo = mid; else hi = mid; }
    var t = (d - a[lo]) / ((a[hi] - a[lo]) || 1), p = v.pts[lo], q = v.pts[hi];
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  }

  var sprites = {};
  function montarSprites() {
    Object.keys(DESENHOS).forEach(function (n) { sprites[n] = { cor: sprite(DESENHOS[n]), sombra: sprite(DESENHOS[n], true) }; });
  }

  // ---------------------------------------------------------------- quadro a quadro
  var NUVEM = ['....nnn......', '..nnnnnnn.nn.', '.nnnnnnnnnnnn', 'ssssssssssss.'];
  var ESTRELAS = (function () { var r = sorteio(11), l = []; for (var i = 0; i < 46; i++) l.push([Math.floor(r() * W), Math.floor(r() * 30), r()]); return l; })();

  function quadro(t) {
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

    VEICULOS.forEach(function (v) {
      var d = (t + v.ini) * v.vel, p = posicao(v, d), a = posicao(v, d - 3), b = posicao(v, d + 3);
      var ang = Math.round(Math.atan2(b[1] - a[1], b[0] - a[0]) / (Math.PI / 16)) * (Math.PI / 16);
      var sp = sprites[v.nome], X = Math.round(p[0]), Y = Math.round(p[1]);
      if (P.noite) { // faróis acesos, em pontilhado
        var cx = Math.cos(ang), sy = Math.sin(ang), frente = (sp.cor.width - 2) / 2;
        ctx.globalAlpha = 0.55;
        for (var kk = 1; kk < 13; kk++) for (var ww = -Math.floor(kk / 3) - 1; ww <= Math.floor(kk / 3) + 1; ww++) {
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
  }

  // ---------------------------------------------------------------- ciclo de vida
  var escuro = window.matchMedia('(prefers-color-scheme: dark)');
  var menos = window.matchMedia('(prefers-reduced-motion: reduce)');
  var visivel = true, rodando = false, t0 = performance.now();

  function preparar() {
    P = escuro.matches ? PALETAS.noite : PALETAS.dia;
    montarEstatico();
    montarSprites();
    quadro(menos.matches ? 14 : (performance.now() - t0) / 1000);
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
