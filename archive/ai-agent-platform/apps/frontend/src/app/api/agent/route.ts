import { NextResponse } from 'next/server';

const EDGE_URL = process.env.NEXT_PUBLIC_EDGE_URL ?? 'http://localhost:54321/functions/v1';

export async function POST(request: Request) {
  const payload = await request.json();
  const upstream = await fetch(`${EDGE_URL}/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (payload?.stream) {
    if (!upstream.body) {
      return NextResponse.json({ error: 'Upstream stream unavailable' }, { status: 502 });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
