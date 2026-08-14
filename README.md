# Mindprint

A family cognitive-style quiz: self-reports plus tiny objective tests map a mind across four
channels — **Visual, Verbal, Spatial, Kinesthetic** — anchored to real research (VVIQ imagery
bands, inner-speech sampling, the object–spatial dissociation, tapping norms). SvelteKit +
TypeScript (strict) + SQLite, self-hostable on a single small server. Domain types live in
`src/lib/quiz/types.ts`.

**For fun, not diagnosis.** Items are drawn from openly published instruments (IRQ, VISQ,
OSIVQ, VVIQ-style anchors), but this is not a validated test.

## Features

- Three depths: **Quick** (~5 min), **Standard** (~15 min), **Thorough** (~35 min, includes a
  real mini-VVIQ mapped to the published 16–80 scale, reaction-time-scored mental rotation,
  and a two-tempo rhythm battery)
- Honest measurement: guessing-corrected objective scores, per-tier error estimates,
  uncertainty bands on the radar, precision-weighted averaging across retakes (localStorage)
- Population **band strips** per channel with real published bands and a "you are here" marker
- **Short share links** (`/p/<code>`) with a server-rendered Open Graph card, so links unfurl
  as your actual Mindprint in iMessage/WhatsApp
- **Family rooms** (`/room/<CODE>`): everyone posts their result with a 6-character code and
  gets a live overlay radar, per-channel dot strips, and family records (tightest metronome,
  sharpest rotation, most vivid mind's eye, …)
- **The Lab**: six standalone literature-named tests (3–4 min each) — Visual Patterns Test,
  digit span, Corsi blocks, anisochrony detection, change-detection K, and the phonological
  similarity effect demo — each norm-scaled (50 = published adult mean, 15 per SD) and blended
  into the channel scores by precision weighting. Four of them also run inline in the Thorough
  tier.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (adapter-node) into ./build
PORT=3000 node build/index.js
```

Environment variables:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | Listen port |
| `ORIGIN` | — | Public origin (e.g. `https://mindprint.example.com`). **Required behind a reverse proxy** so share links and OG image URLs are correct. |
| `DATA_DIR` | `./data` | Where `mindprint.db` (SQLite) lives |
| `FONT_DIR` | `<cwd>/fonts` | TTFs used by the server-side OG-image renderer |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint (OpenAI, OpenRouter, a local llama.cpp/ollama, …) |
| `OPENAI_API_KEY` | — | Enables the LLM narrative feature; **without it the feature silently disables** and the deterministic profiles are used |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name to request |

## LLM narratives

With an API key configured, the results screen adds an AI-drafted profile: a custom title
and description plus **strengths, blindspots, and a "working with this mind" section**, in a
user-selectable tone (gentle / balanced / playful).

Accuracy and cost design: the model never sees raw scores — profiles are quantized into 0–5
bands per channel plus notable flags (e.g. `vviq-hyperphantasia`, `metronome-musician-tight`),
and the prompt carries a fact sheet distilled from the cited research, so claims stay grounded.
Narratives are **cached in SQLite by banded signature + tone**: identical profiles read
identically, and each unique signature costs at most three LLM calls ever (one per tone,
generated only when actually viewed). No names or free text are sent to the endpoint. Share
pages and OG cards use the cached narrative title when one exists.

Note: the process must run with the project directory as cwd (or set `FONT_DIR`), since the
OG renderer loads `fonts/*.ttf` from disk.

## Deploying on NixOS

The repo is a flake exposing a package and a NixOS module.

1. **Pin the npm dependency hash** (one-time): run `nix build .#mindprint`; the first build
   fails with `got: sha256-…` — copy that hash into `npmDepsHash` in `flake.nix` and rebuild.

2. **Import the module** in your server config:

```nix
{
  inputs.mindprint.url = "github:you/mindprint";   # or a local path

  # in your nixosSystem modules:
  imports = [ mindprint.nixosModules.default ];

  services.mindprint = {
    enable = true;
    port = 3123;
    origin = "https://mindprint.example.com";
    # secrets (LLM narrative config) via EnvironmentFile — e.g. agenix/sops-nix:
    environmentFile = "/run/secrets/mindprint.env";
  };

  # reverse proxy (caddy shown; nginx works the same way)
  services.caddy = {
    enable = true;
    virtualHosts."mindprint.example.com".extraConfig = ''
      reverse_proxy 127.0.0.1:3123
    '';
  };
}
```

The module runs the server as a `DynamicUser` systemd service with its SQLite database in
`/var/lib/mindprint`. Back that single directory up and you've backed up everything.

**Manual fallback** (no flake): clone the repo on the server, `npm ci && npm run build`, then
run `node build/index.js` from the project root under any process manager, with `ORIGIN`,
`PORT`, and `DATA_DIR` set. `better-sqlite3` and `@resvg/resvg-js` install prebuilt Linux
binaries via npm, so plain `nodejs_22` is the only system dependency.

## Data & privacy

No accounts, no analytics. A share link stores exactly the profile you see (scores + name you
typed). Rooms are private-by-code (24 members max); anyone with the code can view and post.
Delete the SQLite file to wipe everything server-side; "Clear history" on the results screen
wipes the local device.

## Where the numbers come from

VVIQ bands and prevalence (Marks 1973; Zeman et al. 2020; Wright et al. 2024) · inner-speech
experience sampling (Heavey & Hurlburt 2008) · anendophasia (Nedergaard & Lupyan 2024) ·
object–spatial dissociation (Blazhenkova & Kozhevnikov 2009; Dawes et al. 2020) · tapping
norms (Repp 2005) · item texts from the IRQ (Roebuck & Lupyan 2020, open access), VISQ, and
OSIVQ. Tier error estimates are rough SEMs derived via Spearman–Brown from item counts.
