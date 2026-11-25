// Sizzle & Serve — render.js
// One job: paint everything on the canvas — kitchen, chef, food, order
// board, HUD and screens. It only reads game state; it never changes it.

import { CANVAS_W, CANVAS_H, HUD_H, FLOOR, ORDER_PANEL, STATIONS, INGREDIENTS, SHIFT_SECONDS } from './config.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, colour, align = 'left', weight = 'bold') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// --- food -----------------------------------------------------------------
// Each ingredient is drawn the same way everywhere (fridge, board, plate,
// HUD) so the player learns to read it at a glance.

export function drawIngredient(ctx, id, state, x, y, s) {
  const ing = INGREDIENTS[id];
  const u = s / 40; // unit scale
  ctx.save();
  ctx.translate(x, y);
  if (id === 'bun') {
    ctx.fillStyle = ing.colour;
    ctx.beginPath();
    ctx.arc(0, 2 * u, 16 * u, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.fillRect(-14 * u, 0, 28 * u, 4 * u);
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(-6 * u, -6 * u, 1.6 * u, 0, 7);
    ctx.arc(5 * u, -9 * u, 1.6 * u, 0, 7);
    ctx.arc(9 * u, -3 * u, 1.6 * u, 0, 7);
    ctx.fill();
  } else if (id === 'patty') {
    ctx.fillStyle = state === 'burnt' ? '#241a12' : state === 'cooked' ? '#7a3b1d' : '#c96a4a';
    rr(ctx, -16 * u, -7 * u, 32 * u, 14 * u, 7 * u);
    ctx.fill();
    if (state === 'cooked') {
      ctx.fillStyle = '#a8542f';
      for (const [dx, dy] of [[-9, -2], [0, 2], [9, -2]]) {
        ctx.beginPath(); ctx.arc(dx * u, dy * u, 2.4 * u, 0, 7); ctx.fill();
      }
    }
    if (state === 'burnt') {
      ctx.strokeStyle = '#555';
      ctx.beginPath();
      ctx.moveTo(-12 * u, -4 * u); ctx.lineTo(12 * u, 4 * u);
      ctx.moveTo(12 * u, -4 * u); ctx.lineTo(-12 * u, 4 * u);
      ctx.stroke();
    }
  } else if (id === 'tomato') {
    ctx.fillStyle = ing.colour;
    ctx.beginPath(); ctx.arc(0, 0, 14 * u, 0, 7); ctx.fill();
    ctx.fillStyle = '#f0837a';
    ctx.beginPath(); ctx.arc(-4 * u, -3 * u, 8 * u, 0, 7); ctx.fill();
    if (state === 'chopped') {
      ctx.strokeStyle = ing.dark;
      ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.moveTo(-13 * u, 0); ctx.lineTo(13 * u, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -13 * u); ctx.lineTo(0, 13 * u); ctx.stroke();
    } else {
      ctx.fillStyle = '#4a7d24';
      ctx.beginPath(); ctx.ellipse(0, -13 * u, 5 * u, 3 * u, 0, 0, 7); ctx.fill();
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = ing.colour;
    for (const [dx, dy, r] of [[-8, 2, 9], [0, -4, 10], [8, 2, 9]]) {
      ctx.beginPath(); ctx.arc(dx * u, dy * u, r * u, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = ing.dark;
    ctx.lineWidth = 1.6 * u;
    ctx.beginPath(); ctx.moveTo(-12 * u, 4 * u); ctx.quadraticCurveTo(0, -8 * u, 12 * u, 4 * u); ctx.stroke();
  } else if (id === 'cheese') {
    ctx.fillStyle = ing.colour;
    ctx.beginPath();
    ctx.moveTo(-15 * u, -6 * u); ctx.lineTo(15 * u, -6 * u);
    ctx.lineTo(8 * u, 8 * u); ctx.lineTo(-8 * u, 8 * u);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = ing.dark;
    for (const [dx, dy] of [[-7, -1], [3, 2], [8, -3]]) {
      ctx.beginPath(); ctx.arc(dx * u, dy * u, 1.8 * u, 0, 7); ctx.fill();
    }
  } else if (id === 'onion') {
    ctx.fillStyle = ing.colour;
    ctx.beginPath(); ctx.arc(0, 0, 13 * u, 0, 7); ctx.fill();
    ctx.strokeStyle = ing.dark;
    ctx.lineWidth = 1.8 * u;
    for (const r of [4, 8, 11]) {
      ctx.beginPath(); ctx.arc(0, 0, r * u, 0, 7); ctx.stroke();
    }
    if (state === 'chopped') {
      ctx.fillStyle = '#fff';
      for (const [dx, dy] of [[-9, -6], [4, -9], [10, 3], [-3, 8]]) {
        ctx.beginPath(); ctx.arc(dx * u, dy * u, 3.4 * u, 0, 7); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// A white plate with the stacked items on it.
export function drawPlate(ctx, items, x, y, s) {
  const u = s / 40;
  ctx.fillStyle = '#f4f2ec';
  ctx.beginPath(); ctx.ellipse(x, y, 24 * u, 9 * u, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#c9c2ae';
  ctx.lineWidth = 1.5 * u;
  ctx.stroke();
  let dy = -2 * u;
  for (const it of items) {
    drawIngredient(ctx, it.id, it.state, x, y + dy, s * 0.8);
    dy -= 7 * u;
  }
}

// --- kitchen ---------------------------------------------------------------

function drawFloor(ctx) {
  // Warm checkerboard tiles.
  const t = 58;
  for (let y = FLOOR.y; y < FLOOR.y + FLOOR.h; y += t) {
    for (let x = FLOOR.x; x < FLOOR.x + FLOOR.w; x += t) {
      const even = (Math.floor((x - FLOOR.x) / t) + Math.floor((y - FLOOR.y) / t)) % 2 === 0;
      ctx.fillStyle = even ? '#e9dcc3' : '#dfcfae';
      ctx.fillRect(x, y, t, t);
    }
  }
  ctx.strokeStyle = '#b3a888';
  ctx.lineWidth = 3;
  ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  // A rug in the middle of the floor where the chef runs, with a plate motif.
  ctx.fillStyle = '#c96f4a';
  rr(ctx, 560, 300, 380, 220, 18);
  ctx.fill();
  ctx.fillStyle = '#e8b06a';
  rr(ctx, 576, 316, 348, 188, 12);
  ctx.fill();
  ctx.strokeStyle = '#c96f4a';
  ctx.lineWidth = 3;
  rr(ctx, 592, 332, 316, 156, 10);
  ctx.stroke();
  ctx.fillStyle = '#f4f2ec';
  ctx.beginPath(); ctx.ellipse(750, 410, 52, 20, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#c9c2ae';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e2483d';
  ctx.beginPath(); ctx.arc(750, 402, 12, 0, 7); ctx.fill();
  ctx.fillStyle = '#7dc24a';
  ctx.beginPath(); ctx.arc(738, 404, 6, 0, 7); ctx.arc(762, 404, 6, 0, 7); ctx.fill();
  // A potted plant in the floor's bottom-left corner.
  ctx.fillStyle = '#c96f4a';
  rr(ctx, 348, 636, 44, 36, 6);
  ctx.fill();
  ctx.fillStyle = '#4a7d24';
  ctx.beginPath(); ctx.arc(370, 622, 16, 0, 7); ctx.arc(356, 632, 11, 0, 7); ctx.arc(384, 632, 11, 0, 7); ctx.fill();
}

function drawProgressBar(ctx, x, y, w, frac, colour) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, x, y, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = colour;
  if (frac > 0) { rr(ctx, x, y, Math.max(10, w * frac), 10, 5); ctx.fill(); }
}

function drawStation(ctx, s, k, near) {
  ctx.save();
  if (near) {
    ctx.shadowColor = '#ffd34d';
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = s.colour;
  rr(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = s.trim;
  ctx.lineWidth = 3;
  rr(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.stroke();
  text(ctx, s.label, s.x + s.w / 2, s.y + 16, 13, '#2b2620', 'center');

  const cx = s.x + s.w / 2;
  if (s.id === 'fridge') {
    // Fridge shelves stacked with raw ingredients.
    for (let i = 0; i < 3; i++) {
      const ids = ['bun', 'patty', 'tomato', 'lettuce', 'cheese', 'onion'];
      const id = ids[i * 2];
      drawIngredient(ctx, id, 'raw', s.x + 34 + i * 42, s.y + 52, 30);
    }
    ctx.fillStyle = '#7fa8c4';
    ctx.fillRect(s.x + 8, s.y + 30, 6, 34);
  }
  if (s.id === 'board') {
    ctx.fillStyle = '#f4ead6';
    rr(ctx, s.x + 20, s.y + 30, s.w - 40, 34, 6);
    ctx.fill();
    if (k.board) {
      drawIngredient(ctx, k.board.id, k.board.done ? 'chopped' : 'raw', cx, s.y + 47, 30);
      if (!k.board.done) drawProgressBar(ctx, s.x + 24, s.y + 68, s.w - 48, k.board.progress / 2.6, '#7dc24a');
      else text(ctx, 'READY', cx, s.y + 70, 11, '#4a7d24', 'center');
    } else {
      text(ctx, '— empty —', cx, s.y + 47, 11, '#8a7a5c', 'center');
    }
  }
  if (s.id === 'stove1' || s.id === 'stove2') {
    const st = k.stoves[s.id];
    // Two burner rings.
    for (const bx of [s.x + 26, s.x + s.w - 26]) {
      ctx.strokeStyle = '#1c1e24';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bx, s.y + 48, 15, 0, 7); ctx.stroke();
      if (st && st.state === 'cooking') {
        ctx.fillStyle = Math.floor(performance.now() / 120) % 2 ? '#ff9a3c' : '#ffb84d';
        ctx.beginPath(); ctx.arc(bx, s.y + 48, 11, 0, 7); ctx.fill();
      }
    }
    if (st) {
      drawIngredient(ctx, 'patty', st.state === 'done' ? 'cooked' : st.state === 'burnt' ? 'burnt' : 'raw', cx, s.y + 48, 30);
      const total = st.state === 'cooking' ? 4.2 : 10.2;
      const col = st.state === 'burnt' ? '#e2483d' : st.state === 'done' ? '#f7c948' : '#ff9a3c';
      drawProgressBar(ctx, s.x + 10, s.y + 70, s.w - 20, Math.min(1, st.progress / total), col);
      if (st.state === 'done') text(ctx, 'READY', cx, s.y + 38, 10, '#f7c948', 'center');
      if (st.state === 'burnt') text(ctx, 'BURNT!', cx, s.y + 38, 10, '#ff6b5e', 'center');
    }
  }
  if (s.id === 'assembly') {
    if (k.counterPlate.length > 0) {
      drawPlate(ctx, k.counterPlate, cx, s.y + 52, 34);
      text(ctx, k.counterPlate.length + ' item' + (k.counterPlate.length > 1 ? 's' : ''), cx, s.y + 72, 11, '#5c5344', 'center');
    } else {
      ctx.strokeStyle = '#b3a888';
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.ellipse(cx, s.y + 50, 30, 11, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'plate goes here', cx, s.y + 50, 11, '#8a7a5c', 'center');
    }
  }
  if (s.id === 'serve') {
    ctx.fillStyle = '#f4ead6';
    rr(ctx, s.x + 10, s.y + 30, s.w - 20, 20, 4);
    ctx.fill();
    text(ctx, '★ SERVE ★', cx, s.y + 40, 12, '#8f4526', 'center');
    text(ctx, 'match an order', cx, s.y + 62, 11, '#7a4a30', 'center');
  }
  if (s.id === 'trash') {
    ctx.fillStyle = '#43474f';
    rr(ctx, s.x + 44, s.y + 30, s.w - 88, 40, 6);
    ctx.fill();
    ctx.strokeStyle = '#9aa0aa';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s.x + 52, s.y + 38); ctx.lineTo(s.x + s.w - 52, s.y + 38); ctx.stroke();
    text(ctx, 'BIN', cx, s.y + 52, 13, '#dfe3e8', 'center');
  }
  if (near) text(ctx, s.hint, cx, s.y + s.h + 14, 12, '#fff', 'center');
}

// --- chef ------------------------------------------------------------------

function drawChef(ctx, p, hands, t) {
  const bob = p.moving ? Math.sin(t * 14) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 18, 20, 7, 0, 0, 7); ctx.fill();
  // Body: white chef coat.
  ctx.fillStyle = '#f7f5ef';
  rr(ctx, -17, -8, 34, 30, 10);
  ctx.fill();
  ctx.strokeStyle = '#c9c2ae';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Apron stripe.
  ctx.fillStyle = '#3f7d5c';
  ctx.fillRect(-17, 6, 34, 6);
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(0, -20, 13, 0, 7); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-8, -30, 8, 0, 7); ctx.arc(0, -34, 9, 0, 7); ctx.arc(8, -30, 8, 0, 7); ctx.fill();
  ctx.fillRect(-11, -32, 22, 6);
  // Eyes look where the chef faces.
  ctx.fillStyle = '#2b2620';
  ctx.beginPath(); ctx.arc(p.dir * 4 - 4, -20, 1.8, 0, 7); ctx.arc(p.dir * 4 + 4, -20, 1.8, 0, 7); ctx.fill();
  // Smile.
  ctx.strokeStyle = '#2b2620';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(p.dir * 3, -15, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // Arms reach toward the facing side.
  ctx.strokeStyle = '#f7f5ef';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p.dir * 12, 2); ctx.lineTo(p.dir * 24, 8); ctx.stroke();
  ctx.restore();

  // What the chef carries floats above their head.
  if (hands) {
    if (hands.kind === 'item') {
      drawIngredient(ctx, hands.id, hands.state, p.x, p.y - 52 + bob, 34);
    } else {
      drawPlate(ctx, hands.items, p.x, p.y - 52 + bob, 32);
    }
  }
}

// --- order board -----------------------------------------------------------

function drawOrderBoard(ctx, book, t) {
  const p = ORDER_PANEL;
  ctx.fillStyle = '#2b2620';
  rr(ctx, p.x, p.y, p.w, p.h, 12);
  ctx.fill();
  ctx.fillStyle = '#f7c948';
  text(ctx, 'ORDER BOARD', p.x + p.w / 2, p.y + 24, 18, '#f7c948', 'center');
  ctx.strokeStyle = '#f7c948';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.x + 14, p.y + 42); ctx.lineTo(p.x + p.w - 14, p.y + 42); ctx.stroke();

  const live = book.orders.filter((o) => !o.lost);
  if (live.length === 0) {
    text(ctx, 'No orders yet —', p.x + p.w / 2, p.y + 90, 14, '#cfc4ae', 'center');
    text(ctx, 'the lunch crowd', p.x + p.w / 2, p.y + 112, 14, '#cfc4ae', 'center');
    text(ctx, 'is on its way…', p.x + p.w / 2, p.y + 134, 14, '#cfc4ae', 'center');
  }
  live.forEach((o, i) => {
    const y = p.y + 56 + i * 96;
    const frac = Math.max(0, o.patience / o.maxPatience);
    const urgent = frac < 0.3;
    ctx.fillStyle = urgent && Math.floor(t * 4) % 2 === 0 ? '#5c2b26' : '#3d362e';
    rr(ctx, p.x + 10, y, p.w - 20, 86, 8);
    ctx.fill();
    ctx.fillStyle = '#f4ead6';
    text(ctx, '#' + o.id + '  ' + o.recipe.name, p.x + 22, y + 16, 14, '#f4ead6');
    text(ctx, '$' + o.recipe.price, p.x + p.w - 22, y + 16, 14, '#7dc24a', 'right');
    // The recipe, as a row of little ingredients.
    o.recipe.items.forEach((it, j) => {
      drawIngredient(ctx, it.id, it.state, p.x + 36 + j * 34, y + 48, 26);
    });
    drawProgressBar(ctx, p.x + 22, y + 70, p.w - 44, frac, frac < 0.3 ? '#e2483d' : frac < 0.6 ? '#f7c948' : '#7dc24a');
  });

  // Footer: served / lost tally.
  text(ctx, 'Served ' + book.servedCount + '   •   Walked out ' + book.lostCount,
    p.x + p.w / 2, p.y + p.h - 18, 13, '#cfc4ae', 'center');
}

// --- HUD, picker, toasts, screens ------------------------------------------

function fmtTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function drawHUD(ctx, g) {
  ctx.fillStyle = '#2b2620';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = '#f7c948';
  text(ctx, 'SIZZLE & SERVE', 20, 24, 22, '#f7c948');
  text(ctx, 'a tiny kitchen, a big lunch rush', 20, 46, 12, '#cfc4ae');
  // Score.
  text(ctx, 'SCORE', 330, 20, 12, '#cfc4ae', 'center');
  text(ctx, String(g.score), 330, 44, 22, '#ffffff', 'center');
  // Coins earned this shift.
  text(ctx, 'EARNED', 440, 20, 12, '#cfc4ae', 'center');
  text(ctx, '$' + g.book.earned, 440, 44, 22, '#7dc24a', 'center');
  // Combo.
  if (g.book.combo > 1) {
    text(ctx, 'COMBO x' + g.book.combo, 570, 32, 18, '#ff9a3c', 'center');
    drawProgressBar(ctx, 520, 48, 100, g.book.comboTimer / 12, '#ff9a3c');
  } else {
    text(ctx, 'serve fast twice', 570, 24, 12, '#8a7a5c', 'center');
    text(ctx, 'for a combo', 570, 44, 12, '#8a7a5c', 'center');
  }
  // Shift timer — big, and red when the rush is on.
  const rush = g.timeLeft <= 60;
  text(ctx, rush ? 'DINNER RUSH' : 'SHIFT', 700, 20, 12, rush ? '#ff6b5e' : '#cfc4ae', 'center');
  text(ctx, fmtTime(g.timeLeft), 700, 44, 26, rush ? '#ff6b5e' : '#ffffff', 'center');
  // Shift progress bar.
  drawProgressBar(ctx, 780, 26, 180, 1 - g.timeLeft / SHIFT_SECONDS, '#3f7d5c');
  text(ctx, 'shift progress', 870, 48, 11, '#8a7a5c', 'center');
  // Controls reminder + mute.
  text(ctx, 'WASD / arrows move · E interact · M mute', 1000, 22, 12, '#cfc4ae', 'left');
  text(ctx, g.muted ? 'sound: OFF  (M)' : 'sound: ON  (M)', 1000, 44, 12, '#cfc4ae', 'left');
}

function drawPicker(ctx, k) {
  const ids = Object.keys(INGREDIENTS);
  const w = 560;
  const h = 150;
  const x = (CANVAS_W - w) / 2;
  const y = 260;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#2b2620';
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = '#f7c948';
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
  text(ctx, 'FRIDGE — pick an ingredient  (1-6, arrows, Enter)', x + w / 2, y + 24, 15, '#f7c948', 'center');
  ids.forEach((id, i) => {
    const cx = x + 50 + i * 88;
    if (i === k.pickerIndex) {
      ctx.fillStyle = '#f7c948';
      rr(ctx, cx - 38, y + 44, 76, 76, 10);
      ctx.fill();
    }
    drawIngredient(ctx, id, 'raw', cx, y + 76, 40);
    text(ctx, (i + 1) + ' ' + INGREDIENTS[id].label, cx, y + 128, 12, i === k.pickerIndex ? '#2b2620' : '#f4ead6', 'center');
  });
  text(ctx, 'Esc closes', x + w / 2, y + h - 6, 11, '#8a7a5c', 'center');
}

function drawToasts(ctx, k) {
  k.toasts.forEach((t, i) => {
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = ctx.measureText(t.text).width + 28;
    rr(ctx, CANVAS_W / 2 - w / 2, 196 + i * 30, w, 24, 12);
    ctx.fill();
    text(ctx, t.text, CANVAS_W / 2, 209 + i * 30, 16, t.colour, 'center');
    ctx.globalAlpha = 1;
  });
  if (k.flash && performance.now() < k.flash.until) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = ctx.measureText(k.flash.text).width + 28;
    rr(ctx, CANVAS_W / 2 - w / 2, 196, w, 24, 12);
    ctx.fill();
    text(ctx, k.flash.text, CANVAS_W / 2, 209, 16, k.flash.colour, 'center');
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(20,16,12,0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const w = 640;
  const h = 380;
  const x = (CANVAS_W - w) / 2;
  const y = (CANVAS_H - h) / 2;
  ctx.fillStyle = '#2b2620';
  rr(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  rr(ctx, x, y, w, h, 16);
  ctx.stroke();
  text(ctx, title, CANVAS_W / 2, y + 52, 34, accent, 'center');
  lines.forEach((ln, i) => {
    text(ctx, ln.text, CANVAS_W / 2, y + 108 + i * 32, ln.size || 16, ln.colour || '#f4ead6', 'center');
  });
}

// --- the frame --------------------------------------------------------------

export function render(ctx, g, t) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#241f1a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawFloor(ctx);
  const near = g.state === 'playing' ? g.nearStation : null;
  for (const s of STATIONS) drawStation(ctx, s, g.kitchen, near === s ? s : null);
  drawOrderBoard(ctx, g.book, t);
  drawChef(ctx, g.kitchen.player, g.kitchen.hands, t);
  drawHUD(ctx, g);
  drawToasts(ctx, g.kitchen);
  if (g.kitchen.pickerOpen && g.state === 'playing') drawPicker(ctx, g.kitchen);

  // Carried-item label, so the player always knows what is in their hands.
  const hands = g.kitchen.hands;
  if (hands && g.state === 'playing') {
    const label = hands.kind === 'plate'
      ? 'Plate: ' + (hands.items.map((i) => i.id).join(' + ') || 'empty')
      : hands.id + ' (' + hands.state + ')';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    rr(ctx, CANVAS_W / 2 - 130, CANVAS_H - 34, 260, 24, 12);
    ctx.fill();
    text(ctx, 'Holding: ' + label, CANVAS_W / 2, CANVAS_H - 22, 13, '#fff', 'center');
  }

  if (g.state === 'title') {
    overlay(ctx, 'SIZZLE & SERVE', [
      { text: 'Run the lunch rush: chop, fry, plate and serve', size: 17 },
      { text: 'before the customers walk out.', size: 17 },
      { text: 'WASD / arrows to move · E to use a station · 1-6 at the fridge', colour: '#cfc4ae' },
      { text: 'Cook patties, but not too long — they burn!', colour: '#cfc4ae' },
      { text: 'Press ENTER or click to start your shift', colour: '#f7c948', size: 18 },
    ], '#f7c948');
  }
  if (g.state === 'over') {
    overlay(ctx, 'SHIFT OVER!', [
      { text: 'Score ' + g.score + '  ·  earned $' + g.book.earned, size: 20 },
      { text: 'Served ' + g.book.servedCount + ' orders · ' + g.book.lostCount + ' customers walked out', colour: '#cfc4ae' },
      { text: g.book.servedCount >= 12 ? 'A rush-hour legend. The regulars will be back.' : g.book.servedCount >= 6 ? 'A solid shift — the rush nearly had you.' : 'The lunch crowd won today. Faster chops next time!', colour: '#cfc4ae' },
      { text: 'Press R to run it back', colour: '#f7c948', size: 18 },
    ], '#7dc24a');
  }
}
