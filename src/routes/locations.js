import { Router } from 'express';
import { LOCATIONS } from '../lib/locations.js';

const router = Router();

// Public, static: lets the request form offer "pick a pickup point" and send real coordinates.
router.get('/', (req, res) => res.json(LOCATIONS));

export default router;
