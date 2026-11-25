// Sizzle & Serve — kitchen.js
// One job: the kitchen simulation — the chef, the stations, and what happens
// at each one. No drawing here; render.js reads this state and paints it.

import {
  STATIONS, FLOOR, PLAYER_START, PLAYER_RADIUS, WALK_SPEED,
  INGREDIENTS, CHOP_SECONDS, COOK_SECONDS, BURN_SECONDS,
} from './config.js';
import { sfx, startSizzle, stopSizzle } from './audio.js';

export function createKitchen() {
  return {
    player: { x: PLAYER_START.x, y: PLAYER_START.y, dir: 1, moving: false },
    // What the chef is holding: null, {kind:'item', id, state} or {kind:'plate', items:[]}
    hands: null,
    // The plate sitting on the plating counter (items being built).
    counterPlate: [],
    // Chopping board: null or { id, progress, done }
    board: null,
    // Two stoves: each null or { id:'patty', progress, state:'cooking'|'done'|'burnt' }
    stoves: { stove1: null, stove2: null },
    // Fridge picker: which ingredient the picker highlights (null = closed)
    pickerOpen: false,
    pickerIndex: 0,
    // Toasts floating over the kitchen ("+38  COMBO x2").
    toasts: [],
    flash: null, // { text, colour, until }
    lastChopTick: 0,
  };
}

export function stationById(id) {
  return STATIONS.find((s) => s.id === id);
}

