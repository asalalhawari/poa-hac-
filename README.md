# HAC Signal Investigation UI

React + TypeScript wireframe application implementing the logic of the HAC Signal specification as an investigation workflow rather than reproducing the presentation slides.

## Current focus
- Claim Investigation Workspace
- Components A-E evidence and scoring
- Component B POA inference from timing
- Component C business classification (C1/C2/C3) with clearly separated AI supporting path evidence
- Component D intervention ladder and 25-point ceiling concept
- Component E provider-history availability and lookback evidence
- Human reviewer decision workspace
- Data-quality checks and patient timeline

## Run
```bash
npm install
npm run dev
```

Open the Claims page and select a claim, or navigate directly to `/claims/CLM-2024-001`.

## Important product rule
The HAC Signal is a routing/review signal. The UI does not present the score as an automatic denial decision.
