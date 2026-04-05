import { db } from './db.js';

const PLANTS = [
  { name: 'Puck', icon: '💚', type: 'Golden Pothos' },
  { name: 'Draco', icon: '🐉', type: 'Dracaena Limelight' },
  { name: 'Rae', icon: '❤️', type: 'Anthurium' },
  { name: 'Serena', icon: '🌸', type: 'Peace Lily' },
  { name: 'Nemo', icon: '🐠', type: 'Aglaonema' },
  { name: 'Agnes', icon: '🦎', type: 'Maranta Red Prayer Plant' },
  { name: 'Martin', icon: '🦓', type: 'Zebra Haworthia' },
  { name: 'Sally', icon: '🏥', type: 'Dieffenbachia' },
  { name: 'Plusle', icon: '⚡', type: 'Poinsettia' },
  { name: 'Minun', icon: '⚡', type: 'Poinsettia' },
  { name: 'Clefa', icon: '🌙', type: 'Poinsettia' },
  { name: 'Darius', icon: '💜', type: 'Oxalis triangularis' },
  { name: 'Hecatoncheires', icon: '🦑', type: 'Hoya Grande Green' },
  { name: 'Penny', icon: '🪙', type: 'Pilea depressa' },
  { name: 'Camilla', icon: '⚔️', type: 'Tradescantia Nanouk' },
  { name: 'Donny', icon: '🌿', type: 'Philodendron Micans' },
  { name: 'Garret', icon: '🐍', type: 'Sansevieria Black Gold' },
];

export async function seedIfEmpty() {
  const count = await db.plants.count();
  if (count > 0) return;

  const now = new Date().toISOString();
  await db.plants.bulkAdd(
    PLANTS.map((p) => ({ ...p, createdAt: now }))
  );
}
