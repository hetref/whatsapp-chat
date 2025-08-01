# WhatsApp Web Clone

A fully functional WhatsApp-like web application built with Next.js 15, Supabase, and WhatsApp Cloud API. This application provides real-time messaging, responsive design, and seamless integration with WhatsApp Business API.

## 🚀 Features

- **Real-time Messaging**: Live message updates using Supabase real-time subscriptions
- **Responsive Design**: Mobile-first design that adapts to desktop and mobile layouts
- **WhatsApp Integration**: Send and receive messages via WhatsApp Cloud API
- **User Management**: Automatic user creation and management
- **Infinite Scrolling**: Efficient message loading with pagination
- **Modern UI**: WhatsApp-like interface with Tailwind CSS
- **Authentication**: Secure user auth with Supabase Auth
- **Type Safety**: Full TypeScript support

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Real-time**: Supabase Real-time subscriptions
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **WhatsApp API**: Meta WhatsApp Cloud API

## 📋 Prerequisites

1. **Node.js**: Version 18 or higher
2. **Supabase Account**: [Create account](https://supabase.com)
3. **WhatsApp Business Account**: [Meta Business](https://business.facebook.com/)
4. **WhatsApp Cloud API**: Access via Meta Developers

## 🔧 Installation & Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd whatsapp-chat
npm install
```

### 2. Database Setup

1. Create a new Supabase project at [database.new](https://database.new)

2. Run these SQL commands in your Supabase SQL editor:

```sql
-- Create users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_sent_by_me BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Enable real-time for both tables
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can insert themselves" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can view all messages" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id);
```

3. Enable real-time in your Supabase dashboard:
   - Go to Database → Replication
   - Enable replication for `users` and `messages` tables

### 3. WhatsApp Cloud API Setup

1. **Create Meta App**:
   - Go to [Meta Developers](https://developers.facebook.com/)
   - Create a new app → Business → WhatsApp

2. **Configure WhatsApp**:
   - Add WhatsApp product to your app
   - Get your Phone Number ID from the WhatsApp setup
   - Generate a permanent access token

3. **Set up Webhook**:
   - Webhook URL: `https://yourdomain.com/api/webhook`
   - Verify Token: Your custom verification token
   - Subscribe to `messages` webhook fields

### 4. Environment Variables

Create a `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key

# WhatsApp Cloud API Configuration
PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_TOKEN=your_permanent_access_token
VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_API_VERSION=v23.0
```

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see your WhatsApp web clone!

## 📱 Usage

### For Users
1. **Sign Up/Login**: Create account or login via the landing page
2. **View Contacts**: See all users who have messaged you
3. **Send Messages**: Click on a contact and start messaging
4. **Real-time Updates**: Messages appear instantly without refresh
5. **Mobile Support**: Works seamlessly on mobile devices

### For Developers
1. **API Endpoints**:
   - `GET/POST /api/webhook` - WhatsApp webhook handler
   - `GET/POST /api/send-message` - Send messages via WhatsApp API

2. **Real-time Subscriptions**:
   - User list updates automatically
   - Messages appear in real-time
   - No polling required

## 🏗️ Project Structure

```
├── app/
│   ├── api/
│   │   ├── webhook/route.ts          # WhatsApp webhook handler
│   │   └── send-message/route.ts     # Send messages API
│   ├── auth/                         # Authentication pages
│   ├── protected/                    # Main chat interface
│   │   ├── layout.tsx               # Chat layout
│   │   └── page.tsx                 # Main chat page
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Landing page
├── components/
│   ├── chat/
│   │   ├── user-list.tsx            # Contact list component
│   │   └── chat-window.tsx          # Chat interface component
│   ├── ui/                          # Reusable UI components
│   └── ...                          # Other components
├── lib/
│   ├── supabase/                    # Supabase client configuration
│   └── utils.ts                     # Utility functions
└── ...
```

## 🔐 Security Features

- **Row Level Security**: Database-level access control
- **Authentication**: Supabase Auth integration
- **API Validation**: Request validation and sanitization
- **Environment Variables**: Secure credential management
- **CORS Protection**: API endpoint protection

## 🎨 UI/UX Features

- **WhatsApp-like Design**: Familiar user interface
- **Dark/Light Mode**: Theme switching support
- **Responsive Layout**: Mobile and desktop optimized
- **Smooth Animations**: Transition effects
- **Loading States**: User feedback during operations
- **Error Handling**: Graceful error messages

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🐛 Troubleshooting

### Common Issues

1. **Webhook not receiving messages**:
   - Check webhook URL is accessible
   - Verify webhook token matches
   - Check Meta app webhook configuration

2. **Messages not sending**:
   - Verify WhatsApp API credentials
   - Check access token permissions
   - Ensure phone number is verified

3. **Real-time not working**:
   - Check Supabase real-time is enabled
   - Verify RLS policies
   - Check network connectivity

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```bash
NODE_ENV=development
```

## 📚 API Documentation

### Webhook Endpoint (`/api/webhook`)

**GET** - Webhook verification
- Query params: `hub.mode`, `hub.verify_token`, `hub.challenge`
- Returns: Challenge string on success

**POST** - Receive WhatsApp messages
- Body: WhatsApp webhook payload
- Creates users and stores messages automatically

### Send Message Endpoint (`/api/send-message`)

**POST** - Send WhatsApp message
```json
{
  "to": "phone_number",
  "message": "Hello, World!"
}
```

**GET** - Check API status
- Returns: Configuration status and info

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend as a Service
- [Next.js](https://nextjs.org) - React Framework
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- [Meta WhatsApp API](https://developers.facebook.com/docs/whatsapp) - WhatsApp integration
- [Lucide Icons](https://lucide.dev) - Beautiful icons

## 📞 Support

If you have any questions or need help, please:
1. Check the troubleshooting section
2. Search existing GitHub issues
3. Create a new issue with detailed information

---

**Happy Messaging! 💬**
