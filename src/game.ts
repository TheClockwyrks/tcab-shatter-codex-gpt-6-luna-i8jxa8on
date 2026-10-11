import {
  ACTIONS,
  BINDINGS,
  BULLET_LIFE,
  BULLET_R,
  CUES,
  CORE_R,
  FACE_UP,
  FIELD_H,
  FIELD_W,
  FIRE_INTERVAL_TICKS,
  HALO_R,
  HIT_FLASH_TIME,
  INVULN_TIME,
  MAX_BULLETS,
  MU,
  MUZZLE_SPEED,
  ROCK_CHILD,
  ROCK_HEALTH,
  ROCK_RADIUS,
  ROCK_SPEED_MAX,
  ROCK_SPEED_MIN,
  SAFE_X,
  SAFE_Y,
  SAUCER_AIM_ERROR,
  SAUCER_BULLET_LIFE,
  SAUCER_BULLET_SPEED,
  SAUCER_FIRE_INTERVAL,
  SAUCER_FIRST_DELAY,
  SAUCER_LIFETIME,
  SAUCER_SPEED,
  SAUCER_WEAVE_INTERVAL,
  SAUCER_WEAVE_SPEED,
  SCORE_LARGE,
  SCORE_MEDIUM,
  SCORE_SMALL,
  SHIP_DRAG_HALFLIFE,
  SHIP_MAX,
  SHIP_R,
  SHIP_THRUST,
  SHIP_TURN,
  SHATTER_DEBUG_VERSION,
  SOFTEN,
  SPLIT_KICK,
  START_LIVES,
  STAR_X,
  STAR_Y,
  TICK_DT,
  TITLE_ITEMS,
  TITLE_TEXT,
  TAGLINE_TEXT,
  PAUSE_ITEMS,
  GAMEOVER_ITEMS,
  TORPEDO_CONE,
  TORPEDO_LIFE,
  TORPEDO_R,
  TORPEDO_RECHARGE,
  TORPEDO_SCATTER,
  TORPEDO_SPEED,
  TORPEDO_TURN,
  WAVE_BASE_ROCKS,
  WAVE_BANNER_TIME,
  WAVE_MIN_SHIP_DIST,
  WAVE_MIN_STAR_DIST,
  WAVE_SPEED_CAP,
  WAVE_SPEED_STEP,
  type RockSize,
} from "./constants";
import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";

