import { Router } from 'express';
import { createListing, bulkSync } from '../controllers/feedController';

const router = Router();

router.post('/', createListing);
router.post('/sync', bulkSync);

export default router;
