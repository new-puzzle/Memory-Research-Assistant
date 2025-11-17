# Memory Palace + Autonomous Research Assistant

A fully functional, mobile-compatible web app that combines a 3D virtual memory palace with an AI-powered research assistant.

## 🎯 Features

- **3D Memory Palace**: Interactive Three.js visualization for organizing knowledge
- **AI Research Assistant**: Claude-powered research synthesis and explanations
- **Smart Q&A**: Advanced topic explanations with LaTeX math rendering
- **Cloud Storage**: Google Drive/GCS integration for persistent storage
- **Mobile-First Design**: Fully responsive with dark mode
- **Private & Secure**: Authentication and data encryption

## 📋 Required APIs

### 1. Claude API (Anthropic)
- **Purpose**: AI research assistant, topic explanations, note organization
- **Get API Key**: https://console.anthropic.com/
- **Pricing**: Pay-as-you-go (starting at $0.25/MTok for Claude 3.5 Haiku)
- **Required Scopes**: Full API access
- **Environment Variable**: `ANTHROPIC_API_KEY`

### 2. Google Cloud APIs
- **Purpose**: File storage and OAuth authentication
- **Get Started**: https://console.cloud.google.com/
- **Required APIs**:
  - Google Drive API (for file storage)
  - OR Google Cloud Storage (alternative)
  - OAuth 2.0 (for user authentication)
- **Pricing**:
  - Google Drive: 15GB free, then $1.99/month for 100GB
  - GCS: $0.02/GB/month (first 5GB free operations)
- **Required Credentials**:
  - OAuth 2.0 Client ID & Secret
  - Service Account JSON (if using GCS)
- **Environment Variables**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_SERVICE_ACCOUNT_JSON` (optional)

### 3. arXiv API (Optional)
- **Purpose**: Fetch academic research papers
- **Get Started**: https://arxiv.org/help/api/
- **Pricing**: FREE (rate-limited to 1 request/3 seconds)
- **No API Key Required**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Memory-Research-Assistant

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Environment Configuration

Create `.env` files in both `backend/` and `frontend/`:

**Backend `.env`:**
```env
ANTHROPIC_API_KEY=your_claude_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_SERVICE_ACCOUNT_JSON=path/to/service-account.json
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
SECRET_KEY=your_random_secret_key_for_sessions
ENVIRONMENT=development
```

**Frontend `.env`:**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Run Locally

```bash
# Terminal 1: Start backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Access the app at `http://localhost:5173` (or `http://localhost:3000` if using create-react-app)

## 🔒 Security Features

- **OAuth 2.0 Authentication**: Secure Google login
- **API Key Encryption**: Environment variable protection
- **CORS Configuration**: Restricted origins
- **Rate Limiting**: Prevent API abuse
- **HTTPS Only**: Enforced in production
- **Session Management**: Secure token handling

## ☁️ Deployment Options (Free/Cheap)

### Option 1: Vercel (Frontend) + Railway (Backend) - **RECOMMENDED**

**Cost**: $0-5/month
**Security**: ✅ HTTPS, Environment secrets, Basic auth available

**Frontend (Vercel)**:
```bash
cd frontend
npm install -g vercel
vercel --prod
```
- Free tier: Unlimited deployments, 100GB bandwidth/month
- Auto HTTPS, environment variables encrypted
- Add password protection: Settings → Password Protection

**Backend (Railway)**:
```bash
cd backend
# Install Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```
- Free tier: $5 credit/month, 500 hours runtime
- Auto HTTPS, environment variables secure
- Add authentication middleware in FastAPI

**Total Cost**: FREE (within limits)

### Option 2: Netlify (Frontend) + Render (Backend)

**Cost**: $0-7/month
**Security**: ✅ HTTPS, Password protection, Environment secrets

**Frontend (Netlify)**:
```bash
cd frontend
npm install -g netlify-cli
netlify deploy --prod
```
- Free tier: 100GB bandwidth, 300 build minutes
- Password protection available (free tier)

**Backend (Render)**:
```bash
# Create render.yaml in backend/
# Push to GitHub
# Connect repository in Render dashboard
```
- Free tier: 750 hours/month (sleeps after 15min inactivity)
- Auto HTTPS, environment variables

**Total Cost**: FREE (backend sleeps when inactive)

### Option 3: Google Cloud Run (Full Stack) - **BEST FOR GOOGLE INTEGRATION**