export const BACKGROUND = "#050914";
export type Screen = "title" | "howto" | "playing" | "paused" | "gameover";
export type FieldEdge = "top" | "bottom" | "left" | "right";
export type SaucerEdge = "left" | "right";
export interface ShipState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly angle: number;
  readonly thrusting: boolean;
  readonly invuln: number;
  readonly collision: boolean;
  readonly fireCooldown: number;
}
export interface BulletState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
  readonly trail?: readonly { x: number; y: number }[];
}
export interface RockState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly size: RockSize;
  readonly spin: number;
  readonly health: number;
  readonly flash: number;
}
export interface SaucerState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly mind: boolean;
  readonly gun: boolean;
  readonly travel: boolean;
  readonly weave: 1 | -1;
  readonly fireClock: number;
  readonly weaveClock: number;
  readonly age: number;
}
export interface TorpedoState {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly heading: number;
  readonly life: number;
  readonly homing: boolean;
}
export interface ShatterState {
  readonly screen: Screen;
  readonly menuIndex: number;
  readonly score: number;
  readonly lives: number;
  readonly wave: number;
  readonly waveBanner: number;
  readonly ship: ShipState;
  readonly bullets: readonly BulletState[];
  readonly rocks: readonly RockState[];
  readonly saucer: SaucerState | null;
  readonly enemyBullets: readonly BulletState[];
  readonly torpedoes: readonly TorpedoState[];
  readonly torpedoCharge: number;
  readonly waveSpawning: boolean;
  readonly saucerSpawning: boolean;
  readonly saucerClock: number;
  readonly saucerDue: number;
  readonly nextSaucerEdge: SaucerEdge | null;
  readonly nextSaucerRow: number | null;
  readonly nextSaucerAim: number | null;
  readonly nextRockSpeed: number | null;
  readonly nextRecycleEdge: FieldEdge | null;
  readonly tickClock: number;
  readonly nextId: number;
  readonly simTime: number;
  readonly muted: boolean;
}
const wrap = (n: number, m: number) => ((n % m) + m) % m;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = wrap(a.x - b.x + FIELD_W / 2, FIELD_W) - FIELD_W / 2,
    dy = wrap(a.y - b.y + FIELD_H / 2, FIELD_H) - FIELD_H / 2;
  return Math.hypot(dx, dy);
};
const finite = (n: number) => {
  if (!Number.isFinite(n)) throw new Error("Expected finite number");
  return n;
};
const copy = (
  s: DeepReadonly<ShatterState>,
  patch: Partial<ShatterState>,
): ShatterState => ({ ...s, ...patch });
const snap = (s: DeepReadonly<ShatterState>) => ({
  version: SHATTER_DEBUG_VERSION,
  screen: s.screen,
  menuIndex: s.menuIndex,
  score: s.score,
  lives: s.lives,
  wave: s.wave,
  waveBanner: s.waveBanner,
  muted: s.muted,
  waveSpawning: s.waveSpawning,
  saucerSpawning: s.saucerSpawning,
  saucerClock: s.saucerClock,
  saucerDue: s.saucerDue,
  nextSaucerEdge: s.nextSaucerEdge,
  nextSaucerRow: s.nextSaucerRow,
  nextSaucerAim: s.nextSaucerAim,
  nextRockSpeed: s.nextRockSpeed,
  nextRecycleEdge: s.nextRecycleEdge,
  ship: { ...s.ship, speed: Math.hypot(s.ship.vx, s.ship.vy) },
  bullets: s.bullets.map(({ id, x, y, vx, vy, life }) => ({
    id,
    x,
    y,
    vx,
    vy,
    life,
  })),
  rocks: s.rocks.map((r) => ({ ...r, radius: ROCK_RADIUS[r.size] })),
  saucer: s.saucer,
  enemyBullets: s.enemyBullets.map(({ id, x, y, vx, vy, life }) => ({
    id,
    x,
    y,
    vx,
    vy,
    life,
  })),
  torpedoes: s.torpedoes,
  torpedoCharge: s.torpedoCharge,
  torpedoReady: s.torpedoCharge >= 1,
  simTime: s.simTime,
});
const menuRects = (screen: Screen) => {
  const items =
    screen === "title"
      ? TITLE_ITEMS
      : screen === "paused"
        ? PAUSE_ITEMS
        : screen === "gameover"
          ? GAMEOVER_ITEMS
          : [];
  return items.map((_, i) => ({ x: 440, y: 390 + i * 58, w: 400, h: 48 }));
};
export interface ShatterDebugApi {
  readonly version: number;
  [name: string]: unknown;
}
function debugApi(): ShatterDebugApi {
  const ops: Record<string, (...args: never[]) => unknown> = {
    snapshot: (s: DeepReadonly<ShatterState>) => snap(s),
    reconcile: (s: DeepReadonly<ShatterState>) => ({ ...s }),
    menuItemRect: (s: DeepReadonly<ShatterState>, i: number) =>
      menuRects(s.screen)[i] ?? null,
    reset: (s: DeepReadonly<ShatterState>) => ({
      ...initial(),
      muted: s.muted,
      nextId: 1,
      simTime: 0,
      tickClock: 0,
    }),
    setScreen: (s: DeepReadonly<ShatterState>, v: Screen) =>
      copy(s, { screen: v }),
    setMenuIndex: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { menuIndex: finite(v) }),
    setScore: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { score: finite(v) }),
    setLives: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { lives: finite(v) }),
    setWave: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { wave: finite(v) }),
    setWaveBanner: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { waveBanner: finite(v) }),
    setWaveSpawning: (s: DeepReadonly<ShatterState>, v: boolean) =>
      copy(s, { waveSpawning: v }),
    setSaucerSpawning: (s: DeepReadonly<ShatterState>, v: boolean) =>
      copy(s, { saucerSpawning: v }),
    setSaucerDue: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { saucerDue: finite(v) }),
    setShipPosition: (s: DeepReadonly<ShatterState>, x: number, y: number) =>
      copy(s, { ship: { ...s.ship, x: finite(x), y: finite(y) } }),
    setShipVelocity: (s: DeepReadonly<ShatterState>, vx: number, vy: number) =>
      copy(s, { ship: { ...s.ship, vx: finite(vx), vy: finite(vy) } }),
    setShipAngle: (s: DeepReadonly<ShatterState>, angle: number) =>
      copy(s, { ship: { ...s.ship, angle: finite(angle) } }),
    setShipInvuln: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { ship: { ...s.ship, invuln: finite(v) } }),
    setFireCooldown: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { ship: { ...s.ship, fireCooldown: finite(v) } }),
    setShipCollision: (s: DeepReadonly<ShatterState>, v: boolean) =>
      copy(s, { ship: { ...s.ship, collision: v } }),
    addBullet: (
      s: DeepReadonly<ShatterState>,
      x: number,
      y: number,
      vx: number,
      vy: number,
    ) =>
      copy(s, {
        bullets: [
          ...s.bullets,
          { id: s.nextId, x, y, vx, vy, life: BULLET_LIFE, trail: [] },
        ],
        nextId: s.nextId + 1,
      }),
    removeBullet: (s: DeepReadonly<ShatterState>, id: number) =>
      copy(s, { bullets: s.bullets.filter((e) => e.id !== id) }),
    clearBullets: (s: DeepReadonly<ShatterState>) => copy(s, { bullets: [] }),
    addEnemyBullet: (
      s: DeepReadonly<ShatterState>,
      x: number,
      y: number,
      vx: number,
      vy: number,
    ) =>
      copy(s, {
        enemyBullets: [
          ...s.enemyBullets,
          { id: s.nextId, x, y, vx, vy, life: SAUCER_BULLET_LIFE, trail: [] },
        ],
        nextId: s.nextId + 1,
      }),
    removeEnemyBullet: (s: DeepReadonly<ShatterState>, id: number) =>
      copy(s, { enemyBullets: s.enemyBullets.filter((e) => e.id !== id) }),
    clearEnemyBullets: (s: DeepReadonly<ShatterState>) =>
      copy(s, { enemyBullets: [] }),
    addRock: (
      s: DeepReadonly<ShatterState>,
      size: RockSize,
      x: number,
      y: number,
    ) =>
      copy(s, {
        rocks: [
          ...s.rocks,
          {
            id: s.nextId,
            x,
            y,
            vx: 0,
            vy: 0,
            size,
            spin: 0,
            health: ROCK_HEALTH[size],
            flash: 0,
          },
        ],
        nextId: s.nextId + 1,
      }),
    setRockVelocity: (
      s: DeepReadonly<ShatterState>,
      id: number,
      vx: number,
      vy: number,
    ) =>
      copy(s, {
        rocks: s.rocks.map((r) => (r.id === id ? { ...r, vx, vy } : r)),
      }),
    setRockHealth: (s: DeepReadonly<ShatterState>, id: number, hp: number) =>
      copy(s, {
        rocks: s.rocks.map((r) => (r.id === id ? { ...r, health: hp } : r)),
      }),
    removeRock: (s: DeepReadonly<ShatterState>, id: number) =>
      copy(s, { rocks: s.rocks.filter((r) => r.id !== id) }),
    clearRocks: (s: DeepReadonly<ShatterState>) => copy(s, { rocks: [] }),
    addSaucer: (s: DeepReadonly<ShatterState>, x: number, y: number) =>
      copy(s, {
        saucer: {
          id: s.nextId,
          x,
          y,
          vx: SAUCER_SPEED,
          vy: 0,
          mind: true,
          gun: true,
          travel: true,
          weave: 1,
          fireClock: SAUCER_FIRE_INTERVAL,
          weaveClock: SAUCER_WEAVE_INTERVAL,
          age: 0,
        },
        nextId: s.nextId + 1,
      }),
    removeSaucer: (s: DeepReadonly<ShatterState>) => copy(s, { saucer: null }),
    setSaucerVelocity: (
      s: DeepReadonly<ShatterState>,
      vx: number,
      vy: number,
    ) => (s.saucer ? copy(s, { saucer: { ...s.saucer, vx, vy } }) : s),
    setSaucerWeave: (s: DeepReadonly<ShatterState>, v: 1 | -1) =>
      s.saucer ? copy(s, { saucer: { ...s.saucer, weave: v } }) : s,
    setSaucerMind: (s: DeepReadonly<ShatterState>, v: boolean) =>
      s.saucer ? copy(s, { saucer: { ...s.saucer, mind: v } }) : s,
    setSaucerGun: (s: DeepReadonly<ShatterState>, v: boolean) =>
      s.saucer ? copy(s, { saucer: { ...s.saucer, gun: v } }) : s,
    setSaucerTravel: (s: DeepReadonly<ShatterState>, v: boolean) =>
      s.saucer ? copy(s, { saucer: { ...s.saucer, travel: v } }) : s,
    setTorpedoCharge: (s: DeepReadonly<ShatterState>, v: number) =>
      copy(s, { torpedoCharge: finite(v) }),
    addTorpedo: (
      s: DeepReadonly<ShatterState>,
      x: number,
      y: number,
      h: number,
    ) =>
      copy(s, {
        torpedoes: [
          ...s.torpedoes,
          {
            id: s.nextId,
            x,
            y,
            vx: TORPEDO_SPEED * Math.cos(h),
            vy: TORPEDO_SPEED * Math.sin(h),
            heading: h,
            life: TORPEDO_LIFE,
            homing: true,
          },
        ],
        nextId: s.nextId + 1,
      }),
    removeTorpedo: (s: DeepReadonly<ShatterState>, id: number) =>
      copy(s, { torpedoes: s.torpedoes.filter((t) => t.id !== id) }),
    clearTorpedoes: (s: DeepReadonly<ShatterState>) =>
      copy(s, { torpedoes: [] }),
  };
  for (const [key, field] of [
    ["setNextSaucerEdge", "nextSaucerEdge"],
    ["setNextSaucerRow", "nextSaucerRow"],
    ["setNextSaucerAim", "nextSaucerAim"],
    ["setNextRockSpeed", "nextRockSpeed"],
    ["setNextRecycleEdge", "nextRecycleEdge"],
  ] as const)
    ops[key] = (s: DeepReadonly<ShatterState>, v: unknown) =>
      copy(s, { [field]: typeof v === "number" ? finite(v) : v });
  return { version: SHATTER_DEBUG_VERSION, ...ops } as ShatterDebugApi;
}
function initial(): ShatterState {
  return {
    screen: "title",
    menuIndex: 0,
    score: 0,
    lives: START_LIVES,
    wave: 0,
    waveBanner: 0,
    ship: {
      x: SAFE_X,
      y: SAFE_Y,
      vx: 0,
      vy: 0,
      angle: FACE_UP,
      thrusting: false,
      invuln: 0,
      collision: true,
      fireCooldown: 0,
    },
    bullets: [],
    rocks: [],
    saucer: null,
    enemyBullets: [],
    torpedoes: [],
    torpedoCharge: 1,
    waveSpawning: true,
    saucerSpawning: true,
    saucerClock: 0,
    saucerDue: SAUCER_FIRST_DELAY,
    nextSaucerEdge: null,
    nextSaucerRow: null,
    nextSaucerAim: null,
    nextRockSpeed: null,
    nextRecycleEdge: null,
    tickClock: 0,
    nextId: 1,
    simTime: 0,
    muted: false,
  };
}
type Mutable<T> = T extends readonly (infer U)[]
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
const gravity = (x: number, y: number) => {
  const dx = STAR_X - x,
    dy = STAR_Y - y,
    d = Math.max(Math.hypot(dx, dy), SOFTEN),
    a = MU / (d * d);
  return [(dx / d) * a, (dy / d) * a] as const;
};
function cue(api: UpdateApi, name: string) {
  api.audio.play(name);
}
function spawnWave(s: ShatterState): ShatterState {
  const wave = s.wave,
    rocks = [...s.rocks];
  let id = s.nextId;
  for (let i = 0; i < WAVE_BASE_ROCKS + wave; i++) {
    let x = 0,
      y = 0;
    for (let j = 0; j < 80; j++) {
      x = Math.random() * FIELD_W;
      y = Math.random() * FIELD_H;
      if (
        dist({ x, y }, s.ship) >= WAVE_MIN_SHIP_DIST &&
        Math.hypot(x - STAR_X, y - STAR_Y) >= WAVE_MIN_STAR_DIST
      )
        break;
    }
    const a = Math.random() * Math.PI * 2,
      base =
        s.nextRockSpeed ??
        ROCK_SPEED_MIN.large +
          Math.random() * (ROCK_SPEED_MAX.large - ROCK_SPEED_MIN.large),
      mult = 1 + Math.min(WAVE_SPEED_CAP, WAVE_SPEED_STEP * (wave - 1));
    rocks.push({
      id: id++,
      x,
      y,
      vx: Math.cos(a) * base * mult,
      vy: Math.sin(a) * base * mult,
      size: "large",
      spin: 0,
      health: ROCK_HEALTH.large,
      flash: 0,
    });
  }
  return { ...s, rocks, nextId: id, nextRockSpeed: null };
}
function tick(
  s0: ShatterState,
  api: UpdateApi,
  held: Record<string, number>,
  pressed: Record<string, boolean>,
): ShatterState {
  let s: Mutable<ShatterState> = {
    ...s0,
    simTime: s0.simTime + TICK_DT,
    bullets: [...s0.bullets] as Mutable<BulletState>[],
    rocks: [...s0.rocks] as Mutable<RockState>[],
    enemyBullets: [...s0.enemyBullets] as Mutable<BulletState>[],
    torpedoes: [...s0.torpedoes] as Mutable<TorpedoState>[],
  };
  if (s.screen !== "playing") return s;
  const ship = { ...s.ship };
  ship.angle += (held.right - held.left) * SHIP_TURN * TICK_DT;
  ship.thrusting = held.up > 0;
  if (ship.thrusting) {
    ship.vx += Math.cos(ship.angle) * SHIP_THRUST * TICK_DT;
    ship.vy += Math.sin(ship.angle) * SHIP_THRUST * TICK_DT;
  }
  const drag = Math.pow(0.5, TICK_DT / SHIP_DRAG_HALFLIFE);
  ship.vx *= drag;
  ship.vy *= drag;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > SHIP_MAX) {
    ship.vx *= SHIP_MAX / speed;
    ship.vy *= SHIP_MAX / speed;
  }
  ship.x = wrap(ship.x + ship.vx * TICK_DT, FIELD_W);
  ship.y = wrap(ship.y + ship.vy * TICK_DT, FIELD_H);
  ship.invuln = Math.max(0, ship.invuln - TICK_DT);
  ship.fireCooldown = Math.max(0, ship.fireCooldown - 1);
  s.torpedoCharge = Math.min(1, s.torpedoCharge + TICK_DT / TORPEDO_RECHARGE);
  if (
    (pressed.a || held.a) &&
    ship.fireCooldown <= 0 &&
    s.bullets.length < MAX_BULLETS
  ) {
    s.bullets.push({
      id: s.nextId++,
      x: wrap(ship.x + Math.cos(ship.angle) * SHIP_R, FIELD_W),
      y: wrap(ship.y + Math.sin(ship.angle) * SHIP_R, FIELD_H),
      vx: ship.vx + Math.cos(ship.angle) * MUZZLE_SPEED,
      vy: ship.vy + Math.sin(ship.angle) * MUZZLE_SPEED,
      life: BULLET_LIFE,
      trail: [],
    });
    ship.fireCooldown = FIRE_INTERVAL_TICKS;
    cue(api, CUES.fire);
  }
  if (pressed.b && s.torpedoCharge >= 1 && s.torpedoes.length === 0) {
    s.torpedoes.push({
      id: s.nextId++,
      x: ship.x + Math.cos(ship.angle) * SHIP_R,
      y: ship.y + Math.sin(ship.angle) * SHIP_R,
      vx: Math.cos(ship.angle) * TORPEDO_SPEED,
      vy: Math.sin(ship.angle) * TORPEDO_SPEED,
      heading: ship.angle,
      life: TORPEDO_LIFE,
      homing: true,
    });
    s.torpedoCharge = 0;
  }
  s.ship = ship;
  const moveBallistic = (arr: Mutable<BulletState>[]) =>
    arr
      .map((b) => {
        const [ax, ay] = gravity(b.x, b.y);
        return {
          ...b,
          x: wrap(b.x + b.vx * TICK_DT, FIELD_W),
          y: wrap(b.y + b.vy * TICK_DT, FIELD_H),
          vx: b.vx + ax * TICK_DT,
          vy: b.vy + ay * TICK_DT,
          life: b.life - TICK_DT,
          trail: [...(b.trail ?? []), { x: b.x, y: b.y }].slice(-18),
        };
      })
      .filter((b) => b.life > 0);
  s.bullets = moveBallistic(s.bullets);
  s.enemyBullets = moveBallistic(s.enemyBullets);
  s.rocks = s.rocks.map((r) => {
    const [ax, ay] = gravity(r.x, r.y);
    return {
      ...r,
      x: wrap(r.x + r.vx * TICK_DT, FIELD_W),
      y: wrap(r.y + r.vy * TICK_DT, FIELD_H),
      vx: r.vx + ax * TICK_DT,
      vy: r.vy + ay * TICK_DT,
      spin: r.spin + TICK_DT * 0.3,
      flash: Math.max(0, r.flash - TICK_DT),
    };
  });
  s.torpedoes = s.torpedoes
    .map((t) => {
      let h = t.heading;
      if (t.homing) {
        let target: { x: number; y: number } | null = null,
          best = Infinity;
        for (const e of [...s.rocks, ...(s.saucer ? [s.saucer] : [])]) {
          const dx = wrap(e.x - t.x + FIELD_W / 2, FIELD_W) - FIELD_W / 2,
            dy = wrap(e.y - t.y + FIELD_H / 2, FIELD_H) - FIELD_H / 2,
            a = Math.atan2(dy, dx),
            delta = Math.atan2(Math.sin(a - h), Math.cos(a - h));
          if (Math.abs(delta) <= TORPEDO_CONE && Math.hypot(dx, dy) < best) {
            target = e;
            best = Math.hypot(dx, dy);
          }
        }
        if (target) {
          const a = Math.atan2(
              wrap(target.y - t.y + FIELD_H / 2, FIELD_H) - FIELD_H / 2,
              wrap(target.x - t.x + FIELD_W / 2, FIELD_W) - FIELD_W / 2,
            ),
            d = Math.atan2(Math.sin(a - h), Math.cos(a - h));
          h += Math.max(
            -TORPEDO_TURN * TICK_DT,
            Math.min(TORPEDO_TURN * TICK_DT, d),
          );
        }
      }
      return {
        ...t,
        heading: h,
        vx: Math.cos(h) * TORPEDO_SPEED,
        vy: Math.sin(h) * TORPEDO_SPEED,
        x: wrap(t.x + Math.cos(h) * TORPEDO_SPEED * TICK_DT, FIELD_W),
        y: wrap(t.y + Math.sin(h) * TORPEDO_SPEED * TICK_DT, FIELD_H),
        life: t.life - TICK_DT,
      };
    })
    .filter((t) => t.life > 0);
  let score = s.score;
  const rocks = [...s.rocks];
  let bullets = [...s.bullets],
    torps = [...s.torpedoes];
  const destroy = (r: RockState, angle: number, kick: number) => {
    score +=
      r.size === "large"
        ? SCORE_LARGE
        : r.size === "medium"
          ? SCORE_MEDIUM
          : SCORE_SMALL;
    cue(api, CUES.shatter);
    const child = ROCK_CHILD[r.size];
    if (child) {
      for (const sign of [-1, 1]) {
        const a = angle + (sign * Math.PI) / 2;
        rocks.push({
          id: s.nextId++,
          x: r.x,
          y: r.y,
          vx: r.vx + Math.cos(a) * kick,
          vy: r.vy + Math.sin(a) * kick,
          size: child,
          spin: 0,
          health: ROCK_HEALTH[child],
          flash: 0,
        });
      }
    }
  };
  for (const b of bullets) {
    const ri = rocks.findIndex(
      (r) => dist(r, b) <= ROCK_RADIUS[r.size] + BULLET_R,
    );
    if (ri >= 0) {
      const r = rocks[ri];
      bullets = bullets.filter((x) => x.id !== b.id);
      if (r.health <= 1) {
        rocks.splice(ri, 1);
        destroy(r, Math.atan2(b.vy, b.vx), SPLIT_KICK);
      } else rocks[ri] = { ...r, health: r.health - 1, flash: HIT_FLASH_TIME };
      continue;
    }
    if (dist(b, { x: STAR_X, y: STAR_Y }) <= CORE_R + BULLET_R)
      bullets = bullets.filter((x) => x.id !== b.id);
  }
  for (const t of torps) {
    const ri = rocks.findIndex(
      (r) => dist(r, t) <= ROCK_RADIUS[r.size] + TORPEDO_R,
    );
    if (ri >= 0) {
      const r = rocks.splice(ri, 1)[0];
      destroy(r, t.heading, TORPEDO_SCATTER);
      torps = torps.filter((x) => x.id !== t.id);
    } else if (dist(t, { x: STAR_X, y: STAR_Y }) <= CORE_R + TORPEDO_R)
      torps = torps.filter((x) => x.id !== t.id);
  }
  s.rocks = rocks;
  s.bullets = bullets;
  s.torpedoes = torps;
  s.score = score;
  for (const b of s.enemyBullets)
    if (
      ship.collision &&
      ship.invuln <= 0 &&
      dist(ship, b) <= SHIP_R + BULLET_R
    ) {
      s.enemyBullets = s.enemyBullets.filter((x) => x.id !== b.id);
      s = {
        ...s,
        lives: s.lives - 1,
        ship: {
          ...ship,
          x: SAFE_X,
          y: SAFE_Y,
          vx: 0,
          vy: 0,
          angle: FACE_UP,
          invuln: INVULN_TIME,
        },
        torpedoCharge: 1,
        torpedoes: [],
      };
    }
  if (s.saucer) {
    let q = {
      ...s.saucer,
      age: s.saucer.age + TICK_DT,
      fireClock: s.saucer.fireClock - TICK_DT,
      weaveClock: s.saucer.weaveClock - TICK_DT,
    };
    if (q.mind && q.weaveClock <= 0) {
      q = {
        ...q,
        vy: (q.vy === 0 ? q.weave : -Math.sign(q.vy)) * SAUCER_WEAVE_SPEED,
        weaveClock: SAUCER_WEAVE_INTERVAL,
      };
    }
    if (q.gun && q.fireClock <= 0) {
      const a =
        Math.atan2(ship.y - q.y, ship.x - q.x) +
        (s.nextSaucerAim ?? (Math.random() * 2 - 1) * SAUCER_AIM_ERROR);
      s.enemyBullets.push({
        id: s.nextId++,
        x: q.x,
        y: q.y,
        vx: q.vx + Math.cos(a) * SAUCER_BULLET_SPEED,
        vy: q.vy + Math.sin(a) * SAUCER_BULLET_SPEED,
        life: SAUCER_BULLET_LIFE,
        trail: [],
      });
      s.nextSaucerAim = null;
      q = { ...q, fireClock: SAUCER_FIRE_INTERVAL };
    }
    q = {
      ...q,
      x: wrap(q.x + (q.travel ? q.vx : 0) * TICK_DT, FIELD_W),
      y: wrap(q.y + (q.travel ? q.vy : 0) * TICK_DT, FIELD_H),
    };
    s.saucer = q.age >= SAUCER_LIFETIME ? null : q;
  }
  if (s.waveBanner > 0) {
    s.waveBanner = Math.max(0, s.waveBanner - TICK_DT);
    if (s.waveBanner === 0 && s.waveSpawning)
      s = spawnWave(s as ShatterState) as Mutable<ShatterState>;
  }
  if (s.rocks.length === 0 && s.waveSpawning && s.waveBanner === 0) {
    s = { ...s, wave: s.wave + 1, waveBanner: WAVE_BANNER_TIME };
  }
  return s as ShatterState;
}
export const game: Game<ShatterState, ShatterDebugApi> = {
  initialize(api: InitApi<ShatterState>) {
    for (const n of ACTIONS) api.input.register(n, BINDINGS[n]);
    for (const [name, freq] of [
      [CUES.fire, 620],
      [CUES.shatter, 180],
      [CUES.thrust, 90],
      [CUES.saucer, 300],
      [CUES.death, 110],
      [CUES.extraLife, 880],
    ] as const)
      api.audio.define(name, { wave: "triangle", freq, durationMs: 120 });
    for (const [k, src] of Object.entries({
      screen: (s: DeepReadonly<ShatterState>) => s.screen,
      score: (s: DeepReadonly<ShatterState>) => s.score,
      lives: (s: DeepReadonly<ShatterState>) => s.lives,
      wave: (s: DeepReadonly<ShatterState>) => s.wave,
      ship: (s: DeepReadonly<ShatterState>) =>
        `${s.ship.x.toFixed(0)},${s.ship.y.toFixed(0)}`,
      velocity: (s: DeepReadonly<ShatterState>) =>
        `${s.ship.vx.toFixed(0)},${s.ship.vy.toFixed(0)}`,
      speed: (s: DeepReadonly<ShatterState>) =>
        Math.hypot(s.ship.vx, s.ship.vy).toFixed(0),
      facing: (s: DeepReadonly<ShatterState>) => s.ship.angle.toFixed(2),
      grace: (s: DeepReadonly<ShatterState>) => s.ship.invuln.toFixed(2),
      bullets: (s: DeepReadonly<ShatterState>) => s.bullets.length,
      rocks: (s: DeepReadonly<ShatterState>) => s.rocks.length,
      saucer: (s: DeepReadonly<ShatterState>) =>
        s.saucer ? `${s.saucer.x.toFixed(0)},${s.saucer.y.toFixed(0)}` : "none",
      torpedo: (s: DeepReadonly<ShatterState>) =>
        `${s.torpedoCharge.toFixed(2)} / ${s.torpedoes.length}`,
      sim: (s: DeepReadonly<ShatterState>) => s.simTime.toFixed(2),
    }))
      api.diagnostics.register(k, src);
    return [initial(), debugApi()];
  },
  update(state: DeepReadonly<ShatterState>, api: UpdateApi, dt: number) {
    let s: ShatterState = { ...state, muted: api.audio.muted() };
    if (api.input.pressed("mute")) api.audio.setMuted(!api.audio.muted());
    const held = Object.fromEntries(
      ACTIONS.map((a) => [a, api.input.value(a)]),
    ) as Record<string, number>;
    const pressed = Object.fromEntries(
      ACTIONS.map((a) => [a, api.input.pressed(a)]),
    ) as Record<string, boolean>;
    if (s.screen === "playing" && pressed.pause)
      s = { ...s, screen: "paused", menuIndex: 0 };
    else if (s.screen === "paused" && (pressed.pause || pressed.back))
      s = { ...s, screen: "playing", menuIndex: 0 };
    else if (s.screen === "paused") {
      if (pressed.up) s = { ...s, menuIndex: (s.menuIndex + 2) % 3 };
      if (pressed.down) s = { ...s, menuIndex: (s.menuIndex + 1) % 3 };
      if (pressed.confirm) {
        if (s.menuIndex === 0) s = { ...s, screen: "playing" };
        else if (s.menuIndex === 1)
          s = {
            ...initial(),
            screen: "playing",
            wave: 1,
            waveBanner: WAVE_BANNER_TIME,
          };
        else s = { ...s, screen: "title", menuIndex: 0 };
      }
    } else if (
      s.screen === "title" ||
      s.screen === "howto" ||
      s.screen === "gameover"
    ) {
      if (pressed.back)
        s = { ...s, screen: "title", menuIndex: s.screen === "howto" ? 1 : 0 };
      else {
        const count =
          s.screen === "title" ? 2 : s.screen === "gameover" ? 2 : 0;
        if (count && pressed.up)
          s = { ...s, menuIndex: (s.menuIndex + count - 1) % count };
        if (count && pressed.down)
          s = { ...s, menuIndex: (s.menuIndex + 1) % count };
        if (pressed.confirm) {
          if (s.screen === "title")
            s =
              s.menuIndex === 0
                ? {
                    ...initial(),
                    screen: "playing",
                    wave: 1,
                    waveBanner: WAVE_BANNER_TIME,
                  }
                : { ...s, screen: "howto" };
          else if (s.screen === "howto") s = { ...s, screen: "title" };
          else
            s =
              s.menuIndex === 0
                ? {
                    ...initial(),
                    screen: "playing",
                    wave: 1,
                    waveBanner: WAVE_BANNER_TIME,
                  }
                : { ...s, screen: "title", menuIndex: 0 };
        }
      }
    }
    const pointer = api.input.pointer();
    if (
      s.screen === "title" ||
      s.screen === "paused" ||
      s.screen === "gameover"
    ) {
      for (const sample of api.input.pointerSamples()) {
        const i = menuRects(s.screen).findIndex(
          (r) =>
            sample.x >= r.x &&
            sample.x <= r.x + r.w &&
            sample.y >= r.y &&
            sample.y <= r.y + r.h,
        );
        if (i >= 0) s = { ...s, menuIndex: i };
      }
      if (api.input.pointerPressed()) {
        const i = menuRects(s.screen).findIndex(
          (r) =>
            pointer.x >= r.x &&
            pointer.x <= r.x + r.w &&
            pointer.y >= r.y &&
            pointer.y <= r.y + r.h,
        );
        if (i >= 0) s = { ...s, menuIndex: i };
      }
    }
    s = { ...s, tickClock: s.tickClock + Math.max(0, dt) };
    let n = 0;
    while (s.tickClock >= TICK_DT && n++ < 1200) {
      s = { ...tick(s, api, held, pressed), tickClock: s.tickClock - TICK_DT };
    }
    return s;
  },
  render(state: DeepReadonly<ShatterState>, api: RenderApi) {
    const c = api.ctx;
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, FIELD_W, FIELD_H);
    c.fillStyle = "#10182b";
    for (let i = 0; i < 100; i++) {
      const x = (i * 197) % FIELD_W,
        y = (i * 313) % FIELD_H;
      c.fillRect(x, y, 2, 2);
    }
    const g = c.createRadialGradient(
      STAR_X,
      STAR_Y,
      CORE_R,
      STAR_X,
      STAR_Y,
      HALO_R * 1.5,
    );
    g.addColorStop(0, "rgba(100,185,255,.22)");
    g.addColorStop(0.5, "rgba(45,98,180,.10)");
    g.addColorStop(1, "rgba(20,45,90,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(STAR_X, STAR_Y, HALO_R * 1.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d7f4ff";
    c.shadowColor = "#7bdcff";
    c.shadowBlur = 24;
    c.beginPath();
    c.arc(STAR_X, STAR_Y, CORE_R, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    for (const r of state.rocks) {
      c.save();
      c.translate(r.x, r.y);
      c.rotate(r.spin);
      c.strokeStyle = r.flash > 0 ? "#fff" : "#bdc8d9";
      c.lineWidth = 2;
      c.fillStyle = "#283247";
      c.beginPath();
      for (let i = 0; i < 11; i++) {
        const a = (i * Math.PI * 2) / 11,
          rad = ROCK_RADIUS[r.size] * (0.78 + 0.22 * Math.sin(i * 7 + r.id));
        if (i) c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      c.closePath();
      c.fill();
      c.stroke();
      if (r.health < ROCK_HEALTH[r.size]) {
        c.strokeStyle = "#ff9b75";
        c.globalAlpha = 0.3 + (ROCK_HEALTH[r.size] - r.health) * 0.2;
        c.beginPath();
        c.moveTo(-8, -4);
        c.lineTo(4, 5);
        c.lineTo(13, -8);
        c.stroke();
      }
      c.restore();
    }
    for (const b of [...state.bullets, ...state.enemyBullets]) {
      c.strokeStyle = "#72e7ff";
      c.lineWidth = 3;
      c.beginPath();
      const tr = b.trail ?? [];
      if (tr.length) {
        c.moveTo(tr[0].x, tr[0].y);
        for (const p of tr) c.lineTo(p.x, p.y);
      }
      c.lineTo(b.x, b.y);
      c.stroke();
      c.fillStyle = "#eaffff";
      c.beginPath();
      c.arc(b.x, b.y, BULLET_R, 0, Math.PI * 2);
      c.fill();
    }
    for (const t of state.torpedoes) {
      c.save();
      c.translate(t.x, t.y);
      c.rotate(t.heading);
      c.fillStyle = "#ffb44d";
      c.shadowColor = "#ff8c36";
      c.shadowBlur = 16;
      c.beginPath();
      c.moveTo(13, 0);
      c.lineTo(-8, -5);
      c.lineTo(-5, 0);
      c.lineTo(-8, 5);
      c.closePath();
      c.fill();
      c.restore();
    }
    if (state.saucer) {
      c.save();
      c.translate(state.saucer.x, state.saucer.y);
      c.fillStyle = "#ff647e";
      c.strokeStyle = "#ffd0d8";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(0, 2, 22, 8, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.ellipse(0, -3, 10, 8, 0, Math.PI, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();
    }
    if (state.ship.invuln <= 0 || Math.floor(state.simTime * 12) % 2 === 0) {
      c.save();
      c.translate(state.ship.x, state.ship.y);
      c.rotate(state.ship.angle);
      c.strokeStyle = "#dbfbff";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(17, 0);
      c.lineTo(-12, -11);
      c.lineTo(-7, 0);
      c.lineTo(-12, 11);
      c.closePath();
      c.stroke();
      if (state.ship.thrusting) {
        c.strokeStyle = "#ff9c5c";
        c.beginPath();
        c.moveTo(-9, -5);
        c.lineTo(-19, 0);
        c.lineTo(-9, 5);
        c.stroke();
      }
      c.restore();
    }
    c.fillStyle = "#e7f5ff";
    c.font = "22px monospace";
    c.fillText(`${state.score.toString().padStart(6, "0")}`, 36, 42);
    for (let i = 1; i < state.lives; i++) {
      c.beginPath();
      c.moveTo(40 + i * 22, 62);
      c.lineTo(34 + i * 22, 76);
      c.lineTo(46 + i * 22, 76);
      c.closePath();
      c.strokeStyle = "#a9dbea";
      c.stroke();
    }
    c.fillStyle = "#9bb4cc";
    c.font = "14px monospace";
    c.fillText("TORPEDO", 36, 105);
    c.strokeStyle = "#7697b3";
    c.strokeRect(36, 114, 130, 8);
    c.fillStyle = "#ffae50";
    c.fillRect(36, 114, 130 * state.torpedoCharge, 8);
    if (state.waveBanner > 0) {
      c.textAlign = "center";
      c.font = "bold 34px monospace";
      c.fillStyle = "#d7f7ff";
      c.fillText(`WAVE ${state.wave}`, 640, 130);
      c.textAlign = "left";
    }
    if (
      state.screen === "title" ||
      state.screen === "howto" ||
      state.screen === "paused" ||
      state.screen === "gameover"
    ) {
      c.fillStyle = "rgba(3,7,18,.76)";
      c.fillRect(0, 0, FIELD_W, FIELD_H);
      c.textAlign = "center";
      c.fillStyle = "#e7f7ff";
      c.font = "bold 70px monospace";
      if (state.screen === "title") {
        c.fillText(TITLE_TEXT, 640, 240);
        c.font = "20px monospace";
        c.fillStyle = "#7be7ff";
        c.fillText(TAGLINE_TEXT, 640, 285);
        TITLE_ITEMS.forEach((v, i) => {
          c.font = "bold 27px monospace";
          c.fillStyle = i === state.menuIndex ? "#ffd06b" : "#bed0e2";
          c.fillText(
            `${i === state.menuIndex ? "› " : ""}${v}`,
            640,
            420 + i * 58,
          );
        });
      } else if (state.screen === "howto") {
        c.font = "bold 38px monospace";
        c.fillText("HOW TO PLAY", 640, 110);
        c.textAlign = "left";
        c.font = "18px monospace";
        [
          "Clear every rock through its fragments.",
          "The star pulls rocks and bullets; shots bend around it.",
          "Swallowed rocks return from an edge. The saucer hunts you.",
          "Large rocks are armored. F fires a homing torpedo on a 10s recharge.",
          "ARROWS / WASD thrust and turn · SPACE fire · F torpedo",
          "ENTER confirm · ESC back · P pause · M mute",
        ].forEach((x, i) => c.fillText(x, 220, 210 + i * 52));
        c.textAlign = "center";
        c.fillText("ENTER / ESC TO RETURN", 640, 610);
      } else {
        c.font = "bold 52px monospace";
        c.fillText(
          state.screen === "paused" ? "PAUSED" : "GAME OVER",
          640,
          270,
        );
        if (state.screen === "gameover") {
          c.font = "22px monospace";
          c.fillText(`SCORE ${state.score}   WAVE ${state.wave}`, 640, 330);
        }
        const list = state.screen === "paused" ? PAUSE_ITEMS : GAMEOVER_ITEMS;
        list.forEach((v, i) => {
          c.font = "bold 24px monospace";
          c.fillStyle = i === state.menuIndex ? "#ffd06b" : "#bed0e2";
          c.fillText(
            `${i === state.menuIndex ? "› " : ""}${v}`,
            640,
            390 + i * 58,
          );
        });
      }
      c.textAlign = "left";
    }
  },
};
