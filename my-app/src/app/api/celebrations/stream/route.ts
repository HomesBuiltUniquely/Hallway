import { listUnseenCelebrations, normalizeViewerKey } from '@/lib/celebrations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/** Pushes unseen celebrations for one signed-in person. Clients fall back to polling. */
export async function GET(request: Request) {
  const viewerParam = new URL(request.url).searchParams.get('viewer') || '';
  const hasViewer = Boolean(normalizeViewerKey(viewerParam.split(',')[0]));
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sent = new Set<string>();
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* closed */
        }
      };
      const tick = async () => {
        if (!hasViewer) {
          write('data: []\n\n');
          return;
        }
        try {
          const events = await listUnseenCelebrations(viewerParam, 5);
          const fresh = events.filter((event) => !sent.has(event.id));
          fresh.forEach((event) => sent.add(event.id));
          if (fresh.length > 0) write(`data: ${JSON.stringify(fresh)}\n\n`);
          else write(': ping\n\n');
        } catch {
          write(': ping\n\n');
        }
      };
      void tick();
      timer = setInterval(() => {
        void tick();
      }, 3000);
      request.signal.addEventListener('abort', () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, { headers: corsHeaders(request) });
}
