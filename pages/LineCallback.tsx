import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/AuthService';

const LineCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) {
      return;
    }

    const token = searchParams.get('token');
    
    if (!token) {
      hasProcessed.current = true;
      setStatus('error');
      setErrorMessage('No token provided');
      setTimeout(() => navigate('/lobby'), 2000);
      return;
    }

    // Mark as processed immediately to prevent re-execution
    hasProcessed.current = true;

    // Decode JWT and store token/user
    const user = authService.setTokenFromJWT(token);
    
    if (!user) {
      setStatus('error');
      setErrorMessage('Invalid token');
      setTimeout(() => navigate('/lobby'), 2000);
      return;
    }

    // Update AuthContext state
    setUser(user);
    
    // Clear token from URL
    window.history.replaceState({}, document.title, '/line/callback');
    
    // Success - redirect to lobby
    setStatus('success');
    setTimeout(() => navigate('/lobby'), 500);
  }, [searchParams, navigate, setUser]);

  return (
    <div className="flex items-center justify-center h-screen">
      {status === 'loading' && <div>Processing LINE login...</div>}
      {status === 'success' && <div>Login successful! Redirecting...</div>}
      {status === 'error' && <div>Error: {errorMessage}</div>}
    </div>
  );
};

export default LineCallback;