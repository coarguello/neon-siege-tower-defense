import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Heart, Coins, Play, Pause, RotateCcw, Zap, Target, Crosshair, Sword, Users, Activity, Radio, Flame, Sun, Snowflake, Wand, Bomb, Trash, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { Point, Enemy, Tower, Projectile, GameState, TowerType, EnemyType, Soldier, DifficultyLevel, MapLayout, DamagePopup, Transaction } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TOWER_STATS, ENEMY_STATS } from '../constants';
import BugReportModal from './BugReportModal';
import { SoundEngine } from '../utils/SoundEngine';

const getInitialState = (diff: DifficultyLevel): GameState => {
  switch (diff) {
    case 'easy': return { gold: 200, lives: 20, maxLives: 20, wave: 0, armyLevel: 1, isPaused: false, isDoubleSpeed: false, isGameOver: false, enemiesKilled: 0 };
    case 'medium': return { gold: 150, lives: 20, maxLives: 20, wave: 0, armyLevel: 1, isPaused: false, isDoubleSpeed: false, isGameOver: false, enemiesKilled: 0 };
    case 'master': return { gold: 100, lives: 15, maxLives: 15, wave: 0, armyLevel: 1, isPaused: false, isDoubleSpeed: false, isGameOver: false, enemiesKilled: 0 };
    case 'insane': return { gold: 75, lives: 10, maxLives: 10, wave: 0, armyLevel: 1, isPaused: false, isDoubleSpeed: false, isGameOver: false, enemiesKilled: 0 };
    default: return { gold: 150, lives: 20, maxLives: 20, wave: 0, armyLevel: 1, isPaused: false, isDoubleSpeed: false, isGameOver: false, enemiesKilled: 0 };
  }
};

interface GoldPopup {
  id: number;
  amount: number;
}

interface GameProps {
  difficulty: DifficultyLevel;
  mapLayout: MapLayout;
  onReturnToMenu: () => void;
}