**Cost**: ~$0-10/month (generous free tier)
**Security**: ✅ IAM authentication, VPC, Secret Manager

```bash
# Frontend & Backend as separate Cloud Run services
gcloud run deploy memory-palace-frontend --source ./frontend
gcloud run deploy memory-palace-backend --source ./backend

# Add authentication
gcloud run services add-iam-policy-binding memory-palace-frontend \
  --member="user:your-email@gmail.com" \
  --role="roles/run.invoker"
```
- Free tier: 2 million requests/month, 360,000 GB-seconds
- Integrates seamlessly with Google Drive/GCS
- Built-in IAM authentication (restrict to your email only)

**Total Cost**: FREE for personal use

### Option 4: Docker + Free VPS (Oracle Cloud)

**Cost**: FREE forever
**Security**: ✅ Configure firewall, SSH keys, Nginx auth

```bash
# Build and deploy using Docker Compose
docker-compose up -d

# Add Nginx basic auth
htpasswd -c /etc/nginx/.htpasswd yourusername
```
- Oracle Cloud free tier: 4 ARM CPUs, 24GB RAM, 200GB storage
- Full control over security configuration
- Requires more setup but completely free

**Total Cost**: FREE (requires technical setup)

### Security Recommendations for Private Apps:

1. **Add Basic Authentication** (all options):
   ```python
   # In FastAPI backend
   from fastapi import Depends, HTTPException
   from fastapi.security import HTTPBasic, HTTPBasicCredentials

   security = HTTPBasic()

   def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
       if credentials.username != "your_username" or credentials.password != "your_password":
           raise HTTPException(status_code=401)
   ```

2. **Restrict Access by IP** (if using static IP):
   - Configure in cloud provider's firewall settings

3. **Enable MFA** on cloud accounts

4. **Use Environment Secrets** (never commit API keys)

5. **Monitor Usage** (set up billing alerts)

## 📱 Mobile Optimization

- Responsive design (320px - 4K)
- Touch-optimized controls for 3D navigation
- Lazy loading for performance
- PWA support (install as app)
- Tested on iOS Safari and Android Chrome

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📚 Architecture

```
Memory-Research-Assistant/
├── frontend/                 # React + Three.js frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Main app pages
│   │   ├── services/         # API clients
│   │   └── utils/            # Helper functions
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── core/             # Config, security
│   │   ├── models/           # Data models
│   │   └── services/         # Business logic
│   └── requirements.txt
└── docs/                     # Additional documentation
```

## 🛠️ Tech Stack

- **Frontend**: React, Three.js, TypeScript, Vite, TailwindCSS
- **Backend**: FastAPI, Python 3.9+, Anthropic SDK
- **Storage**: Google Drive API / Google Cloud Storage
- **AI**: Claude 3.5 Sonnet/Haiku
- **Deployment**: Vercel + Railway (recommended)

## 📖 Usage Guide

### 1. Upload Notes
- Drag and drop PDFs, text files, or paste links
- Claude automatically categorizes and organizes them

### 2. Explore Memory Palace
- Navigate 3D space with mouse/touch
- Click rooms to view organized notes
- Zoom and rotate for better visualization

### 3. Research Assistant
- Ask questions about advanced topics
- Get synthesized research from arXiv
- Receive step-by-step explanations with math

### 4. Save & Sync
- All notes automatically save to Google Drive
- Access from any device
- Export as PDF or Markdown

## 🤝 Contributing

This is a personal project, but feel free to fork and customize!

## 📄 License

MIT License - See LICENSE file for details

## 🐛 Troubleshooting

### Backend won't start
- Check Python version: `python --version` (requires 3.9+)
- Verify API keys in `.env`
- Check logs: `tail -f backend/logs/app.log`

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` in frontend `.env`
- Check CORS settings in backend `main.py`
- Ensure backend is running on correct port

### 3D Memory Palace not rendering
- Update GPU drivers
- Try different browser (Chrome recommended)
- Check browser console for WebGL errors

### Google Drive auth failing
- Verify OAuth credentials in Google Cloud Console
- Check redirect URIs match deployment URLs
- Enable Google Drive API in Cloud Console

## 📞 Support

For issues, check the `docs/` folder or open a GitHub issue.

---

Built with ❤️ for personal knowledge management and lifelong learning.
