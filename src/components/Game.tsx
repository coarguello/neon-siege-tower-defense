import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Heart, Coins, Play, Pause, RotateCcw, Zap, Target, Crosshair, Sword, Users } from 'lucide-react';
import { Point, Enemy, Tower, Projectile, GameState, TowerType, EnemyType, TowerSlot, Soldier } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PATH, TOWER_STATS, ENEMY_STATS, TOWER_SLOTS, SLOT_COST } from '../constants';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    gold: 150,
    lives: 20,
    wave: 0,
    isPaused: false,
    isGameOver: false,
  });

  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isShopOpen, setIsShopOpen] = useState(false);

  // Game entities managed in refs to avoid React re-render overhead
  const enemiesRef = useRef<Enemy[]>([]);
  const soldiersRef = useRef<Soldier[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const gameStateRef = useRef<GameState>(gameState);
  const lastWaveTimeRef = useRef<number>(0);
  const slotsRef = useRef<TowerSlot[]>(TOWER_SLOTS.slice(0, 18).map((p, i) => ({
    id: `slot-${i}`,
    x: p.x,
    y: p.y,
    isPurchased: false,
    hasTower: false,
    // Make 3 specific slots visible at start: index 0 (start), 6 (middle), 14 (end)
    isVisible: i === 0 || i === 6 || i === 14,
  })));

  // Sync gameStateRef with state for the game loop (only for UI-driven changes)
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const spawnArmy = useCallback(() => {
    if (gameStateRef.current.gold < 100) return;
    
    setGameState(prev => ({ ...prev, gold: prev.gold - 100 }));
    
    const lastWaypointIndex = PATH.length - 1;
    const spawnPoint = PATH[lastWaypointIndex];
    
    const newSoldiers: Soldier[] = [];
    for (let i = 0; i < 5; i++) {
      newSoldiers.push({
        id: Math.random().toString(36).substr(2, 9),
        x: spawnPoint.x + i * 30, // Staggered entry from the end
        y: spawnPoint.y,
        health: 150,
        maxHealth: 150,
        speed: 2.5, // Faster speed
        damage: 25,
        waypointIndex: lastWaypointIndex,
        targetId: null,
      });
    }
    
    soldiersRef.current = [...soldiersRef.current, ...newSoldiers];
  }, []);

  const spawnWave = useCallback(() => {
    const newWave = gameStateRef.current.wave + 1;
    setGameState(prev => ({ ...prev, wave: newWave }));
    
    // Gradual difficulty for the first few waves
    let waveSize = 3;
    if (newWave === 2) waveSize = 5;
    if (newWave > 2) waveSize = 5 + (newWave - 2) * 3;

    const newEnemies: Enemy[] = [];
    
    for (let i = 0; i < waveSize; i++) {
      let type: EnemyType = 'basic';
      if (newWave === 2 && i === waveSize - 1) {
        type = 'fast';
      } else if (newWave === 3 && i === waveSize - 1) {
        type = 'tank';
      } else if (newWave > 3) {
        const rand = Math.random();
        if (rand < 0.05 && newWave > 10) type = 'phantom';
        else if (rand < 0.1 && newWave > 8) type = 'shielded';
        else if (rand < 0.15 && newWave > 7) type = 'healer';
        else if (rand < 0.2 && newWave > 6) type = 'armored';
        else if (rand < 0.3 && newWave > 5) type = 'splitter';
        else if (rand < 0.5 && newWave > 3) type = 'tank';
        else if (rand < 0.75) type = 'fast';
        else type = 'basic';
      }
      
      const stats = ENEMY_STATS[type];
      
      newEnemies.push({
        id: Math.random().toString(36).substr(2, 9),
        type,
        x: PATH[0].x - i * 40, // Staggered entry
        y: PATH[0].y,
        health: stats.health * (1 + newWave * 0.1),
        maxHealth: stats.health * (1 + newWave * 0.1),
        speed: stats.speed,
        reward: stats.reward,
        waypointIndex: 0,
        distanceTraveled: 0,
        armor: stats.armor,
        shield: stats.shield ? stats.shield * (1 + newWave * 0.05) : undefined,
        maxShield: stats.shield ? stats.shield * (1 + newWave * 0.05) : undefined,
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

      const deltaTime = time - lastTime;
      lastTime = time;

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
              if (dx * dx + dy * dy < 100 * 100) {
                other.health = Math.min(other.maxHealth, other.health + 20);
              }
            });
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
      soldiersRef.current.forEach(soldier => {
        let targetX: number | null = null;
        let targetY: number | null = null;
        let isChasing = false;

        // Combat logic - Find target position
        if (soldier.targetId) {
          const target = enemiesRef.current.find(e => e.id === soldier.targetId);
          if (target) {
            const dx = target.x - soldier.x;
            const dy = target.y - soldier.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < 40 * 40) { // Combat range
              // Duel!
              damageMap[target.id] = (damageMap[target.id] || 0) + soldier.damage * (deltaTime / 1000);
              soldier.health -= 25 * (deltaTime / 1000);
              target.engagedWith = soldier.id;
              
              if (soldier.health <= 0) {
                deadSoldiers.push(soldier.id);
                target.engagedWith = null;
              }
              return; // Stay in place while fighting
            } else {
              // Target for chasing
              targetX = target.x;
              targetY = target.y;
              isChasing = true;
            }
          } else {
            soldier.targetId = null;
          }
        }

        // Find nearest enemy to engage (that isn't already engaged)
        if (!soldier.targetId) {
          const nearestEnemy = enemiesRef.current.find(e => {
            if (e.engagedWith) return false;
            const dx = e.x - soldier.x;
            const dy = e.y - soldier.y;
            return dx * dx + dy * dy < 150 * 150;
          });
          if (nearestEnemy) {
            soldier.targetId = nearestEnemy.id;
            // Don't move yet, will move next frame or below
          }
        }

        // If not chasing, move backwards through path
        if (!isChasing) {
          const targetWaypoint = PATH[soldier.waypointIndex - 1];
          if (!targetWaypoint) {
            deadSoldiers.push(soldier.id);
            return;
          }
          targetX = targetWaypoint.x;
          targetY = targetWaypoint.y;
        }

        if (targetX !== null && targetY !== null) {
          const currentWaypoint = PATH[soldier.waypointIndex];
          const targetWaypoint = PATH[soldier.waypointIndex - 1];
          
          if (!targetWaypoint) return;

          // Strict axis-aligned movement logic
          const isVerticalSegment = currentWaypoint.x === targetWaypoint.x;
          let moveX = 0;
          let moveY = 0;

          if (isVerticalSegment) {
            // Segment is vertical (fixed X). Fix X first if off-track.
            if (Math.abs(soldier.x - currentWaypoint.x) > 0.1) {
              moveX = currentWaypoint.x - soldier.x;
              moveY = 0;
            } else {
              // On track, move vertically towards target (enemy or waypoint)
              moveX = 0;
              moveY = targetY - soldier.y;
            }
          } else {
            // Segment is horizontal (fixed Y). Fix Y first if off-track.
            if (Math.abs(soldier.y - currentWaypoint.y) > 0.1) {
              moveX = 0;
              moveY = currentWaypoint.y - soldier.y;
            } else {
              // On track, move horizontally towards target
              moveX = targetX - soldier.x;
              moveY = 0;
            }
          }

          const distance = Math.sqrt(moveX * moveX + moveY * moveY);
          const moveDist = soldier.speed * (deltaTime / 16);

          if (distance <= moveDist && distance > 0) {
            soldier.x += moveX;
            soldier.y += moveY;
            
            // If we reached a waypoint while patrolling, decrement index
            if (!isChasing && Math.abs(soldier.x - targetWaypoint.x) < 1 && Math.abs(soldier.y - targetWaypoint.y) < 1) {
              soldier.waypointIndex--;
            }
          } else if (distance > 0) {
            soldier.x += (moveX / distance) * moveDist;
            soldier.y += (moveY / distance) * moveDist;
          }
        }
      });

      if (deadSoldiers.length > 0) {
        soldiersRef.current = soldiersRef.current.filter(s => !deadSoldiers.includes(s.id));
      }

      // Handle enemies reaching the end
      if (finishedEnemies.length > 0) {
        setGameState(prev => {
          const newLives = Math.max(0, prev.lives - finishedEnemies.length);
          return { ...prev, lives: newLives, isGameOver: newLives <= 0 };
        });
        enemiesRef.current = enemiesRef.current.filter(e => !finishedEnemies.includes(e.id));
      }

      // 2. Update Towers (Firing)
      const currentEnemies = enemiesRef.current;
      const newProjectiles: Projectile[] = [];

      towersRef.current.forEach(tower => {
        if (tower.lastFired === 0) {
          tower.lastFired = time;
          return;
        }

        if (time - tower.lastFired < tower.fireRate) return;

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
          damageMap[target.id] = (damageMap[target.id] || 0) + p.damage;
        } else {
          const dist = Math.sqrt(distSq);
          p.x += (dx / dist) * pMoveDist;
          p.y += (dy / dist) * pMoveDist;
        }
      });

      // Apply Damage
      let goldEarned = 0;
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
          
          if (newHealth <= 0) {
            goldEarned += e.reward;
            
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

      if (splitEnemies.length > 0) {
        enemiesRef.current = [...enemiesRef.current, ...splitEnemies];
      }

      if (goldEarned > 0) {
        setGameState(gs => ({ ...gs, gold: gs.gold + goldEarned }));
      }

      if (hitProjectiles.length > 0) {
        projectilesRef.current = projectilesRef.current.filter(p => !hitProjectiles.includes(p.id));
      }

      // 4. Render
      render();

      animationFrameId = requestAnimationFrame(update);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Grid (Subtle)
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < CANVAS_WIDTH; x += 40) {
        ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT);
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
        ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y);
      }
      ctx.stroke();

      // Draw Path
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 40;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(PATH[0].x, PATH[0].y);
      PATH.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // Path Highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 44;
      ctx.stroke();

      // Draw Slots
      slotsRef.current.forEach(s => {
        if (!s.isVisible) return;

        const size = 36;
        const half = size / 2;
        
        if (!s.isPurchased) {
          // Locked Slot (Square)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(s.x - half, s.y - half, size, size);
          ctx.setLineDash([]);
          
          // Draw cost
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`$${SLOT_COST}`, s.x, s.y + 4);
          
          // Corner accents
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(s.x - half - 2, s.y - half - 2, 4, 4);
          ctx.fillRect(s.x + half - 2, s.y - half - 2, 4, 4);
          ctx.fillRect(s.x - half - 2, s.y + half - 2, 4, 4);
          ctx.fillRect(s.x + half - 2, s.y + half - 2, 4, 4);
        } else if (!s.hasTower) {
          // Purchased Empty Slot
          ctx.strokeStyle = 'rgba(0, 255, 68, 0.2)';
          ctx.lineWidth = 2;
          ctx.strokeRect(s.x - half, s.y - half, size, size);
          
          // Subtle glow/fill
          ctx.fillStyle = 'rgba(0, 255, 68, 0.03)';
          ctx.fillRect(s.x - half, s.y - half, size, size);

          // Inner square
          ctx.strokeStyle = 'rgba(0, 255, 68, 0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(s.x - 10, s.y - 10, 20, 20);
        }
      });

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
        ctx.fillRect(t.x - 15, t.y - 15, 30, 30);
        
        // Tower Level-based Design Changes
        if (t.level >= 2) {
          // Level 2: Add an outer frame
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(t.x - 18, t.y - 18, 36, 36);
        }

        if (t.level >= 3) {
          // Level 3: Add corner "antennas"
          ctx.fillStyle = '#fff';
          const size = 4;
          ctx.fillRect(t.x - 20, t.y - 20, size, size);
          ctx.fillRect(t.x + 16, t.y - 20, size, size);
          ctx.fillRect(t.x - 20, t.y + 16, size, size);
          ctx.fillRect(t.x + 16, t.y + 16, size, size);
        }

        if (t.level >= 4) {
          // Level 4+: Add a rotating energy ring
          ctx.save();
          ctx.translate(t.x, t.y);
          ctx.rotate(Date.now() / 500);
          ctx.strokeStyle = stats.color;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        
        // Tower Core
        const coreSize = 6 + (t.level * 2);
        const pulse = Math.sin(Date.now() / 200) * 2;
        ctx.fillStyle = '#fff';
        ctx.fillRect(t.x - (coreSize + pulse) / 2, t.y - (coreSize + pulse) / 2, coreSize + pulse, coreSize + pulse);

        // Level Indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`LVL ${t.level}`, t.x, t.y + 35);
      });

      // Draw Enemies
      enemiesRef.current.forEach(e => {
        const stats = ENEMY_STATS[e.type];
        const radius = e.type === 'mini' ? 6 : 12;
        
        // Enemy Body
        ctx.fillStyle = stats.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
        ctx.fill();

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
          ctx.arc(e.x, e.y, radius + 5, 0, Math.PI * 2);
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
          ctx.arc(e.x, e.y, 100 * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Special Visuals
        if (e.type === 'armored') {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(e.x, e.y, radius + 3, 0, Math.PI * 2);
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
          ctx.arc(e.x, e.y, radius + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Health Bar
        const healthPercent = e.health / e.maxHealth;
        const barWidth = radius * 2.5;
        ctx.fillStyle = '#333';
        ctx.fillRect(e.x - barWidth / 2, e.y - radius - 8, barWidth, 4);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff44' : (healthPercent > 0.2 ? '#ffff00' : '#ff4400');
        ctx.fillRect(e.x - barWidth / 2, e.y - radius - 8, barWidth * healthPercent, 4);
      });

      // Draw Soldiers
      soldiersRef.current.forEach(s => {
        // Body
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Sword
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x + 8, s.y - 8);
        ctx.lineTo(s.x + 15, s.y - 15);
        ctx.stroke();
        
        // Health Bar
        const healthPercent = s.health / s.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(s.x - 10, s.y - 15, 20, 3);
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(s.x - 10, s.y - 15, 20 * healthPercent, 3);
      });

      // Draw Projectiles
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      projectilesRef.current.forEach(p => {
        ctx.moveTo(p.x + 3, p.y);
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      });
      ctx.fill();

      // Draw Placement Ghost
      if (selectedTowerType) {
        const stats = TOWER_STATS[selectedTowerType];
        
        // Find nearest visible slot
        const nearestSlot = slotsRef.current.find(s => {
          if (!s.isVisible) return false;
          const dx = s.x - mousePos.x;
          const dy = s.y - mousePos.y;
          return Math.sqrt(dx * dx + dy * dy) < 40;
        });

        const targetX = nearestSlot ? nearestSlot.x : mousePos.x;
        const targetY = nearestSlot ? nearestSlot.y : mousePos.y;
        const canPlace = nearestSlot && nearestSlot.isPurchased && !nearestSlot.hasTower;
        const canAfford = gameStateRef.current.gold >= stats.cost;
        
        ctx.beginPath();
        ctx.arc(targetX, targetY, stats.range, 0, Math.PI * 2);
        ctx.fillStyle = (canPlace && canAfford) ? 'rgba(0, 255, 68, 0.1)' : 'rgba(255, 68, 0, 0.1)';
        ctx.fill();
        
        ctx.fillStyle = stats.color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(targetX - 15, targetY - 15, 30, 30);
        ctx.globalAlpha = 1.0;

        if (nearestSlot && !nearestSlot.isPurchased) {
          ctx.fillStyle = '#fff';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("LOCKED SLOT", targetX, targetY - 25);
        }
      }
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [spawnWave]);

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
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (clickedTower) {
      setSelectedTowerId(clickedTower.id);
      setSelectedTowerType(null); // Deselect shop item if any
      return;
    }

    // 2. Check if clicking on a visible slot
    const clickedSlot = slotsRef.current.find(s => {
      if (!s.isVisible) return false;
      const dx = s.x - x;
      const dy = s.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 25;
    });

    if (clickedSlot) {
      if (!clickedSlot.isPurchased) {
        // Try to purchase slot
        if (gameState.gold >= SLOT_COST) {
          clickedSlot.isPurchased = true;
          setGameState(prev => ({ ...prev, gold: prev.gold - SLOT_COST }));
          
          // UNLOCK NEXT SLOT
          const nextSlot = slotsRef.current.find(s => !s.isVisible);
          if (nextSlot) {
            nextSlot.isVisible = true;
          }
        }
        return;
      }

      if (clickedSlot.isPurchased && !clickedSlot.hasTower && selectedTowerType) {
        // Try to place tower
        const stats = TOWER_STATS[selectedTowerType];
        if (gameState.gold >= stats.cost) {
          const newTower: Tower = {
            id: Math.random().toString(36).substr(2, 9),
            type: selectedTowerType,
            x: clickedSlot.x,
            y: clickedSlot.y,
            range: stats.range,
            damage: stats.damage,
            fireRate: stats.fireRate,
            lastFired: 0,
            targetId: null,
            level: 1,
            cost: stats.cost,
          };
          towersRef.current = [...towersRef.current, newTower];
          clickedSlot.hasTower = true;
          setGameState(prev => ({ ...prev, gold: prev.gold - stats.cost }));
          setSelectedTowerType(null);
        }
        return;
      }
    }

    // 3. If clicking empty space, deselect
    setSelectedTowerId(null);
  };

  const upgradeTower = (towerId: string) => {
    const tower = towersRef.current.find(t => t.id === towerId);
    if (!tower) return;

    const upgradeCost = Math.floor(tower.cost * 1.5);
    if (gameState.gold < upgradeCost) return;

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
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] flex font-sans text-white overflow-hidden">
      {/* HUD - Economy & Health (Top Left) */}
      <div className="absolute top-0 left-0 p-6 flex flex-col gap-2 z-50 pointer-events-none">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg pointer-events-auto shadow-xl">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className="text-2xl font-mono font-bold tracking-tighter">{gameState.gold}</span>
        </div>
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg pointer-events-auto shadow-xl">
          <Heart className="w-5 h-5 text-red-500" />
          <span className="text-2xl font-mono font-bold tracking-tighter">{gameState.lives}</span>
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
            onClick={() => window.location.reload()}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors backdrop-blur-md"
          >
            <RotateCcw className="w-5 h-5" />
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
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-widest">{tower.type}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Level {tower.level}</p>
                        </div>
                      </div>

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
                  <div className="shrink-0 mb-2">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">Special Operations</h4>
                    <button
                      onClick={spawnArmy}
                      disabled={gameState.gold < 100}
                      className={`
                        w-full p-4 rounded-xl border flex items-center gap-4 transition-all group
                        ${gameState.gold >= 100 
                          ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50' 
                          : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'}
                      `}
                    >
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-bold uppercase tracking-widest text-blue-400">Deploy Army</p>
                        <p className="text-[10px] text-gray-500 uppercase">5 Soldiers • 100 Gold</p>
                      </div>
                      <Sword className="w-4 h-4 text-blue-500/50" />
                    </button>
                  </div>

                  <div className="shrink-0 mb-2">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-3">Tower Units</h4>
                  </div>

                  {(['laser', 'plasma', 'slow'] as TowerType[]).map(type => {
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
                          </div>
                          <div className={`text-[10px] text-left leading-tight ${isSelected ? 'text-black/60' : 'text-gray-500'}`}>
                            {type === 'laser' && "Rapid fire light beam."}
                            {type === 'plasma' && "Heavy energy blast."}
                            {type === 'slow' && "Slows enemy movement."}
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
                <button 
                  onClick={() => window.location.reload()}
                  className="px-12 py-4 bg-white text-black font-bold uppercase tracking-widest transform -skew-x-12 hover:bg-red-500 transition-colors"
                >
                  Reboot System
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Background Grid Decoration */}
      <div className="fixed inset-0 opacity-5 pointer-events-none z-0" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
    </div>
  );
}
