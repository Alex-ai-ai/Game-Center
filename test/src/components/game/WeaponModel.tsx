import { forwardRef } from 'react';
import * as THREE from 'three';
import type { WeaponId } from '@/game/constants';

// 第一人称武器模型 —— 每种武器有独立的外观
// 坐标系:原点在枪身中心,枪口朝 -Z(前方),Y 向上,X 向右
// 通过外部 group 的 translateX/Y/Z 放置到屏幕右下角
const MAT_METAL = { color: '#1a1b1f', metalness: 0.7, roughness: 0.35 };
const MAT_METAL_DARK = { color: '#0c0c0e', metalness: 0.7, roughness: 0.3 };
const MAT_GRIP = { color: '#1d1410', metalness: 0.2, roughness: 0.75 };
const MAT_WOOD = { color: '#5a3a1f', metalness: 0.1, roughness: 0.8 };
const MAT_MAG = { color: '#2a2b30', metalness: 0.5, roughness: 0.5 };
const MAT_BLADE = { color: '#c8c8d0', metalness: 0.95, roughness: 0.15 };

interface Props {
  weaponId: WeaponId;
  // recoil 0..1.6+,用于枪口火焰
  muzzleRef: React.Ref<THREE.Mesh>;
}

// 手枪:紧凑 slide + 握把,无枪托
function PistolModel() {
  return (
    <group>
      {/* slide 主体 */}
      <mesh position={[0, 0, -0.08]} castShadow>
        <boxGeometry args={[0.06, 0.09, 0.22]} />
        <meshStandardMaterial {...MAT_METAL} />
      </mesh>
      {/* 枪管(短) */}
      <mesh position={[0, 0.01, -0.22]} castShadow>
        <boxGeometry args={[0.04, 0.04, 0.1]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 握把(倾斜) */}
      <mesh position={[0, -0.14, 0.04]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.17, 0.08]} />
        <meshStandardMaterial {...MAT_GRIP} />
      </mesh>
      {/* 扳机护圈 */}
      <mesh position={[0, -0.06, -0.02]}>
        <torusGeometry args={[0.025, 0.008, 6, 12, Math.PI]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 准星(顶部前) */}
      <mesh position={[0, 0.055, -0.16]}>
        <boxGeometry args={[0.008, 0.02, 0.008]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 照门(顶部后) */}
      <mesh position={[0, 0.055, 0.02]}>
        <boxGeometry args={[0.03, 0.015, 0.008]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
    </group>
  );
}

// 步枪:AR 风格,长枪身 + 弯弹匣 + 枪托
function RifleModel() {
  return (
    <group>
      {/* 上机匣 */}
      <mesh position={[0, 0.02, -0.05]} castShadow>
        <boxGeometry args={[0.07, 0.08, 0.4]} />
        <meshStandardMaterial {...MAT_METAL} />
      </mesh>
      {/* 下机匣 */}
      <mesh position={[0, -0.05, -0.02]} castShadow>
        <boxGeometry args={[0.06, 0.05, 0.3]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 枪管 */}
      <mesh position={[0, 0.02, -0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.32, 12]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 消焰器 */}
      <mesh position={[0, 0.02, -0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.025, 0.06, 8]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 弯弹匣 */}
      <mesh position={[0, -0.16, -0.04]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.045, 0.2, 0.09]} />
        <meshStandardMaterial {...MAT_MAG} />
      </mesh>
      {/* 握把 */}
      <mesh position={[0, -0.13, 0.1]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.14, 0.07]} />
        <meshStandardMaterial {...MAT_GRIP} />
      </mesh>
      {/* 枪托 */}
      <mesh position={[0, -0.02, 0.25]} castShadow>
        <boxGeometry args={[0.05, 0.07, 0.2]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 提把 / 顶部导轨 */}
      <mesh position={[0, 0.08, -0.05]}>
        <boxGeometry args={[0.04, 0.025, 0.3]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 前准星 */}
      <mesh position={[0, 0.1, -0.28]}>
        <boxGeometry args={[0.01, 0.03, 0.01]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
    </group>
  );
}

