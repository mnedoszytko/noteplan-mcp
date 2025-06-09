const { spawn } = require('child_process');

// Test the remove_text_from_note function
const testData = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'remove_text_from_note',
    arguments: {
      textToRemove: 'W22 inner content',
      notePath: '2025-W22.txt'
    }
  }
};

console.log('Testing remove_text_from_note...');
console.log('Input:', JSON.stringify(testData, null, 2));

const child = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

child.stdin.write(JSON.stringify(testData) + '\n');
child.stdin.end();

child.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

child.on('close', (code) => {
  console.log('Process exited with code:', code);
});