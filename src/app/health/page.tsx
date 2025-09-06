"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"

export default function HealthPage(){
    const result = useQuery(api.healthCheck.check)

    if (!result) return <p>Loading ...</p>

    return(
        <div style={{
            padding:20
        }}>
            <h1>Convex Health Check</h1>
            <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
    )
}