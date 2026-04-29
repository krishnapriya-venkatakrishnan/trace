import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Trace</h1>
      <p className="text-sm text-gray-600 mt-2">
        Documents in database: {count ?? 0}
        {error && <span className="text-red-600"> (Error: {error.message})</span>}
      </p>
    </main>
  );
}