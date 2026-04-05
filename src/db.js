import Dexie from 'dexie';

export const db = new Dexie('PlantTracker');

db.version(1).stores({
  plants: '++id, name, icon, createdAt',
  waterings: '++id, plantId, date',
  notes: '++id, plantId, text, date',
});

const PLANT_TYPES = {
  'Puck': 'Golden Pothos',
  'Draco': 'Dracaena Limelight',
  'Rae': 'Anthurium',
  'Serena': 'Peace Lily',
  'Nemo': 'Aglaonema',
  'Agnes': 'Maranta Red Prayer Plant',
  'Martin': 'Zebra Haworthia',
  'Sally': 'Dieffenbachia',
  'Plusle': 'Poinsettia',
  'Minun': 'Poinsettia',
  'Clefa': 'Poinsettia',
  'Darius': 'Oxalis triangularis',
  'Hecatoncheires': 'Hoya Grande Green',
  'Penny': 'Pilea depressa',
  'Camilla': 'Tradescantia Nanouk',
  'Donny': 'Philodendron Micans',
  'Garret': 'Sansevieria Black Gold',
};

db.version(2).stores({
  plants: '++id, name, icon, type, createdAt',
  waterings: '++id, plantId, date',
  notes: '++id, plantId, text, date',
}).upgrade(tx => {
  return tx.table('plants').toCollection().modify(plant => {
    if (!plant.type) {
      plant.type = PLANT_TYPES[plant.name] || '';
    }
  });
});
