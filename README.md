# Unified Setup Guide for Open-Source AID

An interactive, single-page planner for open-source automated insulin delivery (AID). Pick a role (master device or caregiver), a phone platform, an algorithm (Loop, Trio, AAPS), a CGM and a pump, and the page points you to the matching section of the official docs.

> **Disclaimer:** educational compatibility planner only. Not medical advice. Always consult your diabetes care team before changing insulin therapy.

A setup can be shared as a link: the current choices are kept in the URL hash, e.g. `#role=master&os=ios&alg=trio&cgm=dexcom-g7-oneplus&pump=omnipod-dash`.

## Project layout

| Path | What it is |
| --- | --- |
| `index.html` | Markup only: static sections and `<template>`s for the cards |
| `src/app.js` | Entry module: loads the data, owns the state, wires events |
| `src/state.js` | State shape, normalization against the data, URL hash sync |
| `src/render.js` | Renders the page from `(state, data)`; text goes in through `textContent` only |
| `src/dom.js` | Small DOM helpers |
| `src/styles.css` | Tailwind v4 entry with the component classes |
| `data/flow.json` | The decision tree: every platform, algorithm, CGM, pump and caregiver app |
| `data/flow.schema.json` | JSON Schema for `flow.json` |
| `scripts/validate-flow.js` | Checks `flow.json` against the schema (`npm run validate`) |

There is no bundler; the browser loads the ES modules directly. Only the CSS is compiled.

## Develop

```sh
npm install
npm run dev        # Tailwind in watch mode + static server on http://localhost:8000
npm run validate   # check data/flow.json against the schema
```

Opening `index.html` straight from disk does not work: browsers block `fetch()` of `data/flow.json` over `file://`.

## Contributing

Found something outdated? See [CONTRIBUTING.md](CONTRIBUTING.md): you can report it or fix it right on GitHub, no setup needed.

## Updating hardware data

All content lives in `data/flow.json`. Most editors pick up `flow.schema.json` through the `$schema` key and autocomplete fields.

- `support` (`supported` / `unsupported`) and `lifecycle` (`active` / `deprecated`) drive the logic. `status` is only the label shown to users.
- `requiresHeartbeatCgm: true` on a pump warns when it is combined with a CGM whose `wakesAppInBackground` is `false`.
- Bump `lastUpdated` when you verify the data.

Pull requests run the schema check and a link check. The link check also runs weekly, so stale doc links show up as a failed workflow.

## Deploy

Pushes to `main` build the site and publish it with `.github/workflows/pages.yml`. In the repository settings, set **Pages → Source** to **GitHub Actions**.

## License

GNU General Public License v3.0, see [LICENSE](LICENSE).
