# Security Configuration Guide

This guide explains how to secure your Memory Palace app for private use.

## 🔒 Security Layers

Your app has **multiple security layers** you can enable:

### Layer 1: Google OAuth (Already Enabled ✅)
- Users must sign in with Google account
- JWT tokens for session management
- Automatic token expiration

### Layer 2: Email Domain Restrictions
- Limit access to specific email domains
- Perfect for personal/team use

### Layer 3: Basic Authentication
- Username/password before accessing the app
- Simple but effective

### Layer 4: Deployment Platform Protection
- Platform-specific password protection
- IP allowlisting
- IAM authentication

---

## 📋 Configuration Steps

### 1. Backend Email Domain Restrictions

**Edit `backend/.env`:**
```env
# Restrict to specific email domains (comma-separated)
ALLOWED_EMAIL_DOMAINS=gmail.com,yourdomain.com

# Or restrict to your specific email only
# Leave blank to allow all authenticated users
ALLOWED_EMAIL_DOMAINS=
```

**Example - Personal Use Only:**
```env
# Only allow your email
ALLOWED_EMAIL_DOMAINS=youremail@gmail.com
```

**How it works:**
- After Google OAuth, backend checks email domain
- Non-matching domains are rejected with 403 Forbidden
- Already implemented in `backend/app/core/security.py:87-94`

---

### 2. Basic Authentication (Username/Password)

**Edit `backend/.env`:**
```env
# Enable basic auth
BASIC_AUTH_USERNAME=your_username
BASIC_AUTH_PASSWORD=your_secure_password_here

# Generate a strong password:
# python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Generate secure password:**
```bash
# On Mac/Linux
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Output example: 8xK_mP3qL9vN2wR5tY7uB4cD6fH8jK0mN2qS4vX6zA
```

**How it works:**
- Browser prompts for username/password before loading app
- Credentials are checked on every API request
- Already implemented in `backend/app/core/security.py:55-78`

**Enable in production:**
```bash
# Set in your deployment platform's environment variables
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=<your-secure-password>
```

---

### 3. Platform-Level Password Protection

#### Option A: Vercel (Frontend)

**Method 1 - Password Protection (Free)**
1. Go to your Vercel project dashboard
2. Settings → Password Protection
3. Enable and set password
4. Users must enter password before accessing site

**Method 2 - Vercel Authentication (Pro)**
1. Settings → Authentication
2. Enable and configure

#### Option B: Railway (Backend)

**Add authentication middleware:**

Create `backend/app/middleware/auth.py`:
```python
from fastapi import Request, HTTPException, status
from fastapi.responses import Response
import secrets

RAILWAY_AUTH_TOKEN = os.getenv("RAILWAY_AUTH_TOKEN")

