// Sizzle & Serve — config.js
// One job: every tunable number, the kitchen layout and the recipe book.
// Nothing here draws, moves or sounds; it only describes the game.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

// The top strip is the heads-up display; the kitchen floor lives below it.
export const HUD_H = 64;
export const FLOOR = { x: 312, y: 76, w: 952, h: 620 };
export const ORDER_PANEL = { x: 16, y: 76, w: 280, h: 480 };

// A full shift lasts three minutes; the last minute is the dinner rush.
export const SHIFT_SECONDS = 180;
export const RUSH_START = 60; // seconds remaining when the rush begins
export const MAX_ORDERS = 4;
export const ORDER_PATIENCE = 75; // seconds before a customer walks out
export const RUSH_PATIENCE = 55;

export const CHOP_SECONDS = 2.6;
export const COOK_SECONDS = 4.2;
export const BURN_SECONDS = 6.0; // past this on the stove, a patty is ruined
export const SERVE_BASE_PAY = 20;
export const COMBO_WINDOW = 12; // seconds to keep a combo alive
export const WALK_SPEED = 250; // pixels per second

// Every ingredient and what it needs before it can go on a plate.
export const INGREDIENTS = {
  bun: { label: 'Bun', colour: '#e8b06a', dark: '#b97f3a', prep: 'ready', key: '1' },
  patty: { label: 'Patty', colour: '#a8542f', dark: '#6e2f16', prep: 'cook', key: '2' },
  tomato: { label: 'Tomato', colour: '#e2483d', dark: '#9c1f18', prep: 'chop', key: '3' },
  lettuce: { label: 'Lettuce', colour: '#7dc24a', dark: '#4a7d24', prep: 'chop', key: '4' },
  cheese: { label: 'Cheese', colour: '#f7c948', dark: '#c78f14', prep: 'ready', key: '5' },
  onion: { label: 'Onion', colour: '#e8dff5', dark: '#9b7fc4', prep: 'chop', key: '6' },
};

// A prepared ingredient is named "chopped tomato", "cooked patty", or just
// "bun" / "cheese" when it needs no work at all.
export function preparedName(id, state) {
  if (state === 'chopped') return 'chopped ' + INGREDIENTS[id].label.toLowerCase();
  if (state === 'cooked') return 'cooked ' + INGREDIENTS[id].label.toLowerCase();
  if (state === 'burnt') return 'burnt ' + INGREDIENTS[id].label.toLowerCase();
  return INGREDIENTS[id].label.toLowerCase();
}

// The recipe book. Each order asks for a plate holding exactly these items.
export const RECIPES = [
  {
    id: 'classic',
    name: 'Classic Burger',
    items: [
      { id: 'bun', state: 'ready' },
      { id: 'patty', state: 'cooked' },
      { id: 'lettuce', state: 'chopped' },
    ],
    price: 24,
  },
  {
    id: 'cheeseburger',
    name: 'Cheeseburger',
    items: [
      { id: 'bun', state: 'ready' },
      { id: 'patty', state: 'cooked' },
      { id: 'cheese', state: 'ready' },
      { id: 'tomato', state: 'chopped' },
    ],
    price: 30,
  },
  {
    id: 'garden',
    name: 'Garden Stack',
    items: [
      { id: 'bun', state: 'ready' },
      { id: 'lettuce', state: 'chopped' },
      { id: 'tomato', state: 'chopped' },
      { id: 'cheese', state: 'ready' },
      { id: 'onion', state: 'chopped' },
    ],
    price: 34,
  },
  {
    id: 'double',
    name: 'Double Trouble',
    items: [
      { id: 'bun', state: 'ready' },
      { id: 'patty', state: 'cooked' },
      { id: 'patty', state: 'cooked' },
      { id: 'cheese', state: 'ready' },
      { id: 'lettuce', state: 'chopped' },
    ],
    price: 42,
  },
  {
    id: 'melty',
    name: 'Melty Onion Melt',
    items: [
      { id: 'bun', state: 'ready' },
      { id: 'patty', state: 'cooked' },
      { id: 'cheese', state: 'ready' },
      { id: 'onion', state: 'chopped' },
    ],
    price: 32,
  },
];

// Kitchen stations. Each is a rectangle on the floor the chef walks up to;
// `interact` names what the E key (or a click) does there.
export const STATIONS = [
  { id: 'fridge', label: 'FRIDGE', hint: 'Grab ingredients  [1-6]', x: 336, y: 92, w: 150, h: 84, colour: '#bcd6e8', trim: '#7fa8c4' },
  { id: 'board', label: 'CHOPPING BOARD', hint: 'Chop tomato, lettuce, onion', x: 506, y: 92, w: 170, h: 84, colour: '#d9a066', trim: '#9c6b34' },
  { id: 'stove1', label: 'STOVE', hint: 'Cook patties — watch the burn!', x: 696, y: 92, w: 96, h: 84, colour: '#3c3f4a', trim: '#23252d' },
  { id: 'stove2', label: 'STOVE', hint: 'Cook patties — watch the burn!', x: 800, y: 92, w: 96, h: 84, colour: '#3c3f4a', trim: '#23252d' },
  { id: 'assembly', label: 'PLATING', hint: 'Build the dish on a plate', x: 916, y: 92, w: 170, h: 84, colour: '#e8e2d2', trim: '#b3a888' },
  { id: 'serve', label: 'SERVE PASS', hint: 'Serve a finished plate', x: 1106, y: 92, w: 138, h: 84, colour: '#c96f4a', trim: '#8f4526' },
  { id: 'trash', label: 'BIN', hint: 'Toss what you are holding', x: 1106, y: 600, w: 138, h: 84, colour: '#6b7280', trim: '#43474f' },
];

// Where the chef starts a shift, and the walls they cannot cross.
export const PLAYER_START = { x: 780, y: 460 };
export const PLAYER_RADIUS = 20;
