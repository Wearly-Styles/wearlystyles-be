import { Request, Response } from 'express';
import * as closetService from './closet.service';
export const getClosetList = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const userId = user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                statusCode: 401,
                message: "Unauthorized - User identification failed",
                data: null,
                timestamp: new Date().toISOString()
            });
        }
        const data = await closetService.getWardrobeData(userId);
        return res.status(200).json({
            success: true,
            statusCode: 200,
            message: "Get wardrobe list successfully",
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            statusCode: 500,
            message: error.message || "Internal Server Error - Cannot get wardrobe list",
            timestamp: new Date().toISOString()
        });
    }
};