async def railway_auth_middleware(request: Request, call_next):
    if not RAILWAY_AUTH_TOKEN:
        return await call_next(request)

    auth_header = request.headers.get("X-Auth-Token")
    if not auth_header or not secrets.compare_digest(auth_header, RAILWAY_AUTH_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")

    return await call_next(request)
```

**Set environment variable in Railway:**
```env
RAILWAY_AUTH_TOKEN=<generate-secure-token>
```

#### Option C: Google Cloud Run (IAM)

**Restrict access to your email only:**

```bash
# Deploy with authentication required
gcloud run deploy memory-palace-backend \
  --no-allow-unauthenticated

# Add your email as authorized user
gcloud run services add-iam-policy-binding memory-palace-backend \
  --member="user:your-email@gmail.com" \
  --role="roles/run.invoker"

# Same for frontend
gcloud run services add-iam-policy-binding memory-palace-frontend \
  --member="user:your-email@gmail.com" \
  --role="roles/run.invoker"
```

**How it works:**
- Only authenticated Google accounts can access
- Restrict to specific email(s)
- Most secure option for private apps

#### Option D: Netlify (Frontend Alternative)

1. Site Settings → Access Control
2. Enable Password Protection
3. Set password
4. Or use JWT-based access control

---

### 4. IP Allowlisting (Advanced)

**Restrict access to specific IP addresses:**

#### Vercel:
```json
// vercel.json
{
  "routes": [
    {
      "src": "/(.*)",
      "headers": {
        "X-Forwarded-For": "$your-ip-address"
      },
      "continue": true
    }
  ]
}
```

#### Google Cloud Run:
```bash
# Use Cloud Armor for IP filtering
gcloud compute security-policies create memory-palace-policy \
  --description "IP allowlist for Memory Palace"

gcloud compute security-policies rules create 1000 \
  --security-policy memory-palace-policy \
  --src-ip-ranges "YOUR_IP_ADDRESS/32" \
  --action "allow"
```

#### Railway/Render:
Use reverse proxy (Nginx/Caddy) with IP restrictions.

---

## 🎯 Recommended Configurations

### For Personal Use (High Security)

**Backend `.env`:**
```env
# Restrict to your email only
ALLOWED_EMAIL_DOMAINS=your-email@gmail.com

# Add basic auth as second layer
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=<secure-password-here>

# Use Google Cloud Run with IAM
ENVIRONMENT=production
DEBUG=False
```

**Deployment:**
- Google Cloud Run with IAM authentication
- Only your Google account can access

**Security Score: 🔒🔒🔒🔒🔒 (5/5)**

---

### For Personal + Friends (Medium Security)

**Backend `.env`:**
```env
# Allow specific domains
ALLOWED_EMAIL_DOMAINS=gmail.com,outlook.com

# Optional: Add basic auth
BASIC_AUTH_USERNAME=memorypalace
BASIC_AUTH_PASSWORD=<secure-password-share-with-friends>

ENVIRONMENT=production
DEBUG=False
```

**Deployment:**
- Vercel + Railway
- Share basic auth password with friends
- Or use Vercel password protection

**Security Score: 🔒🔒🔒 (3/5)**

---

### For Testing (Low Security)

**Backend `.env`:**
```env
# No domain restrictions
ALLOWED_EMAIL_DOMAINS=

# No basic auth
BASIC_AUTH_USERNAME=
BASIC_AUTH_PASSWORD=

ENVIRONMENT=development
DEBUG=True
```

**Security Score: 🔒 (1/5)**
**⚠️ Not recommended for production**

---

## 🔐 Additional Security Best Practices

### 1. Secure Your API Keys

```bash
# Never commit .env files
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
echo "frontend/.env" >> .gitignore

# Use deployment platform's secret management
# Vercel: Environment Variables (encrypted)
# Railway: Environment Variables (encrypted)
# Google Cloud: Secret Manager
```

### 2. HTTPS Only

**Backend - Force HTTPS in production:**

Edit `backend/app/main.py`:
```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if settings.environment == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

**All platforms provide automatic HTTPS:**
- ✅ Vercel: Automatic
- ✅ Railway: Automatic
- ✅ Google Cloud Run: Automatic
- ✅ Netlify: Automatic

### 3. Rate Limiting (Already Enabled ✅)

**Adjust rate limits in `backend/.env`:**
```env
# Requests per minute per IP
RATE_LIMIT_PER_MINUTE=60  # Lower for more protection
```

**For production:**
```env
RATE_LIMIT_PER_MINUTE=30  # Stricter limit
```

### 4. CORS Configuration

**Edit `backend/.env`:**
```env
# Production - Specify exact domains
CORS_ORIGINS=https://your-app.vercel.app

# Development - Allow localhost
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Multiple domains
CORS_ORIGINS=https://app.com,https://www.app.com,https://staging.app.com
```

### 5. Session Security

**Backend handles this automatically:**
- ✅ JWT tokens expire after 24 hours
- ✅ Tokens stored securely in localStorage
- ✅ Automatic logout on expiration
- ✅ CSRF protection via tokens

### 6. Database Security (Google Drive)

**Your data is protected by:**
- ✅ Google OAuth - only you can access your Drive
- ✅ End-to-end encryption (Google Drive)
- ✅ Files stored in `/Memory-Palace` folder
- ✅ No server-side data storage

---

## 🧪 Testing Your Security

### Test 1: Unauthorized Access
```bash
# Try accessing without authentication
curl https://your-backend.railway.app/api/v1/research/fetch-research

# Expected: 401 Unauthorized
```

### Test 2: Wrong Email Domain
1. Sign in with email not in `ALLOWED_EMAIL_DOMAINS`
2. Expected: 403 Forbidden

### Test 3: Basic Auth
```bash
# Try without credentials
curl https://your-app.com

# Expected: 401 Unauthorized or password prompt
```

### Test 4: Rate Limiting
```bash
# Make 100 requests rapidly
for i in {1..100}; do curl https://your-api.com/health; done

# Expected: 429 Too Many Requests after hitting limit
```

---

## 🚨 Security Checklist

Before deploying to production:

- [ ] Set `ENVIRONMENT=production` in backend
- [ ] Set `DEBUG=False` in backend
- [ ] Configure `ALLOWED_EMAIL_DOMAINS` (recommended)
- [ ] Set `BASIC_AUTH_PASSWORD` (optional but recommended)
- [ ] Update `CORS_ORIGINS` to production domains only
- [ ] Use strong `SECRET_KEY` (32+ random characters)
- [ ] Enable HTTPS redirect
- [ ] Set reasonable rate limits
- [ ] Test unauthorized access attempts
- [ ] Never commit `.env` files
- [ ] Use platform secret managers for API keys
- [ ] Enable platform-level password protection (optional)
- [ ] Set up monitoring/alerts for suspicious activity

---

## 📞 Security Issues

If you discover a security vulnerability:
1. Do NOT open a public GitHub issue
2. Email: [your-security-email@domain.com]
3. Include detailed description
4. Responsible disclosure appreciated

---

## 🔗 Related Documentation

- [README.md](README.md) - Main documentation
- [QUICKSTART.md](QUICKSTART.md) - Getting started
- [backend/app/core/security.py](backend/app/core/security.py) - Security implementation

---

**Remember:** Security is layered. Use multiple protection methods for maximum safety! 🛡️
