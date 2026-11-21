// SOLMAR CITY — hud.js
// The HUD: money, wanted stars, mission panel, speed, clock, minimap,
// screen-edge arrow to the mission target, messages, and every menu screen.

import { CFG, COLORS } from './config.js';
import { formatMoney, formatClock, clamp } from './random.js';
import { ROAD_LINES } from './world.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawMinimap(ctx, game) {
  const size = 190;
  const x0 = CFG.viewW - size - 16;
  const y0 = 16;
  const scale = size / CFG.worldSize;
  ctx.save();
  panel(ctx, x0 - 6, y0 - 6, size + 12, size + 12);
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  // Ground.
  ctx.fillStyle = '#3d7a37';
  ctx.fillRect(x0, y0, size, size);
  // Bay.
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(x0 + 2500 * scale, y0 + 2500 * scale, 700 * scale, 700 * scale);
  // Park.
  ctx.fillStyle = '#69b45a';
  ctx.fillRect(x0 + 1150 * scale, y0 + 1150 * scale, 324 * scale, 324 * scale);
  // Roads.
  ctx.fillStyle = '#3a3d44';
  for (const line of ROAD_LINES) {
    ctx.fillRect(x0, y0 + line * scale - 2, size, 4);
    ctx.fillRect(x0 + line * scale - 2, y0, 4, size);
  }
  // Buildings.
  ctx.fillStyle = 'rgba(200,205,215,0.8)';
  for (const b of game.city.buildings) {
    ctx.fillRect(x0 + b.x * scale, y0 + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
  }
  // Cash pickups.
  ctx.fillStyle = '#37d67a';
  for (const c of game.cashPickups) {
    ctx.beginPath();
    ctx.arc(x0 + c.x * scale, y0 + c.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission target.
  const target = game.missions.target;
  if (target && game.missions.active) {
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.arc(x0 + target.x * scale, y0 + target.y * scale, 5 + Math.sin(game.time * 5) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5a10';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Traffic dots.
  ctx.fillStyle = '#e8e8e8';
  for (const car of game.traffic) {
    ctx.fillRect(x0 + car.x * scale - 1, y0 + car.y * scale - 1, 3, 3);
  }
  // Police: flashing blue/red.
  for (const car of game.police) {
    ctx.fillStyle = Math.sin(car.sirenPhase) > 0 ? '#ff2a1a' : '#2b5cff';
    ctx.beginPath();
    ctx.arc(x0 + car.x * scale, y0 + car.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const pl = game.player;
  const px = x0 + pl.x * scale;
  const py = y0 + pl.y * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(pl.car ? pl.car.angle : pl.faceAngle);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Label.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SOLMAR CITY', x0, y0 + size + 22);
}

export function drawEdgeArrow(ctx, game) {
  const target = game.missions.target;
  if (!target || !game.missions.active) return;
  const pl = game.player;
  const cam = game.camera;
  const dx = target.x - pl.x;
  const dy = target.y - pl.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 320) return; // on screen already
  const angle = Math.atan2(dy, dx);
  // Place the arrow on a circle around the screen centre.
  const cx = CFG.viewW / 2 + Math.cos(angle) * 300;
  const cy = CFG.viewH / 2 + Math.sin(angle) * 220;
  ctx.save();
  ctx.translate(clamp(cx, 40, CFG.viewW - 40), clamp(cy, 90, CFG.viewH - 40));
  ctx.rotate(angle);
  ctx.fillStyle = '#ffc93c';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Distance readout next to the arrow.
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(dist) + 'm', clamp(cx, 40, CFG.viewW - 40), clamp(cy, 90, CFG.viewH - 40) + 30);
}

export function drawHUD(ctx, game) {
  // Money.
  panel(ctx, 16, 16, 190, 56);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatMoney(game.money), 30, 40);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = '13px sans-serif';
  ctx.fillText(game.missions.doneCount + ' / 3 jobs done', 30, 60);

  // Wanted stars.
  panel(ctx, 16, 84, 190, 44);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('WANTED', 30, 100);
  for (let i = 0; i < 5; i++) {
    const sx = 96 + i * 22;
    const sy = 106;
    const lit = i < game.wanted;
    ctx.fillStyle = lit ? '#ffd21f' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, sx, sy, lit ? 10 : 8);
  }
  if (game.wanted > 0) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(game.wanted >= 3 ? 'POLICE CHASE!' : 'LAY LOW', 30, 122);
  }

  // Clock and day phase.
  panel(ctx, 16, 140, 190, 44);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(formatClock(game.hour), 30, 164);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = '13px sans-serif';
  ctx.fillText(game.dayPhaseLabel(), 100, 164);

  // Mission panel.
  const def = game.missions.currentDef();
  panel(ctx, 16, 196, 330, 74);
  ctx.fillStyle = '#ffc93c';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(game.missions.sideJobActive ? 'SIDE JOB' : (def ? def.title : 'FREE ROAM'), 30, 220);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '14px sans-serif';
  ctx.fillText(game.missions.objectiveText(), 30, 244, 300);
  if (game.missions.active && game.missions.target) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = '12px sans-serif';
    const pl = game.player;
    const d = Math.hypot(game.missions.target.x - pl.x, game.missions.target.y - pl.y);
    ctx.fillText('Target: ' + game.missions.target.label + ' — ' + Math.round(d) + 'm', 30, 262);
  }

  // Speed, bottom right, only while driving.
  const pl = game.player;
  if (pl.car) {
    panel(ctx, CFG.viewW - 206, CFG.viewH - 76, 190, 60);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(pl.car.speed) * 0.22) + '', CFG.viewW - 60, CFG.viewH - 40);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = '13px sans-serif';
    ctx.fillText('km/h', CFG.viewW - 30, CFG.viewH - 40);
    ctx.textAlign = 'left';
  } else {
    panel(ctx, CFG.viewW - 206, CFG.viewH - 76, 190, 60);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = '13px sans-serif';
    ctx.fillText('On foot — E near a car', CFG.viewW - 192, CFG.viewH - 40);
  }

  // Controls hint, bottom left.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD move · Shift run · E enter car · Space punch / brake · T job · P pause · H help · M mute', 16, CFG.viewH - 16);

  drawMinimap(ctx, game);
  drawEdgeArrow(ctx, game);

  // Toast messages.
  let y = 290;
  for (const msg of game.messages) {
    ctx.globalAlpha = clamp(msg.life / 1.2, 0, 1);
    panel(ctx, 16, y, Math.min(560, 24 + msg.text.length * 7.4), 34);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(msg.text, 30, y + 22);
    ctx.globalAlpha = 1;
    y += 42;
  }
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(6,10,20,0.72)';
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
}

