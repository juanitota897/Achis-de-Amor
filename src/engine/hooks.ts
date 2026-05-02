/**
 * Hook size catalog with US/UK equivalences.
 *
 * The hook size modulates stitch dimensions: a hook larger than the yarn's
 * recommended size produces looser, larger stitches; smaller produces tighter.
 */

export interface HookSize {
  mm: number;
  us: string | null;
  uk: string | null;
}

export const HOOK_SIZES: HookSize[] = [
  { mm: 1.5, us: null, uk: '2.5' },
  { mm: 1.75, us: null, uk: '2' },
  { mm: 2.0, us: null, uk: '14' },
  { mm: 2.25, us: 'B/1', uk: '13' },
  { mm: 2.5, us: null, uk: '12' },
  { mm: 2.75, us: 'C/2', uk: null },
  { mm: 3.0, us: null, uk: '11' },
  { mm: 3.25, us: 'D/3', uk: '10' },
  { mm: 3.5, us: 'E/4', uk: '9' },
  { mm: 3.75, us: 'F/5', uk: null },
  { mm: 4.0, us: 'G/6', uk: '8' },
  { mm: 4.5, us: '7', uk: '7' },
  { mm: 5.0, us: 'H/8', uk: '6' },
  { mm: 5.5, us: 'I/9', uk: '5' },
  { mm: 6.0, us: 'J/10', uk: '4' },
  { mm: 6.5, us: 'K/10.5', uk: '3' },
  { mm: 7.0, us: null, uk: '2' },
  { mm: 8.0, us: 'L/11', uk: '0' },
  { mm: 9.0, us: 'M/13', uk: '00' },
  { mm: 10.0, us: 'N/15', uk: '000' },
  { mm: 12.0, us: 'P', uk: null },
  { mm: 15.0, us: 'P/Q', uk: null },
  { mm: 16.0, us: 'Q', uk: null },
  { mm: 19.0, us: 'S', uk: null },
  { mm: 25.0, us: 'U', uk: null },
];

/** Find the closest standard hook size to a given mm value. */
export function snapToStandardHook(mm: number): HookSize {
  let closest = HOOK_SIZES[0];
  let minDiff = Math.abs(mm - closest.mm);
  for (const size of HOOK_SIZES) {
    const diff = Math.abs(mm - size.mm);
    if (diff < minDiff) {
      minDiff = diff;
      closest = size;
    }
  }
  return closest;
}

/** Find a hook by US or UK label. */
export function findHookByLabel(label: string): HookSize | null {
  const upper = label.toUpperCase().trim();
  for (const hook of HOOK_SIZES) {
    if (hook.us?.toUpperCase() === upper) return hook;
    if (hook.uk?.toUpperCase() === upper) return hook;
  }
  return null;
}
