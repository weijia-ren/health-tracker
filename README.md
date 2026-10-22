# Health Tracker

Public beta URL: https://health-tracker-app-beta.netlify.app/

A standalone, mobile-first beta for sharing the health tracker as a free public tool.

Core idea: users track sleep, nutrition, exercise, and stress in a few taps. Their check-in data stays in their own browser unless they export it.

## Files

- `index.html` — app shell
- `assets/style.css` — mobile-first responsive design
- `assets/app.js` — local-first check-in, trends, resources, export/import/delete
- `resources/starter-resources.json` — editable resource modules and post links
- `manifest.json` and `service-worker.js` — PWA/offline foundation
- `docs/` — product, privacy, and development documents

## Add resource posts

The Resources tab is driven by `resources/starter-resources.json`. To add a post or link, add another object to the array:

```json
{
  "category": "Sleep",
  "type": "My post",
  "title": "How I improved my bedtime routine",
  "summary": "A short description shown in the module.",
  "action_tip": "One practical step the reader can try.",
  "url": "posts/sleep-timing-matters.html",
  "link_label": "Read my post",
  "last_reviewed": "2026-09-10"
}
```

Allowed categories are:

- `Sleep`
- `Nutrition`
- `Exercise`
- `Stress & recovery`

The app also still supports older `source` and `source_url` fields, but `url` and `link_label` are clearer for future posts.

## Run locally

From this folder:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Use a local server instead of double-clicking `index.html` because resource loading and service worker behavior are closer to production.
