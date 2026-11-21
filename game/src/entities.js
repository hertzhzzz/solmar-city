// SOLMAR CITY — entities.js
// Everyone who moves in the city: the player, pedestrians, traffic and police.
// Cars are simple arcade physics: accelerate, steer, brake, bounce.

import { CFG, CAR_COLORS, PED_SHIRTS } from './config.js';
import {
  ROAD_LINES, isRoadAt, isOnRoadAxis, collidesBuilding,
  resolveBuildingCollision, randomRoadPoint, randomSidewalkPoint, clampToWorld,
} from './world.js';
import { makeRandom, clamp, distance, angleTo, angleDiff } from './random.js';

export function makeCar(x, y, angle, color, kind) {
  return {
    kind: kind || 'traffic',
    x, y, angle,
    speed: 0,
    color,
    w: 46, h: 22,
    parked: kind === 'parked',
    stolen: false,
    brakeLight: false,
    crashCooldown: 0,
    sirenPhase: Math.random() * 6,
    // Traffic AI state.
    axis: 'x', dir: 1, lane: 14,
    waitTimer: 0,
    targetSpeed: CFG.trafficSpeed,
  };
}

export function makePedestrian(x, y, rng) {
  return {
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(45, 80),
    shirt: rng.pick(PED_SHIRTS),
    skin: rng.pick(['#f0c08a', '#c98a5a', '#8a5a3a', '#f5d0a0']),
    walkPhase: rng.range(0, 6),
    fleeing: false,
    down: 0, // seconds spent knocked down
    droppedCash: false,
    target: null,
  };
}

export function spawnCityActors(city, rng) {
  const peds = [];
  for (let i = 0; i < CFG.pedCount; i++) {
    const p = randomSidewalkPoint(rng);
    peds.push(makePedestrian(p.x, p.y, rng));
  }
  const traffic = [];
  for (let i = 0; i < CFG.trafficCount; i++) {
    const p = randomRoadPoint(rng);
    const car = makeCar(p.x, p.y, 0, rng.pick(CAR_COLORS), 'traffic');
    car.axis = p.axis;
    car.dir = rng.chance(0.5) ? 1 : -1;
    car.angle = car.axis === 'x' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    car.lane = 14;
    car.speed = CFG.trafficSpeed * rng.range(0.7, 1.1);
    car.targetSpeed = car.speed;
    traffic.push(car);
  }
  const parked = [];
  for (let i = 0; i < CFG.parkedCount; i++) {
    const p = randomRoadPoint(rng);
    const car = makeCar(p.x, p.y, 0, rng.pick(CAR_COLORS), 'parked');
    car.axis = p.axis;
    car.angle = car.axis === 'x' ? 0 : Math.PI / 2;
    // Park at the road edge, not in the lane.
    if (car.axis === 'x') car.y += 30; else car.x += 30;
    parked.push(car);
  }
  return { peds, traffic, parked };
}

function carCorners(car) {
  const c = Math.cos(car.angle);
  const s = Math.sin(car.angle);
  const hw = car.w / 2;
  const hh = car.h / 2;
  return [
    [car.x + c * hw - s * hh, car.y + s * hw + c * hh],
    [car.x + c * hw + s * hh, car.y + s * hw - c * hh],
    [car.x - c * hw + s * hh, car.y - s * hw - c * hh],
    [car.x - c * hw - s * hh, car.y - s * hw + c * hh],
  ];
}

export function carsOverlap(a, b) {
  // Circle test on the car centres, generous enough for arcade bumps.
  return distance(a.x, a.y, b.x, b.y) < 42;
}

function pushOutOfBuildings(car, city) {
  const [x, y] = resolveBuildingCollision(city, car.x, car.y, 22);
  car.x = x;
  car.y = y;
}

// --- Player on foot -------------------------------------------------------

export function updatePlayerOnFoot(player, input, dt, city, game) {
  const axis = input.moveAxis();
  const speed = input.running() ? CFG.runSpeed : CFG.walkSpeed;
  let vx = 0;
  let vy = 0;
  if (axis.x !== 0 || axis.y !== 0) {
    const len = Math.hypot(axis.x, axis.y);
    vx = (axis.x / len) * speed;
    vy = (axis.y / len) * speed;
    player.faceAngle = Math.atan2(vy, vx);
    player.walking = true;
    player.walkPhase += dt * (input.running() ? 13 : 9);
  } else {
    player.walking = false;
  }
  player.x += vx * dt;
  player.y += vy * dt;
  const [cx, cy] = resolveBuildingCollision(city, player.x, player.y, CFG.playerRadius);
  player.x = cx;
  player.y = cy;
  const [wx, wy] = clampToWorld(player.x, player.y, 16);
  player.x = wx;
  player.y = wy;
  player.speed = Math.hypot(vx, vy);
}

