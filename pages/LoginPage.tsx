import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const from = (location.state as any)?.from || '/';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login({ email, password });
      setAuth(res.token, res.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.code || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const emailError = touched.email && !email ? 'Email is required' : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email format' : null;
  const passwordError = touched.password && !password ? 'Password is required' : null;

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4 bg-gradient-to-br from-yt-black via-yt-black to-[#1a0a0a]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mb-4 shadow-lg shadow-red-500/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-yt-textSec">Sign in to continue to StreamTube</p>
        </div>

        {/* Form Card */}
        <div className="bg-yt-gray/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yt-textSec" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                  type="email"
                  placeholder="you@example.com"
                  className={`w-full bg-[#121212] border ${
                    emailError ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                  } rounded-xl pl-11 pr-4 py-3 outline-none transition-colors`}
                  required
                />
              </div>
              {emailError && <p className="mt-1.5 text-xs text-red-400">{emailError}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yt-textSec" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`w-full bg-[#121212] border ${
                    passwordError ? 'border-red-500/50' : 'border-white/10 focus:border-white/30'
                  } rounded-xl pl-11 pr-12 py-3 outline-none transition-colors`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-yt-textSec hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordError && <p className="mt-1.5 text-xs text-red-400">{passwordError}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!emailError || !!passwordError}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl py-3.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-yt-textSec">
            Don't have an account?{' '}
            <Link to="/signup" className="text-red-400 hover:text-red-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
