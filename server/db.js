// Single shared data layer for all three dashboards.
// All state lives in one JSON document that is persisted to data/db.json.
// Node runs handlers on one thread and every mutation below is synchronous,
// so read-check-write sequences (e.g. accepting an order) are atomic.
const fs = require('fs');
const path = require('path');
const seed = require('./seed');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'db.json');

let state;

function load() {
  try {
    state = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    state = seed();
    save();
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    // Hosts with read-only/ephemeral disks still work from memory.
    console.warn('[db] could not persist:', err.message);
  }
}

function nextId(table) {
  return state.counters[table]++;
}

function now() {
  return new Date().toISOString();
}

function reset() {
  state = seed();
  save();
}

load();

module.exports = {
  get data() {
    return state;
  },
  save,
  nextId,
  now,
  reset,
};
