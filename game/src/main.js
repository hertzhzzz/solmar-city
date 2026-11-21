// SOLMAR CITY — main.js
// The game itself: state machine, loop, wanted system, stealing cars,
// crashes, pickups, camera, saving, and the debug hook the playtest uses.

import { CFG } from './config.js';
import { makeRandom, clamp, distance, formatClock } from './random.js';
import { buildCity, randomSidewalkPoint, randomRoadPoint } from './world.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import {
  makeCar, spawnCityActors, updatePlayerOnFoot, updatePlayerCar,
  updatePedestrians, updateTraffic, updatePolice, carsOverlap,
} from './entities.js';
import { MissionManager } from './missions.js';
import { drawWorld, daylightFactor } from './render.js';
import { drawHUD, drawStartScreen, drawPauseScreen, drawHelpScreen, drawBustedScreen } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { applyShot } from './shots.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = makeRandom(987654);
    this.input = new Input();
    this.sound = new SoundEngine();
    this.city = buildCity();
    const actors = spawnCityActors(this.city, this.rng);
    this.peds = actors.peds;
    this.traffic = actors.traffic;
    this.parkedCars = actors.parked;
    this.police = [];
    this.player = {
      x: 1000, y: 1000, faceAngle: -Math.PI / 2,
      walking: false, walkPhase: 0, speed: 0, car: null,
    };
    this.camera = { x: this.player.x, y: this.player.y, snap: true };
    this.state = 'menu';
    this.time = 0;
    this.hour = CFG.startHour;
    this.money = CFG.startMoney;
    this.wanted = 0;
    this.wantedTimer = 0;
    this.bustedTimer = 0;
    this.lastFine = 0;
    this.messages = [];
    this.particles = [];
    this.skids = [];
    this.cashPickups = [];
    this.deliveryCar = null;
    this.missions = new MissionManager(this);
    this.punchCooldown = 0;
    this.saveData = loadSave();
    if (this.saveData) {
      this.money = this.saveData.money || CFG.startMoney;
      this.missions.index = Math.min(3, this.saveData.jobsDone || 0);
    }
    for (let i = 0; i < 8; i++) this.spawnCashPickup();
    this.lastTs = 0;
    this.frameCount = 0;
  }

  // -- State ---------------------------------------------------------------
  startPlaying() {
    if (this.state === 'menu' || this.state === 'busted') {
      this.state = 'playing';
      this.sound.ensure();
    }
  }

  dayPhaseLabel() {
    const h = this.hour;
    if (h >= 6 && h < 9) return 'Morning';
    if (h >= 9 && h < 12) return 'Late morning';
    if (h >= 12 && h < 17) return 'Afternoon';
    if (h >= 17 && h < 19) return 'Dusk';
    if (h >= 19 && h < 22) return 'Evening';
    if (h >= 22 || h < 5) return 'Night';
    return 'Dawn';
  }

  // -- Messages, particles, pickups ----------------------------------------
  addMessage(text, seconds) {
    this.messages.push({ text, life: seconds || 3 });
    if (this.messages.length > 4) this.messages.shift();
  }

  addCrash(x, y) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + this.rng.range(-14, 14), y: y + this.rng.range(-14, 14),
        vx: this.rng.range(-90, 90), vy: this.rng.range(-90, 90),
        life: 0.5, maxLife: 0.5, color: '#ffb13c',
      });
    }
  }

  spawnSparkle(x, y) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x + this.rng.range(-12, 12), y: y + this.rng.range(-12, 12),
        vx: this.rng.range(-40, 40), vy: this.rng.range(-60, -10),
        life: 0.8, maxLife: 0.8, color: '#ffc93c',
      });
    }
  }

  spawnCashPickup() {
    const p = randomSidewalkPoint(this.rng);
    this.cashPickups.push({ x: p.x, y: p.y, bob: this.rng.range(0, 6), value: 25 });
  }

  spawnDeliveryCar() {
    const car = makeCar(this.player.x + 120, this.player.y + 40, 0, '#ff7a1a', 'player');
    car.parked = true;
    this.deliveryCar = car;
    this.parkedCars.push(car);
    return car;
  }

  spawnParkedNear(x, y) {
    const car = makeCar(x, y, 0, this.rng.pick(['#d94f3d', '#3d7bd9', '#e8b73c']), 'parked');
    this.parkedCars.push(car);
    return car;
  }

  // -- Wanted ---------------------------------------------------------------
  setWanted(level, message) {
    this.wanted = clamp(level, 0, CFG.maxWanted);
    this.wantedTimer = 0;
    this.spawnPoliceForWanted();
    if (message) this.addMessage(message, 4);
  }

  raiseWanted(by, message) {
    if (this.wanted >= CFG.maxWanted) return;
    this.setWanted(this.wanted + by, message);
  }

  spawnPoliceForWanted() {
    const want = this.wanted === 0 ? 0 : this.wanted + 1;
    while (this.police.length < want) {
      const p = randomRoadPoint(this.rng);
      const car = makeCar(p.x, p.y, 0, '#2b5cff', 'police');
      car.targetSpeed = CFG.carMaxSpeed * 0.9;
      this.police.push(car);
    }
    while (this.police.length > want) this.police.pop();
  }

  updateWanted(dt) {
    if (this.wanted === 0) return;
    // Are police close enough to see the player?
    const pl = this.player;
    const px = pl.car ? pl.car.x : pl.x;
    const py = pl.car ? pl.car.y : pl.y;
    let seen = false;
    for (const car of this.police) {
      if (distance(car.x, car.y, px, py) < 520) { seen = true; break; }
    }
    if (seen) {
      this.wantedTimer = 0;
      this.bustedTimer = Math.max(0, this.bustedTimer - dt);
    } else {
      this.wantedTimer += dt;
      if (this.wantedTimer >= CFG.wantedDecaySeconds) {
        this.wantedTimer = 0;
        this.wanted -= 1;
        this.addMessage(this.wanted === 0 ? 'You lost the cops. Clean.' : 'Heat dropping — ' + this.wanted + ' stars left', 3);
        this.spawnPoliceForWanted();
      }
    }
    if (this.bustedTimer >= CFG.bustedHoldSeconds) this.getBusted();
  }

  getBusted() {
    this.lastFine = Math.floor(this.money * CFG.bustedFineRate);
    this.money = Math.max(0, this.money - this.lastFine);
    this.wanted = 0;
    this.bustedTimer = 0;
    this.police = [];
    if (this.player.car) this.exitCar();
    this.player.x = 1000;
    this.player.y = 1000;
    this.state = 'busted';
    this.sound.missionStart();
    this.saveGame();
  }

  // -- Cars ------------------------------------------------------------------
  nearestCar(maxDist) {
    const pl = this.player;
    // During the delivery job, the orange coupe is the car the player wants.
    const def = this.missions.currentDef();
    if (this.missions.active && def && def.id === 'delivery' && this.deliveryCar) {
      const d = distance(pl.x, pl.y, this.deliveryCar.x, this.deliveryCar.y);
      if (d < maxDist) return this.deliveryCar;
    }
    let best = null;
    let bestD = maxDist;
    const all = [...this.parkedCars, ...this.traffic];
    if (this.deliveryCar && !this.parkedCars.includes(this.deliveryCar)) all.push(this.deliveryCar);
    for (const car of all) {
      if (car === pl.car) continue;
      const d = distance(pl.x, pl.y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  enterCar(car) {
    const pl = this.player;
    const wasTraffic = this.traffic.includes(car);
    if (wasTraffic) {
      this.traffic = this.traffic.filter((c) => c !== car);
      this.raiseWanted(1, 'Car stolen! The cops were called.');
    } else {
      const i = this.parkedCars.indexOf(car);
      if (i >= 0) this.parkedCars.splice(i, 1);
    }
    car.kind = 'player';
    car.parked = false;
    car.speed = 0;
    pl.car = car;
    pl.x = car.x;
    pl.y = car.y;
    this.sound.blip(520, 0.1, 'square', 0.08);
  }

  exitCar() {
    const pl = this.player;
    const car = pl.car;
    if (!car) return;
    car.kind = 'parked';
    car.parked = true;
    car.speed = 0;
    pl.x = car.x + Math.cos(car.angle + Math.PI / 2) * 36;
    pl.y = car.y + Math.sin(car.angle + Math.PI / 2) * 36;
    pl.faceAngle = car.angle;
    pl.car = null;
    this.parkedCars.push(car);
  }

  punch() {
    if (this.punchCooldown > 0) return;
    this.punchCooldown = 0.45;
    this.sound.punch();
    const pl = this.player;
    for (const p of this.peds) {
      if (p.down > 0) continue;
      if (distance(pl.x, pl.y, p.x, p.y) < 46) {
        p.down = 3;
        if (!p.droppedCash) {
          p.droppedCash = true;
          this.cashPickups.push({ x: p.x + 20, y: p.y, bob: 0, value: 30 });
        }
        this.raiseWanted(1, 'Assault! Someone called the cops.');
        this.addCrash(p.x, p.y);
        return;
      }
    }
  }

  // -- Collisions -------------------------------------------------------------
  handleCarCollisions(dt) {
    const pl = this.player;
    if (!pl.car) return;
    const car = pl.car;
    car.crashCooldown = Math.max(0, (car.crashCooldown || 0) - dt);
    // Hit a pedestrian.
    for (const p of this.peds) {
      if (p.down > 0 || p.hitByPlayer) continue;
      if (distance(car.x, car.y, p.x, p.y) < 30 && Math.abs(car.speed) > 120) {
        p.down = 4;
        p.hitByPlayer = true;
        this.raiseWanted(1, 'You hit a pedestrian!');
        this.sound.crash();
        this.addCrash(p.x, p.y);
        car.speed *= 0.7;
      }
    }
    // Bump traffic and police cars. One hit costs speed once, then a short
    // cooldown, so brushing a car does not pin the player to a crawl.
    const others = [...this.traffic, ...this.police, ...this.parkedCars];
    for (const other of others) {
      if (other === car) continue;
      if (carsOverlap(car, other)) {
        const push = Math.atan2(car.y - other.y, car.x - other.x);
        car.x += Math.cos(push) * 26 * dt * 10;
        car.y += Math.sin(push) * 26 * dt * 10;
        if (car.crashCooldown <= 0 && Math.abs(car.speed) > 180) {
          this.sound.crash();
          this.addCrash(car.x, car.y);
          if (other.kind === 'police') this.raiseWanted(1, 'You rammed a police car!');
          car.speed *= 0.6;
          car.crashCooldown = 0.6;
        }
        if (other.kind !== 'parked' && other.kind !== 'police') other.speed *= 0.5;
      }
    }
  }

  handlePickups(dt) {
    const pl = this.player;
    const px = pl.car ? pl.car.x : pl.x;
    const py = pl.car ? pl.car.y : pl.y;
    for (const c of this.cashPickups) {
      c.bob += dt * 3;
      if (distance(px, py, c.x, c.y) < 40) {
        c.taken = true;
        this.money += c.value;
        this.sound.pickup();
        this.addMessage('Cash +$' + c.value, 1.5);
        this.spawnSparkle(c.x, c.y);
      }
    }
    this.cashPickups = this.cashPickups.filter((c) => !c.taken);
    while (this.cashPickups.length < 8) this.spawnCashPickup();
  }

  // -- Save -------------------------------------------------------------------
  saveGame() {
    writeSave({
      money: Math.floor(this.money),
      jobsDone: this.missions.index,
      hour: this.hour,
    });
  }

  // -- Update ------------------------------------------------------------------
  update(dt) {
    this.time += dt;
    this.hour = (this.hour + (dt * 24) / CFG.dayLengthSeconds) % 24;
    const input = this.input;
    const pl = this.player;

    if (input.wasPressed('KeyM')) {
      const muted = this.sound.toggleMute();
      this.addMessage(muted ? 'Sound off' : 'Sound on', 1.5);
    }
    if (input.wasPressed('KeyP')) {
      this.state = this.state === 'paused' ? 'playing' : 'paused';
    }
    if (input.wasPressed('KeyH') || input.wasPressed('Slash')) {
      this.state = this.state === 'help' ? 'playing' : 'help';
    }
    if (this.state === 'paused' || this.state === 'help') return;

    if (this.state === 'menu') {
      if (input.wasPressed('Enter') || input.mouseClicked) this.startPlaying();
      return;
    }
    if (this.state === 'busted') {
      if (input.wasPressed('Enter')) {
        this.state = 'playing';
        this.camera.snap = true;
      }
      return;
    }

    if (input.wasPressed('KeyR') && this.state === 'playing') {
      this.hour = CFG.startHour;
      this.addMessage('A new day in Solmar City', 2);
    }
    if (input.wasPressed('KeyT')) {
      if (!this.missions.active && this.missions.currentDef()) this.missions.startNext();
      else if (!this.missions.active && !this.missions.currentDef() && !this.missions.sideJobActive) {
        this.missions.startSideJob();
      }
    }
    if (input.wasPressed('KeyE')) {
      if (pl.car) this.exitCar();
      else {
        const car = this.nearestCar(64);
        if (car) this.enterCar(car);
      }
    }
    if (input.wasPressed('Space') && !pl.car) this.punch();

    this.punchCooldown = Math.max(0, this.punchCooldown - dt);

    if (pl.car) {
      const prevX = pl.car.x;
      const prevY = pl.car.y;
      updatePlayerCar(pl.car, input, dt, this.city, this);
      pl.x = pl.car.x;
      pl.y = pl.car.y;
      if (pl.car.skidding) {
        this.skids.push({
          x1: prevX, y1: prevY, x2: pl.car.x, y2: pl.car.y, life: 0.5,
        });
        if (this.skids.length > 120) this.skids.shift();
      }
      this.sound.setEngine(Math.abs(pl.car.speed) / CFG.carMaxSpeed, true);
    } else {
      updatePlayerOnFoot(pl, input, dt, this.city, this);
      this.sound.setEngine(0, false);
    }
    updatePedestrians(this.peds, dt, this.city, this);
    updateTraffic(this.traffic, dt, this.city, this);
    updatePolice(this.police, dt, this.city, this);
    this.missions.update(dt);
    this.handleCarCollisions(dt);
    this.handlePickups(dt);
    this.updateWanted(dt);
    this.sound.setSiren(this.wanted > 0, dt);

    // Particles and skids fade.
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const s of this.skids) s.life -= dt * 0.25;
    this.skids = this.skids.filter((s) => s.life > 0);

    // Messages fade.
    for (const m of this.messages) m.life -= dt;
    this.messages = this.messages.filter((m) => m.life > 0);

    // Camera follows the player, ahead in the driving direction.
    const lookX = pl.car ? pl.car.x + Math.cos(pl.car.angle) * 90 : pl.x;
    const lookY = pl.car ? pl.car.y + Math.sin(pl.car.angle) * 90 : pl.y;
    if (this.camera.snap) {
      this.camera.x = lookX;
      this.camera.y = lookY;
      this.camera.snap = false;
    } else {
      const t = 1 - Math.exp(-CFG.cameraLerp * dt);
      this.camera.x += (lookX - this.camera.x) * t;
      this.camera.y += (lookY - this.camera.y) * t;
    }
    this.camera.x = clamp(this.camera.x, CFG.viewW / 2 - 60, CFG.worldSize - CFG.viewW / 2 + 60);
    this.camera.y = clamp(this.camera.y, CFG.viewH / 2 - 60, CFG.worldSize - CFG.viewH / 2 + 60);
  }

  // -- Render ------------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CFG.viewW, CFG.viewH);
    // The menu still shows the city behind it.
    ctx.save();
    ctx.translate(CFG.viewW / 2 - this.camera.x, CFG.viewH / 2 - this.camera.y);
    drawWorld(ctx, this, this.camera);
    ctx.restore();
    if (this.state === 'menu') {
      drawStartScreen(ctx, this);
      return;
    }
    drawHUD(ctx, this);
    if (this.state === 'paused') drawPauseScreen(ctx);
    if (this.state === 'help') drawHelpScreen(ctx);
    if (this.state === 'busted') drawBustedScreen(ctx, this);
  }

  frame(ts) {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000 || 0.016);
    this.lastTs = ts;
    this.update(dt);
    this.render();
    this.input.endFrame();
    this.frameCount++;
    requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    requestAnimationFrame((t) => this.frame(t));
  }
}

