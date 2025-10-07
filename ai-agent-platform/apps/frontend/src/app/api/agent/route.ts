import { NextResponse } from 'next/server';

const EDGE_URL = process.env.NEXT_PUBLIC_EDGE_URL ?? 'http://localhost:54321/functions/v1';

export async function POST(request: Request) {
  const payload = await request.json();
  const response = await fetch(`${EDGE_URL}/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

