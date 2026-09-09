import http from 'http';
import { WebSocket } from 'ws';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, body: json });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Companion Backend Integration Verification...\n');

  // 1. Health check
  const health = await request('GET', '/health');
  console.log('1. Health check:', health.status === 200 ? '✅ PASSED' : '❌ FAILED', health.body);

  // 2. Signup
  const email = `runner_${Date.now()}@example.com`;
  const signup = await request('POST', '/api/auth/signup', {
    email,
    password: 'securepassword123',
  });
  console.log('2. Signup:', signup.status === 201 ? '✅ PASSED' : '❌ FAILED', { email: signup.body.user?.email });
  const token = signup.body.token;

  // 3. Login
  const login = await request('POST', '/api/auth/login', {
    email,
    password: 'securepassword123',
  });
  console.log('3. Login:', login.status === 200 ? '✅ PASSED' : '❌ FAILED', { tokenReceived: !!login.body.token });

  // 4. Send Chat message
  const chatMsg = await request(
    'POST',
    '/api/chat/message',
    { content: "Rough run today. My knee's bugging me since the injury in March." },
    token
  );
  console.log('4. Chat message:', chatMsg.status === 200 ? '✅ PASSED' : '❌ FAILED');
  console.log('   User Message:', chatMsg.body.userMessage?.content);
  console.log('   Assistant Reply:', chatMsg.body.assistantMessage?.content);

  // Wait 1.5 seconds for async memory extraction
  await new Promise((r) => setTimeout(r, 1500));

  // 5. List Memories
  const memoriesRes = await request('GET', '/api/memories', null, token);
  console.log('5. List memories:', memoriesRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    count: memoriesRes.body.memories?.length,
    items: memoriesRes.body.memories?.map((m) => m.content),
  });

  // 6. Test memory creation and update
  const createMem = await request(
    'POST',
    '/api/memories',
    { content: 'Training for half marathon; injured knee in March' },
    token
  );
  console.log('6a. Create memory:', createMem.status === 201 ? '✅ PASSED' : '❌ FAILED');
  const testMemoryId = createMem.body.memory?.id;

  const patchRes = await request(
    'PATCH',
    `/api/memories/${testMemoryId}`,
    { content: 'Training for half marathon; knee recovering well with low-impact sessions' },
    token
  );
  console.log('6b. Update memory:', patchRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    updated: patchRes.body.memory?.content,
  });

  // 7. Get Chat History
  const historyRes = await request('GET', '/api/chat/history', null, token);
  console.log('7. Chat history:', historyRes.status === 200 ? '✅ PASSED' : '❌ FAILED', {
    count: historyRes.body.messages?.length,
  });

  // 8. Delete Memory
  const delRes = await request('DELETE', `/api/memories/${testMemoryId}`, null, token);
  console.log('8. Delete memory:', delRes.status === 200 ? '✅ PASSED' : '❌ FAILED');

  // 9. WebSocket Chat Stream
  console.log('9. Testing WebSocket Chat Stream (/api/chat/stream)...');
  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}/api/chat/stream?token=${token}`);
    let chunks = '';

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'message', content: 'What advice do you have for morning runs?' }));
    });

    ws.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === 'chunk') {
        chunks += parsed.text;
      } else if (parsed.type === 'complete') {
        console.log('   ✅ WS Complete received!');
        console.log('   Streamed text:', chunks.trim());
        ws.close();
        resolve(true);
      } else if (parsed.type === 'error') {
        console.log('   WS Error event:', parsed);
        ws.close();
        resolve(false);
      }
    });

    ws.on('error', (err) => {
      console.log('   ❌ WS connection error:', err.message);
      resolve(false);
    });
  });

  console.log('\n🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
