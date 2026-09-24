/**
 * Camera Icon Generator for Cesium 3D Globe
 * Generates crisp, type-specific SVG map pins for each CCTV camera form factor:
 * - Bullet
 * - Dome
 * - Turret
 * - PTZ
 * - Box
 */

import { CameraFormFactor } from '../types/camera';

const iconCache = new Map<string, string>();

/**
 * Returns inner SVG graphic for a given camera form factor
 */
function getFormFactorSvgContent(formFactor: CameraFormFactor, color: string): string {
  switch (formFactor.toLowerCase()) {
    case 'bullet':
      return `
        <!-- Bullet Camera -->
        <!-- Sunshield canopy -->
        <path d="M12 16 L31 16 L28 13 L12 13 Z" fill="${color}" opacity="0.9" />
        <!-- Main cylindrical body -->
        <rect x="14" y="17" width="16" height="9" rx="1.5" fill="#f8fafc" />
        <!-- Front lens barrel -->
        <rect x="30" y="18" width="3" height="7" rx="0.5" fill="#94a3b8" />
        <!-- Front lens aperture -->
        <ellipse cx="33" cy="21.5" rx="1" ry="3" fill="#0f172a" />
        <!-- Rear mounting bracket arm -->
        <path d="M14 22 L9 24 L9 28 L11 28 L11 25.5 L14 24" fill="#64748b" />
        <!-- Wall/pole mount baseplate -->
        <rect x="8" y="27" width="6" height="2" rx="0.5" fill="#cbd5e1" />
      `;

    case 'dome':
      return `
        <!-- Dome Camera -->
        <!-- Ceiling/Wall mount baseplate -->
        <rect x="12" y="15" width="24" height="3.5" rx="1.5" fill="#cbd5e1" />
        <line x1="12" y1="18.5" x2="36" y2="18.5" stroke="${color}" stroke-width="1.5" />
        <!-- Transparent outer dome bubble -->
        <path d="M13 19 Q24 33 35 19 Z" fill="#38bdf8" fill-opacity="0.3" stroke="#f8fafc" stroke-width="1.2" />
        <!-- Internal camera gimbal eye -->
        <circle cx="24" cy="22" r="4.5" fill="#0f172a" stroke="${color}" stroke-width="1.5" />
        <circle cx="24" cy="22" r="2" fill="#38bdf8" />
        <!-- Glare / lens highlight -->
        <ellipse cx="22.5" cy="20.5" rx="0.8" ry="1.2" fill="#ffffff" opacity="0.8" />
      `;

    case 'turret':
      return `
        <!-- Turret / Eyeball Camera -->
        <!-- Sloped mounting collar base -->
        <path d="M12 16 L36 16 L33 21 L15 21 Z" fill="#cbd5e1" stroke="${color}" stroke-width="1" />
        <!-- Spherical eyeball body -->
        <circle cx="24" cy="23" r="7" fill="#f8fafc" stroke="#64748b" stroke-width="1" />
        <!-- Flat lens faceplate with IR LEDs -->
        <circle cx="24" cy="23.5" r="4.5" fill="#0f172a" stroke="${color}" stroke-width="1.5" />
        <circle cx="24" cy="23.5" r="2" fill="#38bdf8" />
        <!-- IR LED ring markers -->
        <circle cx="21" cy="22" r="0.6" fill="#ef4444" />
        <circle cx="27" cy="22" r="0.6" fill="#ef4444" />
        <circle cx="24" cy="26.5" r="0.6" fill="#ef4444" />
      `;

    case 'ptz':
      return `
        <!-- PTZ (Pan-Tilt-Zoom) Camera -->
        <!-- Top pendant mount arm -->
        <path d="M22 13 L26 13 L26 16 L22 16 Z" fill="#64748b" />
        <!-- Upper housing body -->
        <path d="M16 16 L32 16 L31 21 L17 21 Z" fill="#cbd5e1" stroke="${color}" stroke-width="1" />
        <!-- Motorized Pan-tilt spherical dome globe -->
        <circle cx="24" cy="25" r="6.5" fill="#0f172a" stroke="${color}" stroke-width="1.5" />
        <!-- Center powerful optical zoom lens -->
        <circle cx="24" cy="25" r="3" fill="#38bdf8" stroke="#ffffff" stroke-width="0.8" />
        <circle cx="24" cy="25" r="1.2" fill="#0284c7" />
        <!-- Pan rotation arrow indicators -->
        <path d="M14 26 C14 29 17 31 20 31" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" />
        <path d="M34 26 C34 29 31 31 28 31" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" />
      `;

    case 'box':
      return `
        <!-- Box Camera -->
        <!-- Rectangular main body -->
        <rect x="18" y="16" width="16" height="11" rx="1.5" fill="#f8fafc" stroke="#64748b" stroke-width="1" />
        <!-- Top heat shield -->
        <line x1="17" y1="15" x2="34" y2="15" stroke="${color}" stroke-width="2" stroke-linecap="round" />
        <!-- Prominent interchangeable C/CS-mount lens cylinder -->
        <rect x="11" y="18" width="7" height="7" rx="0.5" fill="#334155" stroke="${color}" stroke-width="1" />
        <rect x="8" y="19" width="3" height="5" rx="0.5" fill="#0f172a" />
        <!-- Mounting foot -->
        <rect x="23" y="27" width="5" height="3" fill="#64748b" />
      `;

    default:
      return `
        <!-- Generic CCTV Camera -->
        <rect x="13" y="17" width="16" height="10" rx="2" fill="#f8fafc" stroke="${color}" stroke-width="1.5" />
        <polygon points="29,20 35,16 35,28 29,24" fill="${color}" />
        <circle cx="18" cy="22" r="2.5" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
      `;
  }
}

/**
 * Generates an SVG data URL for a camera pin based on its form factor, color, and selection state.
 */
export function getCameraIconUri(
  formFactor: CameraFormFactor | string = 'bullet',
  color: string = '#3b82f6',
  isSelected: boolean = false
): string {
  const normType = (formFactor || 'bullet').toLowerCase() as CameraFormFactor;
  const cacheKey = `${normType}_${color}_${isSelected ? 'sel' : 'unsel'}`;

  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const strokeColor = isSelected ? '#38bdf8' : color;
  const strokeWidth = isSelected ? '3' : '2';
  const glowFilter = isSelected
    ? `<filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
         <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#38bdf8" flood-opacity="0.9"/>
       </filter>`
    : `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
         <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
       </filter>`;

  const filterAttr = isSelected ? 'filter="url(#glow)"' : 'filter="url(#shadow)"';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="54" viewBox="0 0 48 54">
  <defs>
    ${glowFilter}
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>

  <!-- Pin Marker Outer Shape (Circle + Pointer Needle) -->
  <g ${filterAttr}>
    <!-- Bottom pointer needle -->
    <path d="M19 36 L24 49 L29 36 Z" fill="#0f172a" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" />
    <!-- Main circular pin badge -->
    <circle cx="24" cy="22" r="18" fill="url(#bgGrad)" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
  </g>

  <!-- Inner Camera Graphic -->
  <g>
    ${getFormFactorSvgContent(normType, strokeColor)}
  </g>

  ${
    isSelected
      ? `<circle cx="37" cy="11" r="4.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />`
      : ''
  }
</svg>`;

  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
  iconCache.set(cacheKey, dataUri);
  return dataUri;
}
