# WaChat - Enterprise WhatsApp Business Platform

<div align="center">

**A fully functional, production-ready WhatsApp Business integration platform built with Next.js 15, Clerk Auth, NeonDB, and WhatsApp Cloud API.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square&logo=clerk)](https://clerk.com)
[![NeonDB](https://img.shields.io/badge/NeonDB-Database-00D9FF?style=flat-square&logo=neon)](https://neon.tech)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-complete-feature-list) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Deployment](#-deployment)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Complete Feature List](#-complete-feature-list)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Setup Guide](#-complete-setup-guide)
- [Features Documentation](#-features-documentation)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Complete Feature List

### 💬 Messaging Features
- **Real-time Chat** - Live message updates with optimistic UI
- **Text Messages** - Send and receive unlimited text messages
- **Media Messages** - Images, videos, audio, and documents
- **Template Messages** - Pre-approved message templates
- **Broadcast Groups** - Send messages to multiple contacts
- **Message Status** - Delivery and read receipts
- **Custom Names** - Personalize contact display names

### 🔌 API Features
- **RESTful API** - Complete WhatsApp messaging API
- **API Key Management** - Secure access with encrypted keys
- **Rate Limiting** - Built-in protection and quotas
- **Webhook Support** - Receive real-time message events
- **Template Management** - Create and manage templates via API
- **Message Sending** - Text, template, and media messages

### 🛠️ Platform Features
- **Multi-tenant** - Each user has isolated WhatsApp configuration
- **User Authentication** - Secure login with Clerk
- **Cloud Storage** - AWS S3 integration for media files
- **Database** - PostgreSQL via NeonDB with Prisma ORM
- **Type Safety** - Full TypeScript support
- **Responsive Design** - Works on desktop and mobile

**Real-time Message Updates**

WaChat provides real-time messaging experience through:

- **Live State Management**: React hooks for instant UI updates
- **Optimistic Updates**: Messages appear immediately when sent
- **Smart Polling**: Efficient message synchronization
- **Auto-scroll**: Jump to latest messages automatically

## 🛠️ Technology Stack

### Frontend
```
Framework:      Next.js 15 with App Router
UI Library:     React 19
Language:       TypeScript 5
Styling:        Tailwind CSS 3
Icons:          Lucide React
Components:     Shadcn/ui
State:          React Hooks
```

### Backend
```
API:            Next.js API Routes
Database:       NeonDB (PostgreSQL)
ORM:            Prisma
Storage:        AWS S3
Authentication: Clerk Auth
Middleware:     Clerk Middleware
Session:        JWT with Clerk
```

### Integrations
```
WhatsApp:       Meta WhatsApp Cloud API (v23.0)
Cloud Storage:  AWS SDK v3
Image Optimize: Next.js Image Component
```

### Development
```
Package Manager: npm
Version Control: Git
Deployment:      Vercel (recommended)
```

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Clerk Account** ([Sign up](https://clerk.com))
- **NeonDB Account** ([Sign up](https://neon.tech))
- **Meta Business Account** ([Sign up](https://business.facebook.com/))
- **WhatsApp Business API** access
- **AWS Account** for S3 storage ([Sign up](https://aws.amazon.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/hetref/whatsapp-chat.git
cd whatsapp-chat

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create environment file
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local

# Run database migrations (see Setup Guide)
# Then start development server
npm run dev
```

Visit `http://localhost:3000` - you're ready to go! 🎉

---

## 📚 Complete Setup Guide

### Step 1: Authentication Setup (Clerk)

#### 1.1 Create Clerk Project

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Create a new application
3. Choose your authentication methods (Email, OAuth, etc.)
4. Get your API keys from the "API Keys" section
5. Note your Publishable Key and Secret Key

#### 1.2 Configure Environment Variables

Add Clerk credentials to your `.env.local`:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```



```sql
The database schema is automatically handled by Prisma. Your schema is defined in `prisma/schema.prisma` and applied to NeonDB using:

```bash
# Apply schema to database
npx prisma db push

# Generate type-safe client
npx prisma generate
```
```

### Step 4: AWS S3 Setup

#### 4.1 Create S3 Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click **Create bucket**
3. Choose a unique name (e.g., `your-company-wachat-media`)
4. Select your preferred region
5. **Block all public access** (recommended)
6. Enable versioning (optional)
7. Create the bucket

#### 4.2 Create IAM User

### Step 3: AWS S3 Setup

#### 3.1 Create S3 Bucket

```bash
aws s3 mb s3://wachat-media-bucket --region us-east-1
```

Or via AWS Console:
1. Go to AWS S3 Console
2. Create bucket with unique name
3. **Block all public access** ✅
4. Create bucket

#### 3.2 Create IAM User

Create user with this policy:

#### 3.3 Configure Credentials in App

**🎯 NEW: User-Specific Configuration**

WaChat now supports **multi-tenant** configuration. Each user stores their own WhatsApp credentials:

1. **Sign up** and **log in** to WaChat
2. Navigate to **Setup** page (`/protected/setup`)
3. Fill in your WhatsApp credentials:
   - Access Token
   - Phone Number ID 
   - Business Account ID
4. **Save Configuration**
5. Generate a **Webhook Token** (unique per user)

📝 **Note**: No more environment variables needed for WhatsApp credentials!

#### 3.4 Configure Webhook in Meta

1. Go to Meta Developers → Your App → WhatsApp → Configuration
2. Add webhook URL: `https://your-domain.com/api/webhook/[your-webhook-token]`
3. Use your **unique webhook token** from the setup page
4. Set verify token to match your configuration
5. Subscribe to **messages** events
6. Test the webhook connection
Add your environment variables to the deployed platform:

```env
# Required environment variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
DATABASE_URL="postgresql://..."
AWS_ACCESS_KEY_ID="your_key"
AWS_SECRET_ACCESS_KEY="your_secret" 
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-bucket-name"
```

# ============================================
# WHATSAPP CONFIGURATION (Optional - Legacy)
# ============================================
# NOTE: WhatsApp credentials are now configured per-user through the UI
# You can optionally keep these for backward compatibility, but they're not required
# The app will use user-specific credentials from the database
```

**🔑 Important:** Ensure your Clerk secret key is properly configured in environment variables for secure API authentication.

### Step 5: Run Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` 🎉

---

## 📖 Features Documentation

### ⚙️ Initial Setup (Multi-Tenant)

**First Time Setup:**

After deploying the application and creating your account, you'll be automatically redirected to the setup page (`/protected/setup`).

**Setup Page Features:**

1. **Access Token Configuration** (Required for sending messages)
   - 🔑 Access Token - Your permanent WhatsApp Business API token
   - 📱 Phone Number ID - Your WhatsApp Business phone number ID
   - 🏢 Business Account ID - For template management
   - 🔢 API Version - WhatsApp API version (default: v23.0)

2. **Webhook Configuration** (Required for receiving messages)
   - 🔐 Verify Token - Your custom security token
   - 🔗 Webhook URL - Automatically generated unique URL for you
   
**Multi-User Support:**

- Each user gets their own WhatsApp Business configuration
- Users can manage different businesses independently
- Credentials are securely stored in the database
- No need to redeploy when changing credentials
- Full data isolation between users

**After Setup:**

- ✅ Access token configured → You can send messages and templates
- ✅ Webhook configured & verified → You can receive messages
- 🎉 Both configured → Full bidirectional chat functionality

### 🚀 Real-time Messaging

WaChat provides instant message delivery through optimized state management:

**How it works:**
- Live React state updates for instant UI feedback
- Smart polling for message synchronization
- Sub-second message delivery
- Smart duplicate prevention
- Optimistic UI updates

### 📢 Broadcast Groups

**Creating a Broadcast Group:**

1. Click **Users** icon in chat header
2. Click **Create broadcast group**
3. Enter group name and description
4. Select members from contact list
5. Click **Create Group**

**Sending Broadcasts:**

1. Click **Broadcast** on a group
2. Type message or select template
3. Click **Send**
4. Message delivered to all members individually

**Key Benefits:**
- Each member receives as personal message
- Track individual read status
- See messages in each member's chat
- Real-time broadcast window

### 📋 Template Management

**Creating Templates:**

1. Navigate to **Templates**
2. Click **Create Template**
3. Fill template details:
   - Name (lowercase, underscores only)
   - Category (MARKETING, UTILITY, AUTHENTICATION)
   - Language
4. Add components:
   - Header (optional): Text or media
   - Body (required): Main message with variables
   - Footer (optional): Small text
   - Buttons (optional): Quick Reply, URL, Phone
5. Use `{{1}}`, `{{2}}` for dynamic content
6. Submit for Meta approval

**Sending Templates:**

1. Click template icon (💬) in chat
2. Select approved template
3. Fill variable values
4. Preview and send

### 🗄️ Media Messages

**Supported Types:**

- **Images**: JPG, PNG, WebP, GIF (max 5MB)
- **Videos**: MP4, MOV, AVI (max 16MB)
- **Audio**: MP3, AAC, voice messages (max 16MB)
- **Documents**: PDF, DOC, XLS, PPT (max 100MB)

**Upload Methods:**

- Drag & drop files into chat window
- Click attachment icon (📎)
- Multi-file selection supported

### 👤 User Management

**Custom Names:**

Display Priority:
1. Custom Name (user-set) ⭐
2. WhatsApp Name (from profile)
3. Phone Number (fallback)

**Edit Methods:**
- Hover over user → Click edit icon
- Click chat header → User info dialog → Edit name

**Create New Chat:**

1. Click **+** button
2. Enter phone number: `+1234567890` (E.164 format)
3. Optional: Add custom name
4. Click **Create Chat**

---

## 🔌 API Reference

### WhatsApp Cloud API (WC API)

WaChat provides a comprehensive REST API for programmatic access to WhatsApp messaging features.

#### Available Endpoints

**Status & Health**
- `GET /api/wc/status` - Check API status and template statistics

**Template Management**
- `GET /api/wc/templates` - List all templates with pagination
- `POST /api/wc/templates` - Create new template
- `GET /api/wc/templates/:id` - Get specific template details
- `DELETE /api/wc/templates/:id` - Delete template

**Message Sending**
- `POST /api/wc/messages/text` - Send text messages (max 4096 chars)
- `POST /api/wc/messages/template` - Send template messages with variables
- `POST /api/wc/messages/media` - Send media files (images, videos, audio, documents)

**API Key Management**
- `GET /api/api-keys` - List your API keys
- `POST /api/api-keys` - Create new API key
- `PATCH /api/api-keys` - Update API key name
- `DELETE /api/api-keys` - Revoke API key

📖 **Complete Documentation:**
- **[WC API Documentation](./WC_API_DOCUMENTATION.md)** - Full API reference with examples
- **[Quick Start Guide](./WC_API_QUICK_START.md)** - Get started in 5 minutes
- **[API Structure Guide](./API_STRUCTURE.md)** - Extend the API with custom endpoints

#### Authentication

All WC API requests require an API key in the Authorization header:

```bash
Authorization: Bearer wc_live_your_api_key_here
```

**Creating API Keys:**
1. Navigate to `/protected/api-keys`
2. Click "Create API Key"
3. Give it a descriptive name
4. Copy and securely store the key (shown only once)

**Example Request:**

```bash
# Send a text message
curl -X POST https://yourdomain.com/api/wc/messages/text \
  -H "Authorization: Bearer wc_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "text": "Hello from WaChat API!"
  }'
```

**Key Features:**
- 🔑 API Key Management - Create, manage, and secure API keys
- 📋 Template Management - Create, list, and manage message templates
- 💬 Message Sending - Text, template, and media messages
- 📊 Status Monitoring - Check API health and template statistics
- 🔐 Secure Authentication - Bearer token with encryption
- 📝 Comprehensive Error Handling - Detailed error messages and codes

**Base URL:** `https://yourdomain.com/api/wc`

---

### Legacy Internal APIs

The following endpoints are used internally by the WaChat UI:

### Authentication

All internal API routes require authentication via Clerk session.

### Message APIs

#### `POST /api/send-message`
Send text message.

```typescript
Request:
{
  "to": "+1234567890",
  "message": "Hello!"
}

Response:
{
  "success": true,
  "messageId": "wamid.123..."
}
```

#### `POST /api/send-media`
Upload and send media.

```typescript
FormData:
  to: string
  files: File[]
  captions: string[]

Response:
{
  "success": true,
  "successCount": 2,
  "failureCount": 0
}
```

#### `POST /api/send-template`
Send template message.

```typescript
Request:
{
  "to": "+1234567890",
  "templateName": "order_confirmation",
  "templateData": { ... },
  "variables": {
    "header": { "1": "John" },
    "body": { "1": "12345" }
  }
}
```

### Broadcast APIs

#### `POST /api/groups`
Create broadcast group.

```typescript
Request:
{
  "name": "Marketing Team",
  "description": "All marketing contacts",
  "memberIds": ["+1234567890", "+9876543210"]
}
```

#### `GET /api/groups`
Get all user's broadcast groups.

#### `POST /api/groups/[id]/broadcast`
Send broadcast message.

```typescript
Request:
{
  "message": "Hello team!",
  "messageType": "text"
}
```

### Template APIs

#### `GET /api/templates`
Fetch all templates.

#### `POST /api/templates/create`
Create new template.

#### `DELETE /api/templates/delete`
Delete template.

### User APIs

#### `POST /api/users/update-name`
Update custom name.

#### `POST /api/users/create-chat`
Create new chat.

---

## 🚀 Deployment

### Vercel Deployment (Recommended)

**Step-by-step:**

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Add environment variables
   - Deploy!

3. **Update Webhook**
   - Update WhatsApp webhook URL to:
   - `https://your-app.vercel.app/api/webhook/YOUR_TOKEN`

### Environment Variables Checklist

**Required for Deployment:**

- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- ✅ `CLERK_SECRET_KEY`
- ✅ `DATABASE_URL` 🗄️ **NeonDB connection string**
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `AWS_REGION`
- ✅ `AWS_BUCKET_NAME`

**Not Required (Configured Through UI):**

- ❌ ~~`WHATSAPP_TOKEN`~~ - Now set per-user in `/protected/setup`
- ❌ ~~`WHATSAPP_PHONE_NUMBER_ID`~~ - Now set per-user in `/protected/setup`
- ❌ ~~`WHATSAPP_BUSINESS_ACCOUNT_ID`~~ - Now set per-user in `/protected/setup`
- ❌ ~~`WHATSAPP_API_VERSION`~~ - Now set per-user in `/protected/setup`
- ❌ ~~`WHATSAPP_VERIFY_TOKEN`~~ - Now set per-user in `/protected/setup`

---

## 🐛 Troubleshooting

### Common Issues

#### "Authentication Required" in Webhook Logs

**Problem:** Webhook receives messages but authentication fails.

**Root Cause:** Webhook endpoint requires valid authentication.

**Solution:**
1. **Check Clerk authentication is properly configured** in environment variables
2. Verify webhook token is correctly set in user settings
3. Ensure webhook URL includes the correct token parameter
4. Restart your application after configuration changes

**Why this happens:**
- Webhooks come from WhatsApp (external source)
- Authentication middleware may be blocking webhook requests
- Incorrect token configuration in webhook URL

#### Webhook Not Working
**Solution:**
1. Verify webhook URL is publicly accessible (test in browser)
2. Check verify token matches between app and Meta settings
3. Confirm subscribed to "messages" field in Meta webhook settings
4. Check Clerk authentication is configured properly
5. Review webhook logs in your deployment platform
6. Test with Meta's webhook test button

#### Messages Not Sending
**Solution:**
1. **Complete Setup:** Go to `/protected/setup` and configure credentials
2. Verify access token is **permanent** (not test token - expires in 24h)
3. Check phone number ID is correct (numeric ID from Meta)
4. Check business account ID is correct
5. Ensure recipient has WhatsApp account
6. Review API version compatibility (default v23.0 works)

#### Real-time Updates Not Working
**Solution:**
1. Check React state management is functioning properly
2. Verify API polling intervals are appropriate
3. Review browser console for JavaScript errors
4. Test message updates by refreshing the page

#### Images Not Loading
**Solution:**
1. Verify S3 bucket configuration
2. Check `next.config.ts` has S3 hostname in `remotePatterns`
3. Confirm pre-signed URLs not expired (24-hour expiry)
4. Test bucket permissions with IAM user
5. Check AWS credentials are correct in environment variables

#### Templates Not Loading
**Solution:**
1. **Complete Setup:** Ensure Business Account ID is configured in `/protected/setup`
2. Check business account ID matches your Meta Business Suite
3. Verify access token has template permissions
4. Check templates exist in Meta Business Manager
5. Review template status (must be APPROVED to send)

#### Can't Access Chat After Signup
**Solution:**
1. You need to complete setup first
2. Navigate to `/protected/setup`
3. Configure at least one: Access Token **OR** Webhook
4. After saving, you'll be able to access the chat interface

---

## 🤝 Contributing

We welcome contributions! Here's how:

### Reporting Bugs

1. Check existing issues
2. Create detailed bug report
3. Include reproduction steps
4. Add screenshots
5. Specify environment

### Code Contributions

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Update documentation
6. Submit pull request

### Code Standards

- Follow TypeScript best practices
- Use ESLint configuration
- Write meaningful commits
- Add comments for complex logic
- Update README when needed

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

### Technologies
- [Next.js](https://nextjs.org) - React Framework
- [Clerk](https://clerk.com) - Authentication Platform
- [NeonDB](https://neon.tech) - Database Platform
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Lucide Icons](https://lucide.dev) - Icons
- [Shadcn/ui](https://ui.shadcn.com) - Components

### APIs & Services
- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp)
- [AWS S3](https://aws.amazon.com/s3/)
- [Vercel](https://vercel.com)

---

## 📞 Support

### Getting Help

1. **Documentation**: Read this README
2. **Issues**: Check existing issues
3. **Discussions**: GitHub Discussions
4. **Email**: wachat@aryanshinde.in

---

<div align="center">

## 🎉 Ready to Chat!

**WaChat** is production-ready and waiting for your customers.

**Start messaging now!** 💬✨

---

**Built with ❤️ using Next.js, Clerk Auth, NeonDB, and WhatsApp Cloud API**

[Get Started](#-quick-start) • [View Features](#-complete-feature-list) • [Read Docs](#-documentation)

</div>
