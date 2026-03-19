/**
 * Manual API Testing Guide for Razorpay Endpoints
 * 
 * Use this file to test endpoints with curl or Postman
 */

// ============================================
// SETUP
// ============================================

// 1. Start dev server
npm run dev

// 2. Get your Clerk session token:
//    - Sign in to the app
//    - Open DevTools > Application > Cookies
//    - Copy the __session cookie value
//    - Use it in all requests

const CLERK_SESSION_TOKEN = 'your_clerk_session_token_here';

// ============================================
// TEST 1: CREATE ORDER
// ============================================

/**
 * Endpoint: POST /api/razorpay/create-order
 * Creates a Razorpay order for ₹500 subscription
 */

// CURL:
curl -X POST http://localhost:3000/api/razorpay/create-order \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=${CLERK_SESSION_TOKEN}"

// Expected Response:
{
  "success": true,
  "order": {
    "id": "order_XXXXXXXXXXXXX",
    "amount": 50000,  // in paise (₹500)
    "currency": "INR"
  },
  "plan": {
    "name": "Premium Plan",
    "price": 500,
    "currency": "INR"
  },
  "subscription": {
    "id": "uuid",
    "status": "INACTIVE"
  }
}

// ============================================
// TEST 2: VERIFY PAYMENT
// ============================================

/**
 * Endpoint: POST /api/razorpay/verify-payment
 * Verifies payment and activates subscription
 * 
 * NOTE: You need actual payment data from Razorpay
 * Complete a payment first using Razorpay checkout
 */

// CURL:
curl -X POST http://localhost:3000/api/razorpay/verify-payment \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=${CLERK_SESSION_TOKEN}" \
  -d '{
    "razorpay_order_id": "order_XXXXXXXXXXXXX",
    "razorpay_payment_id": "pay_XXXXXXXXXXXXX",
    "razorpay_signature": "signature_generated_by_razorpay"
  }'

// Expected Response:
{
  "success": true,
  "message": "Payment verified and subscription activated",
  "subscription": {
    "id": "uuid",
    "status": "ACTIVE",
    "currentPeriodStart": "2026-02-15T00:00:00.000Z",
    "currentPeriodEnd": "2026-03-17T00:00:00.000Z",
    "plan": {
      "name": "PREMIUM",
      "displayName": "Premium Plan",
      "price": "500.00"
    }
  },
  "payment": {
    "id": "uuid",
    "amount": 500,
    "currency": "INR",
    "status": "CAPTURED",
    "paymentMethod": "card"
  }
}

// ============================================
// TEST 3: GET SUBSCRIPTION STATUS
// ============================================

/**
 * Endpoint: GET /api/subscription/status
 * Get current user's subscription details
 */

// CURL:
curl -X GET http://localhost:3000/api/subscription/status \
  -H "Cookie: __session=${CLERK_SESSION_TOKEN}"

// Expected Response (INACTIVE):
{
  "hasSubscription": false,
  "isActive": true,
  "status": "INACTIVE",
  "message": "No subscription found. Please subscribe to access all features."
}

// Expected Response (ACTIVE):
{
  "hasSubscription": true,
  "isActive": true,
  "subscription": {
    "id": "uuid",
    "status": "ACTIVE",
    "startDate": "2026-02-15T00:00:00.000Z",
    "currentPeriodStart": "2026-02-15T00:00:00.000Z",
    "currentPeriodEnd": "2026-03-17T00:00:00.000Z",
    "autoRenew": true,
    "cancelledAt": null,
    "daysRemaining": 30,
    "isExpired": false,
    "plan": {
      "name": "PREMIUM",
      "displayName": "Premium Plan",
      "description": "Full access to all WhatsApp features",
      "price": 500,
      "currency": "INR"
    }
  },
  "recentPayments": [
    {
      "id": "uuid",
      "amount": 500,
      "currency": "INR",
      "status": "CAPTURED",
      "paymentMethod": "card",
      "billingPeriodStart": "2026-02-15T00:00:00.000Z",
      "billingPeriodEnd": "2026-03-17T00:00:00.000Z",
      "createdAt": "2026-02-15T10:30:00.000Z"
    }
  ]
}

// ============================================
// TEST 4: CANCEL SUBSCRIPTION
// ============================================

/**
 * Endpoint: POST /api/subscription/cancel
 * Cancel subscription (stops auto-renewal)
 * User can still access until current period ends
 */

// CURL:
curl -X POST http://localhost:3000/api/subscription/cancel \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=${CLERK_SESSION_TOKEN}"

