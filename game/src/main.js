// Sizzle & Serve — main.js
// One job: run the game — the loop, the title/playing/over states, serving
// at the pass, the shift timer, and the staged states screenshots use.
// Everything else lives in its own file: config, audio, input, orders,
// kitchen (simulation) and render (painting).

import { CANVAS_W, CANVAS_H, SHIFT_SECONDS, RUSH_START } from './config.js';
import { createInput } from './input.js';
import { createOrderBook, updateOrders, findMatchingOrder, serveOrder, closestOrder } from './orders.js';
import { createKitchen, updateKitchen, interact, nearestStation, setFlash } from './kitchen.js';
import { render } from './render.js';
import { sfx, unlockAudio, toggleMute, isMuted, stopSizzle } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const params = new URLSearchParams(location.search);
const input = createInput(canvas);

// A tiny deterministic RNG so a staged screenshot looks the same every run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newGame() {
  return {
    state: 'title', // title | playing | over
    score: 0,
    timeLeft: SHIFT_SECONDS,
    book: createOrderBook(),
    kitchen: createKitchen(),
    nearStation: null,
    muted: isMuted(),
    rng: mulberry32((Date.now() % 100000) + 7),
    lastTickSecond: -1,
    rushAnnounced: false,
  };
}

let g = newGame();

function startShift() {
  g = newGame();
  g.state = 'playing';
  unlockAudio();
  sfx.rush();
}

// --- serving ---------------------------------------------------------------
function tryServe() {
  const k = g.kitchen;
  if (!k.hands || k.hands.kind !== 'plate') {
    setFlash(k, 'Bring a finished plate', '#f7c948');
    return;
  }
  const order = findMatchingOrder(g.book, k.hands.items);
  if (!order) {
    const near = closestOrder(g.book, k.hands.items);
    setFlash(k, near ? 'Not what #' + near.id + ' ordered!' : 'No order matches this plate', '#e2483d');
    sfx.wrong();
    return;
  }
  const result = serveOrder(g.book, order);
  g.score += result.pay;
  k.hands = null;
  sfx.serve();
  const msg = '+' + result.pay + (result.tip > 0 ? '  (tip $' + result.tip + ')' : '') +
    (result.combo > 1 ? '  COMBO x' + result.combo : '');
  k.toasts.push({ text: msg, colour: '#7dc24a', life: 2 });
}

// --- staged states for screenshots ------------------------------------------
// ?shot=start  title screen over a live kitchen
// ?shot=play   mid-service: orders on the board, a patty cooking, chef plating
// ?shot=assembly  a dish half-built on the plating counter
// ?shot=rush  the dinner rush: low timer, four orders, high score
function stageShot(shot) {
  if (shot === 'start') {
    g.state = 'title';
    g.book.orders.push(
      { id: 1, recipe: { name: 'Classic Burger', price: 24, items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'lettuce', state: 'chopped' }] }, patience: 60, maxPatience: 75, lost: false },
      { id: 2, recipe: { name: 'Cheeseburger', price: 30, items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'cheese', state: 'ready' }, { id: 'tomato', state: 'chopped' }] }, patience: 40, maxPatience: 75, lost: false },
    );
    g.kitchen.stoves.stove1 = { id: 'patty', progress: 2.0, state: 'cooking' };
    g.kitchen.board = { id: 'tomato', progress: 1.2, done: false, state: 'raw' };
    return;
  }
  g.state = 'playing';
  const R = g.rng;
  if (shot === 'play' || shot === 'assembly') {
    g.timeLeft = 132;
    g.score = 86;
    g.book.servedCount = 3;
    g.book.earned = 86;
    g.book.orders.push(
      { id: 3, recipe: { name: 'Classic Burger', price: 24, items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'lettuce', state: 'chopped' }] }, patience: 52, maxPatience: 75, lost: false },
      { id: 4, recipe: { name: 'Cheeseburger', price: 30, items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'cheese', state: 'ready' }, { id: 'tomato', state: 'chopped' }] }, patience: 30, maxPatience: 75, lost: false },
      { id: 5, recipe: { name: 'Garden Stack', price: 34, items: [{ id: 'bun', state: 'ready' }, { id: 'lettuce', state: 'chopped' }, { id: 'tomato', state: 'chopped' }, { id: 'cheese', state: 'ready' }, { id: 'onion', state: 'chopped' }] }, patience: 64, maxPatience: 75, lost: false },
    );
    g.kitchen.stoves.stove1 = { id: 'patty', progress: 3.4, state: 'cooking' };
    g.kitchen.board = { id: 'lettuce', progress: 2.2, done: false, state: 'raw' };
    g.kitchen.player.x = 1000;
    g.kitchen.player.y = 260;
    if (shot === 'play') {
      g.kitchen.counterPlate = [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }];
      g.kitchen.hands = { kind: 'item', id: 'lettuce', state: 'chopped' };
    } else {
      g.kitchen.counterPlate = [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'lettuce', state: 'chopped' }];
      g.kitchen.hands = null;
    }
    return;
  }
  if (shot === 'rush') {
    g.timeLeft = 34;
    g.score = 486;
    g.book.servedCount = 14;
    g.book.earned = 486;
    g.book.combo = 3;
    g.book.comboTimer = 8;
    g.book.orders.push(
      { id: 8, recipe: { name: 'Double Trouble', price: 42, items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'patty', state: 'cooked' }, { id: 'cheese', state: 'ready' }, { id: 'lettuce', state: 'chopped' }] }, patience: 18, maxPatience: 55, lost: false },
      { id: 9, recipe: { name: 'Classic Burger', price: 24, items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'lettuce', state: 'chopped' }] }, patience: 42, maxPatience: 55, lost: false },
      { id: 10, recipe: { name: 'Cheeseburger', price: 30, items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'cheese', state: 'ready' }, { id: 'tomato', state: 'chopped' }] }, patience: 12, maxPatience: 55, lost: false },
      { id: 11, recipe: { name: 'Melty Onion Melt', price: 32, items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'cheese', state: 'ready' }, { id: 'onion', state: 'chopped' }] }, patience: 50, maxPatience: 55, lost: false },
    );
    g.kitchen.stoves.stove1 = { id: 'patty', progress: 3.9, state: 'cooking' };
    g.kitchen.stoves.stove2 = { id: 'patty', progress: 4.2, state: 'done' };
    g.kitchen.board = { id: 'onion', progress: 2.6, done: true, state: 'chopped' };
    g.kitchen.counterPlate = [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'cheese', state: 'ready' }];
    g.kitchen.hands = { kind: 'plate', items: [{ id: 'bun', state: 'ready' }, { id: 'patty', state: 'cooked' }, { id: 'lettuce', state: 'chopped' }] };
    g.kitchen.player.x = 1150;
    g.kitchen.player.y = 300;
    g.kitchen.toasts.push({ text: '+42  COMBO x3', colour: '#7dc24a', life: 3 });
    return;
  }
  void R;
}

