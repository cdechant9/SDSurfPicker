# Best Surf Beach — Weekly Picker 🏄‍♂️

**This build fixes a bug where scores showed as 0 if the Tide API failed.**  
Tide is now optional; waves/wind forecast will still score even if tide data is unavailable for your exact coordinates.

### Features
- Board + skill aware scoring
- Tide preference (Low/Mid/High) with importance slider
- Crowd factor (ignore/light/strong), optional weekend & 7–9am penalties
- **Mid‑length 🤙 hint** when conditions favor a ~6'8″ wide pointy board
- San Diego defaults (Oceanside removed, **Del Mar** added)
- Error banner shows the last fetch problem, if any

### Publish on GitHub Pages
1. Create a repo (public is easiest).
2. Upload `index.html`, `style.css`, `app.js`, `README.md` to the repo root.
3. Settings → Pages → Source: `main` / `(root)` → Save.
4. Wait ~1–2 minutes. Open `https://<your-username>.github.io/<repo-name>/`.

### Tips
- If you see “No forecast data,” click **Reset to San Diego sample** then **Forecast week**.
- If the error banner says Tide API error, that’s fine — the app continues with waves/wind.
- For super‑reliable data, keep spot coordinates slightly offshore (e.g., ~0.01–0.02° west).

MIT License — have fun and don’t sue me if you pearl on a knee‑high dribbler.
