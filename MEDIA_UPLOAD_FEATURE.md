# Media Upload Feature Documentation

## 🚀 **Overview**

The media upload feature allows users to send images, videos, audio files, and documents directly from the WhatsApp web interface to WhatsApp contacts. It includes drag-and-drop functionality, file previews, caption support, and seamless integration with both WhatsApp Cloud API and AWS S3 storage.

## ✨ **Features**

### **📁 File Upload Methods**
- **Drag & Drop**: Drag files directly into the chat window
- **Click to Upload**: Use the attachment button (📎) to browse and select files
- **Multiple Files**: Upload and send multiple files simultaneously
- **File Preview**: Preview images and see file information before sending

### **🎯 Supported File Types**
- **Images**: JPG, PNG, GIF, WebP, BMP, TIFF
- **Videos**: MP4, MPEG, MOV, AVI, WebM
- **Audio**: MP3, M4A, WAV, WebM, OGG
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP, RAR

### **🔧 File Specifications**
- **Maximum File Size**: 25MB per file (WhatsApp limit)
- **Multiple Files**: No limit on number of files per upload
- **Captions**: Support for image and video captions (up to 1000 characters)

## 🎨 **User Interface**

### **Chat Window Integration**
- **Attachment Button**: 📎 icon next to message input
- **Drag & Drop Zone**: Entire chat window accepts dragged files
- **Visual Feedback**: Drag overlay with clear instructions
- **Loading States**: Progress indicators during upload and send

### **Media Upload Modal**
- **Responsive Design**: Works on desktop and mobile
- **File Previews**: Thumbnail previews for images
- **File Management**: Add/remove files, edit captions
- **Progress Tracking**: Real-time upload status

## 🔧 **Technical Implementation**

### **Components Structure**

```
components/
├── chat/
│   ├── media-upload.tsx      # Main upload modal component
│   └── chat-window.tsx       # Chat interface with drag-drop
app/
├── api/
│   └── send-media/
│       └── route.ts          # Media upload API endpoint
lib/
└── aws-s3.ts                 # S3 upload utilities
```

### **Key Components**

#### **1. MediaUpload Component** (`components/chat/media-upload.tsx`)
- **File Processing**: Handles file validation and preview generation
- **Drag & Drop**: Complete drag-and-drop implementation
- **UI Management**: Modal display, file list, caption editing
- **Upload Orchestration**: Coordinates with API for sending

#### **2. Enhanced ChatWindow** (`components/chat/chat-window.tsx`)
- **Drag & Drop Integration**: Window-level drag-and-drop handling
- **Attachment Button**: Quick access to media upload
- **Loading States**: Visual feedback during media operations
- **ESC Key Support**: Close upload modal with Escape key

#### **3. Send Media API** (`app/api/send-media/route.ts`)
- **WhatsApp Integration**: Upload media to WhatsApp Cloud API
- **Message Sending**: Send media messages with captions
- **S3 Storage**: Store copies in AWS S3 for persistence
- **Database Recording**: Log all sent media in Supabase

#### **4. AWS S3 Utilities** (`lib/aws-s3.ts`)
- **Direct Upload**: Upload File objects to S3
- **Pre-signed URLs**: Generate secure access URLs
- **MIME Type Handling**: Proper file extension mapping

## 🔄 **Media Upload Flow**

### **1. User Interaction**
```
User drags files OR clicks attachment button
    ↓
MediaUpload modal opens with file processing
    ↓
User reviews files, adds captions, confirms send
    ↓
Files are uploaded and sent via API
```

### **2. API Processing**
```
Receive files via FormData
    ↓
For each file:
  1. Upload to WhatsApp Cloud API
  2. Send message via WhatsApp
  3. Upload copy to AWS S3
  4. Store record in Supabase database
    ↓
Return success/failure results
```

### **3. Data Storage**
```
WhatsApp Cloud API: Temporary media hosting
    ↓
AWS S3: Permanent media storage
    ↓
Supabase: Message metadata and S3 URLs
```

