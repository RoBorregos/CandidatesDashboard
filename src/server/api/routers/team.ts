import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "~/server/api/trpc";

export const teamRouter = createTRPCRouter({
    getTeam: protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.db.user.findFirst({
            where: {
                id: ctx.session.user.id
            }
        })

        if (!user?.teamId) {
            return null
        }

        const team = await ctx.db.team.findFirst({
            where: {
                id: user?.teamId
            },
            include: {
                rounds:  {
                    include: {
                        challenges: true
                    }
                }
            },
            
        })

        return team


    }),

    getRounds: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
        
    })
})