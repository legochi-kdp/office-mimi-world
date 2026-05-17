import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mapPath = path.join(__dirname, '../assets/maps/WelcomeZone.json');
const xml = fs.readFileSync(mapPath, 'utf8');

if (!xml.trimStart().startsWith('<?xml')) {
  console.log('Map is already JSON — no conversion needed.');
  process.exit(0);
}

function parseLayer(name) {
  const re = new RegExp(
    `<layer[^>]*name="${name}"[^>]*>[\\s\\S]*?<data[^>]*>([\\s\\S]*?)</data>`,
    'i',
  );
  const match = xml.match(re);
  if (!match) throw new Error(`Layer not found: ${name}`);
  return match[1]
    .trim()
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
}

const map = {
  compressionlevel: -1,
  height: 15,
  width: 20,
  tiledversion: '1.12.1',
  tileheight: 16,
  tilewidth: 16,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  type: 'map',
  version: '1.10',
  infinite: false,
  layers: [
    {
      id: 1,
      name: 'Floor',
      type: 'tilelayer',
      width: 20,
      height: 15,
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      data: parseLayer('Floor'),
    },
    {
      id: 2,
      name: 'Walls',
      type: 'tilelayer',
      width: 20,
      height: 15,
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      data: parseLayer('Walls'),
    },
    {
      id: 3,
      name: 'Furniture',
      type: 'tilelayer',
      width: 20,
      height: 15,
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      data: parseLayer('Furniture'),
    },
  ],
  tilesets: [
    {
      columns: 16,
      firstgid: 1,
      image: 'Modern_Office_16x16.png',
      imageheight: 848,
      imagewidth: 256,
      margin: 0,
      name: 'ModernOffice',
      spacing: 0,
      tilecount: 848,
      tileheight: 16,
      tilewidth: 16,
    },
  ],
};

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
console.log('Converted WelcomeZone.json to Tiled JSON format.');
