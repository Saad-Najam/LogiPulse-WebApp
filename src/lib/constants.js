export const PRIORITIES = ['NORMAL', 'HIGH', 'URGENT'];
export const STATUSES = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];

// Order state machine: a rider may only advance one step at a time.
export const TRANSITIONS = {
  ACCEPTED: 'PICKED_UP',
  PICKED_UP: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};
export const PREVIOUS_STATUS = Object.fromEntries(Object.entries(TRANSITIONS).map(([from, to]) => [to, from]));

export const ROLE_TABLE = { user: 'users', rider: 'riders', admin: 'admins' };
