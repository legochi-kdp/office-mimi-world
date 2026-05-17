# Data & AI World

A top-down 2D browser game built with [Phaser 3](https://phaser.io/) for onboarding new team members at KDP.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (included with Node.js)

## Getting started

```bash
npm install
npm run dev
```

The dev server opens **http://localhost:5173/public/index.html** in your browser. You should see the title screen with “Data & AI World”.

To build for production:

```bash
npm run build
npm run preview
```

## Project structure

```
kdp-data-ai-world/
├── assets/              # Game art and audio (served as static files)
│   ├── tilesets/        # Tiled map tileset images
│   ├── maps/            # Tiled .json / .tmx map exports
│   ├── sprites/         # Characters, NPCs, objects
│   ├── ui/              # Buttons, panels, icons
│   └── audio/           # Music and sound effects
├── public/
│   └── index.html       # HTML shell and game canvas container
├── src/
│   ├── main.js          # Phaser game config and scene registration
│   ├── scenes/          # One file per Phaser scene (screens / levels)
│   ├── characters/      # Player and NPC logic
│   ├── ui/              # HUD and menu components
│   └── data/            # Quest text, dialogue, config JSON
├── package.json         # Dependencies and npm scripts
├── vite.config.js       # Dev server and build settings
└── README.md
```

## Tech stack

- **Phaser 3** — game engine (rendering, input, scenes, physics)
- **Vite** — local dev server and production bundler

## License

ISC (see `package.json`).
