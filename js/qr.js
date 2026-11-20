/* NyxApse QR code generator and reader. Written for this project, no third-party code.
 * Byte mode, error correction level M, versions 1 to 10 (up to 213 bytes).
 * window.NXQR.svg(text, sizeInPixels) returns an SVG string.
 * window.NXQR.decode(rgbaPixels, width, height) reads a code from a camera frame or picture (text or null).
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

 // The fixed parts of a code (finders, timing, alignment, reserved info areas). fn marks the non-data modules.
 function layout(v) {
  var n = 17 + 4 * v, r, c, m = [], fn = [];
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
  if (v >= 7) {
   var vb = bch(v, 0x1F25, 13, 12);
   for (var k = 0; k < 18; k++) { var a = n - 11 + k % 3, b = Math.floor(k / 3), bit = (vb >> k) & 1; set(b, a, bit); set(a, b, bit); }
  }
  return {n: n, m: m, fn: fn};
 }
 // the order in which data bits are placed: two columns at a time, snaking up and down, skipping column 6
 function zigzag(n, fn) {
  var out = [], up = true;
  for (var col = n - 1; col > 0; col -= 2) {
   if (col === 6) col--;
   for (var step = 0; step < n; step++) {
    var row = up ? n - 1 - step : step;
    for (var side = 0; side < 2; side++) if (!fn[row][col - side]) out.push([row, col - side]);
   }
   up = !up;
  }
  return out;
 }
 // where bit i (0 = lowest) of the 15-bit format info sits, in both copies
 function fmtPos(n) {
  var p = [];
  for (var i = 0; i < 15; i++) {
   var a = i < 6 ? [i, 8] : i === 6 ? [7, 8] : i === 7 ? [8, 8] : i === 8 ? [8, 7] : [8, 14 - i];
   var b = i < 8 ? [8, n - 1 - i] : [n - 15 + i, 8];
   p.push([a, b]);
  }
  return p;
 }
 var fmtBits = function (mask) { return bch(mask, 0x537, 11, 10) ^ 0x5412; };   // level M = 00, so the data is just the mask

 function make(text) {
  var e = encode(text), v = e.v, L = layout(v), n = L.n, m = L.m, fn = L.fn, r, c;
  var order = zigzag(n, fn), total = e.bytes.length * 8;
  order.forEach(function (p, i) { m[p[0]][p[1]] = i < total ? (e.bytes[i >> 3] >> (7 - (i & 7))) & 1 : 0; });
  // try the 8 masks, keep the one with the lowest penalty
  var best = null, bestScore = Infinity, pos = fmtPos(n);
  for (var mk = 0; mk < 8; mk++) {
   var t = m.map(function (row) { return row.slice(); });
   for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (!fn[r][c] && MASKS[mk](r, c)) t[r][c] ^= 1;
   var f = fmtBits(mk);
   pos.forEach(function (pp, i) { t[pp[0][0]][pp[0][1]] = (f >> i) & 1; t[pp[1][0]][pp[1][1]] = (f >> i) & 1; });
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


 // ====================== Reading a code (scanner) ======================
 // Reed-Solomon repair of one block (data + check bytes). Returns the fixed block, or null if too damaged.
 function rsFix(cw, ec) {
  var n = cw.length, S = [], bad = false, i, j;
  for (j = 0; j < ec; j++) { var sy = 0; for (i = 0; i < n; i++) sy = mul(sy, EXP[j]) ^ cw[i]; S.push(sy); if (sy) bad = true; }
  if (!bad) return cw;
  var C = [1], B = [1], Lc = 0, mm = 1, bb = 1;   // Berlekamp-Massey: finds the error locator C
  var inv = function (a) { return EXP[255 - LOG[a]]; };
  for (var nn = 0; nn < ec; nn++) {
   var d = S[nn]; for (i = 1; i <= Lc; i++) d ^= mul(C[i] || 0, S[nn - i]);
   if (!d) { mm++; continue; }
   var T = C.slice(), coef = mul(d, inv(bb));
   while (C.length < B.length + mm) C.push(0);
   for (i = 0; i < B.length; i++) C[i + mm] ^= mul(coef, B[i]);
   if (2 * Lc <= nn) { Lc = nn + 1 - Lc; B = T; bb = d; mm = 1; } else mm++;
  }
  var ev = function (poly, x) { var y = 0; for (var q = poly.length - 1; q >= 0; q--) y = mul(y, x) ^ poly[q]; return y; };
  var locs = [];
  for (var e = 0; e < n; e++) if (ev(C, EXP[(255 - e) % 255]) === 0) locs.push(e);
  if (locs.length !== Lc || Lc > ec / 2) return null;
  var omega = []; for (i = 0; i < ec; i++) { var o = 0; for (j = 0; j <= i; j++) o ^= mul(C[j] || 0, S[i - j]); omega.push(o); }
  var dC = []; for (i = 1; i < C.length; i += 2) { dC[i - 1] = C[i]; }
  var out = cw.slice();
  for (i = 0; i < locs.length; i++) {
   var X = EXP[locs[i]], Xi = EXP[(255 - locs[i]) % 255], den = ev(dC, Xi);
   if (!den) return null;
   out[n - 1 - locs[i]] ^= mul(X, mul(ev(omega, Xi), inv(den)));
  }
  for (j = 0; j < ec; j++) { var z = 0; for (i = 0; i < n; i++) z = mul(z, EXP[j]) ^ out[i]; if (z) return null; }
  return out;
 }

 // A sampled square of modules (1 = dark) -> text, or null
 function readModules(M, v) {
  var L = layout(v), n = L.n, fn = L.fn, pos = fmtPos(n), mask = -1, i, k;
  if (M.length !== n) return null;
  // format info: compare with all 8 valid codes, in both copies, allow a few wrong bits
  var best = 99;
  for (var mk = 0; mk < 8; mk++) {
   var f = fmtBits(mk);
   for (k = 0; k < 2; k++) { var diff = 0; for (i = 0; i < 15; i++) if (M[pos[i][k][0]][pos[i][k][1]] !== ((f >> i) & 1)) diff++; if (diff < best) { best = diff; mask = mk; } }
  }
  if (best > 3) return null;
  var bits = [];
  zigzag(n, fn).forEach(function (p) { bits.push(M[p[0]][p[1]] ^ (MASKS[mask](p[0], p[1]) ? 1 : 0)); });
  var bytes = []; for (i = 0; i + 8 <= bits.length; i += 8) { var by = 0; for (k = 0; k < 8; k++) by = (by << 1) | bits[i + k]; bytes.push(by); }
  var ecLen = BLOCKS[v][0], lens = []; BLOCKS[v][1].forEach(function (g) { for (var q = 0; q < g[0]; q++) lens.push(g[1]); });
  var nb = lens.length, most = Math.max.apply(null, lens), at = 0, blocks = lens.map(function () { return []; });
  for (i = 0; i < most; i++) for (k = 0; k < nb; k++) if (i < lens[k]) blocks[k].push(bytes[at++]);
  for (i = 0; i < ecLen; i++) for (k = 0; k < nb; k++) blocks[k].push(bytes[at++]);
  var data = [];
  for (k = 0; k < nb; k++) { var fx = rsFix(blocks[k], ecLen); if (!fx) return null; for (i = 0; i < lens[k]; i++) data.push(fx[i]); }
  var bp = 0, take = function (len) { var x = 0; for (var q = 0; q < len; q++) { x = (x << 1) | ((data[bp >> 3] >> (7 - (bp & 7))) & 1); bp++; } return x; };
  if (take(4) !== 4) return null;                       // only byte mode is used
  var cnt = take(v < 10 ? 8 : 16), str = '';
  if (cnt * 8 > data.length * 8 - bp) return null;
  for (i = 0; i < cnt; i++) str += String.fromCharCode(take(8));
  try { return decodeURIComponent(escape(str)); } catch (e2) { return str; }
 }

 // black/white image: global (Otsu) or local (adaptive) threshold. gray = Uint8Array, returns Uint8Array with 1 = dark
 function binarize(gray, w, h, local) {
  var bw = new Uint8Array(w * h), i;
  if (!local) {
   var hist = new Array(256).fill(0), sum = 0; for (i = 0; i < gray.length; i++) { hist[gray[i]]++; sum += gray[i]; }
   var sB = 0, wB = 0, mx = 0, th = 128, tot = gray.length;
   for (i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; var wF = tot - wB; if (!wF) break; sB += i * hist[i]; var mB = sB / wB, mF = (sum - sB) / wF, vr = wB * wF * (mB - mF) * (mB - mF); if (vr > mx) { mx = vr; th = i; } }
   for (i = 0; i < gray.length; i++) bw[i] = gray[i] <= th ? 1 : 0;
   return bw;
  }
  var W = w + 1, I = new Float64Array(W * (h + 1)), x, y;
  for (y = 0; y < h; y++) { var rs = 0; for (x = 0; x < w; x++) { rs += gray[y * w + x]; I[(y + 1) * W + x + 1] = I[y * W + x + 1] + rs; } }
  var rad = Math.max(6, Math.round(Math.min(w, h) / 8));
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
   var x0 = Math.max(0, x - rad), x1 = Math.min(w, x + rad + 1), y0 = Math.max(0, y - rad), y1 = Math.min(h, y + rad + 1);
   var mean = (I[y1 * W + x1] - I[y0 * W + x1] - I[y1 * W + x0] + I[y0 * W + x0]) / ((x1 - x0) * (y1 - y0));
   bw[y * w + x] = gray[y * w + x] < mean - 10 ? 1 : 0;
  }
  return bw;
 }

 // lengths of the 5 runs (dark, light, dark, light, dark) through pixel (x, y) along (dx, dy); y,x must be dark
 function cross(bw, w, h, x, y, dx, dy) {
  var get = function (k) { var xx = x + dx * k, yy = y + dy * k; return xx < 0 || yy < 0 || xx >= w || yy >= h ? -1 : bw[yy * w + xx]; };
  var c = [0, 0, 0, 0, 0], k = 0, b2, f2;
  while (get(-k) === 1) { c[2]++; k++; } b2 = c[2];
  if (get(-k) === -1) return null;
  while (get(-k) === 0) { c[1]++; k++; } if (get(-k) === -1) return null;
  while (get(-k) === 1) { c[0]++; k++; }
  k = 1; var fc = 0;
  while (get(k) === 1) { fc++; k++; } f2 = fc; c[2] += fc;
  if (get(k) === -1) return null;
  while (get(k) === 0) { c[3]++; k++; } if (get(k) === -1) return null;
  while (get(k) === 1) { c[4]++; k++; }
  return {c: c, off: (f2 - b2 + 1) / 2};
 }
 var ratioOK = function (c) {
  var t = c[0] + c[1] + c[2] + c[3] + c[4], ms = t / 7, q = ms * 0.55;
  return ms >= 1.2 && Math.abs(c[0] - ms) < q && Math.abs(c[1] - ms) < q && Math.abs(c[3] - ms) < q && Math.abs(c[4] - ms) < q && Math.abs(c[2] - 3 * ms) < 3 * q;
 };

 function findFinders(bw, w, h) {
  var cands = [], y, x, i;
  for (y = 0; y < h; y++) {
   var runs = [], row = y * w; x = 0;
   while (x < w) { var col = bw[row + x], s = x; while (x < w && bw[row + x] === col) x++; runs.push([s, x - s, col]); }
   for (i = 0; i + 4 < runs.length; i++) {
    if (!runs[i][2]) continue;
    var c = [runs[i][1], runs[i + 1][1], runs[i + 2][1], runs[i + 3][1], runs[i + 4][1]];
    if (!ratioOK(c)) continue;
    var cx = runs[i + 2][0] + runs[i + 2][1] / 2, X = Math.floor(cx);
    var vr = cross(bw, w, h, X, y, 0, 1); if (!vr || !ratioOK(vr.c)) continue;
    var cy = y + vr.off, hr = cross(bw, w, h, X, Math.round(cy), 1, 0); if (!hr || !ratioOK(hr.c)) continue;
    cx = X + hr.off;
    var ms = (vr.c.reduce(function (a, b) { return a + b; }, 0) + hr.c.reduce(function (a, b) { return a + b; }, 0)) / 14, hit = false;
    for (var j = 0; j < cands.length; j++) { var q = cands[j]; if (Math.abs(q.x - cx) < Math.max(ms, q.ms) && Math.abs(q.y - cy) < Math.max(ms, q.ms)) { q.x = (q.x * q.n + cx) / (q.n + 1); q.y = (q.y * q.n + cy) / (q.n + 1); q.ms = (q.ms * q.n + ms) / (q.n + 1); q.n++; hit = true; break; } }
    if (!hit) cands.push({x: cx, y: cy, ms: ms, n: 1});
   }
  }
  return cands.filter(function (q) { return q.n >= 2; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
 }

 // 8 numbers describing the mapping from module coordinates to image coordinates (4 point pairs)
 function homography(src, dst) {
  var A = [], i, j, k;
  for (i = 0; i < 4; i++) {
   var u = src[i][0], v = src[i][1], x = dst[i][0], y = dst[i][1];
   A.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]); A.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  }
  for (i = 0; i < 8; i++) {
   var p = i; for (j = i + 1; j < 8; j++) if (Math.abs(A[j][i]) > Math.abs(A[p][i])) p = j;
   var tmp = A[i]; A[i] = A[p]; A[p] = tmp;
   if (Math.abs(A[i][i]) < 1e-12) return null;
   for (j = 0; j < 8; j++) if (j !== i) { var f = A[j][i] / A[i][i]; for (k = i; k < 9; k++) A[j][k] -= f * A[i][k]; }
  }
  return A.map(function (r, q) { return r[8] / r[q]; });
 }

 function readWith(bw, w, h, H, v) {
  var n = 17 + 4 * v, M = [], r, c;
  var at = function (u, vv) { var d = H[6] * u + H[7] * vv + 1; return [(H[0] * u + H[1] * vv + H[2]) / d, (H[3] * u + H[4] * vv + H[5]) / d]; };
  var dark = function (u, vv) { var p = at(u, vv), x = Math.round(p[0]), y = Math.round(p[1]); return x < 0 || y < 0 || x >= w || y >= h ? 0 : bw[y * w + x]; };
  for (r = 0; r < n; r++) { M.push([]); for (c = 0; c < n; c++) {
   var cnt = dark(c + .5, r + .5) * 2 + dark(c + .25, r + .25) + dark(c + .75, r + .25) + dark(c + .25, r + .75) + dark(c + .75, r + .75);
   M[r].push(cnt >= 4 ? 1 : 0);
  } }
  return readModules(M, v);
 }

 function tryTriple(bw, w, h, P, ms) {
  var d = function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); };
  var pairs = [[0, 1, 2], [0, 2, 1], [1, 2, 0]], best = null;   // [a, b, the one opposite]
  pairs.forEach(function (pr) { var len = d(P[pr[0]], P[pr[1]]); if (!best || len > best.len) best = {len: len, tl: P[pr[2]], a: P[pr[0]], b: P[pr[1]]}; });
  var tl = best.tl, a = best.a, b = best.b;
  var cr = (a.x - tl.x) * (b.y - tl.y) - (a.y - tl.y) * (b.x - tl.x), tr = cr > 0 ? a : b, bl = cr > 0 ? b : a;
  var leg = (d(tl, tr) + d(tl, bl)) / 2, mod = (tl.ms + tr.ms + bl.ms) / 3;
  var v0 = Math.round((leg / mod + 7 - 17) / 4), tries = [v0, v0 + 1, v0 - 1];
  for (var t = 0; t < tries.length; t++) {
   var v = tries[t]; if (v < 1 || v > 10) continue;
   var n = 17 + 4 * v, k = n - 7, ux = [(tr.x - tl.x) / k, (tr.y - tl.y) / k], uy = [(bl.x - tl.x) / k, (bl.y - tl.y) / k], res = null;
   var src = [[3.5, 3.5], [n - 3.5, 3.5], [3.5, n - 3.5]], dst = [[tl.x, tl.y], [tr.x, tr.y], [bl.x, bl.y]];
   if (v >= 2) {   // find the small alignment square near the 4th corner for a perspective-correct map
    var gx = tl.x + (n - 10) * ux[0] + (n - 10) * uy[0], gy = tl.y + (n - 10) * ux[1] + (n - 10) * uy[1], step = Math.max(1, mod / 3), bs = -1, bx = 0, by = 0;
    for (var oy = -2.5 * mod; oy <= 2.5 * mod; oy += step) for (var ox = -2.5 * mod; ox <= 2.5 * mod; ox += step) {
     var sc = 0;
     for (var i = -2; i <= 2; i++) for (var j = -2; j <= 2; j++) {
      var px = Math.round(gx + ox + i * ux[0] + j * uy[0]), py = Math.round(gy + oy + i * ux[1] + j * uy[1]);
      var val = px < 0 || py < 0 || px >= w || py >= h ? 0 : bw[py * w + px];
      if (val === (Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0)) sc++;
     }
     if (sc > bs) { bs = sc; bx = gx + ox; by = gy + oy; }
    }
    if (bs >= 23) { var H4 = homography(src.concat([[n - 6.5, n - 6.5]]), dst.concat([[bx, by]])); if (H4) res = readWith(bw, w, h, H4, v); if (res) return res; }
   }
   var H3 = homography(src.concat([[n - 3.5, n - 3.5]]), dst.concat([[tr.x + bl.x - tl.x, tr.y + bl.y - tl.y]]));   // flat (affine) guess
   if (H3) res = readWith(bw, w, h, H3, v);
   if (res) return res;
  }
  return null;
 }

 // rgba = RGBA pixels (like canvas getImageData().data). Returns the text in the code, or null.
 function decode(rgba, w, h) {
  var gray = new Uint8Array(w * h), i;
  for (i = 0; i < gray.length; i++) gray[i] = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
  for (var pass = 0; pass < 2; pass++) {
   var bw = binarize(gray, w, h, pass === 1), F = findFinders(bw, w, h), tr = [];
   for (var a = 0; a < F.length; a++) for (var b = a + 1; b < F.length; b++) for (var c = b + 1; c < F.length; c++) {
    var P = [F[a], F[b], F[c]], dd = [Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y), Math.hypot(P[0].x - P[2].x, P[0].y - P[2].y), Math.hypot(P[1].x - P[2].x, P[1].y - P[2].y)].sort(function (p, q) { return p - q; });
    var sym = Math.abs(dd[0] - dd[1]) / dd[1], hyp = Math.abs(dd[2] - Math.SQRT2 * (dd[0] + dd[1]) / 2) / dd[2];
    var msx = Math.max(P[0].ms, P[1].ms, P[2].ms) / Math.min(P[0].ms, P[1].ms, P[2].ms);
    if (sym < 0.35 && hyp < 0.3 && msx < 1.8) tr.push({P: P, score: sym + hyp});
   }
   tr.sort(function (p, q) { return p.score - q.score; });
   for (var t = 0; t < Math.min(6, tr.length); t++) { var out = tryTriple(bw, w, h, tr[t].P); if (out) return out; }
  }
  return null;
 }

 window.NXQR = {
  modules: make,
  decode: decode,
  svg: function (text, px) {
   var t = make(text), n = t.length, z = 4, d = '', r, c, size = n + z * 2;
   for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (t[r][c]) d += 'M' + (c + z) + ' ' + (r + z) + 'h1v1h-1z';
   return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + (px || 220) + '" height="' + (px || 220) + '" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
 };
})();