// --- Driving ---------------------------------------------------------------

export function updatePlayerCar(car, input, dt, city, game) {
  const axis = input.moveAxis();
  const forward = axis.y < 0;
  const reverse = axis.y > 0;
  const steer = axis.x; // +1 turns right when moving forward
  if (forward) car.speed += CFG.carAccel * dt;
  if (reverse) {
    if (car.speed > 5) car.speed -= CFG.carBrake * dt;
    else car.speed -= CFG.carReverseAccel * dt;
  }
  if (!forward && !reverse) {
    car.speed -= Math.sign(car.speed) * CFG.carFriction * 260 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  // Handbrake: Space.
  if (input.down('Space')) {
    car.speed -= Math.sign(car.speed) * 700 * dt;
    car.skidding = Math.abs(car.speed) > 120;
  } else {
    car.skidding = false;
  }
  car.speed = clamp(car.speed, -CFG.carMaxReverse, CFG.carMaxSpeed);
  const dirSign = car.speed >= 0 ? 1 : -1;
  car.angle += steer * CFG.carTurnRate * dt * dirSign * clamp(Math.abs(car.speed) / 140, 0, 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const before = [car.x, car.y];
  pushOutOfBuildings(car, city);
  if (car.x !== before[0] || car.y !== before[1]) {
    // Hit a building: lose speed, spark, small wanted risk if fast.
    if (Math.abs(car.speed) > 200) {
      game.addCrash(car.x, car.y);
      game.sound.crash();
    }
    car.speed *= 0.35;
  }
  const [wx, wy] = clampToWorld(car.x, car.y, 24);
  if (car.x !== wx || car.y !== wy) car.speed *= 0.4;
  car.x = wx;
  car.y = wy;
  car.brakeLight = reverse || input.down('Space');
}

// --- Pedestrians -----------------------------------------------------------

export function updatePedestrians(peds, dt, city, game) {
  const playerCar = game.player.car;
  for (const p of peds) {
    if (p.down > 0) {
      p.down -= dt;
      continue;
    }
    p.walkPhase += dt * 8;
    // Flee from a fast car nearby.
    let threat = null;
    let threatDist = 150;
    const cars = playerCar ? [playerCar, ...game.traffic, ...game.police] : [...game.traffic, ...game.police];
    for (const c of cars) {
      const d = distance(p.x, p.y, c.x, c.y);
      if (Math.abs(c.speed) > 120 && d < threatDist) { threat = c; threatDist = d; }
    }
    if (threat) {
      p.fleeing = true;
      const away = angleTo(threat.x, threat.y, p.x, p.y);
      p.angle = away;
      p.x += Math.cos(away) * 170 * dt;
      p.y += Math.sin(away) * 170 * dt;
    } else {
      p.fleeing = false;
      // Stroll along the sidewalk: keep walking, turn at random.
      if (!p.target || distance(p.x, p.y, p.target.x, p.target.y) < 12) {
        const rng = game.rng;
        const next = randomSidewalkPoint(rng);
        // Stay near the current street: pick a point on the same road line.
        p.target = next;
        p.angle = angleTo(p.x, p.y, next.x, next.y);
      }
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
    }
    const [cx, cy] = resolveBuildingCollision(city, p.x, p.y, 10);
    p.x = cx;
    p.y = cy;
    const [wx, wy] = clampToWorld(p.x, p.y, 14);
    p.x = wx;
    p.y = wy;
  }
}

// --- Traffic ---------------------------------------------------------------

export function updateTraffic(traffic, dt, city, game) {
  const allCars = [...traffic, ...game.police];
  if (game.player.car) allCars.push(game.player.car);
  for (const car of traffic) {
    if (car.waitTimer > 0) {
      car.waitTimer -= dt;
      car.speed = Math.max(0, car.speed - 400 * dt);
    } else {
      car.speed += (car.targetSpeed - car.speed) * dt * 0.8;
    }
    // Stop for a car ahead on the same road.
    for (const other of allCars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = car.axis === 'x'
        ? Math.sign(dx) === car.dir && Math.abs(dy) < 30 && dx * car.dir > 0 && dx * car.dir < 70
        : Math.sign(dy) === car.dir && Math.abs(dx) < 30 && dy * car.dir > 0 && dy * car.dir < 70;
      if (ahead) { car.waitTimer = 0.4; break; }
    }
    // Stop for the player crossing on foot.
    const pl = game.player;
    if (!pl.car) {
      const d = distance(car.x, car.y, pl.x, pl.y);
      if (d < 60 && isRoadAt(pl.x, pl.y)) car.waitTimer = 0.5;
    }
    const step = car.speed * dt;
    if (car.axis === 'x') car.x += car.dir * step;
    else car.y += car.dir * step;
    // At an intersection, sometimes turn onto the crossing road.
    const onX = isOnRoadAxis(car.x, car.y, 'x');
    const onY = isOnRoadAxis(car.x, car.y, 'y');
    if (onX !== null && onY !== null && game.rng.chance(dt * 0.55)) {
      if (game.rng.chance(0.5)) {
        car.axis = 'y';
        car.dir = game.rng.chance(0.5) ? 1 : -1;
        car.y = onY + (car.dir > 0 ? -car.lane : car.lane);
        car.x = onX;
      } else {
        car.axis = 'x';
        car.dir = game.rng.chance(0.5) ? 1 : -1;
        car.x = onX + (car.dir > 0 ? -car.lane : car.lane);
        car.y = onY;
      }
      car.angle = car.axis === 'x'
        ? (car.dir > 0 ? 0 : Math.PI)
        : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    // Wrap around the world edge.
    if (car.x < 60) car.x = CFG.worldSize - 60;
    if (car.x > CFG.worldSize - 60) car.x = 60;
    if (car.y < 60) car.y = CFG.worldSize - 60;
    if (car.y > CFG.worldSize - 60) car.y = 60;
    pushOutOfBuildings(car, city);
  }
}

// --- Police -----------------------------------------------------------------

export function spawnPolice(game, count) {
  const rng = game.rng;
  while (game.police.length < count) {
    const p = randomRoadPoint(rng);
    const car = makeCar(p.x, p.y, 0, COLORS_POLICE, 'police');
    car.speed = 0;
    car.targetSpeed = CFG.carMaxSpeed * 0.92;
    game.police.push(car);
  }
}

const COLORS_POLICE = '#2b5cff';

export function updatePolice(police, dt, city, game) {
  const pl = game.player;
  const px = pl.car ? pl.car.x : pl.x;
  const py = pl.car ? pl.car.y : pl.y;
  for (const car of police) {
    car.sirenPhase += dt * 6;
    const targetAngle = angleTo(car.x, car.y, px, py);
    const diff = angleDiff(car.angle, targetAngle);
    car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    // Police drive a little faster than the player can run, slower than top car speed.
    const want = game.wanted >= 4 ? CFG.carMaxSpeed * 0.95 : CFG.carMaxSpeed * 0.82;
    car.speed += (want - car.speed) * dt * 0.7;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    pushOutOfBuildings(car, city);
    const [wx, wy] = clampToWorld(car.x, car.y, 24);
    car.x = wx;
    car.y = wy;
    // Ram the player: on foot, a touch starts the busted timer.
    if (!pl.car && distance(car.x, car.y, pl.x, pl.y) < 34) {
      game.bustedTimer += dt;
      game.addMessage('POLICE ARE ON YOU — RUN!', 0.5);
    }
    // Ram the player's car: shove it and slow both down, once per hit.
    if (pl.car && carsOverlap(car, pl.car)) {
      const push = angleTo(car.x, car.y, pl.car.x, pl.car.y);
      pl.car.x += Math.cos(push) * 60 * dt;
      pl.car.y += Math.sin(push) * 60 * dt;
      car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
      if (car.ramCooldown <= 0) {
        car.speed *= 0.85;
        pl.car.speed *= 0.75;
        car.ramCooldown = 0.8;
        if (Math.abs(car.speed) > 200) game.addCrash(pl.car.x, pl.car.y);
      }
    } else {
      car.ramCooldown = Math.max(0, (car.ramCooldown || 0) - dt);
    }
  }
}