// Expected Response:
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "subscription": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelledAt": "2026-02-15T10:30:00.000Z",
    "currentPeriodEnd": "2026-03-17T00:00:00.000Z",
    "accessUntil": "2026-03-17T00:00:00.000Z",
    "plan": {
      "name": "PREMIUM",
      "displayName": "Premium Plan",
      "price": "500.00"
    }
  }
}

// ============================================
// TEST 5: REACTIVATE SUBSCRIPTION
// ============================================

/**
 * Endpoint: DELETE /api/subscription/cancel
 * Reactivate a cancelled subscription (before expiry)
 */

// CURL:
curl -X DELETE http://localhost:3000/api/subscription/cancel \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=${CLERK_SESSION_TOKEN}"

// Expected Response:
{
  "success": true,
  "message": "Subscription reactivated successfully",
  "subscription": {
    "id": "uuid",
    "status": "ACTIVE",
    "autoRenew": true,
    "currentPeriodEnd": "2026-03-17T00:00:00.000Z",
    "plan": {
      "name": "PREMIUM",
      "displayName": "Premium Plan"
    }
  }
}

// ============================================
// TEST 6: WEBHOOK HANDLER
// ============================================

/**
 * Endpoint: POST /api/razorpay/webhook
 * Receives webhooks from Razorpay
 * 
 * NOTE: Must have valid webhook signature from Razorpay
 * Test this by setting up webhooks in Razorpay Dashboard
 */

// Setup for webhook testing:
// 1. Install ngrok: npm install -g ngrok
// 2. Expose local server: ngrok http 3000
// 3. Copy ngrok URL (e.g., https://abc123.ngrok.io)
// 4. Go to Razorpay Dashboard > Settings > Webhooks
// 5. Add webhook URL: https://abc123.ngrok.io/api/razorpay/webhook
// 6. Configure webhook secret in .env: RAZORPAY_WEBHOOK_SECRET=your_secret
// 7. Select events: payment.captured, payment.failed, payment.authorized
// 8. Make a test payment and check logs

// Webhook payload example (payment.captured):
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_XXXXXXXXXXXXX",
        "order_id": "order_XXXXXXXXXXXXX",
        "amount": 50000,
        "currency": "INR",
        "status": "captured",
        "method": "card",
        "notes": {
          "userId": "user_clerk_id",
          "purpose": "subscription_payment"
        }
      }
    }
  }
}

// ============================================
// ERROR RESPONSES
// ============================================

// 401 Unauthorized (no auth token)
{
  "error": "Unauthorized"
}

// 400 Bad Request (already has active subscription)
{
  "error": "You already have an active subscription"
}

// 400 Bad Request (invalid payment signature)
{
  "error": "Invalid payment signature"
}

// 404 Not Found (subscription not found)
{
  "error": "Subscription not found"
}

// 500 Internal Server Error
{
  "error": "Failed to create payment order"
}

// 503 Service Unavailable (Razorpay not configured)
{
  "error": "Payment system not configured"
}

// ============================================
// TESTING CHECKLIST
// ============================================

// □ Test create order without auth (should fail with 401)
// □ Test create order with auth and no Razorpay config (should fail with 503)
// □ Test create order successfully
// □ Test create order when already have active subscription (should fail with 400)
// □ Test verify payment with invalid signature (should fail with 400)
// □ Test verify payment with valid data
// □ Test subscription status before payment
// □ Test subscription status after payment
// □ Test cancel subscription without active subscription (should fail)
// □ Test cancel subscription with active subscription
// □ Test reactivate cancelled subscription
// □ Test webhook with invalid signature (should fail with 401)
// □ Test webhook with valid Razorpay data

// ============================================
// POSTMAN COLLECTION
// ============================================

/**
 * Import this as a Postman collection:
 * 
 * 1. Create new Postman collection: "WaChat SaaS Payment"
 * 2. Add environment variable: CLERK_SESSION_TOKEN
 * 3. Add requests:
 *    - POST {{baseUrl}}/api/razorpay/create-order
 *    - POST {{baseUrl}}/api/razorpay/verify-payment
 *    - GET {{baseUrl}}/api/subscription/status
 *    - POST {{baseUrl}}/api/subscription/cancel
 *    - DELETE {{baseUrl}}/api/subscription/cancel
 *    - POST {{baseUrl}}/api/razorpay/webhook
 * 4. Add Cookie header to all requests: __session={{CLERK_SESSION_TOKEN}}
 */
