import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.ts";
import { hashToken } from "../lib/token.ts";

export async function requireGameAccess(
    req: Request<{gameId: string}>,
    res: Response,
    next: NextFunction,
){
    const token = req.get("Authorization")
    ?.match(/^Bearer (\S+)$/i)?.[1];

    if(!token){
        res.status(401).json({
            success: false,
            error:{
                code: "UNAUTHORIZED",
                message: "Missing or invalid authorization header.",  
            },
        });
        return;
    }

    const access =await prisma.gameAccess.findFirst({
        where:{
            gameId: req.params.gameId,
            code: hashToken(token),
        },
        select: {
            gameId:true,
        },
    });

    if(!access){
        res.status(403).json({
            success:false,
            error:{
                code: "FORBIDDEN",
                message: "Access denied for this game. ",
            },
        });
        return;
    }

    next();
}