// --- frame ------------------------------------------------------------------

const statusEl = document.getElementById('status');
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  // Global keys.
  if (input.consumePress('m')) {
    g.muted = toggleMute();
  }

  if (g.state === 'title') {
    if (input.consumePress('Enter') || input.consumeClick()) startShift();
  } else if (g.state === 'over') {
    if (input.consumePress('r') || input.consumePress('Enter') || input.consumeClick()) startShift();
  } else if (g.state === 'playing') {
    // Shift clock.
    g.timeLeft -= dt;
    const whole = Math.ceil(g.timeLeft);
    if (whole !== g.lastTickSecond) {
      g.lastTickSecond = whole;
      if (whole <= 10 && whole > 0) sfx.tick();
    }
    if (g.timeLeft <= RUSH_START && !g.rushAnnounced) {
      g.rushAnnounced = true;
      g.kitchen.toasts.push({ text: 'DINNER RUSH!', colour: '#ff6b5e', life: 2.5 });
      sfx.rush();
    }
    if (g.timeLeft <= 0) {
      g.timeLeft = 0;
      g.state = 'over';
      stopSizzle();
      sfx.lost();
    }

    updateOrders(g.book, dt, g.timeLeft, g.rng,
      () => sfx.orderIn(),
      () => { sfx.lost(); });
    updateKitchen(g.kitchen, dt, input);

    g.nearStation = nearestStation(g.kitchen);

    // Interact: E, Space, or clicking a station (or the chef's own tile).
    const click = input.consumeClick();
    let interactPressed = input.consumePress('e') || input.consumePress('Space');
    if (click && g.nearStation) {
      const s = g.nearStation;
      if (click.x >= s.x - 10 && click.x <= s.x + s.w + 10 &&
          click.y >= s.y - 10 && click.y <= s.y + s.h + 30) {
        interactPressed = true;
      }
    }
    if (interactPressed && !g.kitchen.pickerOpen) {
      unlockAudio();
      if (g.nearStation && g.nearStation.id === 'serve') tryServe();
      else if (g.nearStation) interact(g.kitchen, g.nearStation);
    } else if (interactPressed && g.kitchen.pickerOpen) {
      // The picker already consumed the key in updateKitchen.
    }

    if (statusEl) {
      statusEl.textContent = 'Score ' + g.score + '. ' + g.timeLeft.toFixed(0) +
        ' seconds left. ' + g.book.orders.length + ' orders open.';
    }
  }

  render(ctx, g, t);
  requestAnimationFrame(frame);
}

// Read-only snapshot for automated play-testing (no cheating: it only
// reports what the screen already shows — position, hands, stations, orders).
window.__sizzle = {
  get state() {
    return {
      screen: g.state,
      score: g.score,
      timeLeft: Math.round(g.timeLeft),
      player: { x: Math.round(g.kitchen.player.x), y: Math.round(g.kitchen.player.y) },
      hands: g.kitchen.hands,
      board: g.kitchen.board,
      stoves: g.kitchen.stoves,
      counterPlate: g.kitchen.counterPlate,
      pickerOpen: g.kitchen.pickerOpen,
      nearStation: g.nearStation ? g.nearStation.id : null,
      orders: g.book.orders.map((o) => ({ id: o.id, name: o.recipe.name, items: o.recipe.items, patience: Math.round(o.patience) })),
      served: g.book.servedCount,
      earned: g.book.earned,
    };
  },
};

// A staged screenshot state freezes the title/playing setup but the world
// still ticks (timers, sizzle) so the shot looks alive, not posed.
const shot = params.get('shot');
if (shot) stageShot(shot);
requestAnimationFrame(frame);
