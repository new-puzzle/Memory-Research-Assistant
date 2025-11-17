/**
 * Login page with Google OAuth
 */
import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Brain, Library } from 'lucide-react';
import { useAuthStore } from '@/services/store';
import apiClient from '@/utils/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const { login } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);

  const handleSuccess = async (credentialResponse: any) => {
    try {
      setError(null);
      const result = await apiClient.authenticateWithGoogle(credentialResponse.credential);
      login(result.access_token, result.user);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Library className="w-12 h-12 text-white" />
              <Brain className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Memory Palace
            </h1>
            <p className="text-xl text-white/90">
              AI-Powered Research Assistant
            </p>
          </div>

          {/* Login Card */}
          <div className="card p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
              <p className="text-[var(--text-secondary)]">
                Sign in to access your Memory Palace
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => setError('Google login failed')}
                theme="filled_blue"
                size="large"
                text="signin_with"
              />
            </div>

            <div className="border-t border-[var(--border-color)] pt-6">
              <h3 className="font-semibold mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600">✓</span>
                  <span>3D visual knowledge organization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600">✓</span>
                  <span>AI-powered research synthesis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600">✓</span>
                  <span>Advanced topic explanations with LaTeX</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600">✓</span>
                  <span>Cloud storage integration</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-center text-white/80 text-sm mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
