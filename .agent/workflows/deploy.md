---
description: How to deploy the Curae Sourcing App to GitHub Pages
---

This workflow automates the deployment of the Next.js application to GitHub Pages. It ensures that the generic codebase is synced and then uses the built-in deploy script to push the compiled `out/` folder directly to the `gh-pages` branch.

// turbo-all
Ensure we are on the main branch
```bash
git checkout main
```

Check if there are any uncommitted changes, add them, and commit them. If there are none, this step will gracefully do nothing.
```bash
git add .
git commit -m "chore: auto-commit before deployment" || true
```

Pull the latest incoming changes with rebase to ensure our local branch is perfectly up-to-date with remote.
```bash
git pull origin main --rebase
```

Run the deploy script. This will internally run `npm run build`, generate the static `out/` folder, and automatically push that folder to the `gh-pages` branch.
```bash
npm run deploy
```

Push our sync'd `main` codebase back up to GitHub so that the source code matches the deployed application.
```bash
git push origin main
```
