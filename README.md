# Memory Palace + Autonomous Research Assistant

A fully functional, mobile-compatible web app that combines a 3D virtual memory palace with an AI-powered research assistant.

## 🎯 Features

- **3D Memory Palace**: Interactive Three.js visualization for organizing knowledge
- **AI Research Assistant**: Multi-model AI research synthesis and explanations (Claude, Together, DeepSeek, Mistral)
- **AI Model Selection**: Choose between 4 different AI providers based on your needs
- **Voice Interaction**: Real-time speech-to-text and text-to-speech powered by Google Cloud
- **Smart Q&A**: Advanced topic explanations with LaTeX math rendering
- **Cloud Storage**: Google Drive/GCS integration for persistent storage
- **Mobile-First Design**: Fully responsive with dark mode and large touch targets
- **Private & Secure**: Authentication and data encryption

## 📋 Required APIs

### 1. AI Model APIs (At least one required)

#### Claude API (Anthropic) - **RECOMMENDED**
- **Purpose**: Most capable AI for research, explanations, and note organization
- **Get API Key**: https://console.anthropic.com/
- **Pricing**: Pay-as-you-go (starting at $0.25/MTok for Claude 3.5 Haiku)
- **Required Scopes**: Full API access
- **Environment Variable**: `ANTHROPIC_API_KEY`

#### Together API (Optional)
- **Purpose**: Fast, cost-effective open-source models (Llama 3.1 70B)
- **Get API Key**: https://api.together.xyz/
- **Pricing**: $0.88/MTok (input), $0.88/MTok (output)
- **Environment Variable**: `TOGETHER_API_KEY`

#### DeepSeek API (Optional)
- **Purpose**: Strong reasoning at low cost
- **Get API Key**: https://platform.deepseek.com/
- **Pricing**: ~$0.14/MTok (very affordable)
- **Environment Variable**: `DEEPSEEK_API_KEY`

#### Mistral AI API (Optional)
- **Purpose**: European alternative with multilingual support
- **Get API Key**: https://console.mistral.ai/
- **Pricing**: Varies by model ($2-8/MTok)
- **Environment Variable**: `MISTRAL_API_KEY`

**Note**: You can configure one or multiple AI providers. The app will show only available models based on configured API keys.

### 2. Google Cloud APIs
- **Purpose**: File storage, OAuth authentication, and voice interaction
- **Get Started**: https://console.cloud.google.com/
- **Required APIs**:
  - Google Drive API (for file storage)
  - OR Google Cloud Storage (alternative)
  - OAuth 2.0 (for user authentication)
  - Cloud Speech-to-Text API (for voice input)
  - Cloud Text-to-Speech API (for voice output)
- **Pricing**:
  - Google Drive: 15GB free, then $1.99/month for 100GB
  - GCS: $0.02/GB/month (first 5GB free operations)
  - Speech-to-Text: 60 min/month free, then $0.006/15 seconds
  - Text-to-Speech: 1M chars/month free (WaveNet), then $4/1M chars
- **Required Credentials**:
  - OAuth 2.0 Client ID & Secret
  - Service Account JSON with Speech/TTS permissions
- **Environment Variables**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_APPLICATION_CREDENTIALS` (path to service account JSON)
  - `GOOGLE_SERVICE_ACCOUNT_JSON` (optional, alternative)

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
# AI Model APIs (at least one required)
ANTHROPIC_API_KEY=your_claude_api_key_here
TOGETHER_API_KEY=your_together_api_key_here  # Optional
DEEPSEEK_API_KEY=your_deepseek_api_key_here  # Optional
MISTRAL_API_KEY=your_mistral_api_key_here    # Optional

# Default AI model (options: claude, together, deepseek, mistral)
DEFAULT_AI_MODEL=claude

# Google Cloud APIs
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json  # Alternative

# Security & Configuration
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
- **Select AI Model**: Choose from Claude, Together, DeepSeek, or Mistral in the dropdown
- **Voice Input**: Click microphone button to speak your research topic
- **Text Input**: Type questions about advanced topics
- Get synthesized research from arXiv with key findings
- Receive step-by-step explanations with LaTeX math
- **Voice Output**: Click speaker button to hear AI responses aloud

### 4. Save & Sync
- All notes automatically save to Google Drive
- Access from any device
- Export as PDF or Markdown

## 🎯 Using New Features

### AI Model Selection

The app supports multiple AI providers, allowing you to choose based on your needs:

1. **Access Model Selector**:
   - Look for the AI model dropdown in the top navigation bar
   - Available on desktop and mobile

2. **Choose Your Model**:
   - **Claude 3.5 Sonnet**: Best for complex reasoning, nuanced understanding, and high-quality outputs
   - **Llama 3.1 70B (Together)**: Fast and cost-effective for straightforward tasks
   - **DeepSeek Chat**: Strong reasoning capabilities at the lowest cost
   - **Mistral Large**: Excellent multilingual support and European data residency

3. **Configuration**:
   - Models appear in dropdown only if their API keys are configured
   - Your selection is saved in browser localStorage
   - Default model can be set via `DEFAULT_AI_MODEL` environment variable

### Voice Interaction

Real-time voice features powered by Google Cloud Speech-to-Text and Text-to-Speech:

1. **Enable Voice Features**:
   ```bash
   # Enable Speech APIs in Google Cloud Console
   gcloud services enable speech.googleapis.com
   gcloud services enable texttospeech.googleapis.com

   # Ensure your service account has permissions:
   # - Cloud Speech-to-Text API User
   # - Cloud Text-to-Speech API User
   ```

2. **Use Voice Input (Speech-to-Text)**:
   - Click the **microphone button** (blue) in the Research Assistant
   - Allow browser microphone permissions when prompted
   - Speak your research topic clearly
   - Click the **stop button** (red square) when finished
   - Your speech will be transcribed and filled into the topic field

3. **Use Voice Output (Text-to-Speech)**:
   - After receiving an AI response, click the **speaker button** (purple)
   - The AI's response will be read aloud
   - Click the speaker button again to stop playback
   - Works for research overviews and topic explanations

4. **Mobile Optimization**:
   - Large, tappable buttons (48px) for easy mobile use
   - Visual feedback: "Listening..." and "Speaking..." indicators
   - Optimized for touch interfaces

5. **Browser Requirements**:
   - **HTTPS required** for microphone access (works on localhost)
   - Supported browsers: Chrome, Safari, Firefox, Edge
   - Mobile browsers must support WebRTC MediaRecorder

6. **Troubleshooting Voice**:
   - **Microphone not working**: Check browser permissions in Settings
   - **No audio playback**: Check device volume and browser audio permissions
   - **"Permission denied"**: Grant microphone access in browser settings
   - **Voice endpoint errors**: Verify Google Cloud credentials and API enablement

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
