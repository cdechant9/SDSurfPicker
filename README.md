# Best Surf Beach — Weekly Picker 🏄‍♂️

A tiny, client‑only web app that picks the **best surf spot** for each of the next 7 days and crowns a weekly winner. No accounts, no keys.

### New in this build
- **Tide controls**: pick Low/Mid/High and set importance (ignored → strong).
- **Crowd factor**: sensitivity slider + optional weekend / 7–9am penalties.
- **Mid‑length hint**: when conditions look sweet for your ~6'8″, you'll see a 🤙 tag on the day card and in the weekly table.

**Signals scored**
- Wave height (board + skill aware)
- Swell period
- Wind direction & strength (offshore bias)
- Tide preference (0–30% weight)
- Crowd penalty (0–20%)
- Mid‑length suitability (display hint only)

> It’s a heuristic buddy, not gospel. Always check a cam and your local knowledge before you paddle out.

---

## Quick start (GitHub Pages)

1. **Create a repo**
   - Go to `https://github.com/new`
   - Name it `surf-spot-picker` (or anything)
   - Public repo is easiest

2. **Upload files**
   - Drag in: `index.html`, `style.css`, `app.js`, and `README.md`
   - Commit to the `main` branch

3. **Enable Pages**
   - Repo **Settings → Pages**
   - **Branch:** `main` — **Folder:** `/ (root)`
   - Click **Save** and wait ~1–2 minutes

4. **Open your app**
   - URL will be `https://<your-username>.github.io/<repo-name>/`

### Update it later
Just edit/replace any of the files in `main` — GitHub Pages auto‑deploys updates within a minute or two.

---

## How to use

1. Choose **Skill level** and **Board type** (default: Longboard).
2. Set **Tide preference** + **importance**.
3. Set **Crowd sensitivity**, and optionally penalize **weekends** and **7–9am**.
4. (Optional) Leave **Suggest mid‑length** on to see the 🤙 hint when your 6'8″ is likely fun.
5. Add/Edit **Spots** (name, lat, lon, **orientation°** the beach faces).
6. Click **Forecast week** to get:
   - A **weekly pick** (overall best average morning score)
   - **Per‑day cards** with best spot, best time, height, period, wind, **tide height**, and orientation.
   - **Mid‑length 🤙** tag when the best hour suits a mid‑length (about 2.5–5.5 ft, 9–14 s, friendly wind, suitable tide).

> Orientation tip: West ≈ **270°**, South ≈ **180°**, Southwest ≈ **225°**.

---

## Preloaded San Diego spots (editable)

- Tourmaline Surf Park — (32.8048, -117.2591), 260°
- La Jolla Shores — (32.8569, -117.2570), 270°
- Cardiff Reef — (33.0207, -117.2848), 255°
- San Elijo / Pipes — (33.0352, -117.2966), 260°
- Swami’s — (33.0360, -117.2931), 260°
- Scripps Pier — (32.8650, -117.2530), 270°
- Black’s Beach (south) — (32.8825, -117.2525), 270°
- **Del Mar** — (32.9618, -117.2653), 270°

Spots are saved in your browser’s `localStorage`.

---

## Scoring (bird’s‑eye)

Final score (0..1) blends:
- **Height (50%)**
- **Period (25%)**
- **Wind (25%)**
- **+ Tide (0–30%)** based on your preference/slider
- **− Crowd penalty (0–20%)** from sensitivity + weekend/peak flags

**Mid‑length hint**: separate suitability score; if ≥ 0.6, the 🤙 tag shows.

Morning bias: looks at **06:00–11:00 local** and picks the best hour/day.

---

## Data sources

- **Open‑Meteo Marine API** — waves & wind
- **Open‑Meteo Tide API** — tide height where available
- All requests are in‑browser; no server, no keys.

---

## Local development

Just open `index.html` in a browser — it’s a single‑page app.

For a quick static server:
```bash
python3 -m http.server 8080
# then visit http://localhost:8080/
```

---

## License

MIT — enjoy, tweak, share.
