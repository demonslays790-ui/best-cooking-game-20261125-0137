// Sizzle & Serve — orders.js
// One job: the order board — spawning orders, their patience, matching a
// served plate against them, and the pay (with tips and combos).

import { RECIPES, MAX_ORDERS, ORDER_PATIENCE, RUSH_PATIENCE, SERVE_BASE_PAY, COMBO_WINDOW } from './config.js';

let nextOrderId = 1;

export function createOrderBook() {
  return {
    orders: [], // { id, recipe, patience, maxPatience, served, lost }
    spawnTimer: 4, // first customer arrives a few seconds in
    combo: 0,
    comboTimer: 0,
    servedCount: 0,
    lostCount: 0,
    earned: 0,
  };
}

// How often a new customer walks in. Faster as the shift wears on.
export function spawnInterval(timeLeft) {
  if (timeLeft <= 60) return 7;
  if (timeLeft <= 120) return 10;
  return 13;
}

export function pickRecipe(rng) {
  // Early in a shift the easy recipes show up more; the rush brings doubles.
  const pool = RECIPES.filter((r) => (rng() < 0.75 ? true : r.items.length <= 4));
  return pool[Math.floor(rng() * pool.length)] || RECIPES[0];
}

export function updateOrders(book, dt, timeLeft, rng, onNew, onLost) {
  book.spawnTimer -= dt;
  if (book.spawnTimer <= 0 && book.orders.filter((o) => !o.lost).length < MAX_ORDERS) {
    const recipe = pickRecipe(rng);
    const patience = timeLeft <= 60 ? RUSH_PATIENCE : ORDER_PATIENCE;
    book.orders.push({
      id: nextOrderId++,
      recipe,
      patience,
      maxPatience: patience,
      lost: false,
    });
    book.spawnTimer = spawnInterval(timeLeft) * (0.85 + rng() * 0.3);
    if (onNew) onNew();
  }
  for (const o of book.orders) {
    if (o.lost) continue;
    o.patience -= dt;
    if (o.patience <= 0) {
      o.lost = true;
      book.lostCount++;
      book.combo = 0;
      book.comboTimer = 0;
      if (onLost) onLost(o);
    }
  }
  book.orders = book.orders.filter((o) => !o.lost || o.grace > 0);
  if (book.comboTimer > 0) {
    book.comboTimer -= dt;
    if (book.comboTimer <= 0) book.combo = 0;
  }
}

// A plate matches an order when it holds exactly the recipe's items,
// in any order (two patties means the plate really needs two).
export function findMatchingOrder(book, plateItems) {
  const counts = new Map();
  for (const it of plateItems) {
    const k = it.id + ':' + it.state;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  for (const o of book.orders) {
    if (o.lost) continue;
    const need = new Map();
    for (const it of o.recipe.items) {
      const k = it.id + ':' + it.state;
      need.set(k, (need.get(k) || 0) + 1);
    }
    if (need.size !== counts.size) continue;
    let ok = true;
    for (const [k, v] of need) if (counts.get(k) !== v) { ok = false; break; }
    if (ok) return o;
  }
  return null;
}

// Pay out a served order. Fast service earns a tip on the patience left;
// serving twice in a row inside the combo window raises the multiplier.
export function serveOrder(book, order) {
  const patienceFrac = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(order.recipe.price * 0.5 * patienceFrac);
  book.combo = book.comboTimer > 0 ? book.combo + 1 : 1;
  book.comboTimer = COMBO_WINDOW;
  const mult = 1 + 0.25 * (book.combo - 1);
  const pay = Math.round((SERVE_BASE_PAY + order.recipe.price + tip) * mult);
  book.orders = book.orders.filter((o) => o !== order);
  book.servedCount++;
  book.earned += pay;
  return { pay, tip, combo: book.combo, mult, patienceFrac };
}

// The order a plate is closest to (for the "almost" hint at the pass).
export function closestOrder(book, plateItems) {
  let best = null;
  let bestScore = -1;
  for (const o of book.orders) {
    if (o.lost) continue;
    let score = 0;
    const need = o.recipe.items.map((i) => i.id + ':' + i.state);
    const have = plateItems.map((i) => i.id + ':' + i.state);
    for (const h of have) if (need.includes(h)) score++;
    if (score > bestScore) { bestScore = score; best = o; }
  }
  return best;
}
