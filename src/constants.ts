import { Point, TowerType, EnemyType, MapLayout } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 900;

export const MAP_LAYOUTS: MapLayout[] = [
  {
    id: 's-curve',
    name: 'The S-Curve',
    description: 'Classic tactical layout with multiple chokepoints.',
    path: [
      { x: 0, y: 450 },
      { x: 225, y: 450 },
      { x: 225, y: 150 },
      { x: 600, y: 150 },
      { x: 600, y: 750 },
      { x: 975, y: 750 },
      { x: 975, y: 450 },
      { x: 1200, y: 450 },
    ]
  },
  {
    id: 'perimeter',
    name: 'The Perimeter',
    description: 'Enemies hug the outer walls before diving center.',
    path: [
      { x: 0, y: 100 },
      { x: 1100, y: 100 },
      { x: 1100, y: 800 },
      { x: 100, y: 800 },
      { x: 100, y: 450 },
      { x: 1200, y: 450 }
    ]
  },
  {
    id: 'crossfire',
    name: 'Crossfire',
    description: 'Aggressive zig-zag path cutting through the center.',
    path: [
      { x: 0, y: 200 },
      { x: 400, y: 800 },
      { x: 800, y: 100 },
      { x: 1200, y: 700 }
    ]
  },
  {
    id: 'spiral',
    name: 'The Maelstrom',
    description: 'A spiral path forcing enemies into the center.',
    path: [
      { x: 0, y: 100 },
      { x: 1000, y: 100 },
      { x: 1000, y: 800 },
      { x: 200, y: 800 },
      { x: 200, y: 300 },
      { x: 800, y: 300 },
      { x: 800, y: 600 },
      { x: 400, y: 600 },
      { x: 400, y: 450 },
      { x: 600, y: 450 }
    ]
  },
  {
    id: 'twin-peaks',
    name: 'Twin Peaks',
    description: 'High vertical peaks requiring dense tower clustering.',
    path: [
      { x: 0, y: 700 },
      { x: 300, y: 200 },
      { x: 600, y: 800 },
      { x: 900, y: 200 },
      { x: 1200, y: 700 }
    ]
  },
  {
    id: 'stairs',
    name: 'The Stairs',
    description: 'Constant 90 degree turns breaking line of sight.',
    path: [
      { x: 0, y: 150 },
      { x: 200, y: 150 },
      { x: 200, y: 300 },
      { x: 400, y: 300 },
      { x: 400, y: 450 },
      { x: 600, y: 450 },
      { x: 600, y: 600 },
      { x: 800, y: 600 },
      { x: 800, y: 750 },
      { x: 1200, y: 750 }
    ]
  },
  {
    id: 'loop',
    name: 'The Noose',
    description: 'A massive loop centered around a major killzone.',
    path: [
      { x: 0, y: 800 },
      { x: 500, y: 800 },
      { x: 500, y: 200 },
      { x: 800, y: 200 },
      { x: 800, y: 500 },
      { x: 300, y: 500 },
      { x: 300, y: 800 },
      { x: 1200, y: 800 }
    ]
  },
  {
    id: 'fracture',
    name: 'Fracture',
    description: 'Unpredictable, chaotic diagonal cuts.',
    path: [
      { x: 0, y: 450 },
      { x: 300, y: 100 },
      { x: 350, y: 800 },
      { x: 700, y: 200 },
      { x: 850, y: 800 },
      { x: 1200, y: 450 }
    ]
  },
  {
    id: 'gauntlet',
    name: 'The Gauntlet',
    description: 'A long straight trench with two brutal choke-turns.',
    path: [
      { x: 100, y: 0 },
      { x: 100, y: 800 },
      { x: 1100, y: 800 },
      { x: 1100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 450 }
    ]
  },
  {
    id: 'hook',
    name: 'The Hook',
    description: 'Approaches from the bottom and wraps the arena.',
    path: [
      { x: 600, y: 900 },
      { x: 600, y: 700 },
      { x: 100, y: 700 },
      { x: 100, y: 150 },
      { x: 1100, y: 150 },
      { x: 1100, y: 450 },
      { x: 600, y: 450 }
    ]
  },
  {
    id: 'snakebite',
    name: 'Snakebite',
    description: 'Tight switchbacks transitioning to a dash.',
    path: [
      { x: 0, y: 200 },
      { x: 400, y: 200 },
      { x: 100, y: 400 },
      { x: 500, y: 400 },
      { x: 200, y: 600 },
      { x: 600, y: 600 },
      { x: 1200, y: 600 }
    ]
  },
  {
    id: 'gridlock',
    name: 'Gridlock Protocol',
    description: 'The ultimate maze. Maximum coverage required.',
    path: [
      { x: 0, y: 800 },
      { x: 200, y: 800 },
      { x: 200, y: 200 },
      { x: 400, y: 200 },
      { x: 400, y: 700 },
      { x: 600, y: 700 },
      { x: 600, y: 100 },
      { x: 800, y: 100 },
      { x: 800, y: 600 },
      { x: 1000, y: 600 },
      { x: 1000, y: 300 },
      { x: 1200, y: 300 }
    ]
  }
];

