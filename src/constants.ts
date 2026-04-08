import { Point, TowerType, EnemyType } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PATH: Point[] = [
  { x: 0, y: 300 },
  { x: 150, y: 300 },
  { x: 150, y: 100 },
  { x: 400, y: 100 },
  { x: 400, y: 500 },
  { x: 650, y: 500 },
  { x: 650, y: 300 },
  { x: 800, y: 300 },
];

export const TOWER_STATS: Record<TowerType, { range: number; damage: number; fireRate: number; cost: number; color: string }> = {
  laser: {
    range: 120,
    damage: 10,
    fireRate: 500, // ms
    cost: 50,
    color: '#00f2ff', // Cyan
  },
  plasma: {
    range: 180,
    damage: 40,
    fireRate: 1500,
    cost: 120,
    color: '#ff00ea', // Magenta
  },
  slow: {
    range: 100,
    damage: 2,
    fireRate: 800,
    cost: 80,
    color: '#00ff44', // Green
  },
};

export const ENEMY_STATS: Record<EnemyType, { health: number; speed: number; reward: number; color: string; armor?: number; shield?: number }> = {
  basic: {
    health: 100,
    speed: 1.5,
    reward: 15,
    color: '#ffffff',
  },
  fast: {
    health: 50,
    speed: 3,
    reward: 10,
    color: '#ffff00',
  },
  tank: {
    health: 300,
    speed: 0.8,
    reward: 30,
    color: '#ff4400',
  },
  armored: {
    health: 200,
    speed: 1.0,
    reward: 40,
    color: '#888888',
    armor: 5, // Reduces each hit by 5
  },
  splitter: {
    health: 150,
    speed: 1.2,
    reward: 25,
    color: '#00ccff',
  },
  mini: {
    health: 30,
    speed: 2.5,
    reward: 5,
    color: '#00ccff',
  },
  healer: {
    health: 250,
    speed: 1.0,
    reward: 50,
    color: '#00ff88',
  },
  shielded: {
    health: 150,
    speed: 1.2,
    reward: 45,
    color: '#4488ff',
    shield: 100,
  },
  phantom: {
    health: 120,
    speed: 2.0,
    reward: 35,
    color: '#aa00ff',
  },
};

export const SLOT_COST = 10;

export const TOWER_SLOTS: Point[] = [
  // Initial slots (near start)
  { x: 75, y: 240 }, { x: 75, y: 360 },
  { x: 100, y: 150 }, { x: 200, y: 150 },
  // Mid-game slots
  { x: 275, y: 50 }, { x: 275, y: 150 },
  { x: 350, y: 250 }, { x: 450, y: 250 },
  { x: 350, y: 400 }, { x: 450, y: 400 },
  { x: 525, y: 440 }, { x: 525, y: 560 },
  // Late-game slots
  { x: 600, y: 360 }, { x: 700, y: 360 },
  { x: 725, y: 240 }, { x: 725, y: 360 },
  { x: 200, y: 450 }, { x: 100, y: 450 },
  { x: 50, y: 500 }, { x: 150, y: 500 },
  { x: 750, y: 100 }, { x: 650, y: 100 },
  { x: 550, y: 50 }, { x: 650, y: 50 },
];
