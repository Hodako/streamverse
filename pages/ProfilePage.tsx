import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { meGetVideos, meUpdateProfile, meChangePassword } from '../lib/api';
import { User, Mail, Shield, Video, Calendar, LogOut, Settings, Edit, Lock } from 'lucide-react';
import { VideoCard } from '../components/VideoCard';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadUserData = async () => {
    // If not logged in, don't call /api/me/* endpoints.
    if (!user) {
      setUserVideos([]);
      setLoading(false);
      setMessage(null);
      return;
    }

    setLoading(true);
    try {
      const videosRes = await meGetVideos();
      setUserVideos(videosRes.videos || []);
    } catch (error: any) {
      console.error('Failed to load user data:', error);
      setMessage('Failed to load data. Please login again and try.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setMessage('Name and email are required.');
      return;
    }

    setLoading(true);
    try {
      await meUpdateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setMessage(error?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage('All password fields are required.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await meChangePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setMessage('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to change password:', error);
      setMessage(error?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const joinDate = user ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-yt-black via-yt-black to-[#1a0a0a] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-yt-gray/60 to-yt-gray/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-6 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
                <span className="text-3xl font-bold text-white">
                  {user ? getInitials(user.name) : <User className="w-12 h-12" />}
                </span>
              </div>
              {user?.role === 'admin' && (
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 rounded-full p-1.5 shadow-lg">
                  <Shield className="w-4 h-4 text-black" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">
                {user ? user.name : 'Guest User'}
              </h1>
              {user && (
                <div className="flex flex-col md:flex-row gap-3 text-sm text-yt-textSec mb-4">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {joinDate}</span>
                  </div>
                </div>
              )}
              {!user && (
                <p className="text-yt-textSec mb-4">Sign in to sync your data across devices</p>
              )}
              <div className="flex gap-3 justify-center md:justify-start">
                {user ? (
                  <>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/20"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="bg-yt-gray/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-6 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-3 mb-3 md:mb-2">
              <div className="p-3 md:p-2 bg-green-500/10 rounded-xl">
                <Video className="w-6 h-6 md:w-5 md:h-5 text-green-400" />
              </div>
              <span className="text-base md:text-sm text-yt-textSec font-medium">Your Videos</span>
            </div>
            <div className="text-4xl md:text-3xl font-bold mb-1">{userVideos.length}</div>
            <p className="text-sm md:text-xs text-yt-textSec">Videos uploaded</p>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-yt-gray/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Profile Settings
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="text-sm text-yt-textSec">Display Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-sm text-yt-textSec">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-semibold rounded-lg py-2 hover:bg-white/90 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          <div className="bg-yt-gray/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-sm text-yt-textSec">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="mt-1 w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="text-sm text-yt-textSec">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="mt-1 w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="text-sm text-yt-textSec">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-1 w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-semibold rounded-lg py-2 hover:bg-white/90 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-sm ${
            message.includes('successfully') 
              ? 'bg-green-600/20 text-green-200 border border-green-600/30' 
              : 'bg-red-600/20 text-red-200 border border-red-600/30'
          }`}>
            {message}
          </div>
        )}

        {/* Your Videos */}
        <div className="bg-yt-gray/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Your Videos</h3>
            <Link to="/channel" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              Upload New Video
            </Link>
          </div>
          <div className="min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : (
              userVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {userVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 text-yt-textSec mx-auto mb-4" />
                  <p className="text-yt-textSec">You haven't uploaded any videos yet</p>
                  <Link to="/channel" className="inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                    Upload Your First Video
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
