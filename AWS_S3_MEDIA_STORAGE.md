# AWS S3 Media Storage Integration

## 🎯 **Overview**

Your WhatsApp web application now stores all media files (images, documents, audio, video) in AWS S3 instead of relying on temporary WhatsApp URLs. This provides:

- **Persistent Storage**: Media files are permanently stored and accessible
- **Better Performance**: Faster loading with CDN-like capabilities
- **Security**: Private S3 buckets with pre-signed URLs for controlled access
- **Organization**: Files organized by sender in folder structure
- **Reliability**: No dependency on WhatsApp's temporary URLs

## 🏗️ **Architecture**

### **Media Flow**
```
WhatsApp Message → Webhook → Download from WhatsApp API → Upload to S3 → Store S3 URL in Database → Display in Chat
```

### **File Organization**
```
S3 Bucket Structure:
├── 918097296453/               # Sender phone number folder
│   ├── 1369799507435726.jpg    # Image file
│   ├── 750389464059529.pdf     # Document file
│   └── 23910317685306981.mp3   # Audio file
├── 919876543210/               # Another sender folder
│   └── 987654321012345.mp4     # Video file
```

### **URL Management**
- **Pre-signed URLs**: 24-hour expiry for security
- **Auto-refresh**: Failed media automatically triggers URL refresh
- **Fallback**: Graceful handling when media unavailable

## 🔧 **Technical Implementation**

### **1. AWS S3 Utility (`lib/aws-s3.ts`)**

#### **Core Functions**
```typescript
// Download from WhatsApp and upload to S3
downloadAndUploadToS3(mediaUrl, senderId, mediaId, mimeType, accessToken)

// Generate new pre-signed URL for existing file
generatePresignedUrl(senderId, mediaId, mimeType)

// Check if file exists in S3
checkS3FileExists(senderId, mediaId, mimeType)

// Delete file from S3
deleteFromS3(senderId, mediaId, mimeType)
```

#### **File Extension Mapping**
Supports 25+ file types:
- **Images**: jpg, png, gif, webp, bmp, tiff
- **Documents**: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, zip, rar, 7z
- **Audio**: mp3, m4a, wav, ogg, webm, aac
- **Video**: mp4, mpeg, mov, avi, webm, 3gp

### **2. Enhanced Webhook (`app/api/webhook/route.ts`)**

#### **Media Processing Flow**
1. **Receive WhatsApp webhook** with media message
2. **Get WhatsApp media URL** using Facebook Graph API
3. **Download media file** from WhatsApp servers
4. **Upload to S3** with organized folder structure
5. **Generate pre-signed URL** for 24-hour access
6. **Store in database** with S3 URL and metadata

#### **Database Storage Structure**
```json
{
  "media_data": {
    "type": "image",
    "id": "1369799507435726",
    "mime_type": "image/jpeg",
    "media_url": "https://s3-presigned-url...",
    "s3_uploaded": true,
    "upload_timestamp": "2024-01-15T10:30:00Z",
    "url_refreshed_at": "2024-01-15T18:45:00Z"
  }
}
```

### **3. URL Refresh API (`app/api/media/refresh-url/route.ts`)**

#### **Purpose**
- Regenerate expired pre-signed URLs
- Handle failed media loads automatically
- Maintain seamless user experience

#### **Usage**
```javascript
POST /api/media/refresh-url
{
  "messageId": "whatsapp_message_id"
}
```

### **4. Enhanced Chat UI (`components/chat/chat-window.tsx`)**

#### **Smart Media Handling**
- **Auto-retry**: Failed media loads trigger URL refresh
- **Loading states**: Visual feedback during refresh
- **Fallback UI**: Graceful display when media unavailable
- **Error recovery**: Automatic retry mechanisms

## 🚀 **Setup Instructions**

### **1. AWS Configuration**

#### **Environment Variables**
Add to your `.env.local`:
```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-whatsapp-media-bucket

# Existing WhatsApp variables
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_BUSINESS_OWNER_ID=your_supabase_user_id
PHONE_NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=your_verify_token
```

#### **S3 Bucket Setup**
1. **Create S3 Bucket**:
   ```bash
   aws s3 mb s3://your-whatsapp-media-bucket --region us-east-1
   ```

2. **Set Bucket Policy** (Private with programmatic access):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Deny",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-whatsapp-media-bucket/*",
         "Condition": {
           "Bool": {
             "aws:SecureTransport": "false"
           }
         }
       }
     ]
   }
   ```

3. **Enable Versioning** (Optional but recommended):
   ```bash
   aws s3api put-bucket-versioning --bucket your-whatsapp-media-bucket --versioning-configuration Status=Enabled
   ```

#### **IAM User Permissions**
Create IAM user with these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::your-whatsapp-media-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::your-whatsapp-media-bucket"
    }
  ]
}
```