## 📊 **Database Schema**

### **Messages Table Updates**
```sql
-- Existing columns
id TEXT PRIMARY KEY
sender_id TEXT
receiver_id TEXT
content TEXT
timestamp TIMESTAMPTZ
is_sent_by_me BOOLEAN

-- Media support columns
message_type TEXT DEFAULT 'text'
media_data JSONB

-- Indexes for performance
CREATE INDEX idx_messages_message_type ON messages(message_type);
CREATE INDEX idx_messages_media_data ON messages USING GIN (media_data);
```

### **Media Data JSON Structure**
```json
{
  "type": "image|video|audio|document",
  "id": "unique_media_id",
  "mime_type": "image/jpeg",
  "filename": "original_filename.jpg",
  "caption": "Optional caption text",
  "media_url": "https://s3-presigned-url",
  "s3_uploaded": true,
  "upload_timestamp": "2024-01-01T12:00:00Z",
  "whatsapp_media_id": "whatsapp_generated_id"
}
```

## 🔒 **Security & Storage**

### **AWS S3 Configuration**
- **Private Buckets**: All files stored with private ACL
- **Pre-signed URLs**: Secure, time-limited access (24 hours)
- **Organized Structure**: Files organized by sender ID
- **Metadata**: Original filename and upload timestamp stored

### **File Organization**
```
S3 Bucket Structure:
├── {sender_id_1}/
│   ├── upload_123456_abc.jpg
│   ├── upload_123457_def.pdf
│   └── upload_123458_ghi.mp4
├── {sender_id_2}/
│   ├── upload_234567_jkl.png
│   └── upload_234568_mno.docx
```

### **Access Control**
- **Authentication Required**: Only authenticated users can upload
- **User Isolation**: Users can only access their own files
- **Time-Limited URLs**: Pre-signed URLs expire after 24 hours
- **Automatic Refresh**: URLs refreshed automatically when expired

## 🚀 **API Endpoints**

### **POST /api/send-media**
Upload and send media files via WhatsApp.

#### **Request Format**
```typescript
FormData:
  to: string              // Recipient phone number
  files: File[]           // Array of files to send
  captions: string[]      // Array of captions (optional)
```

#### **Response Format**
```typescript
{
  success: boolean,
  totalFiles: number,
  successCount: number,
  failureCount: number,
  results: [
    {
      success: boolean,
      filename: string,
      messageId?: string,
      mediaType?: string,
      s3Uploaded?: boolean,
      error?: string
    }
  ],
  timestamp: string
}
```

### **GET /api/send-media**
Check API status and configuration.

#### **Response Format**
```typescript
{
  status: "WhatsApp Send Media API",
  configured: boolean,
  version: string,
  timestamp: string
}
```

## 🎯 **Usage Examples**

### **Basic Usage**
1. **Open Chat**: Select a contact in the chat interface
2. **Attach Media**: Click the 📎 button or drag files into chat
3. **Review Files**: Preview files, add captions if desired
4. **Send**: Click "Send" to upload and send via WhatsApp

### **Drag & Drop**
1. **Drag Files**: Drag files from desktop/file explorer
2. **Drop in Chat**: Drop files anywhere in the chat window
3. **Auto-Open Modal**: Upload modal opens automatically
4. **Continue**: Follow normal upload flow

### **Multiple Files**
1. **Select Multiple**: Choose multiple files at once
2. **Add More**: Use "Add More" button to include additional files
3. **Individual Captions**: Add captions to images/videos separately
4. **Batch Send**: All files sent in sequence

## 🔧 **Configuration**

