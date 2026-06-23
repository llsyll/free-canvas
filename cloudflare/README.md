# Cloudflare Pages Setup

This app is a static Next export plus Cloudflare Pages Functions.

## Build settings

- Build command: `npm run build`
- Build output directory: `out`
- Functions directory: `functions`

Do not set `GITHUB_PAGES=true` in Cloudflare Pages. That variable is only for the GitHub Pages workflow.

## D1

Create a D1 database and bind it to the Pages project with binding name:

```txt
DB
```

Then run `cloudflare/schema.sql` against that database.

The app stores users, sessions, and canvas JSON in D1. Canvas JSON includes the React Flow `nodes` and `edges`, so text, styles, and pasted images encoded in node data are saved together.
