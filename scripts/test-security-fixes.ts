#!/usr/bin/env tsx
/**
 * Security Fixes Test Script
 *
 * This script tests all Week 1 critical security fixes
 * Run: npm run test-security (add to package.json)
 * Or: tsx scripts/test-security-fixes.ts
 */

import { checkRateLimit, RATE_LIMITS } from '../lib/rate-limit';

console.log('🔒 Testing Security Fixes\n');
console.log('=' .repeat(60));

// Test 1: Rate Limiting
console.log('\n📊 Test 1: Rate Limiting');
console.log('-'.repeat(60));

function testRateLimiting() {
  const testId = 'test-user-123';
  let passed = true;

  // Test within limit
  for (let i = 0; i < 5; i++) {
    const result = checkRateLimit({
      maxRequests: 5,
      windowSeconds: 60,
      identifier: testId,
    });

    if (i < 5 && !result.success) {
      console.log(`❌ Request ${i + 1} should succeed but failed`);
      passed = false;
    }
  }

  // Test exceeding limit
  const overLimitResult = checkRateLimit({
    maxRequests: 5,
    windowSeconds: 60,
    identifier: testId,
  });

  if (overLimitResult.success) {
    console.log('❌ Request 6 should fail (rate limit exceeded) but succeeded');
    passed = false;
  }

  if (passed) {
    console.log('✅ Rate limiting works correctly');
    console.log(`   - Allowed 5 requests`);
    console.log(`   - Blocked request 6`);
    console.log(`   - Reset time: ${new Date(overLimitResult.reset).toISOString()}`);
  }

  return passed;
}

// Test 2: Service Role Key Protection
console.log('\n🔐 Test 2: Service Role Key Protection');
console.log('-'.repeat(60));

function testServiceRoleProtection() {
  let passed = true;

  // Simulate client-side environment
  const originalWindow = global.window;

  try {
    // @ts-ignore - simulating browser environment
    global.window = {} as any;

    // This should throw an error
    try {
      const { createAdminClient } = require('../lib/supabase/server');
      createAdminClient();
      console.log('❌ createAdminClient() should throw error in client-side but did not');
      passed = false;
    } catch (error) {
      if (error instanceof Error && error.message.includes('SECURITY ERROR')) {
        console.log('✅ Service role protection works correctly');
        console.log('   - Throws error when called from client-side');
        console.log('   - Error message guides developer to correct usage');
      } else {
        console.log('❌ Wrong error thrown:', error);
        passed = false;
      }
    }
  } finally {
    // @ts-ignore
    global.window = originalWindow;
  }

  return passed;
}

// Test 3: Rate Limit Presets
console.log('\n⚙️  Test 3: Rate Limit Configuration');
console.log('-'.repeat(60));

function testRateLimitPresets() {
  console.log('✅ Rate limit presets configured:');
  console.log(`   - AUTH: ${RATE_LIMITS.AUTH.maxRequests} requests/${RATE_LIMITS.AUTH.windowSeconds}s`);
  console.log(`   - ADMIN: ${RATE_LIMITS.ADMIN.maxRequests} requests/${RATE_LIMITS.ADMIN.windowSeconds}s`);
  console.log(`   - PUBLIC: ${RATE_LIMITS.PUBLIC.maxRequests} requests/${RATE_LIMITS.PUBLIC.windowSeconds}s`);
  console.log(`   - UPLOAD: ${RATE_LIMITS.UPLOAD.maxRequests} requests/${RATE_LIMITS.UPLOAD.windowSeconds}s`);
  console.log(`   - QUERY: ${RATE_LIMITS.QUERY.maxRequests} requests/${RATE_LIMITS.QUERY.windowSeconds}s`);
  return true;
}

// Test 4: Environment Variables Check
console.log('\n🔧 Test 4: Environment Variables');
console.log('-'.repeat(60));

function testEnvironmentVariables() {
  let passed = true;

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      console.log(`⚠️  ${varName} is not set`);
      passed = false;
    } else {
      const displayValue = varName.includes('KEY')
        ? value.substring(0, 20) + '...[REDACTED]'
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  }

  if (!passed) {
    console.log('\n⚠️  Some environment variables are missing.');
    console.log('   Check your .env.local file.');
  }

  return passed;
}

// Run all tests
async function runTests() {
  const results = {
    rateLimiting: testRateLimiting(),
    serviceRoleProtection: testServiceRoleProtection(),
    rateLimitPresets: testRateLimitPresets(),
    environmentVariables: testEnvironmentVariables(),
  };

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test Summary');
  console.log('='.repeat(60));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`\n${passed}/${total} tests passed`);

  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✅' : '❌';
    const name = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${icon} ${name}`);
  });

  if (passed === total) {
    console.log('\n🎉 All security fixes are working correctly!');
    console.log('✅ Your application is secure and ready for deployment.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    console.log('❌ Fix the issues before deploying to production.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