### **2. Database Migration**
Already completed in previous setup - no additional changes needed.

### **3. Dependencies**
AWS SDK already installed:
```bash
npm install aws-sdk
```

## 🔍 **Testing the Integration**

### **1. Send Media Messages**
From WhatsApp mobile app, send to your business number:
- 📷 **Image**: Photo with caption
- 📄 **Document**: PDF or file
- 🎵 **Audio**: Voice message or audio file
- 🎬 **Video**: Video with caption

### **2. Verify S3 Upload**
Check AWS S3 Console:
```
Bucket: your-whatsapp-media-bucket
├── 918097296453/
│   ├── 1369799507435726.jpg ✅
│   ├── 750389464059529.pdf ✅
│   └── 23910317685306981.mp3 ✅
```

### **3. Database Verification**
Check Supabase:
```sql
SELECT 
  id, 
  message_type, 
  content,
  media_data->>'media_url' as s3_url,
  media_data->>'s3_uploaded' as uploaded
FROM messages 
WHERE message_type != 'text' 
ORDER BY timestamp DESC;
```

### **4. URL Refresh Testing**
1. Wait 24+ hours for URLs to expire
2. Try viewing media in chat
3. Should automatically refresh and display

## 📊 **Monitoring & Analytics**

### **CloudWatch Metrics**
Monitor these S3 metrics:
- **BucketRequests**: API calls to your bucket
- **BucketSizeBytes**: Total storage used
- **NumberOfObjects**: Total files stored

### **Application Logs**
Key log messages to monitor:
```
✅ "Successfully uploaded to S3: {s3_key}"
✅ "Media URL refreshed: {message_id}"
❌ "Failed to upload to S3"
❌ "Error downloading media from WhatsApp"
```

## 💰 **Cost Optimization**

### **S3 Storage Classes**
- **Standard**: For frequently accessed media (recent messages)
- **IA**: For older media (30+ days)
- **Glacier**: For archival (1+ year old)

### **Lifecycle Policies**
Example policy to optimize costs:
```json
{
  "Rules": [
    {
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## 🔐 **Security Features**

### **Private Bucket**
- All files stored privately
- No public access allowed
- Access only via pre-signed URLs

### **Pre-signed URLs**
- 24-hour expiry for security
- Automatic refresh when needed
- No permanent public links

### **Access Control**
- Users can only access their own conversation media
- Row Level Security (RLS) enforced
- Authentication required for all operations

## 🚨 **Error Handling**

### **Upload Failures**
- Graceful fallback to text representation
- Retry mechanism for temporary failures
- Detailed error logging

### **URL Expiry**
- Automatic detection of expired URLs
- Seamless refresh without user intervention
- Visual feedback during refresh process

### **Network Issues**
- Retry logic for network timeouts
- Fallback UI when media unavailable
- User-friendly error messages

## 🎉 **Benefits Achieved**

### ✅ **Reliability**
- **Permanent Storage**: Media never disappears
- **No Dependency**: Independent of WhatsApp URL availability
- **Backup**: All media safely stored in AWS

### ✅ **Performance**
- **Fast Loading**: S3's global infrastructure
- **Caching**: Browser caching of media files
- **Optimized Delivery**: Pre-signed URLs for direct access

### ✅ **Organization**
- **Sender Folders**: Easy organization by phone number
- **Consistent Naming**: Predictable file naming scheme
- **Metadata**: Rich metadata stored with each file

### ✅ **Security**
- **Private Storage**: No public access to media files
- **Controlled Access**: Time-limited pre-signed URLs
- **User Isolation**: Users can only access their media

### ✅ **Scalability**
- **Unlimited Storage**: S3 scales automatically
- **Global Availability**: Access from anywhere
- **Cost Effective**: Pay only for what you use

## 🚀 **Production Ready**

Your WhatsApp application now has enterprise-grade media storage with:
- ✅ **AWS S3 Integration** for persistent storage
- ✅ **Automatic Upload** from WhatsApp webhooks
- ✅ **Organized File Structure** by sender
- ✅ **Secure Access** with pre-signed URLs
- ✅ **Auto URL Refresh** for expired links
- ✅ **Error Handling** and fallbacks
- ✅ **Cost Optimization** strategies
- ✅ **Monitoring** and logging

**Your media storage is now bulletproof and production-ready!** 🎊 