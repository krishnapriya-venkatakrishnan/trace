# Trace

A retrieval assistant for your private document corpus. Every answer is cited, every LLM call is logged, every cent is accounted for — the model is not a black box.

---

## Demo

> Local-only for now. Run `pnpm dev` and open [http://localhost:3000](http://localhost:3000).

Screenshots: `/ask` (chat + citations), `/dashboard` (cost/latency charts), `/evals` (pass-rate history), `/settings/prompts` (version editor).

---

## Architecture

```
Browser
  │
  ├─ /ask          React streaming UI (useObject + SSE)
  ├─ /dashboard    Server Component + Recharts
  ├─ /evals        Server Component + client runner
  └─ /settings     Prompt version editor
       │
       ▼
Next.js 16 App Router (Node / Fluid Compute)
  │
  ├─ POST /api/ask
  │    │
  │    ├─ 1. Embed question        → text-embedding-3-small
  │    ├─ 2. Hybrid search         → pgvector (ANN) + Postgres FTS, RRF fusion
  │    ├─ 3. Cross-encoder rerank  → top-5 from 20 candidates
  │    ├─ 4. Load active prompt    → prompt_versions (template_id + is_active)
  │    └─ 5. Stream answer         → gpt-4o via streamObject (Zod schema)
  │
  └─ Supabase (Postgres + pgvector)
       ├─ documents        raw uploaded files
       ├─ chunks           split + embedded passages
       ├─ queries          one row per /ask request; stores answer + citations
       ├─ llm_calls        one row per model call; phase, tokens, cost, latency
       ├─ prompt_versions  versioned prompt templates with is_active flag
       ├─ evaluations      fixed test cases (question + expected_properties)
       └─ evaluation_runs  pass/fail results per test × prompt version
```

---

## Five engineering decisions

### 1. Hybrid search (semantic + keyword) over pure vector retrieval

Pure ANN retrieval normalises away exact terms — acronyms, model numbers, proper nouns — that keyword search catches trivially. `hybridSearch` runs both a pgvector cosine-similarity query and a Postgres full-text search query, then fuses the ranked lists with Reciprocal Rank Fusion (RRF). No additional infrastructure required beyond what Supabase already provides.

### 2. Cross-encoder reranking as a separate pass

The bi-encoder used for retrieval optimises for recall (top-20 candidates). A cross-encoder (attending to both query and chunk jointly) optimises for precision. Running rerank on only the top-20 keeps latency predictable while materially improving the quality of the final top-5 context passed to the generator.

### 3. `streamObject` for structured streaming output

The answer schema (`answer`, `citations[]`, `confidence`) is defined with Zod. The AI SDK's `streamObject` emits partial-object tokens as they arrive so the UI can render progressively, while still enforcing the full schema on completion — no post-processing parse step, no second round-trip.

### 4. DB-backed prompt versioning with `is_active` flag

Prompts are stored in `prompt_versions` (template_id, version integer, content, is_active). Activating a new version is a two-row update — no code change, no deploy. Every `llm_calls` row records `prompt_template_id` + `prompt_version`, so the dashboard can annotate cost/quality charts with exactly when a prompt changed.

### 5. Evaluation harness with fixed test cases

Ten deterministic test cases with `expected_properties` (must_mention, must_cite, min_confidence, max_length) are stored in the `evaluations` table. Running "Run all" executes the full RAG pipeline for each case and writes pass/fail + score to `evaluation_runs`. The `/evals` page shows a 28-day pass-rate history chart annotated with prompt version transitions — making prompt regressions visible before activating a new version in production.

---

## Setup

**Prerequisites:** Node 20+, pnpm, a [Supabase](https://supabase.com) project with pgvector enabled, an OpenAI API key.

### 1. Clone and install

```bash
git clone <repo-url>
cd trace
pnpm install
```

### 2. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=sk-...
```

### 3. Database

Run the migrations in your Supabase SQL editor (in order):

```
supabase/migrations/
  01_documents.sql
  02_chunks.sql
  03_queries.sql
  04_llm_calls.sql
  05_prompt_versions.sql
  06_evaluations.sql
  07_evaluation_runs.sql
```

Enable the `pgvector` extension if not already active:

```sql
create extension if not exists vector;
```

### 4. Seed prompt template

Insert the initial `answer_generation` prompt via the Supabase SQL editor:

```sql
insert into prompt_versions (template_id, version, content, is_active)
values (
  'answer_generation', 1,
  'You are a precise research assistant. Answer the question using only the provided sources.
Cite every factual claim with inline [N] markers matching the source number.

Sources:
{sources}

Question: {question}

Respond with a JSON object: { "answer": "...", "citations": [1,2], "confidence": 0.9 }',
  true
);
```

Or use the `/settings/prompts` UI after starting the dev server.

### 5. Seed evaluation cases (optional)

```bash
npx tsx src/lib/evaluation/seed.ts
```

### 6. Run

```bash
pnpm dev      # http://localhost:3000
```

Upload a PDF at `/upload`, then ask a question at `/ask`.

---

## Cost and rate limiting

### Per-query cost breakdown

| Phase | Model | Typical cost |
|---|---|---|
| Embedding | text-embedding-3-small | ~$0.00002 |
| Rerank | gpt-4o (cross-encoder prompt) | ~$0.001 |
| Generation | gpt-4o | ~$0.003–0.010 |
| **Total** | | **~$0.004–0.012 per query** |

Costs are recorded per `llm_calls` row and surfaced in the `/dashboard` cost breakdown charts.

### Rate limiting

The `/api/ask` route enforces a per-IP daily limit using a token-bucket stored in Supabase. Client IPs are SHA-256 hashed before storage — no raw IPs are persisted. Limits and the 24-hour window can be adjusted in `src/lib/rate-limit.ts`.

To disable rate limiting in development, remove the `checkRateLimit` call from `src/app/api/ask/route.ts`.
