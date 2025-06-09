const { spawn } = require('child_process');

function runMCPCommand(data) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let output = '';
    child.stdin.write(JSON.stringify(data) + '\n');
    child.stdin.end();

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      try {
        const response = JSON.parse(output.trim());
        resolve(response);
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function testWorkflow() {
  const testText = 'TEST: This is a temporary test string for MCP testing!';
  
  console.log('🧪 Testing MCP workflow...\n');
  
  // Step 1: Add text to weekly note
  console.log('1️⃣ Adding test text to weekly note...');
  const addCommand = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'append_to_note',
      arguments: {
        content: testText,
        notePath: '2025-W22.txt'
      }
    }
  };
  
  try {
    const addResult = await runMCPCommand(addCommand);
    console.log('✅ Add result:', addResult.result.content[0].text);
  } catch (error) {
    console.log('❌ Add failed:', error);
    return;
  }
  
  // Step 2: Read note to verify text was added
  console.log('\n2️⃣ Reading weekly note to verify...');
  const readCommand = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'read_weekly_note',
      arguments: {}
    }
  };
  
  try {
    const readResult = await runMCPCommand(readCommand);
    const noteContent = readResult.result.content[0].text;
    console.log('📖 Note content:\n', noteContent);
    
    if (noteContent.includes(testText)) {
      console.log('✅ Test text found in note!');
    } else {
      console.log('❌ Test text NOT found in note');
    }
  } catch (error) {
    console.log('❌ Read failed:', error);
  }
  
  // Step 3: Remove the test text
  console.log('\n3️⃣ Removing test text from weekly note...');
  const removeCommand = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'remove_text_from_note',
      arguments: {
        textToRemove: testText,
        notePath: '2025-W22.txt'
      }
    }
  };
  
  try {
    const removeResult = await runMCPCommand(removeCommand);
    console.log('✅ Remove result:', removeResult.result.content[0].text);
  } catch (error) {
    console.log('❌ Remove failed:', error);
    return;
  }
  
  // Step 4: Read note again to verify text was removed
  console.log('\n4️⃣ Reading weekly note to verify removal...');
  try {
    const finalReadResult = await runMCPCommand(readCommand);
    const finalContent = finalReadResult.result.content[0].text;
    console.log('📖 Final note content:\n', finalContent);
    
    if (!finalContent.includes(testText)) {
      console.log('✅ Test text successfully removed!');
    } else {
      console.log('❌ Test text still found in note');
    }
  } catch (error) {
    console.log('❌ Final read failed:', error);
  }
  
  console.log('\n🎉 Test workflow completed!');
}

testWorkflow();