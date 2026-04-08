export type Point = { x: number; y: number };

export type EnemyType = 'basic' | 'fast' | 'tank' | 'armored' | 'splitter' | 'mini' | 'healer' | 'shielded' | 'phantom';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  reward: number;
  waypointIndex: number;
  distanceTraveled: number;
  armor?: number; // Reduces damage taken
  shield?: number; // Absorbs damage before health
  maxShield?: number;
  slowTimer?: number; // Time remaining for slow effect
  lastHealTime?: number; // For healer type
  engagedWith?: string | null; // ID of soldier blocking this enemy
}

export type TowerType = 'laser' | 'plasma' | 'slow';

export interface Tower {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  range: number;
  damage: number;
  fireRate: number;
  lastFired: number;
  targetId: string | null;
  level: number;
  cost: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  type?: TowerType; // To handle special effects like slow
}

export interface TowerSlot {
  id: string;
  x: number;
  y: number;
  isPurchased: boolean;
  hasTower: boolean;
  isVisible: boolean;
}

export interface Soldier {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  waypointIndex: number; // Moving backwards
  targetId: string | null;
}

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  isPaused: boolean;
  isGameOver: boolean;
}
