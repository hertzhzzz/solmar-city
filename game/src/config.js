// SOLMAR CITY — config.js
// Every tunable number of the game lives here, in one place.

export const CFG = {
  // World
  worldSize: 3200,
  roadGap: 400,
  roadWidth: 76,
  blockMargin: 26,
  // Canvas
  viewW: 1280,
  viewH: 720,
  // Player on foot
  walkSpeed: 230,
  runSpeed: 350,
  playerRadius: 13,
  // Driving
  carAccel: 620,
  carReverseAccel: 380,
  carMaxSpeed: 560,
  carMaxReverse: 180,
  carTurnRate: 2.6,
  carFriction: 0.55,
  carBrake: 900,
  // Traffic
  trafficSpeed: 150,
  trafficCount: 26,
  pedCount: 42,
  parkedCount: 14,
  // Wanted
  maxWanted: 5,
  wantedDecaySeconds: 7,
  bustedHoldSeconds: 1.6,
  // Clock: one full day lasts 8 real minutes
  dayLengthSeconds: 480,
  startHour: 9.2,
  // Money
  startMoney: 120,
  bustedFineRate: 0.15,
  // Camera
  cameraLerp: 5,
};

export const COLORS = {
  grass: '#5d9e4e',
  grassDark: '#4c8a3f',
  parkGrass: '#69b45a',
  sand: '#e8d49a',
  water: '#2f7fb8',
  waterDeep: '#256a9e',
  road: '#3a3d44',
  roadLine: '#e8d44d',
  sidewalk: '#9aa0a8',
  buildingRoof: ['#c96f4a', '#7d8aa0', '#b8a06a', '#8a6fa0', '#5f8a7a', '#a05a5a', '#6a7fb0'],
  buildingEdge: '#2c2f36',
  lampGlow: '#ffd98a',
  playerShirt: '#ff5a3c',
  playerSkin: '#f0c08a',
  policeBlue: '#2b5cff',
  policeWhite: '#f2f4f8',
  taxiYellow: '#f5c518',
  cashGreen: '#37d67a',
  missionGold: '#ffc93c',
  hudPanel: 'rgba(12, 16, 24, 0.72)',
  hudText: '#ffffff',
  hudMuted: '#c8d0dc',
};

export const CAR_COLORS = [
  '#d94f3d', '#3d7bd9', '#e8b73c', '#4fae5f', '#8a5fd0',
  '#e8e8e8', '#2c2f36', '#d97fb0', '#3db8c9', '#c96a2e',
];

export const PED_SHIRTS = [
  '#e8e8e8', '#4fae5f', '#d9a03d', '#7d8aa0', '#c96a8a',
  '#5f8a7a', '#b05a5a', '#6a7fb0', '#e8d44d', '#9a6fc0',
];

// Mission rewards, in dollars.
export const REWARDS = { delivery: 250, cashRun: 400, escape: 600, sideJob: 150 };
