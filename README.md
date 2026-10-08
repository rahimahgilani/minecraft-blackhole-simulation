# Minecraft-Style Black Hole Earth Simulation

> A voxel Lahore is going about its day when a black hole appears in the sky.
> Watch — or walk through — the full three-week descent from a bright normal
> morning to the last spiral of debris feeding the accretion disk.

**▶ Live demo:** [rahimahgilani.github.io/minecraft-blackhole-simulation](https://rahimahgilani.github.io/minecraft-blackhole-simulation/)

## 🚀 Quick Start

No build step — it's plain HTML + ES modules.

```bash
git clone https://github.com/rahimahgilani/minecraft-blackhole-simulation.git
cd minecraft-blackhole-simulation
# open index.html in any modern browser, or serve it:
npx serve .
```

Three.js r160 loads from a CDN import map, so an internet connection is needed
on first load.

## 🎮 What's Inside?

| Feature | Description |
|---------|-------------|
| **First-person city** | A voxel Lahore — road grid, apartment blocks, trees, street lamps, moving cars and pedestrians. Walk it in first person or fly. |
| **Real-time timeline** | A live `T+` HUD clock maps the slider to simulated time: 1 sec → 1 min → 1 hour → 1 day → 1 week → **3 weeks (final)**. Speed control: ×1 / ×60 / ×3600. |
| **Day → catastrophe lighting** | Bright blue day → golden warning → blood-red dusk → a void lit only by the accretion disk's orange glow. |
| **Escalating catastrophes** | The Moon cracks and shatters, the atmosphere streams away, the ocean draws back before a tsunami crest rolls through, magma erupts from widening fissures, and debris spirals into the disk. |
| **Spaghettification** | People, cars and buildings are pulled skyward and visibly stretched along the pull direction as tidal forces win. |
| **Shader black hole** | Dark event horizon, photon ring, a rotating accretion disk with a temperature gradient, and a lensing halo that warps the star field behind it. |
| **Educational overlays** | A SIMULATION MODE banner, per-phase explanations with a "Physically: …" note, and a built-in Q&A panel about lensing, tides, time dilation and survival. |
| **Cinematic & orbit views** | One-click guided camera tour, or a high orbit to watch the planet come apart. |

## ⌨ Controls

| Input | Action |
|-------|--------|
| Click | Lock mouse / look around |
| `W A S D` | Move |
| Mouse | Look |
| `Shift` | Sprint |
| `Space` | Jump |
| `F` | Fly mode (`Space` up / `Ctrl` down) |
| Click object | Inspect distance |
| `P` / `R` | Pause / restart |
| `T` | Toggle timeline |
| `C` / `V` | Cinematic mode / orbit view |
| Timeline slider | Scrub the whole catastrophe |

## ⏱ The Timeline

The slider is nonlinear so the early seconds stay watchable:

| Slider | Simulated time |
|--------|----------------|
| 0–5 % | T+0 → 1 sec |
| 5–10 % | 1 sec → 1 min |
| 10–25 % | 1 min → 1 hour |
| 25–45 % | 1 hour → 1 day |
| 45–70 % | 1 day → 1 week |
| 70–100 % | 1 week → 3 weeks (final) |

What you see at each milestone:

| Milestone | Event |
|-----------|-------|
| NORMAL | Bright day, traffic, pedestrians. |
| 1 SEC | The black hole appears; light bends around it. |
| 1 MIN | Lensing strengthens; glowing cracks spread across the Moon. |
| 1 HOUR | The atmosphere begins streaming toward the black hole. |
| 1 DAY | The Moon shatters; the ocean draws back, then a tsunami crest rolls in. |
| 1 WEEK | Magma fountains from the fissures; a spout stretches the sea into the sky. |
| 2–3 WEEKS | Earth is a glowing spiral of debris feeding the accretion disk. |

## 📚 How It Works

```
index.html            page shell, HUD, import map
main.js               engine: renderer, timeline clock, first-person
                      controls, cinematic camera, phase narration
src/world.js          voxel city + all catastrophe systems
src/blackhole.js      shader black hole: horizon, disk, lensing halo
style.css             HUD styling
tests/                headless smoke tests (Node, no browser needed)
```

- **Timeline engine** — one `setSimTime(t)` drives everything: black-hole
  approach, sky/light keyframes, phase text, the `T+` clock, and every
  catastrophe's lifecycle in `world.update(t, dt, elapsed, bhPos)`.
- **World** — built from instanced boxes and groups; destruction is
  procedural (lean → sink → debris → chunks), so the city never breaks the
  same way twice.
- **Black hole** — the disk and lensing halo are custom GLSL shaders; the
  halo warps a procedural star field with strength keyed to approach.

## 🧪 Tests

The simulation logic runs headlessly in Node against a minimal Three.js stub:

```bash
node tests\main.smoke.test.mjs   # engine boot, clock mapping, phases (4 groups)
node tests\world.smoke.test.mjs  # catastrophe lifecycles (11 groups)
```

15 test groups total — clock stops, tsunami drawback/crest, moon shatter,
atmosphere stripping, magma, spaghettification and fragmentation are all
asserted. (`node_modules/three` is a test-only stub; the browser uses the
real Three.js from the CDN import map.)

## ⚠ Simulation Mode

This is an **educational visualization**, not a physics solver: timescales are
compressed, tidal effects are stylized, and relativistic ray-tracing is
approximated with a lensing sprite. The banner in the app says so too.

## 🤝 Contributing

Pull requests are welcome — please open an issue first to discuss what you'd
like to add.

## 📄 License

MIT © 2026 Rahim Ahgilani