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

db.version(3).stores({
  plants: '++id, name, icon, type, createdAt',
  waterings: '++id, plantId, date',
  notes: '++id, plantId, text, date',
  photos: '++id, plantId, date',
});

db.version(4).stores({
  plants: '++id, name, icon, type, createdAt',
  waterings: '++id, plantId, date',
  notes: '++id, plantId, text, date',
  photos: '++id, plantId, date',
}).upgrade(tx => {
  return tx.table('plants').toCollection().modify(plant => {
    if (plant.wateringInterval === undefined) {
      plant.wateringInterval = 7;
    }
  });
});

db.version(5).stores({
  plants: '++id, name, icon, type, createdAt',
  waterings: '++id, plantId, date',
  notes: '++id, plantId, text, date',
  photos: '++id, plantId, date',
}).upgrade(tx => {
  return tx.table('notes').toCollection().modify(note => {
    if (!note.emoji) {
      note.emoji = '📝';
    }
  });
});

// v6: introduce a lifecycle status so plants can be "laid to rest" in the
// Graveyard instead of permanently deleted. Existing plants are all alive.
// 'dead' plants keep their full history but drop out of watering reminders.
db.version(6).stores({
  plants: '++id, name, icon, type, status, createdAt',
  waterings: '++id, plantId, date',
  notes: '++id, plantId, text, date',
  photos: '++id, plantId, date',
}).upgrade(tx => {
  return tx.table('plants').toCollection().modify(plant => {
    if (!plant.status) {
      plant.status = 'alive';
    }
  });
});

// v7: notes can be pinned to a dedicated group at the top of a plant's Care Log.
// Existing notes default to unpinned.
db.version(7).stores({
  plants: '++id, name, icon, type, status, createdAt',
  waterings: '++id, plantId, date',
  notes: '++id, plantId, text, date',
  photos: '++id, plantId, date',
}).upgrade(tx => {
  return tx.table('notes').toCollection().modify(note => {
    if (note.pinned === undefined) {
      note.pinned = false;
    }
  });
});

// v8: opt-in care schedules beyond watering. fertInterval / rotateInterval are
// per-plant intervals in days; null means "no schedule" (the task stays out of
// the Tend tab and shows no chip). Watering keeps its existing interval.
db.version(8).stores({
  plants: '++id, name, icon, type, status, createdAt',
  waterings: '++id, plantId, date',
  notes: '++id, plantId, text, date',
  photos: '++id, plantId, date',
}).upgrade(tx => {
  return tx.table('plants').toCollection().modify(plant => {
    if (plant.fertInterval === undefined) plant.fertInterval = null;
    if (plant.rotateInterval === undefined) plant.rotateInterval = null;
  });
});
