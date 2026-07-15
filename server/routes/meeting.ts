import { Hono } from 'hono';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const meetingRoutes = new Hono();

interface Message {
  id: string;
  role: 'human' | 'agent';
  sender: string;
  content: string;
  timestamp: string;
}

interface Room {
  id: string;
  name: string;
  participants: string[];
  createdAt: string;
  messages: Message[];
}

// Persistence
const DATA_DIR = join(process.cwd(), 'server', 'data');
const ROOMS_FILE = join(DATA_DIR, 'meeting_rooms.json');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadRooms(): Record<string, Room> {
  try {
    if (existsSync(ROOMS_FILE)) return JSON.parse(readFileSync(ROOMS_FILE, 'utf-8'));
  } catch {}
  // Default room
  return {
    'room-agent-strategy': {
      id: 'room-agent-strategy',
      name: 'Agent Strategy Session',
      participants: ['Agent Zero', 'SYNTHIA', 'PAULI BRAIN', 'Devika'],
      createdAt: new Date().toISOString(),
      messages: [
        { id: '1', role: 'agent', sender: 'Agent Zero', content: 'Fleet is assembled. 32 agents standing by. What is today\'s primary objective?', timestamp: new Date(Date.now() - 120000).toISOString() },
        { id: '2', role: 'agent', sender: 'SYNTHIA', content: 'Kupuri Media onboarding pipeline needs activation. Tanda CDMX launch is T-minus 48 hours.', timestamp: new Date(Date.now() - 90000).toISOString() },
        { id: '3', role: 'agent', sender: 'PAULI BRAIN', content: 'Guardian fleet is scanning 313 repos. We move when the board is clean.', timestamp: new Date(Date.now() - 60000).toISOString() },
      ],
    },
  };
}

function saveRooms(rooms: Record<string, Room>) {
  try { writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2)); } catch {}
}

let rooms = loadRooms();

// GET /api/meeting/rooms
meetingRoutes.get('/rooms', (c) => {
  const roomList = Object.values(rooms).map(r => ({
    id: r.id, name: r.name, participants: r.participants,
    createdAt: r.createdAt, messageCount: r.messages.length,
    lastMessage: r.messages.at(-1) ?? null,
  }));
  return c.json({ rooms: roomList });
});

// POST /api/meeting/rooms — create room
meetingRoutes.post('/rooms', async (c) => {
  const { name, participants = [] } = await c.req.json<{ name: string; participants?: string[] }>();
  const id = `room-${Date.now()}`;
  rooms[id] = { id, name, participants, createdAt: new Date().toISOString(), messages: [] };
  saveRooms(rooms);
  return c.json(rooms[id], 201);
});

// GET /api/meeting/rooms/:id/messages
meetingRoutes.get('/rooms/:id/messages', (c) => {
  const room = rooms[c.req.param('id')];
  if (!room) return c.json({ error: 'Room not found' }, 404);
  return c.json({ messages: room.messages });
});

// POST /api/meeting/rooms/:id/messages — add message + optional AI response
meetingRoutes.post('/rooms/:id/messages', async (c) => {
  const room = rooms[c.req.param('id')];
  if (!room) return c.json({ error: 'Room not found' }, 404);

  const body = await c.req.json<{ content: string; sender?: string; role?: 'human' | 'agent' }>();
  const userMsg: Message = {
    id: `msg-${Date.now()}`,
    role: body.role ?? 'human',
    sender: body.sender ?? 'You',
    content: body.content,
    timestamp: new Date().toISOString(),
  };
  room.messages.push(userMsg);

  // Generate AI agent response if human message
  if (userMsg.role === 'human') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const agentNames = ['Agent Zero', 'SYNTHIA', 'PAULI BRAIN'];
    const responder = agentNames[Math.floor(Math.random() * agentNames.length)];
    let agentReply = `[${responder}] Acknowledged.`;

    if (apiKey) {
      try {
        const systemPrompts: Record<string, string> = {
          'Agent Zero': 'You are Agent Zero, the chief brain of Archon-X. Strategic, decisive, brief.',
          'SYNTHIA': 'Eres SYNTHIA de Kupuri Media. Respondes en inglés pero con calidez mexicana.',
          'PAULI BRAIN': 'You are PAULI BRAIN. You speak like a wise Italian-American businessman. Authoritative, brief, insightful.',
        };
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 150,
            system: systemPrompts[responder] ?? systemPrompts['Agent Zero'],
            messages: [{ role: 'user', content: body.content }],
          }),
        });
        if (res.ok) {
          const data = await res.json() as { content: [{ text: string }] };
          agentReply = data.content[0].text;
        }
      } catch {}
    }

    const agentMsg: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'agent',
      sender: responder,
      content: agentReply,
      timestamp: new Date().toISOString(),
    };
    room.messages.push(agentMsg);
  }

  saveRooms(rooms);
  return c.json({ messages: room.messages.slice(-20) }, 201);
});

// DELETE /api/meeting/rooms/:id
meetingRoutes.delete('/rooms/:id', (c) => {
  if (!rooms[c.req.param('id')]) return c.json({ error: 'Not found' }, 404);
  delete rooms[c.req.param('id')];
  saveRooms(rooms);
  return c.json({ success: true });
});
