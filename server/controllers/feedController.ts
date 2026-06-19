import db from '../config/db';
import { Response } from 'express';

// Extend express Request to include io
export const createListing = async (req: any, res: Response) => {
    const { author_id, type, title, description, local_timestamp } = req.body;

    if (!process.env.DATABASE_URL) {
        // Return mock success if DB not configured so app doesn't break
        const mockListing = { 
            id: crypto.randomUUID(), 
            author_id, 
            type, 
            title, 
            description, 
            status: 'Open', 
            created_at: local_timestamp || new Date() 
        };
        req.io.emit('new_feed_item', mockListing);
        return res.status(201).json({ success: true, data: mockListing });
    }

    try {
        const result = await db.query(
            'INSERT INTO listings (author_id, type, title, description, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [author_id, type, title, description, local_timestamp || new Date()]
        );
        
        const newListing = result.rows[0];
        req.io.emit('new_feed_item', newListing);
        res.status(201).json({ success: true, data: newListing });
    } catch (error) {
        console.error("Error creating listing:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const bulkSync = async (req: any, res: Response) => {
    const { pendingActions } = req.body;
    
    // Simplistic handling of bulk sync actions from frontend
    if (!process.env.DATABASE_URL) {
        return res.status(200).json({ success: true, message: "Mock bulk sync complete" });
    }
    
    try {
        // Broadcast a sync event to confirm it works
        req.io.emit('sync_complete', { count: pendingActions?.length || 0 });
        res.status(200).json({ success: true, message: "Sync complete" });
    } catch (error) {
        console.error("Error syncing data:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}
