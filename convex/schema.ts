// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

    profiles: defineTable({
        fullName: v.optional(v.string()),
        email: v.string(),
        avatarUrl: v.optional(v.string()),
        preferences: v.optional(v.any()), // voice prefs, difficulty, etc.
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
        deleted: v.optional(v.boolean()),
        deletedAt: v.optional(v.number())
    }).index("by_email", ["email"]),

    // --- Resume metadata (one row per upload) ---
    resumes: defineTable({
        profileId: v.id("profiles"),
        filename: v.string(),
        storageUrl: v.string(),           // S3/Supabase signed URL
        parsedJson: v.optional(v.any()), // parsed structure (education, experience)
        summary: v.optional(v.string()), // short text summary for UI
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
        deleted: v.optional(v.boolean())
    }).index("by_profile", ["profileId"]),

    // --- Resume chunks (chunked text + embeddings) ---
    resume_chunks: defineTable({
        resumeId: v.id("resumes"),
        profileId: v.id("profiles"),
        text: v.string(),
        chunkIndex: v.number(),
        startToken: v.optional(v.number()),
        endToken: v.optional(v.number()),
        embedding: v.optional(v.array(v.float64())),
        metadata: v.optional(v.any()),
        createdAt: v.number()
    }).vectorIndex("resume_chunks_by_embedding", {
        vectorField: "embedding",
        dimensions: 1536
    }).index("by_resume", ["resumeId"]),

    resume_critiques: defineTable({
        resumeId: v.id("resumes"),
        profileId: v.id("profiles"),
        critique: v.string(),
        suggestions: v.optional(v.array(v.string())),
        createdAt: v.number()
    }).index("by_resume", ["resumeId"]),


    // --- Companies and job postings ---
    companies: defineTable({
        name: v.string(),
        domain: v.optional(v.string()),
        description: v.optional(v.string()),
        createdAt: v.number()
    }).index("by_name", ["name"]),

    job_postings: defineTable({
        companyId: v.id("companies"),
        sourceUrl: v.string(),
        title: v.optional(v.string()),
        rawHtml: v.optional(v.string()),   // store minimally; large blobs avoided
        extractedText: v.optional(v.string()),
        metadata: v.optional(v.any()),     // location, salary, role, tags
        createdAt: v.number(),
        scrapedAt: v.optional(v.number())
    }).index("by_company", ["companyId"]),

    // --- Company doc chunks used for RAG ---
    company_doc_chunks: defineTable({
        jobPostingId: v.id("job_postings"),
        companyId: v.optional(v.id("companies")),
        text: v.string(),
        chunkIndex: v.number(),
        embedding: v.optional(v.array(v.float64())),
        metadata: v.optional(v.any()),
        createdAt: v.number()
    }).vectorIndex("company_chunks_by_embedding", {
        vectorField: "embedding",
        dimensions: 1536
    }).index("by_jobPosting", ["jobPostingId"]),

    // --- Interview sessions (state) ---
    interview_sessions: defineTable({
        profileId: v.id("profiles"),
        companyId: v.optional(v.id("companies")),
        jobPostingId: v.optional(v.id("job_postings")),
        roleTitle: v.optional(v.string()),
        stage: v.string(), // e.g., created/intro/behavioral/technical/wrapup/completed
        config: v.optional(v.any()), // difficulty, voice, timers
        historySummary: v.optional(v.string()), // small summary for quick resume
        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
        endedAt: v.optional(v.number())
    }).index("by_profile", ["profileId"]),

    // --- Chronological session events (questions/answers/hints) ---
    session_events: defineTable({
        sessionId: v.id("interview_sessions"),
        type: v.string(), // question|answer|hint|evaluation
        actor: v.string(), // interviewer|candidate|system
        payload: v.any(), // small JSON containing text, metadata, score, etc.
        createdAt: v.number()
    }).index("by_session", ["sessionId"]),

    // --- Transcript chunks (ASR) ---
    transcript_chunks: defineTable({
        sessionId: v.id("interview_sessions"),
        speaker: v.string(), // candidate|interviewer
        text: v.string(),
        startMs: v.optional(v.number()),
        endMs: v.optional(v.number()),
        embedding: v.optional(v.array(v.float64())), // optional for similarity
        createdAt: v.number()
    }).index("by_session", ["sessionId"]),

    // --- Questions templates and taxonomy ---
    questions: defineTable({
        title: v.string(),
        body: v.string(),
        tags: v.optional(v.array(v.string())), // behavioral, system_design, algorithms...
        difficulty: v.optional(v.string()),
        sampleAnswer: v.optional(v.string()),
        createdAt: v.number()
    }).index("by_tag", ["tags"]),

    // --- Instances of a question asked in a session ---
    question_instances: defineTable({
        sessionId: v.id("interview_sessions"),
        questionId: v.optional(v.id("questions")),
        generatedQuestion: v.string(),
        idealPoints: v.optional(v.array(v.string())),
        difficulty: v.optional(v.string()),
        createdAt: v.number()
    }).index("by_session", ["sessionId"]),

    // --- Evaluations & rubrics ---
    evaluations: defineTable({
        sessionId: v.id("interview_sessions"),
        questionInstanceId: v.optional(v.id("question_instances")),
        scorer: v.optional(v.string()), // "auto" or reviewer id
        rubric: v.any(), // structured scores by criteria
        score: v.number(),
        notes: v.optional(v.string()),
        createdAt: v.number()
    }).index("by_session", ["sessionId"]),

    // --- Post-session feedback summary ---
    feedback_reports: defineTable({
        sessionId: v.id("interview_sessions"),
        profileId: v.id("profiles"),
        overallScore: v.optional(v.number()),
        summary: v.optional(v.string()),
        suggestions: v.optional(v.array(v.string())),
        resources: v.optional(v.array(v.any())),
        createdAt: v.number()
    }).index("by_profile", ["profileId"]),

    // --- Resources (courses, articles) for suggestions ---
    resources: defineTable({
        title: v.string(),
        url: v.string(),
        type: v.optional(v.string()), // course/book/article
        tags: v.optional(v.array(v.string())),
        createdAt: v.number()
    }).index("by_tag", ["tags"]),

    // --- API keys / short-lived tokens (encrypt these outside Convex or vault) ---
    api_keys: defineTable({
        profileId: v.optional(v.id("profiles")),
        kind: v.string(), // vocode, provider, etc.
        maskedKey: v.string(), // last 4 chars
        metadata: v.optional(v.any()), // expiry, scopes
        createdAt: v.number()
    }),

    // --- Audit & System ---
    audit_logs: defineTable({
        actor: v.optional(v.string()), // profileId or system
        action: v.string(),
        details: v.optional(v.any()),
        createdAt: v.number()
    }),

    system_tasks: defineTable({
        kind: v.string(), // "cleanup", "reindex", "summary"
        state: v.string(), // pending|running|completed|failed
        metadata: v.optional(v.any()),
        createdAt: v.number(),
        updatedAt: v.optional(v.number())
    })
});
