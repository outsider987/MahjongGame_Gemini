import React, { useState } from 'react';
import { X, User, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const { login, register, loginWithLine, isLoading } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      const result = await login({ username, password });
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Login failed');
      }
    } else {
      if (!displayName.trim()) {
        setError('Display name is required');
        return;
      }
      const result = await register({ username, email, password, display_name: displayName });
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Registration failed');
      }
    }
  };

  const handleLineLogin = () => {
    loginWithLine();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-gradient-to-b from-[#4a1a1a] to-[#2a0a0a] p-1 rounded-2xl shadow-[0_0_50px_rgba(255,0,0,0.3)] max-w-md w-full mx-4 animate-scaleIn">
        <div className="bg-[#fff8e1] rounded-xl p-6 border-4 border-[#d4b98c]">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b-2 border-[#d4b98c] pb-4">
            <h2 className="text-2xl font-bold text-[#5d4037] flex items-center gap-2">
              {mode === 'login' ? (
                <>
                  <LogIn className="w-6 h-6 text-red-600" />
                  登入
                </>
              ) : (
                <>
                  <UserPlus className="w-6 h-6 text-red-600" />
                  註冊
                </>
              )}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-600 transition-colors bg-gray-200 hover:bg-red-100 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* LINE Login Button */}
          <button
            onClick={handleLineLogin}
            className="w-full mb-4 py-3 bg-[#06C755] hover:bg-[#05b54d] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.992zm-18.988 2.595c0 .198-.161.359-.359.359h-2.965a.358.358 0 0 1-.359-.359v-4.635c0-.198.161-.359.359-.359h.734c.198 0 .359.161.359.359v3.542h1.872c.198 0 .359.161.359.359v.734zm2.328.359h-.734a.358.358 0 0 1-.359-.359v-4.635c0-.198.161-.359.359-.359h.734c.198 0 .359.161.359.359v4.635a.358.358 0 0 1-.359.359zm6.186 0h-.734a.361.361 0 0 1-.293-.152l-2.012-2.746v2.539a.358.358 0 0 1-.359.359h-.734a.358.358 0 0 1-.359-.359v-4.635c0-.198.161-.359.359-.359h.734c.112 0 .218.052.287.141l2.018 2.757v-2.539c0-.198.161-.359.359-.359h.734c.198 0 .359.161.359.359v4.635a.358.358 0 0 1-.359.359zm4.487-3.893h-1.872v-.742h1.872c.198 0 .359.161.359.359v.024a.358.358 0 0 1-.359.359zm.359 1.287v.024a.358.358 0 0 1-.359.359h-1.872v-.742h1.872c.198 0 .359.161.359.359zm0 1.312v.024a.358.358 0 0 1-.359.359h-1.872v-.742h1.872c.198 0 .359.161.359.359z" />
            </svg>
            使用 LINE 登入
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#d4b98c]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#fff8e1] text-gray-500">或</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="用戶名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-[#d4b98c] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-800"
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="電子郵件"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-[#d4b98c] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-800"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="顯示名稱"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-[#d4b98c] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-800"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 border border-[#d4b98c] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-800"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center bg-red-50 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 text-lg"
              disabled={isLoading}
            >
              {isLoading ? '處理中...' : mode === 'login' ? '登入' : '註冊'}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-4 text-center text-sm text-gray-600">
            {mode === 'login' ? (
              <>
                還沒有帳號？{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-red-600 hover:text-red-700 font-bold"
                >
                  立即註冊
                </button>
              </>
            ) : (
              <>
                已有帳號？{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-red-600 hover:text-red-700 font-bold"
                >
                  立即登入
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-scaleIn { animation: scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
};

