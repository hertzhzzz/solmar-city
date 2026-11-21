// SOLMAR CITY — input.js
// Keyboard and mouse state, with edge detection for single-press actions.

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseClicked = false;
    this.anyKey = false;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      this.anyKey = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); });
    window.addEventListener('mousemove', (e) => {
      const rect = document.getElementById('game').getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (1280 / rect.width);
      this.mouseY = (e.clientY - rect.top) * (720 / rect.height);
    });
    window.addEventListener('mousedown', () => { this.mouseClicked = true; });
  }

  down(code) { return this.keys.has(code); }

  wasPressed(code) { return this.pressed.has(code); }

  // Movement axes, from WASD or the arrow keys.
  moveAxis() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    return { x, y };
  }

  running() {
    return this.down('ShiftLeft') || this.down('ShiftRight');
  }

  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
