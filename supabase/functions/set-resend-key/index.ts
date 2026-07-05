import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  return new Response(JSON.stringify({ message: "This function has been deprecated and disabled." }), {
    status: 410,
    headers: { 'Content-Type': 'application/json' }
  });
});
