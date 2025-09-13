#!/usr/bin/env tsx
/**
 * Basic API Testing
 */

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAPIs() {
  console.log('🧪 Testing API endpoints...\n');
  
  const tests = [
    { method: 'GET', url: '/api/health', name: 'Health Check' },
    { method: 'GET', url: '/api/casino/seeds', name: 'Casino Seeds' },
    { method: 'GET', url: '/', name: 'Home Page' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await axios({
        method: test.method.toLowerCase() as any,
        url: BASE_URL + test.url,
        timeout: 5000
      });
      
      console.log(`✅ ${test.name}: ${response.status}`);
      passed++;
    } catch (error: any) {
      console.log(`❌ ${test.name}: ${error.response?.status || 'ERROR'}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
}

testAPIs().catch(console.error);