import {prisma} from "../lib/prisma.ts";
import {createAccessToken, hashToken} from "../lib/token.ts"
export async function createGame(){
    const accessToken= createAccessToken();
    const game= await prisma.gameSession.create({
        data:{
            wallet:{
                create: {},
            },
        access: {
            create: {
                code: hashToken(accessToken),
            },
        },
    },
        include:{
            wallet:true,
        },
    });

    return {game, accessToken};
}

export async function getGame(gameId:string){
    const game= await prisma.gameSession.findUnique({
        where:{
            id:gameId,
        },
        include:{
            wallet:true,
        },
    });
    return game;
}