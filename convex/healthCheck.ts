import { query } from "./_generated/server"

export const check = query(async(ctx)=>{
    return {
        ok: true,
        timestamp: Date.now(),
    }
})