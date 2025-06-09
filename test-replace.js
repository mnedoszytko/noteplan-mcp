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

async function testReplace() {
  console.log('🔄 Testing replace functionality...\n');
  
  // Step 1: Add some text to replace
  console.log('1️⃣ Adding text to weekly note...');
  const addCommand = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'append_to_note',
      arguments: {
        content: 'REPLACE_ME: Original text that needs updating',
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
  
  // Step 2: Replace the text
  console.log('\n2️⃣ Replacing text...');
  const replaceCommand = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'replace_text_in_note',
      arguments: {
        oldText: 'REPLACE_ME: Original text that needs updating',
        newText: 'REPLACED: New updated text!',
        notePath: '2025-W22.txt'
      }
    }
  };
  
  try {
    const replaceResult = await runMCPCommand(replaceCommand);
    console.log('✅ Replace result:', replaceResult.result.content[0].text);
  } catch (error) {
    console.log('❌ Replace failed:', error);
    return;
  }
  
  // Step 3: Read note to verify replacement
  console.log('\n3️⃣ Reading note to verify replacement...');
  const readCommand = {
    jsonrpc: '2.0',
    id: 3,
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
    
    if (noteContent.includes('REPLACED: New updated text!')) {
      console.log('✅ Text successfully replaced!');
    } else {
      console.log('❌ Replacement not found');
    }
  } catch (error) {
    console.log('❌ Read failed:', error);
  }
  
  // Step 4: Clean up - remove the test text
  console.log('\n4️⃣ Cleaning up test text...');
  const cleanupCommand = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'remove_text_from_note',
      arguments: {
        textToRemove: 'REPLACED: New updated text!',
        notePath: '2025-W22.txt'
      }
    }
  };
  
  try {
    const cleanupResult = await runMCPCommand(cleanupCommand);
    console.log('✅ Cleanup result:', cleanupResult.result.content[0].text);
  } catch (error) {
    console.log('❌ Cleanup failed:', error);
  }
  
  console.log('\n🎉 Replace test completed!');
}

testReplace();