# Best Surf Beach — Weekly Picker (Debug Build)

This build logs **every API request** (URL + status + number of rows) to both the **browser console** and the **on‑page Debug log**.

### What to look for
- For each spot you should see three GETs:
  1. Marine (wave_height, wave_period) → `https://marine-api.open-meteo.com/v1/marine`
  2. Forecast (wind) → `https://api.open-meteo.com/v1/forecast`
  3. Tide (optional) → `https://marine-api.open-meteo.com/v1/tide`
- A **ROWS N** line for each, where `N` should be > 0.
- A **MERGED HOURS M** line per spot. If `M` is 0, something’s off with the coordinates.

### Common fixes
- If rows are 0 for Marine, nudge longitude **0.01–0.02° west** (slightly offshore) and retry.
- Tide can fail and that’s fine; scoring continues.
- Use **Reset to San Diego sample** to verify the app works in your area.

### Footer text
“All heuristics are for fun. Double-check cams and local knowledge (Martin and Noah's opinions).”

### Deploy
Upload `index.html`, `style.css`, `app.js`, `README.md` to your repo root and enable GitHub Pages.
