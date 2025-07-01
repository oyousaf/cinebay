export const config = { runtime: "edge" };

export default async function handler() {
  return new Response(JSON.stringify({ message: "Backend active!" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}