export function bootGame() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  window.__solmar = {
    game,
    ready: false,
    state() {
      const pl = game.player;
      return {
        state: game.state,
        money: Math.floor(game.money),
        wanted: game.wanted,
        hour: Math.round(game.hour * 100) / 100,
        dayPhase: game.dayPhaseLabel(),
        mission: game.missions.currentDef() ? game.missions.currentDef().id : 'done',
        missionActive: game.missions.active,
        bagsLeft: game.missions.bagsLeft,
        inCar: !!pl.car,
        speed: pl.car ? Math.round(Math.abs(pl.car.speed)) : Math.round(pl.speed),
        x: Math.round(pl.x),
        y: Math.round(pl.y),
        police: game.police.length,
        peds: game.peds.length,
        traffic: game.traffic.length,
        frames: game.frameCount,
      };
    },
    press(code) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })), 60);
    },
    hold(code) { window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); },
    release(code) { window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); },
    teleport(x, y) {
      game.player.x = x;
      game.player.y = y;
      if (game.player.car) { game.player.car.x = x; game.player.car.y = y; }
      game.camera.snap = true;
    },
    setWanted(n) { game.setWanted(n, null); },
    startMission() { game.missions.startNext(); },
  };
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    applyShot(game, parseInt(shot, 10));
  } else if (params.get('play') === '1') {
    game.startPlaying();
  }
  game.start();
  window.__solmar.ready = true;
  return game;
}
