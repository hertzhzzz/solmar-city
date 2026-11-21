// SOLMAR CITY — render.js
// Everything the camera sees: streets, buildings, the park, the bay,
// cars, people, police lights, skid marks, sparks, and the day-night sky.

import { CFG, COLORS } from './config.js';
import { clamp, lerp } from './random.js';
import { isWaterAt, ROAD_LINES } from './world.js';

export function daylightFactor(hour) {
  // 1.0 at midday, 0.15 at midnight. Smooth through dawn and dusk.
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h <= 17) return 1;
  if (h >= 19 || h <= 5) return 0.15;
  if (h > 17 && h < 19) return lerp(1, 0.15, (h - 17) / 2);
  return lerp(0.15, 1, (h - 5) / 2);
}

export function skyTint(hour) {
  const day = daylightFactor(hour);
  const h = ((hour % 24) + 24) % 24;
  // Orange dusk between 17:30 and 19:00.
  if (h > 17 && h < 19.5) {
    const t = 1 - Math.abs(h - 18.2) / 1.3;
    return { day, dusk: clamp(t, 0, 1) };
  }
  return { day, dusk: 0 };
}

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 4, car.w, car.h);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 7);
  ctx.fill();
  // Cabin and windshield.
  ctx.fillStyle = 'rgba(20,28,40,0.85)';
  roundRect(ctx, -6, -car.h / 2 + 3, 16, car.h - 6, 4);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#fff6c9';
  ctx.fillRect(car.w / 2 - 2, -car.h / 2 + 2, 3, 5);
  ctx.fillRect(car.w / 2 - 2, car.h / 2 - 7, 3, 5);
  // Brake lights.
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2a1a';
    ctx.fillRect(-car.w / 2 - 1, -car.h / 2 + 2, 3, 5);
    ctx.fillRect(-car.w / 2 - 1, car.h / 2 - 7, 3, 5);
  }
  // Police livery.
  if (car.kind === 'police') {
    ctx.fillStyle = '#f2f4f8';
    ctx.fillRect(-car.w / 2 + 6, -car.h / 2, 14, car.h);
    ctx.fillStyle = '#101418';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 2, 3);
    // Light bar, flashing red / blue.
    const red = Math.sin(car.sirenPhase) > 0;
    ctx.fillStyle = red ? '#ff2a1a' : '#2b5cff';
    ctx.fillRect(-4, -car.h / 2 - 1, 5, 4);
    ctx.fillStyle = red ? '#2b5cff' : '#ff2a1a';
    ctx.fillRect(1, -car.h / 2 - 1, 5, 4);
  }
  // Player car marker: a small gold chevron on the roof.
  if (car.kind === 'player') {
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(4, 0);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPerson(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.down > 0) {
    // Knocked down: lying flat.
    ctx.rotate(1.2);
    ctx.fillStyle = p.shirt;
    ctx.fillRect(-11, -5, 22, 10);
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(13, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(p.angle);
  const bob = Math.sin(p.walkPhase) * 2;
  // Legs.
  ctx.fillStyle = '#2c2f36';
  ctx.fillRect(-4, -5 + bob, 7, 4);
  ctx.fillRect(-4, 1 - bob, 7, 4);
  // Body.
  ctx.fillStyle = p.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = p.skin;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWorld(ctx, game, cam) {
  const city = game.city;
  const view = { x: cam.x - CFG.viewW / 2, y: cam.y - CFG.viewH / 2, w: CFG.viewW, h: CFG.viewH };
  const tint = skyTint(game.hour);

  // Ground: grass everywhere first.
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(view.x, view.y, view.w, view.h);
  // Mow stripes for texture.
  ctx.fillStyle = COLORS.grassDark;
  const stripe = 160;
  const startY = Math.floor(view.y / stripe) * stripe;
  for (let y = startY; y < view.y + view.h; y += stripe * 2) {
    ctx.fillRect(view.x, y, view.w, stripe);
  }

  // The bay and the beach.
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(2480, 2480, 720, 720);
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(2560, 2560, 640, 640);
  ctx.fillStyle = COLORS.waterDeep;
  ctx.fillRect(2620, 2620, 580, 580);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(2560, 2620);
  ctx.lineTo(3200, 2620);
  ctx.moveTo(2620, 2560);
  ctx.lineTo(2620, 3200);
  ctx.stroke();

  // Park.
  ctx.fillStyle = COLORS.parkGrass;
  ctx.fillRect(1150, 1150, 324, 324);
  ctx.strokeStyle = '#3f7a34';
  ctx.lineWidth = 4;
  ctx.strokeRect(1150, 1150, 324, 324);
  ctx.fillStyle = '#8a6f4d';
  ctx.beginPath();
  ctx.arc(1312, 1312, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5fa8d8';
  ctx.beginPath();
  ctx.arc(1312, 1312, 18, 0, Math.PI * 2);
  ctx.fill();

  // Roads: asphalt, then centre dashes, then sidewalks.
  for (const line of ROAD_LINES) {
    ctx.fillStyle = COLORS.sidewalk;
    ctx.fillRect(0, line - CFG.roadWidth / 2 - 10, CFG.worldSize, CFG.roadWidth + 20);
    ctx.fillRect(line - CFG.roadWidth / 2 - 10, 0, CFG.roadWidth + 20, CFG.worldSize);
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(0, line - CFG.roadWidth / 2, CFG.worldSize, CFG.roadWidth);
    ctx.fillRect(line - CFG.roadWidth / 2, 0, CFG.roadWidth, CFG.worldSize);
  }
  // Centre dashes.
  ctx.fillStyle = COLORS.roadLine;
  for (const line of ROAD_LINES) {
    for (let t = 40; t < CFG.worldSize; t += 80) {
      ctx.fillRect(t, line - 2, 36, 4);
      ctx.fillRect(line - 2, t, 4, 36);
    }
  }
  // Crosswalks at intersections.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const lx of ROAD_LINES) {
    for (const ly of ROAD_LINES) {
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(lx + i * 10 - 3, ly - CFG.roadWidth / 2 + 4, 6, 10);
        ctx.fillRect(lx + i * 10 - 3, ly + CFG.roadWidth / 2 - 14, 6, 10);
      }
    }
  }

  // Buildings, with a drop shadow to fake height.
  for (const b of city.buildings) {
    if (b.x + b.w < view.x || b.x > view.x + view.w || b.y + b.h < view.y || b.y > view.y + view.h) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = COLORS.buildingEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Roof detail.
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 8, 16, 16);
    if (b.name) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 32);
    }
  }

  // Trees.
  for (const t of city.trees) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(t.x + 3, t.y + 4, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f7a34';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f9e46';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Street lamps.
  for (const lamp of city.lamps) {
    if (lamp.x < view.x || lamp.x > view.x + view.w || lamp.y < view.y || lamp.y > view.y + view.h) continue;
    ctx.fillStyle = '#3a3d44';
    ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(lamp.x - 3, lamp.y - 3, 6, 6);
  }

  // Cash pickups: green bills with a bob and a glow ring.
  for (const c of game.cashPickups) {
    const bobY = Math.sin(c.bob) * 3;
    ctx.fillStyle = 'rgba(55,214,122,0.25)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d9e4b';
    ctx.fillRect(c.x - 11, c.y - 6 + bobY, 22, 12);
    ctx.fillStyle = '#37d67a';
    ctx.fillRect(c.x - 9, c.y - 4 + bobY, 18, 8);
    ctx.fillStyle = '#0c5c28';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', c.x, c.y + 3 + bobY);
  }

  // Mission cash bags.
  for (const bag of game.missions.bags) {
    if (bag.taken) continue;
    const bobY = Math.sin(bag.bob + game.time * 3) * 3;
    ctx.fillStyle = 'rgba(255,201,60,0.3)';
    ctx.beginPath();
    ctx.arc(bag.x, bag.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5a10';
    ctx.fillRect(bag.x - 10, bag.y - 8 + bobY, 20, 16);
    ctx.fillStyle = '#ffc93c';
    ctx.fillRect(bag.x - 8, bag.y - 6 + bobY, 16, 12);
    ctx.fillStyle = '#7a5a10';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', bag.x, bag.y + 3 + bobY);
  }

  // Mission target marker: a pulsing gold ring and beacon.
  const target = game.missions.target;
  if (target && game.missions.active) {
    const pulse = 1 + Math.sin(game.time * 4) * 0.15;
    ctx.strokeStyle = COLORS.missionGold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 34 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.missionGold;
    ctx.beginPath();
    ctx.arc(target.x, target.y, 7, 0, Math.PI * 2);
    ctx.fill();
    // Light beacon.
    const grad = ctx.createLinearGradient(target.x, target.y - 260, target.x, target.y);
    grad.addColorStop(0, 'rgba(255,201,60,0)');
    grad.addColorStop(1, 'rgba(255,201,60,0.55)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(target.x - 16, target.y);
    ctx.lineTo(target.x - 4, target.y - 260);
    ctx.lineTo(target.x + 4, target.y - 260);
    ctx.lineTo(target.x + 16, target.y);
    ctx.closePath();
    ctx.fill();
  }

  // Skid marks.
  for (const s of game.skids) {
    ctx.strokeStyle = `rgba(20,20,24,${s.life})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // Parked cars, then traffic, then police, then the player's car.
  for (const car of game.parkedCars) drawCarShape(ctx, car);
  for (const car of game.traffic) drawCarShape(ctx, car);
  for (const car of game.police) drawCarShape(ctx, car);

  // Pedestrians.
  for (const p of game.peds) drawPerson(ctx, p);

  // The player.
  const pl = game.player;
  if (pl.car) {
    drawCarShape(ctx, pl.car);
  } else {
    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate(pl.faceAngle);
    const bob = pl.walking ? Math.sin(pl.walkPhase) * 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(2, 3, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22252c';
    ctx.fillRect(-5, -6 + bob, 8, 5);
    ctx.fillRect(-5, 1 - bob, 8, 5);
    ctx.fillStyle = COLORS.playerShirt;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.playerSkin;
    ctx.beginPath();
    ctx.arc(3, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22252c';
    ctx.beginPath();
    ctx.arc(5, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Direction tick above the player.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(pl.x, pl.y - 24, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Particles: sparks and sparkles.
  for (const pt of game.particles) {
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Night: darken the world, then cut light pools around lamps and cars.
  const day = tint.day;
  if (day < 0.95) {
    ctx.fillStyle = `rgba(8, 12, 34, ${(1 - day) * 0.55})`;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    // Lamp glow.
    for (const lamp of city.lamps) {
      if (lamp.x < view.x - 90 || lamp.x > view.x + view.w + 90) continue;
      if (lamp.y < view.y - 90 || lamp.y > view.y + view.h + 90) continue;
      const g = ctx.createRadialGradient(lamp.x, lamp.y, 4, lamp.x, lamp.y, 90);
      g.addColorStop(0, 'rgba(255,217,138,0.5)');
      g.addColorStop(1, 'rgba(255,217,138,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 90, 0, Math.PI * 2);
      ctx.fill();
    }
    // Headlight cones for every moving car.
    const cars = [...game.traffic, ...game.police];
    if (pl.car) cars.push(pl.car);
    for (const car of cars) {
      if (Math.abs(car.speed) < 5 && car.kind !== 'player') continue;
      const fx = car.x + Math.cos(car.angle) * 70;
      const fy = car.y + Math.sin(car.angle) * 70;
      const g = ctx.createRadialGradient(fx, fy, 6, fx, fy, 110);
      g.addColorStop(0, 'rgba(255,246,201,0.5)');
      g.addColorStop(1, 'rgba(255,246,201,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, 110, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Dusk: warm orange wash.
  if (tint.dusk > 0) {
    ctx.fillStyle = `rgba(255,122,40,${tint.dusk * 0.14})`;
    ctx.fillRect(view.x, view.y, view.w, view.h);
  }

  // Water shimmer, drawn last so it sits above the night tint.
  if (view.x < 3200 && view.y < 3200) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const wy = 2660 + i * 90 + Math.sin(game.time * 0.7 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(2600, wy);
      ctx.lineTo(3160, wy);
      ctx.stroke();
    }
  }
}

export function isWaterAtPoint(x, y) {
  return isWaterAt(x, y);
}
