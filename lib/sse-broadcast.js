 // lib/sse-broadcast.js
let clients = new Set();

export function addSSEClient(controller) {
  clients.add(controller);
  console.log(`✅ Added SSE client, total: ${clients.size}`);
  return clients.size;
}

export function removeSSEClient(controller) {
  clients.delete(controller);
  console.log(`🗑️ Removed SSE client, total: ${clients.size}`);
  return clients.size;
}

export function broadcastToSSE(data) {
  if (clients.size === 0) {
    console.log('📡 No SSE clients connected to broadcast to');
    return 0;
  }

  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify({
    type: 'broadcast',
    data: data,
    timestamp: new Date().toISOString()
  })}\n\n`);

  let sentCount = 0;
  let errorCount = 0;

  clients.forEach(controller => {
    try {
      controller.enqueue(message);
      sentCount++;
    } catch (error) {
      console.error('Error broadcasting to client:', error);
      clients.delete(controller);
      errorCount++;
    }
  });

  console.log(`📡 Broadcasted to ${sentCount} clients, errors: ${errorCount}`);
  return sentCount;
}

export function getClientCount() {
  return clients.size;
}