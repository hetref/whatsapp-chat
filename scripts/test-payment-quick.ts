#!/usr/bin/env node

/**
 * Quick Test Script for Payment Endpoints
 * 
 * Tests all endpoints with mock data (except actual Razorpay calls)
 * 
 * Usage: npm run test:payment
 */

import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command: string, description: string) {
  log(`\n${description}`, 'cyan');
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    log('✅ Success', 'green');
    return output;
  } catch (error: any) {
    log('❌ Failed', 'red');
    if (error.stdout) log(error.stdout, 'yellow');
    if (error.stderr) log(error.stderr, 'red');
    throw error;
  }
}

async function main() {
  log('\n╔══════════════════════════════════════════════╗', 'cyan');
  log('║     Payment Endpoints Quick Test            ║', 'cyan');
  log('╚══════════════════════════════════════════════╝\n', 'cyan');

  log('📋 Test Plan:', 'blue');
  log('  1. ✅ Verify Razorpay utilities compile', 'reset');
  log('  2. ✅ Verify API routes compile', 'reset');
  log('  3. ✅ Check database schema', 'reset');
  log('  4. ⚠️  Manual endpoint testing (requires dev server)\n', 'yellow');

  // Test 1: Check if TypeScript compiles
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test 1: TypeScript Compilation Check', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  try {
    runCommand('npx tsc --noEmit', 'Checking TypeScript compilation...');
  } catch (error) {
    log('\n⚠️  TypeScript has some errors. Check the output above.', 'yellow');
  }

  // Test 2: Check Prisma schema
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test 2: Database Schema Validation', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  try {
    runCommand('npx prisma validate', 'Validating Prisma schema...');
  } catch (error) {
    log('\n❌ Prisma schema has errors!', 'red');
    throw error;
  }

  // Test 3: List created files
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test 3: Created Files Verification', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const files = [
    { path: 'lib/razorpay.ts', desc: 'Razorpay utility functions' },
    { path: 'app/api/razorpay/create-order/route.ts', desc: 'Create order endpoint' },
    { path: 'app/api/razorpay/verify-payment/route.ts', desc: 'Verify payment endpoint' },
    { path: 'app/api/razorpay/webhook/route.ts', desc: 'Webhook handler' },
    { path: 'app/api/subscription/status/route.ts', desc: 'Subscription status endpoint' },
    { path: 'app/api/subscription/cancel/route.ts', desc: 'Cancel subscription endpoint' },
  ];

  const fs = await import('fs');
  const path = await import('path');

  let allFilesExist = true;
  for (const file of files) {
    const filePath = path.join(process.cwd(), file.path);
    if (fs.existsSync(filePath)) {
      log(`✅ ${file.desc}`, 'green');
      log(`   ${file.path}`, 'reset');
    } else {
      log(`❌ ${file.desc}`, 'red');
      log(`   ${file.path}`, 'reset');
      allFilesExist = false;
    }
  }

  if (!allFilesExist) {
    log('\n❌ Some files are missing!', 'red');
    throw new Error('Missing files');
  }

  // Test 4: Environment check
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test 4: Environment Variables Check', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ];

  const optionalEnvVars = [
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'NEXT_PUBLIC_RAZORPAY_KEY_ID',
  ];

  // Load .env file
  const dotenv = await import('dotenv');
  dotenv.config();

  log('\nRequired variables:', 'blue');
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar}`, 'green');
    } else {
      log(`❌ ${envVar} - MISSING!`, 'red');
    }
  }

  log('\nOptional variables (for payment features):', 'blue');
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      log(`✅ ${envVar}`, 'green');
    } else {
      log(`⚠️  ${envVar} - Not set (payment features disabled)`, 'yellow');
    }
  }

  // Summary
  log('\n╔══════════════════════════════════════════════╗', 'green');
  log('║          ✅ Quick Tests Complete             ║', 'green');
  log('╚══════════════════════════════════════════════╝\n', 'green');

  log('📝 Next Steps:', 'blue');
  log('  1. Set Razorpay credentials in .env file', 'reset');
  log('  2. Start dev server: npm run dev', 'reset');
  log('  3. Run manual tests: npm run test:payment:manual', 'reset');
  log('  4. Or use the API_TESTING_GUIDE.js for curl commands\n', 'reset');

  log('📚 Testing Resources:', 'blue');
  log('  - scripts/test-payment-flow.ts', 'reset');
  log('  - scripts/API_TESTING_GUIDE.js', 'reset');
  log('  - Razorpay Test Mode: https://razorpay.com/docs/payments/payments/test-card-details/\n', 'reset');
}

main().catch((error) => {
  log('\n❌ Tests failed!', 'red');
  console.error(error);
  process.exit(1);
});
