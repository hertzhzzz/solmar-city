// SOLMAR CITY — shots.js
// Screenshot presets, driven by ?shot=1..4 in the URL.
// Each one stages a different moment of the game, so the screenshots show
// driving, walking, night, police and missions instead of one flat scene.

import { CFG } from './config.js';

export function applyShot(game, n) {
  const g = game;
  // Screenshots stage a fresh state, not the playtest's saved money.
  g.money = CFG.startMoney;
  g.startPlaying();
  if (n === 1) {
    // Cover: dusk car chase, three stars, mission 1 live.
    g.hour = 18.4;
    g.missions.index = 0;
    g.missions.startNext();
    const car = g.deliveryCar;
    g.enterCar(car);
    car.x = 1150;
    car.y = 1030;
    car.angle = 0;
    car.speed = CFG.carMaxSpeed;
    g.player.x = car.x;
    g.player.y = car.y;
    g.setWanted(3, null);
    g.spawnPoliceForWanted();
    for (const p of g.police) {
      p.x = car.x - 260 + Math.random() * 120;
      p.y = car.y - 180 + Math.random() * 120;
      p.speed = 380;
    }
  } else if (n === 2) {
    // Day on foot downtown, traffic and pedestrians all around.
    g.hour = 11.0;
    g.player.x = 1400;
    g.player.y = 1400;
    g.player.faceAngle = -Math.PI / 2;
    g.setWanted(0, null);
    g.missions.index = 0;
    g.missions.startNext();
  } else if (n === 3) {
    // Night at the marina: headlights, lamps, water, one star.
    g.hour = 22.3;
    g.player.x = 1650;
    g.player.y = 2900;
    g.player.faceAngle = Math.PI;
    g.setWanted(1, null);
    g.spawnPoliceForWanted();
    g.missions.index = 1;
    g.missions.startNext();
  } else if (n === 4) {
    // Golden hour cash run: bags on the ground, minimap and HUD busy.
    g.hour = 16.8;
    g.player.x = 1000;
    g.player.y = 1000;
    g.player.faceAngle = Math.PI / 4;
    g.setWanted(0, null);
    g.missions.index = 1;
    g.missions.startNext();
    const car = g.spawnParkedNear(1050, 980);
    car.angle = 0;
  }
  g.camera.x = g.player.x;
  g.camera.y = g.player.y;
  g.camera.snap = true;
  g.missions.doneCount = g.missions.index;
}
