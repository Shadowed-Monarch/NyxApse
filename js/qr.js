/* NyxApse QR code generator. Written for this project, no third-party code.
 * Byte mode, error correction level M, versions 1 to 10 (up to 213 bytes).
 * window.NXQR.svg(text, sizeInPixels) returns an SVG string.
 * "QR Code" is a registered trademark of DENSO WAVE INCORPORATED. */
(function () {
 'use strict';

 // ---------- Math in GF(256), primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 ----------
 var EXP = [], LOG = [], i;
 for (i = 0, EXP[0] = 1; i < 255; i++) { LOG[EXP[i]] = i; EXP[i + 1] = EXP[i] << 1; if (EXP[i + 1] > 255) EXP[i + 1] ^= 0x11D; }
 for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
 var mul = function (a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; };

 // Reed-Solomon: the n check bytes for a block of data bytes
 function rsCheck(data, n) {
  var g = [1], j, k;
  for (j = 0; j < n; j++) { var h = []; for (k = 0; k <= g.length; k++) h.push(0); for (k = 0; k < g.length; k++) { h[k] ^= g[k]; h[k + 1] ^= mul(g[k], EXP[j]); } g = h; }
  var r = []; for (j = 0; j < n; j++) r.push(0);
  data.forEach(function (d) { var f = d ^ r[0]; r.shift(); r.push(0); for (var q = 0; q < n; q++) r[q] ^= mul(g[q + 1], f); });
  return r;
 }

 // ---------- Size tables, level M. [check bytes per block, [[blocks, data bytes per block], ...]] ----------
 var BLOCKS = [null, [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]], [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]]];
 var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
 var dataBytes = function (v) { return BLOCKS[v][1].reduce(function (s, b) { return s + b[0] * b[1]; }, 0); };

 // ---------- Text -> final byte sequence (data + check bytes, interleaved) ----------
 function utf8(s) { return Array.prototype.slice.call(unescape(encodeURIComponent(s))).map(function (c) { return c.charCodeAt(0); }); }
 function encode(text) {
  var bytes = utf8(text), v = 1;
  while (v <= 10 && dataBytes(v) * 8 < 4 + (v < 10 ? 8 : 16) + bytes.length * 8) v++;
  if (v > 10) throw new Error('QR text too long');
  var bits = [];
  var put = function (val, len) { for (var b = len - 1; b >= 0; b--) bits.push((val >> b) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
  var cap = dataBytes(v) * 8;
  put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  var data = [], p;
  for (p = 0; p < bits.length; p += 8) data.push(parseInt(bits.slice(p, p + 8).join(''), 2));
  for (p = 0; data.length < dataBytes(v); p++) data.push(p % 2 ? 0x11 : 0xEC);
  var ecLen = BLOCKS[v][0], blocks = [], at = 0;
  BLOCKS[v][1].forEach(function (g) { for (var n = 0; n < g[0]; n++) { var d = data.slice(at, at + g[1]); at += g[1]; blocks.push({d: d, e: rsCheck(d, ecLen)}); } });
  var out = [], most = Math.max.apply(null, blocks.map(function (b) { return b.d.length; })), x;
  for (x = 0; x < most; x++) blocks.forEach(function (b) { if (x < b.d.length) out.push(b.d[x]); });
  for (x = 0; x < ecLen; x++) blocks.forEach(function (b) { out.push(b.e[x]); });
  return {v: v, bytes: out};
 }

 // ---------- Drawing the code ----------
 function bch(value, poly, polyLen, shift) {   // BCH check bits for the format and version fields (shift = degree of poly)
  var r = value << shift, t;
  for (t = 30; t >= shift; t--) if ((r >> t) & 1) r ^= poly << (t - shift);
  return (value << shift) | r;
 }
 var MASKS = [
  function (r, c) { return (r + c) % 2 === 0; },
  function (r) { return r % 2 === 0; },
  function (r, c) { return c % 3 === 0; },
  function (r, c) { return (r + c) % 3 === 0; },
  function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
  function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; },
  function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
  function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
 ];

 function make(text) {
  var e = encode(text), v = e.v, n = 17 + 4 * v, r, c;
  var m = [], fn = [];
  for (r = 0; r < n; r++) { m.push([]); fn.push([]); for (c = 0; c < n; c++) { m[r].push(0); fn[r].push(false); } }
  var set = function (row, col, dark) { m[row][col] = dark ? 1 : 0; fn[row][col] = true; };

  // finder patterns with their white border
  [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (o) {
   for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
    var rr = o[0] + dr, cc = o[1] + dc; if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
    var ring = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
    set(rr, cc, dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && ring !== 2);
   }
  });
  // timing lines
  for (r = 8; r < n - 8; r++) { set(r, 6, r % 2 === 0); set(6, r, r % 2 === 0); }
  // alignment patterns
  var al = ALIGN[v], last = al.length - 1;
  al.forEach(function (ar, ai) { al.forEach(function (ac, aj) {
   if ((ai === 0 && aj === 0) || (ai === 0 && aj === last) || (ai === last && aj === 0)) return;
   for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) set(ar + dr, ac + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }); });
  // reserve the format and version areas (filled in later) and the always-dark module
  for (r = 0; r < 9; r++) { fn[r][8] = true; fn[8][r] = true; }
  for (r = 0; r < 8; r++) { fn[8][n - 1 - r] = true; fn[n - 1 - r][8] = true; }
  set(n - 8, 8, true);
  if (v >= 7) for (r = 0; r < 6; r++) for (c = 0; c < 3; c++) { fn[r][n - 11 + c] = true; fn[n - 11 + c][r] = true; }
  var versionBits = v >= 7 ? bch(v, 0x1F25, 13, 12) : 0;
  if (v >= 7) for (var k = 0; k < 18; k++) { var a = n - 11 + k % 3, b = Math.floor(k / 3), bit = (versionBits >> k) & 1; set(b, a, bit); set(a, b, bit); }

  // data: two columns at a time, snaking up and down, skipping column 6
  var bitAt = 0, total = e.bytes.length * 8, up = true;
  for (var col = n - 1; col > 0; col -= 2) {
   if (col === 6) col--;
   for (var step = 0; step < n; step++) {
    var row = up ? n - 1 - step : step;
    for (var side = 0; side < 2; side++) {
     var cc = col - side; if (fn[row][cc]) continue;
     m[row][cc] = bitAt < total ? (e.bytes[bitAt >> 3] >> (7 - (bitAt & 7))) & 1 : 0; bitAt++;
    }
   }
   up = !up;
  }

  // try the 8 masks, keep the one with the lowest penalty
  var best = null, bestScore = Infinity;
  for (var mk = 0; mk < 8; mk++) {
   var t = m.map(function (row) { return row.slice(); });
   for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (!fn[r][c] && MASKS[mk](r, c)) t[r][c] ^= 1;
   var f = bch((0 << 3) | mk, 0x537, 11, 10) ^ 0x5412, put = function (row, col2, i2) { t[row][col2] = (f >> i2) & 1; };   // level M = 00
   for (var q = 0; q < 6; q++) put(q, 8, q);
   put(7, 8, 6); put(8, 8, 7); put(8, 7, 8);
   for (q = 9; q < 15; q++) put(8, 14 - q, q);
   for (q = 0; q < 8; q++) put(8, n - 1 - q, q);
   for (q = 8; q < 15; q++) put(n - 15 + q, 8, q);
   var s = penalty(t, n); if (s < bestScore) { bestScore = s; best = t; }
  }
  return best;
 }

 function penalty(t, n) {
  var s = 0, r, c, line, dark = 0, A = '10111010000', B = '00001011101';
  var scan = function (get) {
   for (var i2 = 0; i2 < n; i2++) {
    var str = '', run = 1;
    for (var j = 0; j < n; j++) {
     var cur = get(i2, j); str += cur;
     if (j > 0 && cur === get(i2, j - 1)) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1;
    }
    for (var p = 0; p + 11 <= n; p++) { var w = str.substr(p, 11); if (w === A || w === B) s += 40; }
   }
  };
  scan(function (i2, j) { return t[i2][j]; });
  scan(function (i2, j) { return t[j][i2]; });
  for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) if (t[r][c] === t[r][c + 1] && t[r][c] === t[r + 1][c] && t[r][c] === t[r + 1][c + 1]) s += 3;
  for (r = 0; r < n; r++) for (c = 0; c < n; c++) dark += t[r][c];
  s += 10 * Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5);
  return s;
 }

 window.NXQR = {
  modules: make,
  svg: function (text, px) {
   var t = make(text), n = t.length, z = 4, d = '', r, c, size = n + z * 2;
   for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (t[r][c]) d += 'M' + (c + z) + ' ' + (r + z) + 'h1v1h-1z';
   return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + (px || 220) + '" height="' + (px || 220) + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
 };
})();
