#!/usr/bin/env bun

async function testServer() {
  console.log('Testing server at http://localhost:3002...');

  try {
    // Test root
    const rootResp = await fetch('http://localhost:3002/');
    const rootText = await rootResp.text();
    console.log('Root status:', rootResp.status);
    console.log('Root HTML preview:', rootText.slice(0, 300));

    // Test dist file
    const distResp = await fetch('http://localhost:3002/dist/main.js');
    const distText = await distResp.text();
    console.log('Dist status:', distResp.status);
    console.log('Dist size:', distText.length, 'chars');

    if (distResp.ok && distText.length > 0) {
      console.log('✅ Server is working correctly!');
      return true;
    } else {
      console.log('❌ Dist file not loading');
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error);
    return false;
  }
}

testServer().then(success => {
  process.exit(success ? 0 : 1);
});
