import { Router } from 'express';
import { getAllData, syncUser, syncAdvert, syncBid, syncNotification } from '../controllers/feedController';

const router = Router();

router.get('/all-data', getAllData);
router.post('/users', syncUser);
router.post('/adverts', syncAdvert);
router.post('/bids', syncBid);
router.post('/notifications', syncNotification);

export default router;