export const TOWER_STATS: Record<TowerType, { range: number; damage: number; fireRate: number; cost: number; color: string; maxHealth: number }> = {
  laser: {
    range: 200,
    damage: 16,
    fireRate: 400, // ms
    cost: 40,
    color: '#00f2ff', // Cyan
    maxHealth: 150,
  },
  plasma: {
    range: 270,
    damage: 48,
    fireRate: 1500,
    cost: 100,
    color: '#ff00ea', // Magenta
    maxHealth: 200,
  },
  slow: {
    range: 150,
    damage: 3,
    fireRate: 800,
    cost: 65,
    color: '#00ff44', // Green
    maxHealth: 300,
  },
  railgun: {
    range: 330,
    damage: 130,
    fireRate: 2500,
    cost: 200,
    color: '#ffae00', // Gold
    maxHealth: 100, // Glass cannon
  },
  tesla: {
    range: 135,
    damage: 8,
    fireRate: 150,
    cost: 150,
    color: '#ff0055', // Bright Pink/Red
    maxHealth: 200,
  },
  minigun: {
    range: 130,
    damage: 6,
    fireRate: 100,
    cost: 90,
    color: '#ff5500', // Orange-ish
    maxHealth: 250,
  },
  pulse: {
    range: 200,
    damage: 34,
    fireRate: 1000,
    cost: 120,
    color: '#0055ff', // Deep Blue
    maxHealth: 250,
  },
  frost: {
    range: 250,
    damage: 8,
    fireRate: 1200,
    cost: 180,
    color: '#00ffff', // Cyan/Ice
    maxHealth: 220,
  },
  beam: {
    range: 220,
    damage: 20,
    fireRate: 200,
    cost: 250,
    color: '#ffffff', // White
    maxHealth: 200,
  },
  artillery: {
    range: 450,
    damage: 120,
    fireRate: 3500,
    cost: 300,
    color: '#ff0000', // Pure Red
    maxHealth: 150,
  },
};

export const ENEMY_STATS: Record<EnemyType, { health: number; speed: number; reward: number; color: string; armor?: number; shield?: number }> = {
  basic: {
    health: 50,
    speed: 2.25,
    reward: 15,
    color: '#ffffff',
  },
  fast: {
    health: 40,
    speed: 4.5,
    reward: 10,
    color: '#ffff00',
  },
  tank: {
    health: 175,
    speed: 1.20,
    reward: 30,
    color: '#ff4400',
  },
  armored: {
    health: 160,
    speed: 1.5,
    reward: 40,
    color: '#888888',
    armor: 5, // Reduces each hit by 5
  },
  splitter: {
    health: 120,
    speed: 1.8,
    reward: 25,
    color: '#00ccff',
  },
  mini: {
    health: 24,
    speed: 3.75,
    reward: 5,
    color: '#00ccff',
  },
  healer: {
    health: 200,
    speed: 1.5,
    reward: 50,
    color: '#00ff88',
  },
  shielded: {
    health: 120,
    speed: 1.8,
    reward: 45,
    color: '#4488ff',
    shield: 100,
  },
  phantom: {
    health: 95,
    speed: 3,
    reward: 35,
    color: '#aa00ff',
  },
  dreadnought: {
    health: 800,
    speed: 0.8,
    reward: 150,
    color: '#660000', // Dark Red
    armor: 15,
  },
  goliath: {
    health: 600,
    speed: 2.0,
    reward: 120,
    color: '#ff6600', // Orange-ish
    armor: 10,
  },
  warprunner: {
    health: 250,
    speed: 6.0,
    reward: 100,
    color: '#ffff66', // Bright Yellow
  },
  titan: {
    health: 1500,
    speed: 1.0,
    reward: 300,
    color: '#cc0066', // Crimson/Magenta
    armor: 20,
    shield: 500,
  },
  prime: {
    health: 900,
    speed: 1.8,
    reward: 200,
    color: '#00ffcc', // Teal/Mint
  },
  overlord: {
    health: 1200,
    speed: 1.2,
    reward: 250,
    color: '#0066ff', // Strong Blue
    shield: 2000,
  },
  stalker: {
    health: 700,
    speed: 3.5,
    reward: 180,
    color: '#6600cc', // Deep Purple
  },
  singularity: {
    health: 5000,
    speed: 0.9,
    reward: 500,
    color: '#ffffff', // Pure White
    armor: 30,
  },
  nemesis: {
    health: 12000,
    speed: 1.5,
    reward: 2000,
    color: '#ff0000', // Blood Red
    armor: 50,
    shield: 5000,
  },
};


