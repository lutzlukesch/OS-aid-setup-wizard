# Contributing

Thanks for helping keep this guide accurate. You don't need to be a developer.

## Found something outdated or wrong?

Click **Report Error / Broken Link** at the bottom of the page (it fills in the setup you have selected), or [open an issue](../../issues/new/choose). Tell us what's wrong, for example a broken doc link, wrong instructions or outdated hardware, and, if you can, link a source (official docs, release notes).

## Want to fix it yourself?

All content is in one file, [`data/flow.json`](data/flow.json). You can edit it on GitHub:

1. Open [`data/flow.json`](data/flow.json) and click the ✏️ pencil icon.
2. Change the text between the quotes. Keep the quotes, commas and brackets as they are.
3. Click **Commit changes…** → **Propose changes**, then **Create pull request**.
4. Add a source link in the description.

An automatic check tells you if the file got broken. A maintainer reviews it, and once merged, the site updates within a few minutes.

## Developers

One branch per fix, then a pull request to `main`:

```sh
git checkout -b fix/short-description
npm install
npm run dev        # http://localhost:8000
npm run validate   # checks data/flow.json
```

In `flow.json`, `support` and `lifecycle` drive the logic; `status` is only a label. Update `lastUpdated` when you verify data.
