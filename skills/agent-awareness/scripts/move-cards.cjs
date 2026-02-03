const http = require('http');

function moveCard(cardId, targetColumn = 'active') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ columnId: targetColumn });
    const url = new URL(`/api/cards/${cardId}/move`, 'http://localhost:3003');
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const targetColumn = args[0] || 'done'; // Default to 'done'
  const cardId = args[1];
  
  if (cardId) {
    // Move specific card
    const result = await moveCard(cardId, targetColumn);
    console.log(`Moved ${cardId} to ${targetColumn}`);
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Move task 1 to Done
    const task1Id = '15791e9f-af5d-4b80-9a67-d22a7e83649d';
    const result = await moveCard(task1Id, targetColumn);
    console.log(`Moved first task to ${targetColumn}`);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
