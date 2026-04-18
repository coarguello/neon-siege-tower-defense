export type Point = { x: number; y: number };

export type EnemyType = 'basic' | 'fast' | 'tank' | 'armored' | 'splitter' | 'mini' | 'healer' | 'shielded' | 'phantom' | 'dreadnought' | 'goliath' | 'warprunner' | 'titan' | 'prime' | 'overlord' | 'stalker' | 'singularity' | 'nemesis';

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
  isBoss?: boolean;
  bossType?: 'tank' | 'stealth' | 'titan' | 'swarm';
  color?: string;
  targetTowerId?: string | null; // ID of tower it is currently destroying
  hitCooldown?: number; // Attack speed against towers
}

export type TowerType = 'laser' | 'plasma' | 'slow' | 'railgun' | 'tesla' | 'minigun' | 'pulse' | 'frost' | 'beam' | 'artillery';

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
  health: number; // New mechanic: Bosses can destroy towers
  maxHealth: number;
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



export interface Soldier {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  level: number;
  waypointIndex: number; // Moving backwards
  targetId: string | null;
}

export type DifficultyLevel = 'easy' | 'medium' | 'master' | 'insane';

export interface GameState {
  gold: number;
  lives: number;
  maxLives: number;
  wave: number;
  armyLevel: number;
  isPaused: boolean;
  isGameOver: boolean;
  isBossAlert?: boolean; // Controls visual flashing drill sequence
  enemiesKilled: number;
  isBugReportOpen?: boolean;
}

export interface MapLayout {
  id: string;
  name: string;
  description: string;
  path: Point[];
}
