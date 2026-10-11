import { describe, expect, it } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import { game, type ShatterState } from "./game";

function harness() {
  const init = {
    input: { register() {}, layout: () => null },
    audio: { define() {}, load: async () => undefined },
    assets: {
      loadImage: async () => ({}) as ImageBitmap,
      loadAudio: async () => ({}) as AudioBuffer,
      load: async () => new Blob(),
      resolve: (path: string) => path,
    },
    diagnostics: { register() {} },
    events: {} as InitApi<ShatterState>["events"],
    viewport: () =>
      ({}) as InitApi<ShatterState>["viewport"] extends () => infer V
        ? V
        : never,
  } as unknown as InitApi<ShatterState>;
  const [state] = game.initialize(init) as [ShatterState, unknown];
  return state;
}
function api(values: Record<string, number> = {}): UpdateApi {
  return {
    input: {
      value: (name: string) => values[name] ?? 0,
      pressed: () => false,
      pointer: () => ({
        x: 0,
        y: 0,
        down: false,
        device: "mouse",
        buttons: [],
      }),
      pointerPressed: () => false,
      pointerReleased: () => false,
      pointerSamples: () => [],
      pointerContacts: () => [],
      wheel: () => ({ x: 0, y: 0 }),
    },
    audio: {
      play() {},
      loop() {},
      stop() {},
      looping: () => false,
      setMuted() {},
      muted: () => false,
    },
  } as unknown as UpdateApi;
}

describe("Shatter fixed-step simulation", () => {
  it("carries partial frame time and advances only complete ticks", () => {
    const start = harness();
    const partial = game.update(start, api(), 1 / 240);
    expect(partial.simTime).toBe(0);
    const next = game.update(partial, api(), 1 / 240);
    expect(next.simTime).toBeCloseTo(1 / 120);
  });

  it("applies thrust in its facing direction only on whole ticks", () => {
    const start = {
      ...harness(),
      screen: "playing" as const,
      ship: { ...harness().ship, angle: 0 },
    };
    const next = game.update(start, api({ up: 1 }), 1 / 120);
    expect(next.ship.vx).toBeGreaterThan(0);
    expect(Math.abs(next.ship.vy)).toBeLessThan(0.001);
    expect(next.ship.thrusting).toBe(true);
  });
});