// 霰弹枪:粗枪管 + 泵动护木 + 木质枪托
function ShotgunModel() {
  return (
    <group>
      {/* 机匣主体 */}
      <mesh position={[0, 0.02, -0.05]} castShadow>
        <boxGeometry args={[0.08, 0.09, 0.4]} />
        <meshStandardMaterial {...MAT_METAL} />
      </mesh>
      {/* 粗枪管 */}
      <mesh position={[0, 0.04, -0.38]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.4, 12]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 弹仓管(枪管下方) */}
      <mesh position={[0, -0.03, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.38, 10]} />
        <meshStandardMaterial {...MAT_METAL} />
      </mesh>
      {/* 泵动护木 */}
      <mesh position={[0, -0.03, -0.32]} castShadow>
        <boxGeometry args={[0.07, 0.06, 0.16]} />
        <meshStandardMaterial {...MAT_WOOD} />
      </mesh>
      {/* 木质枪托 */}
      <mesh position={[0, -0.04, 0.24]} castShadow>
        <boxGeometry args={[0.06, 0.1, 0.24]} />
        <meshStandardMaterial {...MAT_WOOD} />
      </mesh>
      {/* 木质握把 */}
      <mesh position={[0, -0.13, 0.1]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.055, 0.14, 0.07]} />
        <meshStandardMaterial {...MAT_WOOD} />
      </mesh>
      {/* 顶部瞄准肋 */}
      <mesh position={[0, 0.075, -0.2]}>
        <boxGeometry args={[0.015, 0.015, 0.3]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 准星珠 */}
      <mesh position={[0, 0.085, -0.5]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#ff7a18" emissive="#ff7a18" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// 狙击枪:超长枪管 + 大瞄准镜 + 两脚架
function SniperModel() {
  return (
    <group>
      {/* 机匣主体 */}
      <mesh position={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[0.07, 0.09, 0.45]} />
        <meshStandardMaterial {...MAT_METAL} />
      </mesh>
      {/* 超长枪管 */}
      <mesh position={[0, 0.01, -0.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 12]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 枪口制退器 */}
      <mesh position={[0, 0.01, -0.86]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 8]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 大瞄准镜(主体) */}
      <mesh position={[0, 0.1, -0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.32, 16]} />
        <meshStandardMaterial color="#0a0a0c" metalness={0.6} roughness={0.25} />
      </mesh>
      {/* 瞄准镜前物镜(较大) */}
      <mesh position={[0, 0.1, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.05, 0.04, 16]} />
        <meshStandardMaterial color="#1a2a1a" metalness={0.3} roughness={0.1} emissive="#0a1a0a" emissiveIntensity={0.3} />
      </mesh>
      {/* 瞄准镜后目镜 */}
      <mesh position={[0, 0.1, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 0.03, 16]} />
        <meshStandardMaterial color="#0a0a0c" metalness={0.4} roughness={0.2} />
      </mesh>
      {/* 镜架(连接环) */}
      <mesh position={[0, 0.06, -0.15]}>
        <boxGeometry args={[0.04, 0.04, 0.03]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      <mesh position={[0, 0.06, 0.05]}>
        <boxGeometry args={[0.04, 0.04, 0.03]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 枪托 */}
      <mesh position={[0, -0.03, 0.3]} castShadow>
        <boxGeometry args={[0.06, 0.13, 0.28]} />
        <meshStandardMaterial color="#2a1a0f" metalness={0.1} roughness={0.85} />
      </mesh>
      {/* 握把 */}
      <mesh position={[0, -0.12, 0.1]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.12, 0.06]} />
        <meshStandardMaterial color="#2a1a0f" metalness={0.1} roughness={0.85} />
      </mesh>
      {/* 弹匣(短) */}
      <mesh position={[0, -0.14, -0.05]} castShadow>
        <boxGeometry args={[0.045, 0.1, 0.08]} />
        <meshStandardMaterial {...MAT_MAG} />
      </mesh>
      {/* 两脚架(前方折叠) */}
      <mesh position={[-0.06, -0.08, -0.5]} rotation={[0.4, 0, 0.2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.18, 6]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      <mesh position={[0.06, -0.08, -0.5]} rotation={[0.4, 0, -0.2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.18, 6]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
    </group>
  );
}

// 刀:刀柄 + 刀刃
function KnifeModel() {
  return (
    <group>
      {/* 刀柄 */}
      <mesh position={[0, -0.05, 0.12]} castShadow>
        <boxGeometry args={[0.05, 0.05, 0.16]} />
        <meshStandardMaterial {...MAT_GRIP} />
      </mesh>
      {/* 护手 */}
      <mesh position={[0, -0.04, 0.04]}>
        <boxGeometry args={[0.07, 0.025, 0.03]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 刀刃 */}
      <mesh position={[0, -0.02, -0.16]} castShadow>
        <boxGeometry args={[0.025, 0.05, 0.34]} />
        <meshStandardMaterial {...MAT_BLADE} />
      </mesh>
      {/* 刀尖(锥形) */}
      <mesh position={[0, -0.02, -0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.022, 0.08, 4]} />
        <meshStandardMaterial {...MAT_BLADE} />
      </mesh>
    </group>
  );
}

// 手榴弹:椭圆球体 + 拉环
function GrenadeModel() {
  return (
    <group>
      {/* 弹体 */}
      <mesh position={[0, -0.04, -0.05]} castShadow>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#3a4a2a" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* 顶部螺纹 */}
      <mesh position={[0, 0.04, -0.05]}>
        <cylinderGeometry args={[0.025, 0.025, 0.04, 8]} />
        <meshStandardMaterial {...MAT_METAL_DARK} />
      </mesh>
      {/* 拉环 */}
      <mesh position={[0, 0.1, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.035, 0.008, 6, 12]} />
        <meshStandardMaterial color="#ff7a18" emissive="#ff7a18" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

const WeaponModel = forwardRef<THREE.Mesh, Props>(({ weaponId, muzzleRef }, _ref) => {
  // 枪口火焰位置(各枪枪口前方)
  const muzzlePos: Record<string, [number, number, number]> = {
    pistol: [0, 0.01, -0.28],
    rifle: [0, 0.02, -0.56],
    shotgun: [0, 0.04, -0.6],
    sniper: [0, 0.01, -0.92],
    knife: [0, -0.02, -0.42],
    grenade: [0, 0, -0.2],
  };
  const mp = muzzlePos[weaponId] ?? [0, 0, -0.5];

  return (
    <group>
      {weaponId === 'pistol' && <PistolModel />}
      {weaponId === 'rifle' && <RifleModel />}
      {weaponId === 'shotgun' && <ShotgunModel />}
      {weaponId === 'sniper' && <SniperModel />}
      {weaponId === 'knife' && <KnifeModel />}
      {weaponId === 'grenade' && <GrenadeModel />}

      {/* 枪口火焰(仅枪械) */}
      <mesh ref={muzzleRef} position={mp}>
        <planeGeometry args={[0.18, 0.18]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
});

WeaponModel.displayName = 'WeaponModel';
export default WeaponModel;
