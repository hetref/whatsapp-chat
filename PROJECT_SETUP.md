# WaChat Project Setup Guide

This guide explains how to set up and run the WaChat project from scratch in a new environment. WaChat is built with **Next.js 15**, **Clerk Auth**, **NeonDB**, **Prisma ORM**, and **AWS S3** for a complete WhatsApp Business integration platform.

---

## 1. Prerequisites

- Node.js 18 or newer
- npm (comes with Node.js)
- A Clerk account for authentication
- A NeonDB account for the database
- An AWS account with S3 bucket permissions
- A Meta Business / WhatsApp Cloud API account

---

## 2. Clone and Install

1. Clone the repository:

```bash
git clone https://github.com/hetref/whatsapp-chat.git
cd whatsapp-chat
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npx prisma generate
```

---

## 3. Environment Variables

Create a file named `.env.local` in the project root with the following values:

```bash
# ============================================
# CLERK AUTHENTICATION
# ============================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_clerk_publishable_key"
CLERK_SECRET_KEY="sk_test_your_clerk_secret_key"

# ============================================
# NEONDB DATABASE
# ============================================
DATABASE_URL="postgresql://username:password@ep-xxx.neon.tech/dbname?sslmode=require"

# ============================================
# AWS S3 CONFIGURATION
# ============================================
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=wachat-media-bucket
```

### Notes:
- **Clerk Keys**: Get these from your Clerk dashboard → API Keys section
- **Database URL**: Get this from your NeonDB dashboard → Connection Details
- **AWS Keys**: Create an IAM user with S3 access permissions
- **WhatsApp credentials are NOT needed in environment variables** - they are configured per-user in the app interface

---

## 4. Clerk Authentication Setup

1. Go to [clerk.com](https://clerk.com) and create a new application
2. Choose your authentication methods (Email/Password, OAuth providers, etc.)
3. In the Clerk dashboard, go to **API Keys**
4. Copy your Publishable Key and Secret Key
5. Add them to your `.env.local` file

## 5. NeonDB Database Setup

1. Go to [console.neon.tech](https://console.neon.tech) and create a new project
2. Choose your preferred region
3. Copy the connection string from the dashboard
4. Add it to your `.env.local` file as `DATABASE_URL`

### Initialize Database Schema

Run the following commands to set up your database:

```bash
# Push the Prisma schema to your database
npx prisma db push

# Generate the Prisma client
npx prisma generate

# Optional: Open Prisma Studio to view your database
npx prisma studio
```

This will create all the necessary tables:
- `users` - Stores user and contact information
- `messages` - WhatsApp message data
- `chat_groups` - Broadcast groups
- `group_members` - Group membership data
- `user_settings` - Per-user WhatsApp configuration

---

## 6. WhatsApp Cloud API Setup

### 6.1 Create Meta Business App

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Create a **Business** app
3. Add the **WhatsApp** product to your app
4. Get your credentials:
   - **Access Token** (make it permanent, not test token)
   - **Phone Number ID** 
   - **Business Account ID**
   - **Verify Token** (create your own secure string)

### 6.2 Configure in WaChat (Per User)

**🎯 Multi-Tenant Configuration**: Each user configures their own WhatsApp credentials through the web interface:

1. **Sign up** and **log in** to your deployed WaChat instance
2. Navigate to `/protected/setup` (you'll be redirected automatically)
3. Fill in the **Access Token Configuration**:
   - Access Token
   - Phone Number ID  
   - Business Account ID
4. **Save Configuration**
5. Generate a **Webhook Token** (unique per user)
6. Configure the webhook in Meta using the generated URL

### 6.3 Webhook Configuration

In Meta Developers → Your App → WhatsApp → Configuration:

1. **Webhook URL**: `https://your-domain.com/api/webhook/[your-unique-token]`
2. **Verify Token**: Match what you configured in the app
3. **Subscribe to Events**: `messages`
4. Test the webhook connection

**Benefits of this approach**:
- ✨ **Multi-tenant**: Multiple users can use different WhatsApp accounts
- 🔒 **Secure**: Credentials stored securely in database per user
- 🚀 **No redeployment** needed when changing credentials
- 👥 **Scalable**: Support multiple businesses from one deployment

---

## 7. AWS S3 Setup (Media Storage)

1. Create an S3 bucket (e.g., `wachat-media-bucket`) in your chosen region.
2. Block public access for the bucket.
3. Create an IAM user with permissions to `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on that bucket.
4. Put that user's `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` into `.env.local`.

Media files will be stored in S3 and accessed via presigned URLs generated by the backend.

---

## 8. Running the Project

### Development Mode

```bash
# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Additional Commands

```bash
# View your database in Prisma Studio
npx prisma studio

# Reset your database (WARNING: This will delete all data)
npx prisma db push --force-reset

# Generate Prisma client after schema changes
npx prisma generate
```

---

## 9. Deployment Options

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

- **Railway**: Connect GitHub repo, add env vars, deploy
- **Render**: Docker-based deployment with environment configuration
- **AWS/GCP/Azure**: Use container services with proper environment setup

### Environment Variables for Production

Ensure these are set in your deployment platform:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY` 
- `DATABASE_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_BUCKET_NAME`

---

## 10. Summary of Core Flows

### Authentication Flow
- **Clerk Auth** handles all user authentication and session management
- **Protected routes** are secured via Clerk middleware
- **JWT sessions** provide secure API access

### Message Flow
- **Incoming WhatsApp messages** → `/api/webhook/[token]` → Stored in NeonDB via Prisma
- **Outgoing messages** → `/api/send-message` → WhatsApp API + stored in database
- **Media messages** → Uploaded to AWS S3 → URLs stored in database

### Database Architecture
- **Prisma ORM** provides type-safe database operations
- **NeonDB** (PostgreSQL) stores all application data
- **Multi-tenant design** allows multiple WhatsApp businesses per deployment

### Real-time Updates
- **Live message updates** through React state management
- **Optimistic UI** for instant message display
- **Efficient polling** for new message detection

---

## 🚀 Quick Start Summary

1. **Clone repo** and run `npm install`
2. **Set up Clerk** authentication
3. **Create NeonDB** database and add connection string
4. **Configure AWS S3** for media storage
5. **Run `npx prisma db push`** to create database schema
6. **Start with `npm run dev`**
7. **Sign up** in the app and configure WhatsApp credentials
8. **Start messaging!** 🎉