export default function Game({ difficulty, mapLayout, onReturnToMenu }: GameProps) {
  const PATH = mapLayout.path;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(getInitialState(difficulty));

  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [goldPopups, setGoldPopups] = useState<GoldPopup[]>([]);

  // Game entities managed in refs to avoid React re-render overhead
  const enemiesRef = useRef<Enemy[]>([]);
  const soldiersRef = useRef<Soldier[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const damagePopupsRef = useRef<DamagePopup[]>([]);
  const shakeIntensityRef = useRef<number>(0);
  const popupThrottleRef = useRef<Map<string, number>>(new Map());
  const transactionLogRef = useRef<Transaction[]>([]);
  const gameStateRef = useRef<GameState>(gameState);
  const lastWaveTimeRef = useRef<number>(0);
  const prevGoldRef = useRef<number>(gameState.gold);

  useEffect(() => {
    if (gameState.gold !== prevGoldRef.current && !gameState.isGameOver) {
      const difference = gameState.gold - prevGoldRef.current;
      const id = Date.now() + Math.random();
      
      setGoldPopups(prev => [...prev, { id, amount: difference }]);
      
      setTimeout(() => {
        setGoldPopups(prev => prev.filter(p => p.id !== id));
      }, 1000);
    }
    prevGoldRef.current = gameState.gold;
  }, [gameState.gold, gameState.isGameOver]);

  // Helper distance checks for free placement
  const distToSegmentSq = (p: Point, v: Point, w: Point) => {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return (p.x - (v.x + t * (w.x - v.x))) ** 2 + (p.y - (v.y + t * (w.y - v.y))) ** 2;
  };

  const isNearPath = useCallback((x: number, y: number, safeDist = 35) => {
    const pt = { x, y };
    for (let i = 0; i < PATH.length - 1; i++) {
      if (distToSegmentSq(pt, PATH[i], PATH[i+1]) < safeDist * safeDist) return true;
    }
    return false;
  }, [PATH]);

  const isOverlappingTower = useCallback((x: number, y: number, safeDist = 45) => {
    return towersRef.current.some(t => {
      const dx = t.x - x;
      const dy = t.y - y;
      return (dx * dx + dy * dy) < safeDist * safeDist;
    });
  }, []);

  // Sync gameStateRef with state for the game loop (only for UI-driven changes)
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);


  const spawnArmy = useCallback(() => {
    if (soldiersRef.current.length >= 10) return;
    
    const cost = 75; // Weaker start, lower cost
    if (gameStateRef.current.gold < cost) return;
    
    setGameState(prev => ({ ...prev, gold: prev.gold - cost }));
    
    const lastWaypointIndex = PATH.length - 1;
    const spawnPoint = PATH[lastWaypointIndex];
    const prevPoint = PATH[lastWaypointIndex - 1]; // Soldiers travel backwards along PATH
    
    // Calculate exit vector to queue soldiers nicely just off-screen
    const dxEnd = spawnPoint.x - prevPoint.x;
    const dyEnd = spawnPoint.y - prevPoint.y;
    const distEnd = Math.sqrt(dxEnd * dxEnd + dyEnd * dyEnd);
    const normXEnd = dxEnd / distEnd;
    const normYEnd = dyEnd / distEnd;
    
    const level = gameStateRef.current.armyLevel;
    const hp = Math.floor(60 * (1 + (level - 1) * 0.7));
    const damage = Math.floor(15 * (1 + (level - 1) * 0.6));

    const newSoldiers: Soldier[] = [];
    for (let i = 0; i < 5; i++) {
      newSoldiers.push({
        id: Math.random().toString(36).substr(2, 9),
        x: spawnPoint.x + normXEnd * i * 30, // Stagger trailing off the line
        y: spawnPoint.y + normYEnd * i * 30,
        health: hp,
        maxHealth: hp,
        speed: 2.5, // Faster speed
        damage: damage,
        level: level,
        waypointIndex: lastWaypointIndex,
        targetId: null,
      });
    }
    
    soldiersRef.current = [...soldiersRef.current, ...newSoldiers];
  }, [PATH]);

  const upgradeArmy = () => {
    const upgradeCost = gameState.armyLevel * 200;
    if (gameState.gold < upgradeCost) return;

    setGameState(prev => ({
      ...prev,
      gold: prev.gold - upgradeCost,
      armyLevel: prev.armyLevel + 1
    }));
  };

  const spawnWave = useCallback(() => {
    const newWave = gameStateRef.current.wave + 1;
    setGameState(prev => ({ ...prev, wave: newWave }));
    
    // Boss Wave Interception
    if (newWave > 0 && newWave % 5 === 0) {
      setGameState(prev => ({ ...prev, isBossAlert: true, isPaused: true }));
      setTimeout(() => {
        setGameState(prev => ({ ...prev, isBossAlert: false, isPaused: false }));
        const startPt = PATH[0];
        const nextPt = PATH[1];
        const dxInit = nextPt.x - startPt.x;
        const dyInit = nextPt.y - startPt.y;
        const distInit = Math.sqrt(dxInit * dxInit + dyInit * dyInit);
        const normX = dxInit / distInit;
        const normY = dyInit / distInit;

        const diffMods = {
          easy: { hp: 0.8, spd: 0.9 },
          medium: { hp: 1.0, spd: 1.0 },
          master: { hp: 1.5, spd: 1.2 },
          insane: { hp: 2.0, spd: 1.5 },
        };
        const { hp: hpMod, spd: spdMod } = diffMods[difficulty];
        
        const waveScale = Math.pow(1.03, newWave - 1);

        const bossHealth = Math.floor(1900 * (newWave / 5) * hpMod * waveScale);
        
        const bossEnemies: Enemy[] = [];
        
        // 1. The Boss
        const bossTypes: ('tank' | 'stealth' | 'titan' | 'swarm')[] = ['tank', 'stealth', 'titan', 'swarm'];
        const bossDesign = bossTypes[(newWave / 5 - 1) % bossTypes.length];
        
        bossEnemies.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'basic', // Inherits basic movement core
          isBoss: true,
          bossType: bossDesign,
          x: startPt.x - normX * 40,
          y: startPt.y - normY * 40,
          health: bossHealth,
          maxHealth: bossHealth,
          speed: 1.2 * spdMod * waveScale,
          reward: 100,
          color: '#ff0000',
          waypointIndex: 0,
          distanceTraveled: 0,
        });

        // 2. 3 Escorts
        const stats = ENEMY_STATS['fast'];
        for(let i=1; i<=3; i++) {
           bossEnemies.push({
             id: Math.random().toString(36).substr(2, 9),
             type: 'fast',
             x: startPt.x - normX * (40 + i * 45),
             y: startPt.y - normY * (40 + i * 45),
             health: stats.health * 1.5 * (newWave/5) * waveScale,
             maxHealth: stats.health * 1.5 * (newWave/5) * waveScale,
             speed: stats.speed * 1.2 * spdMod * waveScale,
             reward: 15,
             color: '#ff0000',
             waypointIndex: 0,
             distanceTraveled: 0,
             slowTimer: 0,
           });
        }
        
        enemiesRef.current = [...enemiesRef.current, ...bossEnemies];
      }, 3000);
      return;
    }

    // Gradual difficulty for the first few waves
    let waveSize = 3;
    if (newWave === 2) waveSize = 5;
    if (newWave > 2) waveSize = 5 + (newWave - 2) * 3;

    const newEnemies: Enemy[] = [];
    
    // Calculate entry vector to spawn enemies behind the path cleanly
    const startPt = PATH[0];
    const nextPt = PATH[1];
    const dxInit = nextPt.x - startPt.x;
    const dyInit = nextPt.y - startPt.y;
    const distInit = Math.sqrt(dxInit * dxInit + dyInit * dyInit);
    const normXInit = dxInit / distInit;
    const normYInit = dyInit / distInit;

    for (let i = 0; i < waveSize; i++) {
      let type: EnemyType = 'basic';
      
      // Elite Milestones
      if (newWave === 20 && i === waveSize - 1) type = 'dreadnought';
      else if (newWave === 30 && i === waveSize - 1) type = 'goliath';
      else if (newWave === 40 && i === waveSize - 1) type = 'warprunner';
      else if (newWave === 50 && i === waveSize - 1) type = 'titan';
      else if (newWave === 60 && i === waveSize - 1) type = 'prime';
      else if (newWave === 70 && i === waveSize - 1) type = 'overlord';
      else if (newWave === 80 && i === waveSize - 1) type = 'stalker';
      else if (newWave === 90 && i === waveSize - 1) type = 'singularity';
      else if (newWave === 100 && i === waveSize - 1) type = 'nemesis';
      
      // Standard wave progression
      else if (newWave > 2) {
        const rand = Math.random();
        
        // Late game random elite spawns (after their intro wave)
        if (rand < 0.01 && newWave > 90) type = 'singularity';
        else if (rand < 0.02 && newWave > 80) type = 'stalker';
        else if (rand < 0.03 && newWave > 70) type = 'overlord';
        else if (rand < 0.04 && newWave > 60) type = 'prime';
        else if (rand < 0.05 && newWave > 50) type = 'titan';
        else if (rand < 0.06 && newWave > 40) type = 'warprunner';
        else if (rand < 0.08 && newWave > 30) type = 'goliath';
        else if (rand < 0.10 && newWave > 20) type = 'dreadnought';
        
        // Mid-game spawns
        else if (rand < 0.15 && newWave > 10) type = 'phantom';
        else if (rand < 0.20 && newWave > 8) type = 'shielded';
        else if (rand < 0.25 && newWave > 7) type = 'healer';
        else if (rand < 0.35 && newWave > 6) type = 'armored';
        else if (rand < 0.45 && newWave > 5) type = 'splitter';
        else if (rand < 0.55 && newWave > 5) type = 'tank';
        else if (rand < 0.75) type = 'fast';
        else type = 'basic';
      } else if (newWave === 2 && i === waveSize - 1) {
        type = 'fast';
      }
      
      const stats = ENEMY_STATS[type];
      
      const diffMods = {
        easy: { hp: 0.8, spd: 0.9 },
        medium: { hp: 1.0, spd: 1.0 },
        master: { hp: 1.5, spd: 1.2 },
        insane: { hp: 2.0, spd: 1.5 },
      };
      
      const { hp: hpMod, spd: spdMod } = diffMods[difficulty];
      
      const waveScale = Math.pow(1.03, newWave - 1);

      const hMultiplier = waveScale * hpMod;
      const sMultiplier = waveScale * hpMod;

      newEnemies.push({
        id: Math.random().toString(36).substr(2, 9),
        type,
        x: startPt.x - normXInit * i * 45, // Tighter stagger extending backwards off the screen
        y: startPt.y - normYInit * i * 45,
        health: stats.health * hMultiplier,
        maxHealth: stats.health * hMultiplier,
        speed: stats.speed * spdMod * waveScale,
        reward: stats.reward,
        waypointIndex: 0,
        distanceTraveled: 0,
        armor: stats.armor,
        shield: stats.shield ? stats.shield * sMultiplier : undefined,
        maxShield: stats.shield ? stats.shield * sMultiplier : undefined,
        slowTimer: 0,
      });
    }
    
    enemiesRef.current = [...enemiesRef.current, ...newEnemies];
  }, []);

  // Initial wave
  useEffect(() => {
    if (gameState.wave === 0 && !gameState.isGameOver) {
      const timer = setTimeout(() => spawnWave(), 1000);
      return () => clearTimeout(timer);
    }
  }, [spawnWave, gameState.wave, gameState.isGameOver]);

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      if (gameStateRef.current.isPaused || gameStateRef.current.isGameOver) {
        lastTime = time;
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      const rawDelta = time - lastTime;
      lastTime = time;
      // Apply game speed multiplier
      const deltaTime = gameStateRef.current.isDoubleSpeed ? rawDelta * 2 : rawDelta;

      // Auto-spawn next wave when current is cleared
      if (enemiesRef.current.length === 0 && gameStateRef.current.wave > 0) {
        if (lastWaveTimeRef.current === 0) {
          lastWaveTimeRef.current = time;
        } else if (time - lastWaveTimeRef.current > 3000) {
          spawnWave();
          lastWaveTimeRef.current = 0;
        }
      } else {
        lastWaveTimeRef.current = 0;
      }

      // 1. Update Enemies
      const finishedEnemies: string[] = [];
      const damageMap: Record<string, number> = {};
      
      enemiesRef.current.forEach(enemy => {
        // Handle Engagement (Blocking)
        if (enemy.engagedWith) {
          const soldier = soldiersRef.current.find(s => s.id === enemy.engagedWith);
          if (soldier && soldier.targetId === enemy.id) {
            // Enemy is blocked, don't move
            return;
          } else {
            enemy.engagedWith = null;
          }
        }

        // Handle Slow Effect
        let currentSpeed = enemy.speed;
        if (enemy.slowTimer && enemy.slowTimer > 0 && enemy.type !== 'phantom') {
          currentSpeed *= 0.5;
          enemy.slowTimer -= deltaTime;
        }

        // Handle Healing (Healer Type)
        if (enemy.type === 'healer') {
          const now = time;
          if (!enemy.lastHealTime || now - enemy.lastHealTime > 2000) {
            enemy.lastHealTime = now;
            // Heal nearby enemies
            enemiesRef.current.forEach(other => {
              if (other.id === enemy.id || other.health <= 0) return;
              const dx = other.x - enemy.x;
              const dy = other.y - enemy.y;
              if (dx * dx + dy * dy < 150 * 150) {
                other.health = Math.min(other.maxHealth, other.health + 20);
              }
            });
          }
        }

        // Boss Mechanic: Tower Destruction
        if (enemy.isBoss) {
          if (!enemy.targetTowerId) {
            let closestTower: string | null = null;
            let closestDist = 120 * 120; // 120px aggro range for Boss
            towersRef.current.forEach(t => {
              if (t.health <= 0) return;
              const dx = t.x - enemy.x;
              const dy = t.y - enemy.y;
              const ds = dx*dx + dy*dy;
              if (ds < closestDist) {
                closestDist = ds;
                closestTower = t.id;
              }
            });
            if (closestTower) {
              enemy.targetTowerId = closestTower;
              enemy.hitCooldown = 0; // Fire immediately on aggro for instant feedback!
            }
          }

          if (enemy.targetTowerId) {
            const tower = towersRef.current.find(t => t.id === enemy.targetTowerId);
            if (tower && tower.health > 0) {
              const dx = tower.x - enemy.x;
              const dy = tower.y - enemy.y;
              const distSq = dx*dx + dy*dy;
              
              if (distSq > 130 * 130) {
                // Out of range, broke leash
                enemy.targetTowerId = null;
              } else {
                // Attack the tower!
                enemy.hitCooldown = (enemy.hitCooldown || 0) - deltaTime;
                if (enemy.hitCooldown <= 0) {
                  tower.health -= 40; // 3 hits to destroy (towers have 100 HP)
                  enemy.hitCooldown = 1500;
                  shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 40); // Boss punch = VIOLENT shake
                }
                // Boss stops moving to smash the tower
                return;
              }
            } else {
              enemy.targetTowerId = null; // Tower is dead
            }
          }
        }

        const targetWaypoint = PATH[enemy.waypointIndex + 1];
        if (!targetWaypoint) {
          finishedEnemies.push(enemy.id);
          return;
        }

        const dx = targetWaypoint.x - enemy.x;
        const dy = targetWaypoint.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const moveDist = currentSpeed * (deltaTime / 16);
        
        if (distance <= moveDist) {
          enemy.x = targetWaypoint.x;
          enemy.y = targetWaypoint.y;
          enemy.waypointIndex++;
        } else {
          enemy.x += (dx / distance) * moveDist;
          enemy.y += (dy / distance) * moveDist;
        }
        enemy.distanceTraveled += moveDist;
      });

      // 1.5 Update Soldiers
      const deadSoldiers: string[] = [];
      let earnedGold = 0;
      
      const waveNum = gameStateRef.current.wave;
      const soldierFatigueFactor = Math.max(0.05, 1 - (waveNum - 1) * 0.05); // -5% damage per wave
      const soldierDefensePenalty = 1 + (waveNum - 1) * 0.05; // +5% damage taken per wave

      soldiersRef.current.forEach((soldier, i) => {
        let isEngaged = false;

        // Combat logic
        if (soldier.targetId) {
          const target = enemiesRef.current.find(e => e.id === soldier.targetId);
          if (target && target.health > 0) {
            const dx = target.x - soldier.x;
            const dy = target.y - soldier.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < 60 * 60) { // Combat range
              isEngaged = true; // Stay in place while fighting
              // Soldiers deal less damage and take more damage based on wave fatigue
              damageMap[target.id] = (damageMap[target.id] || 0) + (soldier.damage * soldierFatigueFactor) * (deltaTime / 1000);
              soldier.health -= (25 * soldierDefensePenalty) * (deltaTime / 1000);
              target.engagedWith = soldier.id;
              
              if (soldier.health <= 0) {
                deadSoldiers.push(soldier.id);
                target.engagedWith = null;
              }
            } else {
               soldier.targetId = null;
               target.engagedWith = null;
            }
          } else {
            soldier.targetId = null;
          }
        }

        // Find nearest enemy to engage (that isn't already engaged)
        if (!soldier.targetId) {
          const nearestEnemy = enemiesRef.current.find(e => {
            if (e.engagedWith && e.engagedWith !== soldier.id) return false;
            const dx = e.x - soldier.x;
            const dy = e.y - soldier.y;
            return dx * dx + dy * dy < 60 * 60;
          });
          if (nearestEnemy) {
            soldier.targetId = nearestEnemy.id;
            nearestEnemy.engagedWith = soldier.id;
            isEngaged = true;
          }
        }

        if (isEngaged) return; // Stay perfectly in place to fight!

        // Movement Logic!
        // We ALWAYS trace the path backwards.
        const targetWaypoint = PATH[soldier.waypointIndex - 1];
        if (!targetWaypoint) {
           // We reached the enemy spawn! Despawn and grant gold.
           deadSoldiers.push(soldier.id);
           earnedGold += 10;
           return;
        }

        let moveX = targetWaypoint.x - soldier.x;
        let moveY = targetWaypoint.y - soldier.y;

        const distance = Math.sqrt(moveX * moveX + moveY * moveY);
        const moveDist = soldier.speed * (deltaTime / 16);
        let canMove = true;

        // Prevent soldier stacking / merging along path
        if (distance > 0) {
          const dirX = moveX / distance;
          const dirY = moveY / distance;
          
          // STRICT SPATIAL HIERARCHY: Soldiers only check collisions against older soldiers (those ahead in queue)
          for (let j = 0; j < i; j++) {
            const other = soldiersRef.current[j];
            const dx = other.x - soldier.x;
            const dy = other.y - soldier.y;
            const distSq = dx * dx + dy * dy;

            // Minimum separation
            if (distSq < 32 * 32) {
              const dot = dirX * dx + dirY * dy;
              // Stop entirely if someone ahead is directly blocking our movement vector backwards along the path
              if (dot > 0 && Math.abs(dot) > Math.sqrt(distSq) * 0.4) {
                canMove = false;
                break;
              }
            }
          }
        }

        if (canMove) {
          if (distance <= moveDist && distance > 0) {
            soldier.x = targetWaypoint.x;
            soldier.y = targetWaypoint.y;
            soldier.waypointIndex--;
          } else if (distance > 0) {
            soldier.x += (moveX / distance) * moveDist;
            soldier.y += (moveY / distance) * moveDist;
          }
        }
      });

      if (deadSoldiers.length > 0) {
        soldiersRef.current = soldiersRef.current.filter(s => !deadSoldiers.includes(s.id));
      }

      if (earnedGold > 0) {
        setGameState(prev => ({ ...prev, gold: prev.gold + earnedGold }));
      }

      // Handle enemies reaching the end
      if (finishedEnemies.length > 0) {
        setGameState(prev => {
          const newLives = Math.max(0, prev.lives - finishedEnemies.length);
          return { ...prev, lives: newLives, isGameOver: newLives <= 0 };
        });
        enemiesRef.current = enemiesRef.current.filter(e => !finishedEnemies.includes(e.id));
      }

      // 2a. Signal Tower Aura — Heal & Boost nearby towers
      const boostedTowerIds = new Set<string>();
      const signalFatigue = Math.max(0.25, 1 - (gameStateRef.current.wave * 0.01));

      towersRef.current.forEach(signal => {
        if (signal.type !== 'signal') return;
        towersRef.current.forEach(target => {
          if (target.id === signal.id) return;
          const dx = target.x - signal.x;
          const dy = target.y - signal.y;
          if (dx * dx + dy * dy <= signal.range * signal.range) {
            // Heal: 2 HP/s degraded by fatigue
            target.health = Math.min(target.maxHealth, target.health + 2 * signalFatigue * (deltaTime / 1000));
            boostedTowerIds.add(target.id);
          }
        });
      });

      // 2b. Update Towers (Firing)
      const currentEnemies = enemiesRef.current;
      const newProjectiles: Projectile[] = [];

      towersRef.current.forEach(tower => {
        if (tower.type === 'signal') return; // Signal towers never fire projectiles
        if (tower.lastFired === 0) {
          tower.lastFired = time;
          return;
        }

        // Fire rate boost: +25% speed (0.75× cooldown) degraded by fatigue
        const boostMult = boostedTowerIds.has(tower.id) ? (1 - 0.25 * signalFatigue) : 1;
        if (time - tower.lastFired < tower.fireRate * boostMult) return;

        // Find target
        let target: Enemy | null = null;
        let maxDist = -1;

        for (let i = 0; i < currentEnemies.length; i++) {
          const enemy = currentEnemies[i];
          if (enemy.x < 0) continue;

          const dx = enemy.x - tower.x;
          const dy = enemy.y - tower.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq <= tower.range * tower.range) {
            if (enemy.distanceTraveled > maxDist) {
              maxDist = enemy.distanceTraveled;
              target = enemy;
            }
          }
        }

        if (target) {
          tower.lastFired = time;
          SoundEngine.playLaser();
          newProjectiles.push({
            id: Math.random().toString(36).substr(2, 9),
            x: tower.x,
            y: tower.y,
            targetId: (target as Enemy).id,
            damage: tower.damage,
            speed: 8,
            type: tower.type,
          });
        }
      });

      if (newProjectiles.length > 0) {
        projectilesRef.current = [...projectilesRef.current, ...newProjectiles].slice(-200);
      }

      // 3. Update Projectiles
      const hitProjectiles: string[] = [];
      const enemyMap = new Map<string, Enemy>(currentEnemies.map(e => [e.id, e]));

      projectilesRef.current.forEach(p => {
        const target = enemyMap.get(p.targetId);
        if (!target) {
          hitProjectiles.push(p.id);
          return;
        }

        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const distSq = dx * dx + dy * dy;
        
        const pMoveDist = p.speed * (deltaTime / 16);
        
        if (distSq <= (pMoveDist + 5) * (pMoveDist + 5)) {
          hitProjectiles.push(p.id);
          
          // Secret Fatigue mechanic: Turrets slowly lose efficiency as waves progress (1% per wave, cap at 75% reduction)
          const fatigueMultiplier = Math.max(0.25, 1 - (gameStateRef.current.wave * 0.01));
          const effectiveProjDamage = p.damage * fatigueMultiplier;
          
          damageMap[target.id] = (damageMap[target.id] || 0) + effectiveProjDamage;
        } else {
          const dist = Math.sqrt(distSq);
          p.x += (dx / dist) * pMoveDist;
          p.y += (dy / dist) * pMoveDist;
        }
      });

      // Apply Damage
      let goldEarned = 0;
      let earnedKills = 0;
      const splitEnemies: Enemy[] = [];

      enemiesRef.current = enemiesRef.current.map(e => {
        if (damageMap[e.id]) {
          // Apply Slow Effect if projectile was from slow tower
          const hitBySlow = projectilesRef.current.some(p => p.targetId === e.id && p.type === 'slow');
          if (hitBySlow) {
            e.slowTimer = 2000; // 2 seconds slow
          }

          let remainingDamage = damageMap[e.id];

          // Apply Shield
          if (e.shield && e.shield > 0) {
            const shieldDamage = Math.min(e.shield, remainingDamage);
            e.shield -= shieldDamage;
            remainingDamage -= shieldDamage;
          }

          // Apply Armor to remaining damage
          const effectiveDamage = Math.max(remainingDamage > 0 ? 1 : 0, remainingDamage - (e.armor || 0));
          const newHealth = e.health - effectiveDamage;

          // Spawn floating damage number (throttled per enemy: max 1 popup per 300ms)
          if (effectiveDamage > 0) {
            const now = Date.now();
            const lastPopupTime = popupThrottleRef.current.get(e.id) || 0;
            if (now - lastPopupTime >= 300) {
              const isCrit = effectiveDamage >= 50;
              damagePopupsRef.current.push({
                id: Math.random().toString(36).substr(2, 9),
                x: e.x + (Math.random() - 0.5) * 30,
                y: e.y - 20,
                amount: Math.round(effectiveDamage),
                life: 1.0,
                maxLife: 1.0,
                isCrit,
              });
              popupThrottleRef.current.set(e.id, now);
              if (isCrit) shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 15);
            }
          }
          
          if (newHealth <= 0) {
            goldEarned += e.reward;
            earnedKills += 1;
            SoundEngine.playExplosion();
            if (e.reward > 0) SoundEngine.playCoin();
            popupThrottleRef.current.delete(e.id); // 🧹 Clean up stale map entry
            
            // Handle Splitting
            if (e.type === 'splitter') {
              const miniStats = ENEMY_STATS.mini;
              for (let i = 0; i < 3; i++) {
                splitEnemies.push({
                  id: Math.random().toString(36).substr(2, 9),
                  type: 'mini',
                  x: e.x + (Math.random() - 0.5) * 20,
                  y: e.y + (Math.random() - 0.5) * 20,
                  health: miniStats.health,
                  maxHealth: miniStats.health,
                  speed: miniStats.speed,
                  reward: miniStats.reward,
                  waypointIndex: e.waypointIndex,
                  distanceTraveled: e.distanceTraveled,
                  slowTimer: 0,
                });
              }
            }
          }
          return { ...e, health: newHealth };
        }
        return e;
      }).filter(e => e.health > 0);

      enemiesRef.current = [...enemiesRef.current, ...splitEnemies];

      // Cleanup Destroyed Towers
      towersRef.current = towersRef.current.filter(t => t.health > 0);


      if (goldEarned > 0 || earnedKills > 0) {
        setGameState(gs => {
          let bonus = 0;
          if (earnedKills > 0) {
            const prevM = Math.floor(gs.enemiesKilled / 1000);
            const newM = Math.floor((gs.enemiesKilled + earnedKills) / 1000);
            bonus = (newM - prevM) * 50;
          }
          return {
            ...gs,
            gold: gs.gold + goldEarned + bonus,
            enemiesKilled: gs.enemiesKilled + earnedKills
          };
        });
      }

      if (hitProjectiles.length > 0) {
        projectilesRef.current = projectilesRef.current.filter(p => !hitProjectiles.includes(p.id));
      }

      // 5. Decay Screen Shake
      if (shakeIntensityRef.current > 0) {
        shakeIntensityRef.current = Math.max(0, shakeIntensityRef.current - deltaTime * 0.02);
      }

      // 6. Decay Damage Popups
      damagePopupsRef.current = damagePopupsRef.current
        .map(p => ({ ...p, life: p.life - deltaTime / 800, y: p.y - deltaTime * 0.04 }))
        .filter(p => p.life > 0)
        .slice(-60); // Hard cap to prevent memory blowout

      // 7. Render
      render();

      animationFrameId = requestAnimationFrame(update);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Apply Screen Shake FIRST, then clear, so the whole frame shifts
      ctx.save();
      if (shakeIntensityRef.current > 0.1) {
        const sx = (Math.random() - 0.5) * shakeIntensityRef.current;
        const sy = (Math.random() - 0.5) * shakeIntensityRef.current;
        ctx.translate(sx, sy);
      }

      // Clear Base (inside shake context so it fills the translated frame)
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(-20, -20, CANVAS_WIDTH + 40, CANVAS_HEIGHT + 40);

      // Draw Main Path Ground
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 40;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      PATH.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // Path Border Highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 44;
      ctx.stroke();



      // Draw Towers
      towersRef.current.forEach(t => {
        const stats = TOWER_STATS[t.type];
        const isSelected = selectedTowerId === t.id;
        
        // Range Circle
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? `${stats.color}22` : `${stats.color}08`;
        ctx.fill();
        ctx.strokeStyle = isSelected ? `${stats.color}66` : `${stats.color}22`;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Tower Body (Base)
        ctx.fillStyle = stats.color;
        ctx.fillRect(t.x - 22.5, t.y - 22.5, 45, 45);
        
        // Tower Level-based Design Changes
        if (t.level >= 2) {
          // Level 2: Add an outer frame
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(t.x - 27, t.y - 27, 54, 54);
        }

        if (t.level >= 3) {
          // Level 3: Add corner "antennas"
          ctx.fillStyle = '#fff';
          const size = 6;
          ctx.fillRect(t.x - 30, t.y - 30, size, size);
          ctx.fillRect(t.x + 24, t.y - 30, size, size);
          ctx.fillRect(t.x - 30, t.y + 24, size, size);
          ctx.fillRect(t.x + 24, t.y + 24, size, size);
        }

        if (t.level >= 4) {
          // Level 4+: Add a rotating energy ring
          ctx.save();
          ctx.translate(t.x, t.y);
          ctx.rotate(Date.now() / 500);
          ctx.strokeStyle = stats.color;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, 33, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        
        // Tower Core
        const coreSize = 6 + (t.level * 2);
        const pulse = Math.sin(Date.now() / 200) * 2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(t.x - (coreSize + pulse) / 2, t.y - (coreSize + pulse) / 2, coreSize + pulse, coreSize + pulse);

        // === SIGNAL TOWER: Animated WiFi Rings ===
        if (t.type === 'signal') {
          const now = Date.now();
          // Draw 3 concentric animated WiFi arcs
          [40, 65, 90].forEach((radius, i) => {
            const phase = ((now / 800) - i * 0.4) % 1; // staggered outward pulse
            if (phase < 0) return;
            ctx.save();
            ctx.globalAlpha = (1 - phase) * 0.7;
            ctx.strokeStyle = '#00ffaa';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            // WiFi arc: top 135° arc
            ctx.arc(t.x, t.y, radius * phase + 10, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx.stroke();
            ctx.restore();
          });
        } else {
          // Level Indicator (non-signal towers only)
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`LVL ${t.level}`, t.x, t.y + 35);
        }

        // Boost glow: green outer ring if this tower is inside a Signal aura
        const isSignalBoosted = towersRef.current.some(sig => {
          if (sig.type !== 'signal' || sig.id === t.id) return false;
          const dx = t.x - sig.x;
          const dy = t.y - sig.y;
          return dx * dx + dy * dy <= sig.range * sig.range;
        });
        if (isSignalBoosted && t.type !== 'signal') {
          const glowPulse = (Math.sin(Date.now() / 400) + 1) / 2; // 0..1
          ctx.save();
          ctx.globalAlpha = 0.3 + glowPulse * 0.3;
          ctx.strokeStyle = '#00ffaa';
          ctx.lineWidth = 3;
          ctx.strokeRect(t.x - 25, t.y - 25, 50, 50);
          ctx.restore();
        }

        // Tower Health Bar
        if (t.health < t.maxHealth) {
          const hpPercent = t.health / t.maxHealth;
          ctx.fillStyle = '#333';
          ctx.fillRect(t.x - 20, t.y - 35, 40, 3);
          ctx.fillStyle = hpPercent > 0.5 ? '#00ff44' : (hpPercent > 0.2 ? '#ffff00' : '#ff4400');
          ctx.fillRect(t.x - 20, t.y - 35, 40 * hpPercent, 3);
        }
      });

      // Draw Enemies
      enemiesRef.current.forEach(e => {
        let radius = e.type === 'mini' ? 9 : 18;
        let color = ENEMY_STATS[e.type]?.color || '#ffffff';
        
        // Boss Modifications
        if (e.isBoss) {
          radius = 35; // Massive radius
          color = e.color || '#ff0000';
          
          ctx.save();
          ctx.translate(e.x, e.y);
          
          // Outer Glow
          ctx.shadowBlur = 25;
          ctx.shadowColor = color;

          const timeSlow = Date.now() / 1500;
          const timeFast = Date.now() / 300;

          const drawPolygon = (sides: number, rad: number) => {
            ctx.beginPath();
            for(let i=0; i<sides; i++){
              const angle = i * Math.PI*2 / sides;
              if(i===0) ctx.moveTo(Math.cos(angle)*rad, Math.sin(angle)*rad);
              else ctx.lineTo(Math.cos(angle)*rad, Math.sin(angle)*rad);
            }
            ctx.closePath();
          };

          if (e.bossType === 'titan') {
            // The Monolith: Massive intricate overlapping polygons
            ctx.rotate(timeSlow);
            
            // Outer Octagon Base
            ctx.fillStyle = '#0a0005';
            drawPolygon(8, 45);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Inner Hexagon
            ctx.rotate(-timeSlow * 2.5);
            ctx.fillStyle = 'rgba(255, 0, 80, 0.1)';
            drawPolygon(6, 35);
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.stroke();

            // Core Cross
            ctx.rotate(timeSlow * 4);
            const p = 15 + Math.sin(timeFast) * 5;
            ctx.fillStyle = color;
            ctx.fillRect(-p, -p/3, p*2, p/(1.5));
            ctx.fillRect(-p/3, -p, p/(1.5), p*2);
            
          } else if (e.bossType === 'tank') {
            // The Fortress: Heavy Cross blocks that spin
            ctx.rotate(timeSlow * 0.8);

            ctx.fillStyle = '#110500';
            ctx.shadowBlur = 10;
            
            // 4 massive blocks
            for(let i=0; i<4; i++) {
              ctx.rotate(Math.PI/2);
              ctx.fillRect(10, -20, 25, 40);
              ctx.strokeStyle = color;
              ctx.lineWidth = 3;
              ctx.strokeRect(10, -20, 25, 40);
              
              // Shield nodes
              ctx.beginPath();
              ctx.arc(45, 0, 5, 0, Math.PI*2);
              ctx.fillStyle = '#ff8800';
              ctx.fill();
            }

            // Core
            ctx.fillStyle = color;
            ctx.shadowBlur = 30;
            drawPolygon(4, 18);
            ctx.fill();

          } else if (e.bossType === 'stealth') {
            // The Phantom: Dagger shuriken with ghost trails
            const ghostCount = 3;
            for(let g = ghostCount; g >= 0; g--) {
              ctx.save();
              // Ghost trailing calculation
              ctx.rotate((timeSlow * 2) - (g * 0.15));
              ctx.globalAlpha = g === 0 ? 1 : 0.15;
              ctx.shadowBlur = g === 0 ? 25 : 0;
              
              const pulse = Math.sin(timeFast) * 10;
              for(let i=0; i<4; i++) {
                ctx.rotate(Math.PI/2);
                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(40 + pulse, 5);
                ctx.lineTo(40 + pulse, -5);
                ctx.closePath();
                ctx.fillStyle = g === 0 ? color : '#fff';
                ctx.fill();
              }
              
              // Core ring
              ctx.beginPath();
              ctx.arc(0, 0, 10, 0, Math.PI*2);
              ctx.fillStyle = '#111';
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = color;
              ctx.stroke();
              
              ctx.restore();
            }

          } else {
            // The Hive (Swarm): Multiple bands of fast-orbiting matter
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#050511';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Inner fast ring
            for(let i=0; i<5; i++) {
              const angle = (i * Math.PI*2) / 5 + timeFast;
              const sx = Math.cos(angle) * 22;
              const sy = Math.sin(angle) * 22;
              ctx.beginPath();
              ctx.arc(sx, sy, 4, 0, Math.PI*2);
              ctx.fillStyle = '#fff';
              ctx.fill();
            }

            // Outer slow counter-ring
            for(let i=0; i<8; i++) {
              const angle = (i * Math.PI*2) / 8 - timeSlow * 3;
              const orbitR = 38 + Math.sin(timeFast * 0.5 + i) * 6;
              const sx = Math.cos(angle) * orbitR;
              const sy = Math.sin(angle) * orbitR;
              
              ctx.save();
              ctx.translate(sx, sy);
              ctx.rotate(timeFast * 2);
              drawPolygon(3, 8); // Triangles
              ctx.fillStyle = color;
              ctx.fill();
              ctx.restore();
            }
          }
          ctx.restore();
          
          // Epic Laser Beam for Tower Destruction
          if (e.targetTowerId) {
             const t = towersRef.current.find(t => t.id === e.targetTowerId);
             if (t) {
               // Draw the destructive Laser
               ctx.save();
               ctx.beginPath();
               ctx.moveTo(e.x, e.y);
               ctx.lineTo(t.x, t.y);
               
               // Outer Red Glow
               ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
               ctx.lineWidth = 15 + Math.random() * 5; 
               ctx.shadowBlur = 30;
               ctx.shadowColor = '#ff0000';
               ctx.stroke();
               
               // Inner White Core
               ctx.beginPath();
               ctx.moveTo(e.x, e.y);
               ctx.lineTo(t.x, t.y);
               ctx.strokeStyle = '#ffffff';
               ctx.lineWidth = 4 + Math.random() * 2;
               ctx.shadowBlur = 10;
               ctx.stroke();
               
               // Impact Particles on the Tower
               const impactPulse = Math.random() * 15;
               ctx.beginPath();
               ctx.arc(t.x, t.y, 10 + impactPulse, 0, Math.PI * 2);
               ctx.fillStyle = '#ffffff';
               ctx.fill();
               ctx.beginPath();
               ctx.arc(t.x, t.y, 20 + impactPulse, 0, Math.PI * 2);
               ctx.strokeStyle = '#ff0000';
               ctx.lineWidth = 3;
               ctx.stroke();
               
               ctx.restore();
             }
          }
        } else {
          // Normal Enemy Body
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Slow Effect Visual
        if (e.type !== 'phantom' && e.slowTimer && e.slowTimer > 0) {
          ctx.strokeStyle = '#00ff44';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, radius + 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Shield Visual
        if (e.shield && e.shield > 0 && e.maxShield) {
          ctx.strokeStyle = 'rgba(68, 136, 255, 0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, radius + 7.5, 0, Math.PI * 2);
          ctx.stroke();
          
          // Shield Bar
          const shieldPercent = e.shield / e.maxShield;
          ctx.fillStyle = '#4488ff';
          ctx.fillRect(e.x - radius * 1.25, e.y - radius - 14, (radius * 2.5) * shieldPercent, 3);
        }

        // Healer Pulse
        if (e.type === 'healer') {
          const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
          ctx.strokeStyle = `rgba(0, 255, 136, ${0.2 * pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, 150 * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Special Visuals
        if (e.type === 'armored') {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, radius + 4.5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (e.type === 'splitter') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(e.x - 4, e.y - 4, 3, 0, Math.PI * 2);
          ctx.arc(e.x + 4, e.y - 4, 3, 0, Math.PI * 2);
          ctx.arc(e.x, e.y + 4, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === 'phantom') {
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.arc(e.x, e.y, radius + 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Health Bar
        if (e.health < e.maxHealth) {
          const healthPercent = e.health / e.maxHealth;
          const barWidth = radius * 1.8;
          const barHeight = 3;
          ctx.fillStyle = '#333';
          ctx.fillRect(e.x - barWidth / 2, e.y - radius - 6, barWidth, barHeight);
          ctx.fillStyle = healthPercent > 0.5 ? '#00ff44' : (healthPercent > 0.2 ? '#ffff00' : '#ff4400');
          ctx.fillRect(e.x - barWidth / 2, e.y - radius - 6, barWidth * healthPercent, barHeight);
        }
      });

      // Draw Soldiers
      soldiersRef.current.forEach(s => {
        ctx.save();
        
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;

        if (s.level === 1) {
          // Level 1: "Primitive Droid" (Rusty, low-tech)
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 14);
          grad.addColorStop(0, '#885544');
          grad.addColorStop(1, '#332211');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
          ctx.fill();
          
          // Flickering red eye
          ctx.fillStyle = pulse > 0.5 ? '#ff0000' : '#880000';
          ctx.beginPath();
          ctx.arc(s.x + 4, s.y - 4, 3, 0, Math.PI * 2);
          ctx.fill();

        } else if (s.level === 2) {
          // Level 2: "Combat Unit" (Industrial Blue, Basic Sword)
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#0066ff';
          
          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 14);
          grad.addColorStop(0, '#66aaff');
          grad.addColorStop(1, '#003388');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
          ctx.fill();
          
          // Core Pulse
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // Basic Energy Sword
          const swingAngle = s.targetId ? Math.sin(Date.now() / 80) * 0.6 : 0;
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(swingAngle);
          
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(8, -8);
          ctx.lineTo(18, -18);
          ctx.stroke();
          
          ctx.restore();

        } else if (s.level === 3) {
          // Level 3: "Tactical Operative" (Neon blue, Shield, Sword)
          ctx.shadowBlur = 10 + (pulse * 5);
          ctx.shadowColor = '#4488ff';

          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 15);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.3, '#4488ff');
          grad.addColorStop(1, '#001a4d');
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
          ctx.fill();

          // Shield
          ctx.strokeStyle = '#00f2ff';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          const shieldAngle = (Date.now() / 1000) % (Math.PI * 2);
          ctx.arc(s.x, s.y, 18, shieldAngle, shieldAngle + Math.PI / 2);
          ctx.stroke();

          // Energy Sword
          const swingAngle = s.targetId ? Math.sin(Date.now() / 80) * 0.6 : 0;
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(swingAngle);
          
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#4488ff';
          ctx.shadowBlur = 20;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(10, -10);
          ctx.lineTo(22, -22);
          ctx.stroke();
          
          ctx.restore();
          
          // Core Pulse
          ctx.fillStyle = '#fff';
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 3 + (pulse * 2), 0, Math.PI * 2);
          ctx.fill();

        } else {
          // Level 4+: "Elite Sentinel" (Gold/White, Dual Swords, Overcharged)
          ctx.shadowBlur = 20 + (pulse * 10);
          ctx.shadowColor = '#ffaa00';

          const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 16);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.4, '#ffdd00');
          grad.addColorStop(1, '#664400');
          
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 16, 0, Math.PI * 2);
          ctx.fill();

          // Full Shield (Dashed energy ring)
          ctx.strokeStyle = '#ffee77';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 20;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          
          // Rotate dash slightly based on time
          ctx.lineDashOffset = -(Date.now() / 50) % 10;
          ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]); // reset

          // Dual Swords
          const swingAngle = s.targetId ? Math.sin(Date.now() / 80) * 0.6 : 0;
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(swingAngle);
          
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ffcc00';
          ctx.shadowBlur = 25;
          ctx.lineCap = 'round';
          
          // Sword 1 (Right)
          ctx.beginPath();
          ctx.moveTo(10, -10);
          ctx.lineTo(24, -24);
          ctx.stroke();

          // Sword 2 (Left)
          ctx.beginPath();
          ctx.moveTo(-10, -10);
          ctx.lineTo(-24, -24);
          ctx.stroke();
          
          ctx.restore();
          
          // Core Pulse
          ctx.fillStyle = '#fff';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 4 + (pulse * 3), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        
        // 5. Health Bar (Proportional to enemy style)
        if (s.health < s.maxHealth) {
          const healthPercent = s.health / s.maxHealth;
          const barWidth = 30; // radius * 2
          const barHeight = 3;
          ctx.fillStyle = '#333';
          ctx.fillRect(s.x - barWidth / 2, s.y - 22, barWidth, barHeight);
          ctx.fillStyle = '#4488ff';
          ctx.fillRect(s.x - barWidth / 2, s.y - 22, barWidth * healthPercent, barHeight);
        }
      });

      // Draw Projectiles
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      projectilesRef.current.forEach(p => {
        ctx.moveTo(p.x + 4.5, p.y);
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      });
      ctx.fill();

      // Draw Placement Ghost
      /*
      if (selectedTowerType) {
        const stats = TOWER_STATS[selectedTowerType];
        const targetX = mousePos.x;
        const targetY = mousePos.y;
        
        const isPathClear = !isNearPath(targetX, targetY);
        const isTowerClear = !isOverlappingTower(targetX, targetY);
        const underLimit = towersRef.current.length < 10;
        const canPlace = isPathClear && isTowerClear && underLimit;
        const canAfford = gameStateRef.current.gold >= stats.cost;
        
        ctx.beginPath();
        ctx.arc(targetX, targetY, stats.range, 0, Math.PI * 2);
        ctx.fillStyle = (canPlace && canAfford) ? 'rgba(0, 255, 68, 0.1)' : 'rgba(255, 68, 0, 0.1)';
        ctx.fill();
        
        ctx.fillStyle = stats.color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(targetX - 22.5, targetY - 22.5, 45, 45);
        ctx.globalAlpha = 1.0;

        if (!underLimit) {
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("MAX TOWERS REACHED", targetX, targetY - 30);
        } else if (!isPathClear) {
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("TOO CLOSE TO PATH", targetX, targetY - 30);
        }
      }
      */

      // Restore canvas transform (undo screen shake)
      ctx.restore();

      // Draw Floating Damage Numbers (drawn AFTER restore so they don't shake)
      damagePopupsRef.current.forEach(p => {
        const alpha = Math.max(0, p.life / p.maxLife);
        const scale = p.isCrit ? 1.6 : 1.0;
        const fontSize = Math.round(11 * scale);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (p.isCrit) {
          // Crit: orange glow outline + white core
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = 3;
          ctx.strokeText(`-${p.amount}`, p.x, p.y);
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#ff4444';
        }
        ctx.fillText(`-${p.amount}`, p.x, p.y);
        ctx.restore();
      });
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [spawnWave, PATH]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.isPaused || gameState.isGameOver) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Check if clicking on an existing tower for selection/upgrade
    const clickedTower = towersRef.current.find(t => {
      const dx = t.x - x;
      const dy = t.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 30;
    });

    if (clickedTower) {
      setSelectedTowerId(clickedTower.id);
      setSelectedTowerType(null); // Deselect shop item if any
      return;
    }

    // 2. Free Placement Logic
    if (selectedTowerType) {
      const isPathClear = !isNearPath(x, y);
      const isTowerClear = !isOverlappingTower(x, y);
      const underLimit = towersRef.current.length < 10;
      
      if (isPathClear && isTowerClear && underLimit) {
        const stats = TOWER_STATS[selectedTowerType];
        if (gameState.gold >= stats.cost) {
          const newTower: Tower = {
            id: Math.random().toString(36).substr(2, 9),
            type: selectedTowerType,
            x,
            y,
            range: stats.range,
            damage: stats.damage,
            fireRate: stats.fireRate,
            lastFired: 0,
            targetId: null,
            level: 1,
            cost: stats.cost,
            health: stats.maxHealth,
            maxHealth: stats.maxHealth,
          };
          towersRef.current = [...towersRef.current, newTower];
          setGameState(prev => ({ ...prev, gold: prev.gold - stats.cost }));
          transactionLogRef.current.push({ type: 'buy', towerType: selectedTowerType, amount: stats.cost, wave: gameStateRef.current.wave });
          SoundEngine.playCoin();
        } else {
          SoundEngine.playError();
        }
      } else {
        SoundEngine.playError();
      }
      
      // Whether successful or not, clicking the canvas while holding a tower 
      // attempts to place it. If it fails, we cancel the selection so it doesn't get stuck.
      setSelectedTowerType(null);
      return;
    }

    // 3. If clicking empty space, deselect
    setSelectedTowerId(null);
  };

  const upgradeTower = (towerId: string) => {
    const tower = towersRef.current.find(t => t.id === towerId);
    if (!tower) return;
    
    if (tower.level >= 5) {
      SoundEngine.playError();
      return;
    }

    const upgradeCost = Math.floor(tower.cost * 1.5);
    if (gameState.gold < upgradeCost) {
      SoundEngine.playError();
      return;
    }

    towersRef.current = towersRef.current.map(t => {
      if (t.id === towerId) {
        return {
          ...t,
          level: t.level + 1,
          damage: t.damage * 1.3,
          range: t.range * 1.1,
          cost: upgradeCost, // New base for next upgrade
        };
      }
      return t;
    });

    setGameState(prev => ({ ...prev, gold: prev.gold - upgradeCost }));
    transactionLogRef.current.push({ type: 'upgrade', towerType: tower.type, amount: upgradeCost, wave: gameStateRef.current.wave });
    SoundEngine.playCoin();
  };

  const sellTower = (towerId: string) => {
    const tower = towersRef.current.find(t => t.id === towerId);
    if (!tower) return;

    // Refund 50% of the CURRENT cost (which scales with level)
    const refund = Math.floor(tower.cost * 0.5);
    
    towersRef.current = towersRef.current.filter(t => t.id !== towerId);
    setGameState(prev => ({ ...prev, gold: prev.gold + refund }));
    setSelectedTowerId(null);
    transactionLogRef.current.push({ type: 'sell', towerType: tower.type, amount: -refund, wave: gameStateRef.current.wave });
    SoundEngine.playCoin();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleReboot = () => {
    enemiesRef.current = [];
    soldiersRef.current = [];
    towersRef.current = [];
    projectilesRef.current = [];
    damagePopupsRef.current = [];
    shakeIntensityRef.current = 0;
    lastWaveTimeRef.current = 0;
    
    // Clear selection
    setSelectedTowerType(null);
    setSelectedTowerId(null);

    // Reset State
    const freshState = getInitialState(difficulty);
    setGameState(freshState);
    gameStateRef.current = freshState;
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] flex font-sans text-white overflow-hidden">
      {/* Top Right Controls */}
      <div className="absolute top-0 right-0 p-6 z-50 pointer-events-none flex gap-2">
        <button 
          onClick={() => {
            SoundEngine.toggleMute();
            setGameState(p => ({ ...p }));
          }}
          className="p-3 bg-black/60 hover:bg-black/80 border border-white/10 rounded-lg transition-colors backdrop-blur-md pointer-events-auto shadow-xl"
        >
          {SoundEngine.isMuted ? <VolumeX className="w-5 h-5 text-gray-500" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* HUD - Economy & Health (Top Left) */}
      <div className="absolute top-0 left-0 p-6 flex flex-col gap-2 z-50 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg pointer-events-auto shadow-xl relative">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className="text-2xl font-mono font-bold tracking-tighter">{gameState.gold}</span>
          
          {/* Dynamic Floating Popups */}
          <AnimatePresence>
            {goldPopups.map((popup) => (
              <motion.div
                key={popup.id}
                initial={{ opacity: 0, y: popup.amount > 0 ? 0 : -10, scale: 0.5 }}
                animate={{ 
                  opacity: 1, 
                  y: popup.amount > 0 ? -30 : 20, 
                  scale: 1 
                }}
                exit={{ opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`absolute right-[-45px] top-[20%] font-black font-mono text-xl pointer-events-none ${
                  popup.amount > 0 
                    ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' 
                    : 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                }`}
              >
                {popup.amount > 0 ? '+' : ''}{popup.amount}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg pointer-events-auto shadow-xl">
          <Heart className="w-5 h-5 text-red-500" />
          <span className="text-2xl font-mono font-bold tracking-tighter">{gameState.lives}</span>
        </div>
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg pointer-events-auto shadow-xl">
          <Radio className={`w-5 h-5 ${towersRef.current.length >= 10 ? 'text-red-500' : 'text-blue-400'}`} />
          <span className={`text-2xl font-mono font-bold tracking-tighter ${towersRef.current.length >= 10 ? 'text-red-500' : 'text-white'}`}>
            {towersRef.current.length}/10
          </span>
        </div>
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg pointer-events-auto shadow-xl">
          <Target className="w-5 h-5 text-purple-400" />
          <span className="text-2xl font-mono font-bold tracking-tighter">{gameState.enemiesKilled}</span>
        </div>
      </div>

      {/* HUD - Wave & Controls (Bottom Left) */}
      <div className="absolute bottom-0 left-0 p-6 flex flex-col items-start gap-2 z-50 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-2 rounded-lg pointer-events-auto shadow-xl">
          <span className="text-xs uppercase tracking-widest text-gray-500 block mb-1">Current Wave</span>
          <span className="text-3xl font-black italic tracking-tighter">WAVE {gameState.wave}</span>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={() => setGameState(p => ({ ...p, isPaused: !p.isPaused }))}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors backdrop-blur-md"
          >
            {gameState.isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setGameState(p => ({ ...p, isDoubleSpeed: !p.isDoubleSpeed }))}
            className={`p-3 border rounded-lg transition-colors backdrop-blur-md font-black text-sm tracking-wide ${
              gameState.isDoubleSpeed 
                ? 'bg-yellow-400/20 border-yellow-400/60 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400'
            }`}
            title="Toggle 2x Speed"
          >
            ⚡2x
          </button>
          <button 
            onClick={() => setGameState(p => ({ ...p, isBugReportOpen: true, isPaused: true }))}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/50 rounded-lg transition-colors backdrop-blur-md"
            title="Report System Bug"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Protocols Tab (Right Side) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center z-40 pointer-events-none">
        <div className="flex items-center pointer-events-auto">
          {/* Upgrade Panel (if tower selected) */}
          <AnimatePresence>
            {selectedTowerId && (
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                className="absolute right-[100%] mr-4 bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl w-64 flex flex-col gap-4"
              >
                {(() => {
                  const tower = towersRef.current.find(t => t.id === selectedTowerId);
                  if (!tower) return null;
                  const stats = TOWER_STATS[tower.type];
                  const upgradeCost = Math.floor(tower.cost * 1.5);
                  const canAfford = gameState.gold >= upgradeCost;
                  const isMaxLevel = tower.level >= 5;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs uppercase tracking-[0.2em] font-black text-white/50">Upgrade Protocol</h3>
                        <button onClick={() => setSelectedTowerId(null)} className="text-white/30 hover:text-white">×</button>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center border border-white/10" style={{ color: stats.color }}>
                          {tower.type === 'laser' && <Zap className="w-6 h-6" />}
                          {tower.type === 'plasma' && <Crosshair className="w-6 h-6" />}
                          {tower.type === 'slow' && <Target className="w-6 h-6" />}
                          {tower.type === 'railgun' && <Radio className="w-6 h-6" />}
                          {tower.type === 'tesla' && <Activity className="w-6 h-6" />}
                          {tower.type === 'minigun' && <Flame className="w-6 h-6" />}
                          {tower.type === 'pulse' && <Sun className="w-6 h-6" />}
                          {tower.type === 'frost' && <Snowflake className="w-6 h-6" />}
                          {tower.type === 'beam' && <Wand className="w-6 h-6" />}
                          {tower.type === 'artillery' && <Bomb className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-widest">{tower.type}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Level {tower.level}</p>
                        </div>
                      </div>

                      {isMaxLevel ? (
                        <div className="text-center py-3 text-red-500 font-bold uppercase tracking-widest text-xs border border-red-500/20 bg-red-500/5">
                          Maximum Level Reached
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 p-2 rounded border border-white/5">
                              <p className="text-[8px] uppercase text-gray-500">Damage</p>
                              <p className="text-xs font-mono">{Math.floor(tower.damage)} <span className="text-green-400">→ {Math.floor(tower.damage * 1.3)}</span></p>
                            </div>
                            <div className="bg-white/5 p-2 rounded border border-white/5">
                              <p className="text-[8px] uppercase text-gray-500">Range</p>
                              <p className="text-xs font-mono">{Math.floor(tower.range)} <span className="text-green-400">→ {Math.floor(tower.range * 1.1)}</span></p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => upgradeTower(selectedTowerId)}
                            disabled={!canAfford}
                            className={`
                              w-full py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs transition-all
                              ${canAfford ? 'bg-white text-black hover:bg-green-400' : 'bg-white/5 text-white/20 cursor-not-allowed'}
                            `}
                          >
                            <Coins className="w-4 h-4" />
                            Upgrade ({upgradeCost})
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => sellTower(selectedTowerId)}
                        className="w-full py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs transition-all bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20"
                      >
                        <Trash className="w-4 h-4" />
                        Sell ({Math.floor(tower.cost * 0.5)})
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* The "Tab" hanging out */}
          <button
            onClick={() => setIsShopOpen(!isShopOpen)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-l-2xl border-y border-l backdrop-blur-xl transition-all shadow-2xl
              ${isShopOpen ? 'bg-white text-black border-white translate-x-0' : 'bg-black/80 text-white border-white/10 hover:border-white/30 translate-x-0'}
            `}
          >
            <Shield className={`w-6 h-6 ${isShopOpen ? 'fill-current' : ''}`} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-black [writing-mode:vertical-lr] rotate-180">Protocols</span>
          </button>

          {/* The Shop Content */}
          <AnimatePresence>
            {isShopOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="h-screen bg-black/80 backdrop-blur-2xl border-l border-white/10 flex flex-col p-8 pt-32 gap-6 overflow-hidden"
              >
                <div className="shrink-0">
                  <h3 className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Defense Protocols</h3>
                  <div className="h-px bg-gradient-to-r from-white/20 to-transparent" />
                </div>

                <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                  {/* Army Protocol */}
                  <div className="shrink-0 mb-4 bg-blue-500/5 border border-blue-500/10 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-blue-500/10 bg-blue-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-blue-400">Army Protocol</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">LVL {gameState.armyLevel}</span>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/40 p-2 border border-white/5 rounded">
                          <span className="block text-[8px] uppercase text-gray-500 mb-1">Squad HP</span>
                          <span className="block text-xs font-mono">{Math.floor(60 * (1 + (gameState.armyLevel - 1) * 0.7))}</span>
                        </div>
                        <div className="bg-black/40 p-2 border border-white/5 rounded">
                          <span className="block text-[8px] uppercase text-gray-500 mb-1">Squad DMG</span>
                          <span className="block text-xs font-mono">{Math.floor(15 * (1 + (gameState.armyLevel - 1) * 0.6))}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={spawnArmy}
                          disabled={gameState.gold < 75 || soldiersRef.current.length >= 10}
                          className={`
                            w-full py-2 rounded border flex items-center justify-center gap-2 transition-all
                            ${gameState.gold >= 75 && soldiersRef.current.length < 10 ? 'bg-blue-500 text-white border-blue-400 hover:bg-blue-400' : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'}
                          `}
                        >
                          <Sword className="w-3 h-3" />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-center">
                            {soldiersRef.current.length >= 10 ? 'Max Army (10/10)' : 'Deploy (75)'}
                          </span>
                        </button>

                        <button
                          onClick={upgradeArmy}
                          disabled={gameState.gold < gameState.armyLevel * 200}
                          className={`
                            w-full py-2 rounded border flex items-center justify-center gap-2 transition-all
                            ${gameState.gold >= gameState.armyLevel * 200 ? 'bg-white text-black border-white hover:bg-green-400' : 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed'}
                          `}
                        >
                          <Coins className="w-3 h-3" />
                          <span className="text-[10px] uppercase font-bold tracking-widest">Upgrade ({gameState.armyLevel * 200})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 mb-2">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">Tower Units</h4>
                  </div>

                  {(Object.keys(TOWER_STATS) as TowerType[]).sort((a, b) => TOWER_STATS[a].cost - TOWER_STATS[b].cost).map(type => {
                    const stats = TOWER_STATS[type];
                    const isSelected = selectedTowerType === type;
                    const canAfford = gameState.gold >= stats.cost;

                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedTowerType(isSelected ? null : type)}
                        disabled={!canAfford && !isSelected}
                        className={`
                          relative shrink-0 flex flex-col gap-3 p-5 border transition-all transform -skew-x-6
                          ${isSelected ? 'bg-white text-black border-white' : 'bg-black/40 border-white/5 hover:border-white/20'}
                          ${!canAfford && !isSelected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-xs uppercase font-mono tracking-widest font-bold ${isSelected ? 'text-black' : 'text-white'}`}>
                            {type}
                          </span>
                          <div className="flex items-center gap-1">
                            <Coins className={`w-3 h-3 ${isSelected ? 'text-black' : 'text-yellow-400'}`} />
                            <span className={`text-sm font-bold ${isSelected ? 'text-black' : 'text-white'}`}>{stats.cost}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 flex items-center justify-center border border-current/20"
                            style={{ color: isSelected ? '#000' : stats.color }}
                          >
                            {type === 'laser' && <Zap className="w-6 h-6" />}
                            {type === 'plasma' && <Crosshair className="w-6 h-6" />}
                            {type === 'slow' && <Target className="w-6 h-6" />}
                            {type === 'railgun' && <Radio className="w-6 h-6" />}
                            {type === 'tesla' && <Activity className="w-6 h-6" />}
                            {type === 'minigun' && <Flame className="w-6 h-6" />}
                            {type === 'pulse' && <Sun className="w-6 h-6" />}
                            {type === 'frost' && <Snowflake className="w-6 h-6" />}
                            {type === 'beam' && <Wand className="w-6 h-6" />}
                            {type === 'artillery' && <Bomb className="w-6 h-6" />}
                            {type === 'signal' && <Zap className="w-6 h-6" style={{ transform: 'rotate(45deg)' }} />}
                          </div>
                          <div className={`text-[10px] text-left leading-tight ${isSelected ? 'text-black/60' : 'text-gray-500'}`}>
                            {type === 'laser' && "Rapid fire light beam."}
                            {type === 'plasma' && "Heavy energy blast."}
                            {type === 'slow' && "Slows enemy movement."}
                            {type === 'railgun' && "High-damage long range beam."}
                            {type === 'tesla' && "Rapid electrical discharge."}
                            {type === 'minigun' && "Very high fire rate."}
                            {type === 'pulse' && "Moderate AOE damage."}
                            {type === 'frost' && "Heavy slow effect."}
                            {type === 'beam' && "Continuous energy stream."}
                            {type === 'artillery' && "Massive long-range explosion."}
                            {type === 'signal' && "📡 Heals & boosts nearby towers."}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-auto p-4 bg-white/5 border border-white/5 rounded italic text-[10px] text-gray-500 text-center">
                  Select a protocol and click on the grid to deploy.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center">
        {/* Main Game Area */}
        <div className="relative group">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            className="border border-white/10 shadow-2xl cursor-crosshair"
          />
          
          {/* Game Over Overlay */}
          <AnimatePresence>
            {gameState.isGameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50"
              >
                <h2 className="text-6xl font-black italic tracking-tighter text-red-500 mb-4 transform -skew-x-12">SYSTEM FAILURE</h2>
                <p className="text-gray-400 mb-8 uppercase tracking-widest">The perimeter has been breached.</p>
                <div className="flex gap-4">
                  <button 
                    onClick={handleReboot}
                    className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest transform -skew-x-12 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Reboot System
                  </button>
                  <button 
                    onClick={onReturnToMenu}
                    className="px-8 py-4 bg-transparent border border-white text-white font-bold uppercase tracking-widest transform -skew-x-12 hover:bg-white/10 transition-colors"
                  >
                    Main Menu
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Boss Alert Overlay */}
          <AnimatePresence>
            {gameState.isBossAlert && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-600/10 animate-[pulse_0.2s_ease-in-out_infinite] pointer-events-none" />
                <h2 className="text-[140px] font-black italic tracking-tighter text-red-600 mb-4 transform -skew-x-12 animate-[pulse_0.5s_ease-in-out_infinite] drop-shadow-[0_0_50px_rgba(255,0,0,0.8)]">
                  ¡JEFE!
                </h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Background Grid Decoration */}
      <div className="fixed inset-0 opacity-5 pointer-events-none z-0" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }} />

      {/* Bug Report Overlay */}
      <AnimatePresence>
        {gameState.isBugReportOpen && (
          <BugReportModal 
            gameState={gameState} 
            difficulty={difficulty}
            canvasRef={canvasRef}
            transactionLog={transactionLogRef.current}
            onClose={() => setGameState(p => ({ ...p, isBugReportOpen: false, isPaused: false }))} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
