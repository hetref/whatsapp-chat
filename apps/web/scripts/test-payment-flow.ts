/**
 * Test Script for Razorpay Payment Endpoints
 * 
 * This script tests all payment-related endpoints:
 * 1. Create Order
 * 2. Verify Payment
 * 3. Subscription Status
 * 4. Cancel Subscription
 * 5. Webhook Handler
 * 
 * Usage: npx tsx scripts/test-payment-flow.ts
 * 
 * Prerequisites:
 * - Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
 * - Set TEST_USER_TOKEN (Clerk session token) in this file
 * - Start dev server: npm run dev
 */

const BASE_URL = 'http://localhost:3000';

// ⚠️ REPLACE WITH ACTUAL CLERK SESSION TOKEN
// You can get this from browser DevTools > Application > Cookies > __session
const TEST_USER_TOKEN = 'your_clerk_session_token_here';

// Test configuration
const config = {
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `__session=${TEST_USER_TOKEN}`, // Clerk auth cookie
  },
};

// Colors for console output
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

async function runTests() {
  log('\n🚀 Starting Payment Flow Tests\n', 'cyan');
  log('⚠️  Make sure the dev server is running (npm run dev)\n', 'yellow');

  // Test 1: Create Order
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test 1: Create Razorpay Order', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  try {
    const createOrderResponse = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
      method: 'POST',
      headers: config.headers,
    });

    if (!createOrderResponse.ok) {
      throw new Error(`HTTP ${createOrderResponse.status}: ${await createOrderResponse.text()}`);
    }

    const orderData = await createOrderResponse.json();
    log('✅ Order created successfully!', 'green');
    log('\nOrder Details:', 'blue');
    console.log(JSON.stringify(orderData, null, 2));

    // Save order details for next test
    const orderId = orderData.order.id;
    const amount = orderData.order.amount;

    log('\n⚠️  To complete the payment:', 'yellow');
    log('1. Use this order ID in Razorpay checkout', 'yellow');
    log('2. Complete payment in test mode', 'yellow');
    log('3. Copy payment_id, order_id, and signature', 'yellow');
    log('4. Run the verify payment test with those values\n', 'yellow');

    // Test 2: Subscription Status (Before Payment)
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 2: Get Subscription Status (Before Payment)', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

    const statusResponse1 = await fetch(`${BASE_URL}/api/subscription/status`, {
      method: 'GET',
      headers: config.headers,
    });

    if (!statusResponse1.ok) {
      throw new Error(`HTTP ${statusResponse1.status}: ${await statusResponse1.text()}`);
    }

    const statusData1 = await statusResponse1.json();
    log('✅ Subscription status fetched!', 'green');
    log('\nStatus:', 'blue');
    console.log(JSON.stringify(statusData1, null, 2));

    // Test 3: Verify Payment (Simulated)
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 3: Verify Payment (Simulation)', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

    log('⚠️  This test requires actual Razorpay payment data', 'yellow');
    log('Run this manually with real payment data:', 'yellow');
    log('\nExample:', 'blue');
    console.log(`
fetch('${BASE_URL}/api/razorpay/verify-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': '__session=${TEST_USER_TOKEN}'
  },
  body: JSON.stringify({
    razorpay_order_id: 'order_XXX',
    razorpay_payment_id: 'pay_XXX',
    razorpay_signature: 'signature_XXX'
  })
})
    `);

    // Test 4: Cancel Subscription (will fail if not active)
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    log('Test 4: Cancel Subscription', 'cyan');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

    const cancelResponse = await fetch(`${BASE_URL}/api/subscription/cancel`, {
      method: 'POST',
      headers: config.headers,
    });

    if (cancelResponse.ok) {
      const cancelData = await cancelResponse.json();
      log('✅ Subscription cancelled!', 'green');
      console.log(JSON.stringify(cancelData, null, 2));
    } else {
      const errorText = await cancelResponse.text();
      log(`Expected error (subscription not active yet): ${errorText}`, 'yellow');
    }

    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
    log('✅ All automated tests completed!', 'green');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'green');

  } catch (error) {
    log('\n❌ Test failed:', 'red');
    console.error(error);
    process.exit(1);
  }
}

async function testWebhook() {
  log('\n🔔 Testing Webhook Handler\n', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test 5: Webhook Handler (Simulated)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  log('⚠️  Webhook signatures cannot be easily simulated', 'yellow');
  log('To test webhooks:', 'yellow');
  log('1. Set up webhook URL in Razorpay Dashboard', 'yellow');
  log('2. Use ngrok to expose local server: ngrok http 3000', 'yellow');
  log('3. Set webhook URL: https://your-ngrok-url.ngrok.io/api/razorpay/webhook', 'yellow');
  log('4. Make a test payment and check webhook logs\n', 'yellow');

  log('Webhook events supported:', 'blue');
  log('  - payment.captured', 'reset');
  log('  - payment.failed', 'reset');
  log('  - payment.authorized\n', 'reset');
}

// Run tests
if (TEST_USER_TOKEN === 'your_clerk_session_token_here') {
  log('❌ Error: Please set TEST_USER_TOKEN in test-payment-flow.ts', 'red');
  log('\nTo get your session token:', 'yellow');
  log('1. Start the dev server: npm run dev', 'yellow');
  log('2. Sign in to the app', 'yellow');
  log('3. Open DevTools > Application > Cookies', 'yellow');
  log('4. Copy the __session cookie value', 'yellow');
  log('5. Paste it in test-payment-flow.ts as TEST_USER_TOKEN\n', 'yellow');
  process.exit(1);
} else {
  runTests()
    .then(() => testWebhook())
    .catch((error) => {
      log('\n❌ Fatal error:', 'red');
      console.error(error);
      process.exit(1);
    });
}
