import {prisma} from "../lib/prisma.ts";

export async function createGame(){
    const game= await prisma.gameSession.create({
        data:{
            wallet:{
                create: {},
            },
        },
        include:{
            wallet:true,
        }
    });
    return game;
}