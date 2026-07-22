# PIM Flow Graph

Static Vite application for visualizing coherence between PIM papers.

## Local development

```sh
npm ci
npm run dev
```

## GitHub Pages deployment

Use this directory as the root of the GitHub repository. Keep hidden files when
copying it so that `.github/workflows/deploy-pages.yml` is included.

1. Push the repository to the `main` branch.
2. Open **Settings → Pages** in GitHub.
3. Select **GitHub Actions** as the build and deployment source.

Every push to `main` runs the tests, builds `dist/`, and deploys it to GitHub
Pages. The relative Vite base supports both user/organization Pages and project
Pages URLs.

`src/data/digests/` is a checked-in deployment snapshot. When this directory is
used inside the larger PIM workspace, `npm run build` refreshes the snapshot
from the workspace's `digests/` directory before building. In a standalone
repository it builds from the checked-in snapshot.
