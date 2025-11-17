# Quick Start Guide

Get your Memory Palace app running in 5 minutes!

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Git
- API Keys (see below)

## Required API Keys

### 1. Claude API Key (Required)
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy the key (starts with `sk-ant-api03-...`)

### 2. Google OAuth Credentials (Required)
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google Drive API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:5173` (for local development)
   - Your production domain (when deploying)
7. Copy Client ID and Client Secret

## Installation

```bash
# Clone repository
git clone <your-repo-url>
cd Memory-Research-Assistant

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your API keys

# Frontend setup
cd ../frontend
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your Google Client ID
```

## Configure Environment Variables

### Backend (.env)
```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
SECRET_KEY=generate-random-string-here
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Run the App

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Backend runs on: http://localhost:8000

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Frontend runs on: http://localhost:5173

## First Use

1. Open http://localhost:5173 in your browser
2. Click "Sign in with Google"
3. Grant necessary permissions
4. You're ready to go!

## Try These Features

### 1. Research Synthesis
- Click "Research" tab
- Enter a topic: "Transformer architectures in machine learning"
- Check "Include papers from arXiv"
- Click "Fetch Research"

### 2. Topic Explanation
- Click "Explain Topic" tab
- Enter: "Derive the math behind attention mechanisms"
- Select complexity level
- Click "Explain Topic"

### 3. Memory Palace
- Click "Upload" button
- Add a note with title and content
- Add tags for organization
- Watch it appear in your 3D Memory Palace!
- Click rooms to explore
- Drag to rotate, scroll to zoom

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.9+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check if .env file exists and has API keys
cat .env
```

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check .env file
cat .env
```

### Google login fails
- Verify GOOGLE_CLIENT_ID in both backend and frontend .env files
- Check that redirect URI includes http://localhost:5173
- Try in incognito mode

### Claude API errors
- Verify ANTHROPIC_API_KEY is correct
- Check your API key has credits
- Check rate limits

## Next Steps

- Read full [README.md](README.md) for deployment options
- Customize the app for your needs
- Deploy to production (see README for options)

## Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review API responses in browser DevTools
- Check backend logs for errors

Happy learning! 🏛️🧠