function titleText(ctx, text, y, size, color) {
  ctx.fillStyle = color || '#ffffff';
  ctx.font = 'bold ' + size + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, CFG.viewW / 2, y);
}

export function drawStartScreen(ctx, game) {
  dimScreen(ctx);
  titleText(ctx, 'SOLMAR CITY', 170, 84, '#ffc93c');
  titleText(ctx, 'An open-world crime story in the sun', 215, 22, '#e8ecf2');
  titleText(ctx, 'You are Danny Cole, fresh out of luck. Vic the fixer has three jobs for you.', 260, 17, '#c8d0dc');
  titleText(ctx, 'Steal cars. Dodge the cops. Get paid. Own the city.', 288, 17, '#c8d0dc');
  const hasSave = game.saveData !== null;
  titleText(ctx, hasSave ? 'ENTER — Continue ($' + Math.floor(game.saveData.money) + ', ' + game.saveData.jobsDone + '/3 jobs)' : 'ENTER — New game', 360, 20, '#ffffff');
  titleText(ctx, 'WASD move · Shift run · E steal / enter car · Space punch · T start job', 420, 16, '#c8d0dc');
  titleText(ctx, 'P pause · H help · M mute · Your progress saves automatically', 448, 16, '#c8d0dc');
  titleText(ctx, 'A 2D open world: traffic, pedestrians, police chases, missions, day and night.', 500, 15, '#9aa4b2');
  titleText(ctx, 'Original game — not affiliated with any commercial series.', 540, 13, '#7a8494');
}

export function drawPauseScreen(ctx) {
  dimScreen(ctx);
  titleText(ctx, 'PAUSED', 300, 56, '#ffffff');
  titleText(ctx, 'P — resume · H — help · R — restart the day', 360, 18, '#c8d0dc');
}

export function drawHelpScreen(ctx) {
  dimScreen(ctx);
  titleText(ctx, 'HOW TO PLAY', 130, 44, '#ffc93c');
  const lines = [
    'WASD / arrows — move or drive. Shift — run. Space — punch on foot, handbrake in a car.',
    'E — get in or out of a car. Any parked or traffic car can be taken; stealing one raises your wanted level.',
    'T — start the next story job. Finish all three jobs, then take side jobs for $150 each.',
    'Hitting a pedestrian or a police car raises your wanted level. Police chase you and try to bust you.',
    'Break line of sight to cool down: your wanted level drops one star at a time.',
    'Green bills on the street are cash. Gold markers are mission targets. The minimap shows it all.',
    'M — mute. P — pause. Your money and jobs save automatically.',
  ];
  lines.forEach((line, i) => {
    ctx.fillStyle = '#e8ecf2';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('•  ' + line, 130, 200 + i * 36, 1020);
  });
  titleText(ctx, 'H or Esc — back to the game', 500, 18, '#ffc93c');
}

export function drawBustedScreen(ctx, game) {
  dimScreen(ctx);
  titleText(ctx, 'BUSTED!', 280, 64, '#ff5a3c');
  titleText(ctx, 'The Solmar City police caught you. Fine: $' + Math.floor(game.lastFine), 350, 20, '#ffffff');
  titleText(ctx, 'ENTER — get back on the street', 400, 18, '#ffc93c');
}
