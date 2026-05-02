import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local (Next.js convention) before falling back to .env
config({ path: '.env.local', override: false });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(url, key);

// Update these questions to match the documents actually in your corpus.
const evalCases = [
    {
        question: 'What is RAG (Retrieval-Augmented Generation) and what problem does it solve?',
        expected_properties: {
            must_mention: ['retrieval', 'generation'],
            must_cite: true,
            min_confidence: 0.6,
            max_length: 600,
        },
        notes: 'Basic definitional — should be answerable from any RAG documentation',
    },
    {
        question: 'How does vector embedding enable semantic similarity search?',
        expected_properties: {
            must_mention: ['vector', 'embedding'],
            must_cite: true,
            min_confidence: 0.5,
            max_length: 500,
        },
        notes: 'Core retrieval concept',
    },
    {
        question: 'What are the steps required to add a new document to the system?',
        expected_properties: {
            must_mention: [],
            must_cite: true,
            min_confidence: 0.5,
            max_length: 800,
        },
        notes: 'Procedural — should cite upload/ingest documentation',
    },
    {
        question: 'How does hybrid search combine keyword and semantic search approaches?',
        expected_properties: {
            must_mention: ['keyword', 'semantic'],
            must_cite: false,
            min_confidence: 0.5,
            max_length: 500,
        },
        notes: 'Retrieval method comparison',
    },
    {
        question: 'What is the role of reranking in improving retrieval quality?',
        expected_properties: {
            must_mention: ['relevance'],
            must_cite: false,
            min_confidence: 0.5,
            max_length: 400,
        },
        notes: 'Pipeline component explanation',
    },
    {
        question: 'How is the cost of each query calculated across the pipeline phases?',
        expected_properties: {
            must_mention: ['token', 'cost'],
            must_cite: false,
            min_confidence: 0.4,
            max_length: 400,
        },
        notes: 'Operational cost transparency',
    },
    {
        question: 'What happens when a user query returns no relevant documents?',
        expected_properties: {
            must_mention: [],
            must_cite: false,
            min_confidence: 0.4,
            max_length: 400,
        },
        notes: 'Edge case handling and error behaviour',
    },
    {
        question: 'What document formats are supported for ingestion?',
        expected_properties: {
            must_mention: [],
            must_cite: true,
            min_confidence: 0.3,
            max_length: 300,
        },
        notes: 'Factual lookup — low confidence since this may not be in all corpora',
    },
    {
        question: 'How are inline citations formatted in the generated answer?',
        expected_properties: {
            must_mention: ['citation'],
            must_cite: true,
            min_confidence: 0.5,
            max_length: 400,
        },
        notes: 'Output format — tests citation mechanism end-to-end',
    },
    {
        question: 'What rate limits are in place to protect the system from abuse?',
        expected_properties: {
            must_mention: [],
            must_cite: false,
            min_confidence: 0.3,
            max_length: 300,
        },
        notes: 'Low confidence threshold — tests graceful handling of low-certainty answers',
    },
];

async function seed() {
    console.log(`Inserting ${evalCases.length} evaluation cases…`);

    const { data, error } = await supabase
        .from('evaluations')
        .insert(evalCases)
        .select('id, question');

    if (error) {
        console.error('Insert failed:', error.message);
        process.exit(1);
    }

    console.log('Inserted:');
    for (const row of data ?? []) {
        console.log(`  [${row.id}] ${row.question.slice(0, 70)}…`);
    }
    console.log('Done.');
}

seed();
