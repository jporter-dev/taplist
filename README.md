# Baltimore Taplist

> The goal of this project was to create a unified, sortable, and searchable taplist for the popular bars and breweries around town. Untappd ratings are tied in so it can be used for deciding on a destination when going out.


## Development

The project consists of two portions - the main webapp, and the Cloudflare Worker. The worker manages access to the KV, acts as a proxy, and manages scheduled deploys.

### Cloudflare worker

<https://github.com/jporter-dev/taplist-worker>

### Project setup

```bash
npm install
```

### Compiles and hot-reloads for development

```bash
npm run serve
```

### Compiles and minifies for production

```bash
npm run build
```

### Run the taplist scraper

```bash
npm run scrape
```

### Deploy the site

```bash
npm run deploy
```
