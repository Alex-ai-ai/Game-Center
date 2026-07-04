import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG, WEAPONS, type WeaponId } from '@/game/constants';
import { useGame } from '@/game/store';
import { enemyRegistry } from '@/game/enemyRegistry';
import { applyDamage, damageForWeapon, explosionDamage } from '@/game/combat';
import { playerState, spawnGrenade, getGrenades, removeGrenade, clearGrenades } from '@/game/playerRef';
import WeaponModel from './WeaponModel';

const CENTER = new THREE.Vector2(0, 0);

// 数字键 → 武器槽位
const SLOT_KEYS: Record<string, WeaponId> = {
  Digit1: 'pistol',
  Digit2: 'rifle',
  Digit3: 'shotgun',
  Digit4: 'sniper',
  Digit5: 'knife',
  Digit6: 'grenade',
};

export default function PlayerController() {
  const controls = useRef<any>(null);
  const weapon = useRef<THREE.Group>(null);
  const muzzle = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const firing = useRef(false);
  const aimingHeld = useRef(false);
  const lastShot = useRef(0);
  const recoil = useRef(0);
  const reloadStart = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const velocityY = useRef(0);
  const onGround = useRef(true);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // 订阅当前武器以驱动模型切换渲染
  const weaponId = useGame((s) => s.weaponId);
  const def = WEAPONS[weaponId];

  // 临时复用向量,避免每帧分配
  const tmpForward = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);
  const tmpMove = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  // 初始相机
  useEffect(() => {
    camera.position.set(0, CONFIG.playerEye, 0);
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = CONFIG.playerFov;
    cam.updateProjectionMatrix();
    velocityY.current = 0;
    onGround.current = true;
    clearGrenades();
  }, [camera]);

  // 指针锁同步 + 外部锁请求
  useEffect(() => {
    const onPLC = () => {
      const locked = document.pointerLockElement != null;
      const s = useGame.getState();
      if (locked) {
        if (s.phase === 'paused') s.setPhase('playing');
      } else {
        if (s.phase === 'playing') s.setPhase('paused');
        firing.current = false;
        aimingHeld.current = false;
        s.setAiming(false);
      }
    };
    const onReqLock = () => {
      try { controls.current?.lock?.(); } catch { /* noop */ }
    };
    document.addEventListener('pointerlockchange', onPLC);
    window.addEventListener('dz:lock', onReqLock);
    return () => {
      document.removeEventListener('pointerlockchange', onPLC);
      window.removeEventListener('dz:lock', onReqLock);
    };
  }, []);

  const tryReload = () => {
    const s = useGame.getState();
    const def = WEAPONS[s.weaponId];
    if (def.reloadTime <= 0) return;
    if (s.reloading) return;
    const rt = s.runtimes[s.weaponId];
    if (rt.ammo >= def.magSize || rt.reserve <= 0) return;
    s.beginReload();
    reloadStart.current = performance.now();
  };

  // 近战(刀):对前方锥形范围内的敌人造成伤害
  const doMelee = () => {
    const s = useGame.getState();
    const def = WEAPONS[s.weaponId];
    if (def.kind !== 'melee') return;
    lastShot.current = performance.now();
    recoil.current = Math.min(1.6, recoil.current + 1);
    s.consumeAmmo();
    camera.getWorldDirection(tmpForward);
    tmpForward.y = 0;
    tmpForward.normalize();
    let hitAny = false;
    for (const e of enemyRegistry.all()) {
      if (!e.alive || e.dyingAt > 0) continue;
      const to = tmpMove.set(e.position.x - camera.position.x, 0, e.position.z - camera.position.z);
      const dist = to.length();
      if (dist > def.meleeRange || dist < 0.01) continue;
      to.divideScalar(dist);
      const dot = to.dot(tmpForward);
      if (dot < Math.cos(def.meleeCone)) continue;
      applyDamage(e, def.meleeDamage, false);
      hitAny = true;
    }
    if (hitAny) useGame.getState().onEnemyHit(false, false);
  };

  // 投掷手榴弹
  const throwGrenade = () => {
    const s = useGame.getState();
    const def = WEAPONS[s.weaponId];
    if (def.kind !== 'throwable') return;
    if (s.runtimes[s.weaponId].ammo <= 0) return;
    s.consumeAmmo();
    lastShot.current = performance.now();
    camera.getWorldDirection(tmpForward);
    const startPos = camera.position.clone().addScaledVector(tmpForward, 0.6);
    startPos.y -= 0.2;
    const vel = tmpForward.clone().multiplyScalar(def.throwSpeed);
    vel.y += 4.5; // 抛物线
    spawnGrenade(startPos, vel, 1.6);
  };

  // 枪械射击(支持多发弹丸/散射)
  const shootGun = () => {
    const s = useGame.getState();
    const def = WEAPONS[s.weaponId];
    if (def.kind !== 'gun') return;
    s.consumeAmmo();
    lastShot.current = performance.now();
    recoil.current = Math.min(1.6, recoil.current + (def.id === 'sniper' ? 2.2 : 1));

    // 瞄准时散射归零(精准),腰射按武器散射
    const spreadFactor = s.aiming ? 0 : 1;
    const pellets = def.pellets;
    let anyHit = false;
    for (let i = 0; i < pellets; i++) {
      // 中心射线 + 随机偏移模拟散射
      const ox = (Math.random() - 0.5) * def.spread * spreadFactor * 2;
      const oy = (Math.random() - 0.5) * def.spread * spreadFactor * 2;
      raycaster.setFromCamera(CENTER, camera);
      // 通过偏移相机方向实现散射
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const camRight = new THREE.Vector3().crossVectors(dir, up).normalize();
      const camUp = new THREE.Vector3().crossVectors(camRight, dir).normalize();
      dir.addScaledVector(camRight, ox).addScaledVector(camUp, oy).normalize();
      raycaster.set(camera.position, dir);
      const hits = raycaster.intersectObjects(enemyRegistry.getHitboxes(), false);
      if (hits.length > 0) {
        const obj = hits[0].object;
        const id = obj.userData.enemyId as number | undefined;
        const part = obj.userData.part as 'head' | 'body' | undefined;
        if (id != null && part) {
          const enemy = enemyRegistry.get(id);
          if (enemy) {
            applyDamage(enemy, damageForWeapon(def.id, part), part === 'head');
            anyHit = true;
          }
        }
      }
    }
    if (anyHit) useGame.getState().onEnemyHit(false, false);
  };

  const performAttack = () => {
    const s = useGame.getState();
    if (s.phase !== 'playing' || s.reloading) return;
    const def = WEAPONS[s.weaponId];
    // 弹药检查(刀无限)
    if (def.kind !== 'melee' && s.runtimes[s.weaponId].ammo <= 0) {
      tryReload();
      return;
    }
    if (def.kind === 'melee') doMelee();
    else if (def.kind === 'throwable') throwGrenade();
    else shootGun();
  };

  // 输入监听
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const s = useGame.getState();
      if (s.phase !== 'playing') return;
      if (document.pointerLockElement == null) return;
      if (e.button === 0) {
        firing.current = true;
        performAttack();
      } else if (e.button === 2) {
        aimingHeld.current = true;
        s.setAiming(true);
      }
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) firing.current = false;
      else if (e.button === 2) {
        aimingHeld.current = false;
        useGame.getState().setAiming(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      // 装弹
      if (e.code === 'KeyR') tryReload();
      // 武器切换
      const w = SLOT_KEYS[e.code];
      if (w) useGame.getState().switchWeapon(w);
      // 跳跃
      if (e.code === 'Space' && onGround.current) {
        velocityY.current = CONFIG.jumpSpeed;
        onGround.current = false;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onContext = (e: Event) => e.preventDefault(); // 屏蔽右键菜单
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('contextmenu', onContext);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('contextmenu', onContext);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = useGame.getState();
    const def = WEAPONS[s.weaponId];

    // 写入玩家位置快照(供雷达)
    playerState.position.copy(camera.position);
    // yaw: 从相机朝向取水平角
    camera.getWorldDirection(tmpForward);
    playerState.yaw = Math.atan2(tmpForward.x, tmpForward.z);

    // 仅在游戏中处理输入/物理
    if (s.phase === 'playing') {
      // WASD 移动
      let fx = 0;
      let fz = 0;
      if (keys.current['KeyW']) fz -= 1;
      if (keys.current['KeyS']) fz += 1;
      if (keys.current['KeyA']) fx -= 1;
      if (keys.current['KeyD']) fx += 1;
      if (fx !== 0 || fz !== 0) {
        camera.getWorldDirection(tmpForward);
        tmpForward.y = 0;
        tmpForward.normalize();
        tmpRight.crossVectors(tmpForward, up).normalize();
        tmpMove.set(0, 0, 0).addScaledVector(tmpForward, -fz).addScaledVector(tmpRight, fx);
        if (tmpMove.lengthSq() > 0) {
          tmpMove.normalize().multiplyScalar(CONFIG.moveSpeed * dt);
          const nx = camera.position.x + tmpMove.x;
          const nz = camera.position.z + tmpMove.z;
          const dist = Math.hypot(nx, nz);
          const limit = CONFIG.arenaRadius;
          if (dist <= limit) {
            camera.position.x = nx;
            camera.position.z = nz;
          } else {
            const scale = limit / dist;
            camera.position.x = nx * scale;
            camera.position.z = nz * scale;
          }
        }
      }

      // 跳跃 / 重力
      if (!onGround.current) {
        velocityY.current -= CONFIG.gravity * dt;
        camera.position.y += velocityY.current * dt;
        if (camera.position.y <= CONFIG.playerEye) {
          camera.position.y = CONFIG.playerEye;
          velocityY.current = 0;
          onGround.current = true;
        }
      }

      // 自动连发(仅自动武器 + 左键按住 + 未瞄准或允许)
      if (firing.current && !s.reloading) {
        if (def.kind === 'gun' && def.automatic) {
          if (performance.now() - lastShot.current >= def.fireCooldown * 1000) performAttack();
        }
      }

      // 装弹进度
      if (s.reloading) {
        const p = (performance.now() - reloadStart.current) / def.reloadTime;
        s.setReloadProgress(Math.min(1, p));
        if (p >= 1) s.finishReload();
      }
    }

    // 瞄准过渡(FOV 插值)
    const targetAds = s.aiming && def.adsFov != null ? 1 : 0;
    const curAds = s.adsProgress + (targetAds - s.adsProgress) * Math.min(1, dt * CONFIG.adsLerp);
    s.setAdsProgress(curAds);
    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = def.adsFov != null
      ? THREE.MathUtils.lerp(CONFIG.playerFov, def.adsFov, curAds)
      : CONFIG.playerFov;
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov = targetFov;
      cam.updateProjectionMatrix();
    }

    // 手榴弹物理 + 引信爆炸
    const grenades = getGrenades();
    for (let i = grenades.length - 1; i >= 0; i--) {
      const g = grenades[i];
      g.velocity.y -= CONFIG.gravity * dt;
      g.position.addScaledVector(g.velocity, dt);
      if (g.position.y <= 0.1) {
        g.position.y = 0.1;
        g.velocity.y *= -0.4;
        g.velocity.x *= 0.6;
        g.velocity.z *= 0.6;
      }
      const age = (performance.now() - g.bornAt) / 1000;
      if (age >= g.fuse && !g.exploded) {
        g.exploded = true;
        const gd = WEAPONS.grenade;
        explosionDamage(g.position, gd.explosionRadius, gd.explosionDamage);
        removeGrenade(g.id);
      }
    }

    // 后坐力衰减
    recoil.current = Math.max(0, recoil.current - dt * 6);

    // 武器跟随相机 + 后坐力偏移
    const g = weapon.current;
    if (g) {
      g.visible = true;
      g.position.copy(camera.position);
      g.quaternion.copy(camera.quaternion);
      // 不同武器的腰射/瞄准位置偏移
      // 腰射:枪在右下;瞄准:枪收回中心(枪口对准屏幕中央)
      const isGun = def.kind === 'gun';
      // 各枪瞄准时的微调(让照门/瞄准镜对准屏幕中心)
      const adsOffsetMap: Record<string, { x: number; y: number; z: number }> = {
        pistol:  { x: 0.0,  y: -0.14, z: -0.52 },
        rifle:   { x: 0.0,  y: -0.13, z: -0.55 },
        shotgun: { x: 0.0,  y: -0.12, z: -0.6 },
        sniper:  { x: 0.0,  y: -0.45, z: -0.75 },  // 狙击开镜:枪下移+后移,不挡瞄准镜视野
        knife:   { x: 0.25, y: -0.25, z: -0.55 },
        grenade: { x: 0.25, y: -0.22, z: -0.5 },
      };
      const hipMap: Record<string, { x: number; y: number; z: number }> = {
        pistol:  { x: 0.22, y: -0.26, z: -0.5 },
        rifle:   { x: 0.26, y: -0.28, z: -0.55 },
        shotgun: { x: 0.26, y: -0.27, z: -0.6 },
        sniper:  { x: 0.28, y: -0.28, z: -0.6 },
        knife:   { x: 0.3,  y: -0.28, z: -0.55 },
        grenade: { x: 0.28, y: -0.24, z: -0.5 },
      };
      const ao = adsOffsetMap[def.id] ?? adsOffsetMap.pistol;
      const ho = hipMap[def.id] ?? hipMap.pistol;
      const aimX = THREE.MathUtils.lerp(ho.x, ao.x, curAds);
      const aimY = THREE.MathUtils.lerp(ho.y, ao.y, curAds);
      const aimZ = THREE.MathUtils.lerp(ho.z, ao.z, curAds);
      g.translateX(aimX + recoil.current * 0.012 * 0.2);
      g.translateY(aimY + recoil.current * 0.012);
      g.translateZ(aimZ + recoil.current * 0.06);
      g.rotateX(recoil.current * 0.22);
      g.rotateZ(-0.04);
      // 瞄准时轻微放大(贴脸感)——狙击枪不需要,保持视野干净
      if (isGun && def.id !== 'sniper') {
        const sc = 1 + curAds * 0.15;
        g.scale.set(sc, sc, sc);
      } else {
        g.scale.set(1, 1, 1);
      }
    }
    if (muzzle.current) {
      const mat = muzzle.current.material as THREE.MeshBasicMaterial;
      mat.opacity = recoil.current > 0.25 ? Math.min(1, recoil.current) : 0;
      const sc = 0.8 + recoil.current * 0.6;
      muzzle.current.scale.set(sc, sc, sc);
    }
  });

  return (
    <>
      <PointerLockControls ref={controls} selector={undefined} />
      <group ref={weapon}>
        <WeaponModel weaponId={weaponId} muzzleRef={muzzle} />
      </group>
    </>
  );
}
