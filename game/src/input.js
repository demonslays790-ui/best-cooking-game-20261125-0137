// Sizzle & Serve — input.js
// One job: turn keyboard and mouse into a small, clean input state.
// The game reads `keys` and `consumePress()`; it never touches DOM events.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // keys pressed since last consume
  const mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };

  function keyName(e) {
    if (e.key === ' ') return 'Space';
    if (e.key.length === 1) return e.key.toLowerCase();
    return e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => { keys.clear(); pressed.clear(); });

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = canvasPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.clicked = true;
    mouse.clickX = p.x;
    mouse.clickY = p.y;
  });

  return {
    keys,
    mouse,
    // True once per physical press; the game calls this every frame.
    consumePress(k) {
      if (pressed.has(k)) { pressed.delete(k); return true; }
      return false;
    },
    consumeClick() {
      if (mouse.clicked) {
        mouse.clicked = false;
        return { x: mouse.clickX, y: mouse.clickY };
      }
      return null;
    },
    // Held-down movement: WASD or arrows.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
  };
}
