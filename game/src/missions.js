// SOLMAR CITY — missions.js
// The story: three jobs for Vic, a fixer in Solmar City, then repeatable side work.
// Each mission has a briefing, a live objective line, and a cash reward.

import { REWARDS } from './config.js';
import { distance } from './random.js';
import { randomRoadPoint, randomSidewalkPoint } from './world.js';

export const MISSION_DEFS = [
  {
    id: 'delivery',
    title: 'JOB 1 — FIRST DELIVERY',
    briefing: 'Vic needs a package taken to Marina Bay. Grab the orange coupe and drive it there. Do not wreck it.',
    objective: 'Drive the orange coupe to Marina Bay',
    reward: REWARDS.delivery,
  },
  {
    id: 'cashrun',
    title: 'JOB 2 — CASH RUN',
    briefing: 'Five cash bags are stashed around the city. Collect them all, on foot or by car. Cops will notice if you hit anyone.',
    objective: 'Collect the cash bags',
    reward: REWARDS.cashRun,
  },
  {
    id: 'escape',
    title: 'JOB 3 — HEAT ESCAPE',
    briefing: 'The job went loud. Three stars, cops everywhere. Lose them and reach the Hideout Garage on the west side.',
    objective: 'Reach the Hideout Garage with the heat off your back',
    reward: REWARDS.escape,
  },
];

export class MissionManager {
  constructor(game) {
    this.game = game;
    this.index = 0; // which mission is active; 3 means the story is done
    this.active = false;
    this.target = null; // {x, y, label}
    this.bags = []; // cash-run pickups
    this.bagsLeft = 0;
    this.doneCount = 0;
    this.sideJobActive = false;
  }

  currentDef() {
    return MISSION_DEFS[this.index] || null;
  }

  startNext() {
    const def = this.currentDef();
    if (!def) return false;
    this.active = true;
    const g = this.game;
    if (def.id === 'delivery') {
      this.target = { x: 1600, y: 2980, label: 'Marina Bay drop-off' };
      // Park the orange coupe near the player.
      g.deliveryCar = g.spawnDeliveryCar();
      g.addMessage('Get in the orange coupe (E)', 4);
    } else if (def.id === 'cashrun') {
      this.bags = [];
      for (let i = 0; i < 5; i++) {
        const p = randomSidewalkPoint(g.rng);
        this.bags.push({ x: p.x, y: p.y, taken: false, bob: g.rng.range(0, 6), label: 'Cash bag' });
      }
      this.bagsLeft = 5;
      this.target = this.bags[0];
      g.addMessage('Find the 5 cash bags — follow the gold marker', 4);
    } else if (def.id === 'escape') {
      this.target = { x: 420, y: 2200, label: 'Hideout Garage' };
      g.setWanted(3, 'The job went loud!');
      g.addMessage('Three stars! Reach the Hideout Garage', 4);
    }
    g.addMessage(def.title, 5);
    g.sound.missionStart();
    return true;
  }

  startSideJob() {
    const g = this.game;
    const p = randomRoadPoint(g.rng);
    this.target = { x: p.x, y: p.y, label: 'Side delivery' };
    this.sideJobActive = true;
    this.active = true;
    g.addMessage('SIDE JOB — deliver to the gold marker ($150)', 4);
    g.sound.missionStart();
  }

  objectiveText() {
    const def = this.currentDef();
    if (this.sideJobActive) return 'Side job: reach the gold marker';
    if (!def) return 'Story complete — free roam. Press T for a side job ($150).';
    if (def.id === 'cashrun') return `Collect the cash bags (${5 - this.bagsLeft}/5)`;
    return def.objective;
  }

  completeCurrent() {
    const g = this.game;
    const def = this.currentDef();
    if (this.sideJobActive) {
      g.money += REWARDS.sideJob;
      g.addMessage(`SIDE JOB DONE — +$${REWARDS.sideJob}`, 4);
      g.sound.missionComplete();
      this.sideJobActive = false;
      this.active = false;
      this.target = null;
      g.saveGame();
      return;
    }
    if (!def) return;
    g.money += def.reward;
    this.doneCount++;
    this.active = false;
    this.target = null;
    g.addMessage(`${def.title} — COMPLETE! +$${def.reward}`, 5);
    g.sound.missionComplete();
    this.index++;
    const next = this.currentDef();
    if (next) {
      g.addMessage(`Next job: ${next.title} — press T to start`, 6);
    } else {
      g.addMessage('STORY COMPLETE! You run Solmar City now.', 8);
    }
    g.saveGame();
  }

  update(dt) {
    if (!this.active) return;
    const g = this.game;
    const pl = g.player;
    const px = pl.car ? pl.car.x : pl.x;
    const py = pl.car ? pl.car.y : pl.y;
    const def = this.currentDef();

    if (this.sideJobActive) {
      if (distance(px, py, this.target.x, this.target.y) < 70) this.completeCurrent();
      return;
    }
    if (!def) return;

    if (def.id === 'delivery') {
      const inCoupe = pl.car === g.deliveryCar;
      if (inCoupe && distance(px, py, this.target.x, this.target.y) < 80) {
        this.completeCurrent();
      } else if (!inCoupe) {
        this.target = { x: g.deliveryCar.x, y: g.deliveryCar.y, label: 'Orange coupe' };
      } else {
        this.target = { x: 1600, y: 2980, label: 'Marina Bay drop-off' };
      }
    } else if (def.id === 'cashrun') {
      let nearest = null;
      let nearestD = Infinity;
      for (const bag of this.bags) {
        if (bag.taken) continue;
        const d = distance(px, py, bag.x, bag.y);
        if (d < 46) {
          bag.taken = true;
          this.bagsLeft--;
          g.money += 40;
          g.sound.pickup();
          g.addMessage(`Cash bag +$40 (${5 - this.bagsLeft}/5)`, 2);
          g.spawnSparkle(bag.x, bag.y);
        } else if (d < nearestD) {
          nearestD = d;
          nearest = bag;
        }
      }
      this.target = nearest;
      if (this.bagsLeft <= 0) this.completeCurrent();
    } else if (def.id === 'escape') {
      if (g.wanted === 0 && distance(px, py, this.target.x, this.target.y) < 90) {
        this.completeCurrent();
      }
    }
  }
}