function stationCenter(s) {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

// The station the chef is close enough to use (nearest within reach).
export function nearestStation(k) {
  let best = null;
  let bestD = 110;
  for (const s of STATIONS) {
    const c = stationCenter(s);
    const dx = k.player.x - c.x;
    const dy = k.player.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function addToast(k, text, colour) {
  k.toasts.push({ text, colour, life: 1.6 });
}

export function setFlash(k, text, colour) {
  k.flash = { text, colour, until: performance.now() + 1400 };
}

export function updateKitchen(k, dt, input, onEvent) {
  // --- movement -----------------------------------------------------------
  const mv = input.moveVector();
  const p = k.player;
  p.moving = mv.x !== 0 || mv.y !== 0;
  if (mv.x !== 0) p.dir = mv.x > 0 ? 1 : -1;
  p.x += mv.x * WALK_SPEED * dt;
  p.y += mv.y * WALK_SPEED * dt;
  // Stay on the floor, and out of the station counters along the top wall.
  p.x = Math.max(FLOOR.x + PLAYER_RADIUS, Math.min(FLOOR.x + FLOOR.w - PLAYER_RADIUS, p.x));
  p.y = Math.max(FLOOR.y + PLAYER_RADIUS, Math.min(FLOOR.y + FLOOR.h - PLAYER_RADIUS, p.y));
  for (const s of STATIONS) {
    if (s.id === 'trash') continue; // the bin is low; you can step up to it
    if (p.y - PLAYER_RADIUS < s.y + s.h && p.y + PLAYER_RADIUS > s.y &&
        p.x + PLAYER_RADIUS > s.x && p.x - PLAYER_RADIUS < s.x + s.w) {
      // Push the chef back below the counter they bumped into.
      p.y = s.y + s.h + PLAYER_RADIUS;
    }
  }

  // --- chopping -----------------------------------------------------------
  if (k.board && !k.board.done) {
    k.board.progress += dt;
    if (Math.floor(k.board.progress * 4) !== Math.floor(k.lastChopTick * 4)) sfx.chop();
    k.lastChopTick = k.board.progress;
    if (k.board.progress >= CHOP_SECONDS) {
      k.board.done = true;
      k.board.state = 'chopped';
      sfx.chopDone();
      addToast(k, 'Chopped!', '#7dc24a');
    }
  }

  // --- cooking ------------------------------------------------------------
  let anyCooking = false;
  for (const id of ['stove1', 'stove2']) {
    const st = k.stoves[id];
    if (!st) continue;
    if (st.state === 'cooking') {
      anyCooking = true;
      st.progress += dt;
      if (st.progress >= COOK_SECONDS) {
        st.state = 'done';
        sfx.cookDone();
        addToast(k, 'Patty ready!', '#f7c948');
      }
    } else if (st.state === 'done') {
      st.progress += dt;
      if (st.progress >= COOK_SECONDS + BURN_SECONDS) {
        st.state = 'burnt';
        sfx.burn();
        addToast(k, 'Burnt!', '#e2483d');
      }
    }
  }
  if (anyCooking) startSizzle(); else stopSizzle();

  // --- toasts -------------------------------------------------------------
  for (const t of k.toasts) t.life -= dt;
  k.toasts = k.toasts.filter((t) => t.life > 0);

  // --- fridge picker ------------------------------------------------------
  if (k.pickerOpen) {
    const ids = Object.keys(INGREDIENTS);
    if (input.consumePress('ArrowLeft') || input.consumePress('a')) {
      k.pickerIndex = (k.pickerIndex + ids.length - 1) % ids.length;
      sfx.click();
    }
    if (input.consumePress('ArrowRight') || input.consumePress('d')) {
      k.pickerIndex = (k.pickerIndex + 1) % ids.length;
      sfx.click();
    }
    for (let i = 0; i < ids.length; i++) {
      if (input.consumePress(String(i + 1))) {
        k.pickerIndex = i;
        takeFromFridge(k, ids[i]);
        return;
      }
    }
    if (input.consumePress('Enter') || input.consumePress('Space') || input.consumePress('e')) {
      takeFromFridge(k, ids[k.pickerIndex]);
      return;
    }
    if (input.consumePress('Escape')) { k.pickerOpen = false; sfx.click(); return; }
  }
}

// Take one raw ingredient out of the fridge into the chef's hands.
export function takeFromFridge(k, id) {
  if (k.hands) {
    setFlash(k, 'Hands full!', '#e2483d');
    sfx.wrong();
    return;
  }
  // Bun and cheese need no prep: they come out of the fridge already ready
  // to plate. Everything else comes out raw and needs the board or stove.
  const state = INGREDIENTS[id].prep === 'ready' ? 'ready' : 'raw';
  k.hands = { kind: 'item', id, state };
  k.pickerOpen = false;
  sfx.pickup();
}

// The E key (or a click on a station): do the right thing for the station
// the chef is standing at, given what is in their hands.
export function interact(k, station) {
  if (!station) return;
  const hands = k.hands;

  if (station.id === 'fridge') {
    if (hands) { setFlash(k, 'Hands full!', '#e2483d'); sfx.wrong(); return; }
    k.pickerOpen = !k.pickerOpen;
    sfx.click();
    return;
  }

  if (station.id === 'board') {
    if (k.board && k.board.done) {
      if (hands) { setFlash(k, 'Hands full!', '#e2483d'); sfx.wrong(); return; }
      k.hands = { kind: 'item', id: k.board.id, state: 'chopped' };
      k.board = null;
      sfx.pickup();
      return;
    }
    if (k.board) { setFlash(k, 'Still chopping…', '#f7c948'); return; }
    if (hands && hands.kind === 'item' && INGREDIENTS[hands.id].prep === 'chop' && hands.state === 'raw') {
      k.board = { id: hands.id, progress: 0, done: false, state: 'raw' };
      k.hands = null;
      sfx.place();
      return;
    }
    setFlash(k, 'Needs something to chop', '#f7c948');
    return;
  }

  if (station.id === 'stove1' || station.id === 'stove2') {
    const st = k.stoves[station.id];
    if (st && (st.state === 'done' || st.state === 'burnt')) {
      if (hands) { setFlash(k, 'Hands full!', '#e2483d'); sfx.wrong(); return; }
      k.hands = { kind: 'item', id: 'patty', state: st.state === 'done' ? 'cooked' : 'burnt' };
      k.stoves[station.id] = null;
      sfx.pickup();
      return;
    }
    if (st) { setFlash(k, st.state === 'cooking' ? 'Still cooking…' : 'Burnt — toss it', '#f7c948'); return; }
    if (hands && hands.kind === 'item' && hands.id === 'patty' && hands.state === 'raw') {
      k.stoves[station.id] = { id: 'patty', progress: 0, state: 'cooking' };
      k.hands = null;
      sfx.place();
      return;
    }
    setFlash(k, 'Needs a raw patty', '#f7c948');
    return;
  }

  if (station.id === 'assembly') {
    if (hands && hands.kind === 'item') {
      if (hands.state === 'raw' || hands.state === 'burnt') {
        setFlash(k, 'Not ready yet!', '#e2483d');
        sfx.wrong();
        return;
      }
      if (k.counterPlate.length >= 5) { setFlash(k, 'Plate is full!', '#e2483d'); return; }
      k.counterPlate.push({ id: hands.id, state: hands.state });
      k.hands = null;
      sfx.place();
      return;
    }
    if (hands && hands.kind === 'plate') {
      if (k.counterPlate.length > 0) { setFlash(k, 'Counter plate in the way', '#f7c948'); return; }
      k.counterPlate = hands.items;
      k.hands = null;
      sfx.place();
      return;
    }
    // Empty hands: pick the plate up off the counter.
    if (k.counterPlate.length > 0) {
      k.hands = { kind: 'plate', items: k.counterPlate };
      k.counterPlate = [];
      sfx.pickup();
      return;
    }
    setFlash(k, 'Bring an ingredient', '#f7c948');
    return;
  }

  if (station.id === 'serve') {
    // Serving itself is handled by main.js (it needs the order book);
    // here we only report that the chef is at the pass with a plate.
    return;
  }

  if (station.id === 'trash') {
    if (hands) {
      k.hands = null;
      sfx.place();
      addToast(k, 'Tossed', '#9aa0aa');
    }
    return;
  }
}