### **Environment Variables**
```bash
# WhatsApp Cloud API
PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_TOKEN=your_access_token
WHATSAPP_API_VERSION=v23.0

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_BUCKET_NAME=your_bucket_name

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **WhatsApp Cloud API Setup**
1. **Create App**: Create Facebook App with WhatsApp Business API
2. **Get Credentials**: Obtain Phone Number ID and Access Token
3. **Configure Webhook**: Set up webhook for receiving messages
4. **Test Upload**: Verify media upload permissions

### **AWS S3 Setup**
1. **Create Bucket**: Create private S3 bucket
2. **Configure IAM**: Set up IAM user with S3 permissions
3. **Set CORS**: Configure CORS for web uploads (if needed)
4. **Test Access**: Verify upload and pre-signed URL generation

## 🧪 **Testing**

### **Manual Testing**
1. **File Types**: Test all supported file types
2. **Size Limits**: Test files approaching 25MB limit
3. **Multiple Files**: Test batch uploads
4. **Drag & Drop**: Test drag-and-drop functionality
5. **Captions**: Test caption functionality for images/videos
6. **Error Handling**: Test with invalid files or network issues

### **Automated Testing**
```bash
# Test API endpoint
curl -X POST /api/send-media \
  -F "to=+1234567890" \
  -F "files=@test-image.jpg" \
  -F "captions=Test caption"

# Check API status
curl -X GET /api/send-media
```

## 📱 **Mobile Responsiveness**

### **Responsive Design**
- **Touch-Friendly**: Large touch targets for mobile
- **Viewport Optimized**: Proper scaling on mobile devices
- **Gesture Support**: Touch gestures for file management
- **Performance**: Optimized for mobile networks

### **Mobile-Specific Features**
- **Camera Access**: Direct camera capture (browser dependent)
- **Photo Library**: Access to device photo library
- **File Browser**: Native file browser integration
- **Offline Handling**: Graceful handling of connectivity issues

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Files Not Uploading**
- Check file size (must be ≤ 25MB)
- Verify file type is supported
- Check WhatsApp API credentials
- Verify AWS S3 permissions

#### **WhatsApp Messages Not Sending**
- Verify WhatsApp access token is valid
- Check phone number format (+1234567890)
- Ensure recipient has WhatsApp account
- Check WhatsApp API rate limits

#### **S3 Upload Failures**
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket exists and is accessible
- Check AWS region configuration

#### **Database Errors**
- Verify Supabase connection
- Check table schema matches expected format
- Ensure user authentication is working
- Check row-level security policies

### **Debug Mode**
Enable detailed logging by checking browser console for:
- File processing logs
- API request/response details
- S3 upload progress
- Database operation results

## 🎉 **Benefits**

### **User Experience**
- **Intuitive Interface**: Familiar drag-and-drop interaction
- **Visual Feedback**: Clear progress and status indicators
- **Flexible Options**: Multiple ways to upload and send media
- **Professional UI**: Clean, modern interface matching WhatsApp

### **Technical Advantages**
- **Scalable Storage**: AWS S3 for reliable, scalable media storage
- **Persistent Access**: Media remains accessible via S3 URLs
- **Efficient Processing**: Optimized upload and send pipeline
- **Error Resilience**: Graceful handling of failures at each step

### **Business Value**
- **Enhanced Communication**: Rich media sharing capabilities
- **Professional Appearance**: Polished, production-ready interface
- **Reliable Delivery**: Multiple redundancy layers ensure delivery
- **Cost Effective**: Efficient use of cloud resources

## 🔄 **Future Enhancements**

### **Planned Features**
- **Image Editing**: Basic image editing before sending
- **File Compression**: Automatic compression for large files
- **Progress Tracking**: Real-time upload progress bars
- **Batch Operations**: Advanced batch management features
- **Cloud Integration**: Support for Google Drive, Dropbox, etc.

### **Performance Optimizations**
- **Parallel Uploads**: Concurrent file processing
- **Smart Retry**: Intelligent retry logic for failed uploads
- **Caching**: Client-side caching for repeated uploads
- **Compression**: Automatic file optimization

This comprehensive media upload feature transforms the WhatsApp web interface into a fully-featured messaging platform with professional-grade file sharing capabilities! 🚀 