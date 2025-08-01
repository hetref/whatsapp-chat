# WhatsApp Web Clone - Setup Checklist

Use this checklist to ensure you have everything set up correctly for your WhatsApp web application.

## ✅ Prerequisites Setup

### 1. Development Environment
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

### 2. Accounts & Services
- [ ] Supabase account created at [supabase.com](https://supabase.com)
- [ ] Meta Business account at [business.facebook.com](https://business.facebook.com)
- [ ] Meta Developer account at [developers.facebook.com](https://developers.facebook.com)

## ✅ Database Setup (Supabase)

### 1. Create Project
- [ ] New Supabase project created
- [ ] Project name and region selected
- [ ] Database password saved securely

### 2. Database Schema
- [ ] `users` table created with correct schema
- [ ] `messages` table created with correct schema
- [ ] Foreign key relationships established
- [ ] Row Level Security (RLS) enabled on both tables
- [ ] Authentication policies created

### 3. Real-time Configuration
- [ ] Real-time replication enabled for `users` table
- [ ] Real-time replication enabled for `messages` table
- [ ] Webhook events configured

### 4. API Keys
- [ ] Supabase URL copied from Settings → API
- [ ] Supabase Anon Key copied from Settings → API

## ✅ WhatsApp API Setup

### 1. Meta App Configuration
- [ ] New Meta app created (Business type)
- [ ] WhatsApp product added to app
- [ ] App reviewed and approved (if required)

### 2. WhatsApp Business API
- [ ] Phone number added and verified
- [ ] Phone Number ID obtained
- [ ] Permanent access token generated
- [ ] Test message sent successfully

### 3. Webhook Configuration
- [ ] Webhook URL configured (your-domain.com/api/webhook)
- [ ] Verify token set and documented
- [ ] Webhook fields subscribed to (messages)
- [ ] Webhook verified and active

## ✅ Application Setup

### 1. Code Installation
- [ ] Repository cloned locally
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables file created (`.env.local`)

### 2. Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY` set
- [ ] `PHONE_NUMBER_ID` set
- [ ] `WHATSAPP_TOKEN` set
- [ ] `VERIFY_TOKEN` set
- [ ] `WHATSAPP_API_VERSION` set (default: v23.0)

### 3. Application Testing
- [ ] Development server starts (`npm run dev`)
- [ ] Homepage loads successfully
- [ ] Authentication pages accessible
- [ ] No console errors in browser
- [ ] Database connection working

## ✅ Feature Testing

### 1. Authentication
- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Protected routes redirect correctly
- [ ] Logout works properly

### 2. Chat Interface
- [ ] Chat layout displays correctly
- [ ] User list loads (even if empty)
- [ ] Chat window shows welcome message
- [ ] Mobile responsive layout works

### 3. API Endpoints
- [ ] Webhook endpoint accessible (GET /api/webhook)
- [ ] Send message endpoint accessible (GET /api/send-message)
- [ ] Webhook verification working
- [ ] API returns proper status codes

## ✅ Production Deployment

### 1. Deployment Platform
- [ ] Vercel/Netlify/Railway account set up
- [ ] Repository connected to deployment platform
- [ ] Build settings configured

### 2. Environment Variables (Production)
- [ ] All environment variables added to production
- [ ] Webhook URL updated to production domain
- [ ] WhatsApp webhook configured with production URL

### 3. Final Testing
- [ ] Production app loads successfully
- [ ] Authentication works in production
- [ ] Webhook receives test messages
- [ ] Messages can be sent successfully
- [ ] Real-time updates working

## 🐛 Common Issues & Solutions

### Database Issues
- **RLS blocking queries**: Ensure authentication policies are correctly set
- **Real-time not working**: Check replication settings and table REPLICA IDENTITY
- **Foreign key errors**: Verify user exists before creating messages

### WhatsApp API Issues
- **Webhook not verified**: Check verify token matches exactly
- **Messages not sending**: Verify access token and phone number permissions
- **Rate limiting**: Check API usage and rate limits

### Application Issues
- **Build errors**: Check TypeScript errors and missing dependencies
- **Environment variables**: Ensure all required variables are set
- **Authentication issues**: Check Supabase auth configuration

## 📞 Getting Help

If you encounter issues:

1. **Check this checklist** - ensure all steps are completed
2. **Review logs** - check browser console and server logs
3. **Test APIs individually** - use tools like Postman or curl
4. **Check documentation** - refer to Supabase and WhatsApp API docs
5. **Create GitHub issue** - provide detailed error information

---

**Once all items are checked, you're ready to start messaging! 🎉** 