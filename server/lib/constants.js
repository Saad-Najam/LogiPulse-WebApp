const STATUSES = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
const PRIORITIES = ['NORMAL', 'HIGH', 'URGENT'];

// State machine: each status may only advance to the next one.
const NEXT_STATUS = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'PICKED_UP',
  PICKED_UP: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
  DELIVERED: null,
};

module.exports = { STATUSES, PRIORITIES, NEXT_STATUS };
