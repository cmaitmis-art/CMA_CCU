import { useState } from 'react';
import '../CMAStyles.css';
import './Login.css';
import { login } from '../api.js';
import { CMA_LOGO_BASE64 } from '../utils/logoBase64.js';

const cmaLogo = CMA_LOGO_BASE64;

export default function CMALogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();

    const uname = username.trim();
    if (!uname) {
      setError('Please enter your username.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(uname, password);
      onLogin?.(user);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-login-root">
      <div className="modern-login-card">
        {/* Left Side (Blue section with clouds) */}
        <div className="modern-login-left">
          <div className="modern-login-left-content">
            <h3>Welcome to</h3>
            <div className="modern-login-logo-wrapper">
              <img src={cmaLogo} alt="CMA Logo" />
            </div>
            <h2>CMA — CCU</h2>
            <p>Condominium Management Authority</p>
          </div>
          
          <div className="modern-login-clouds">
            {/* Desktop vertical cloud border */}
            <svg className="desktop-cloud-svg" viewBox="0 0 100 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="rgba(255,255,255,0.2)" d="M100,0 Q70,30 95,70 Q50,130 90,190 Q30,250 85,310 Q50,380 95,450 Q70,490 100,500 L100,0 Z" />
              <path fill="rgba(255,255,255,0.5)" d="M100,0 Q60,25 90,65 Q30,125 80,185 Q10,250 75,315 Q30,385 90,445 Q60,485 100,500 L100,0 Z" />
              <path fill="#ffffff" d="M100,0 Q40,20 80,60 Q10,120 70,180 Q-20,250 60,320 Q10,390 80,440 Q40,480 100,500 L100,0 Z" />
            </svg>
            {/* Mobile horizontal cloud border */}
            <svg className="mobile-cloud-svg" viewBox="0 0 500 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="rgba(255,255,255,0.2)" d="M0,100 Q30,70 70,95 Q130,50 190,90 Q250,30 310,85 Q380,50 450,95 Q490,70 500,100 L0,100 Z" />
              <path fill="rgba(255,255,255,0.5)" d="M0,100 Q25,60 65,90 Q125,30 185,80 Q250,10 315,75 Q385,30 445,90 Q485,60 500,100 L0,100 Z" />
              <path fill="#ffffff" d="M0,100 Q20,40 60,80 Q120,10 180,70 Q250,-20 320,60 Q390,10 440,80 Q480,40 500,100 L0,100 Z" />
            </svg>
          </div>
        </div>

        {/* Right Side (White section with form) */}
        <div className="modern-login-right">
          <h2>Login to your account</h2>
          
          <form className="modern-login-form" onSubmit={handleLogin}>
            <div className="modern-form-group username-group">
              <label htmlFor="username">Username</label>
              <div className="modern-input-wrapper">
                <input
                  id="username"
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  autoComplete="username"
                />
                <span className="modern-input-check">✓</span>
              </div>
            </div>

            <div className="modern-form-group">
              <label htmlFor="password">Password</label>
              <div className="modern-input-wrapper">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="modern-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex="-1"
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="modern-error">
                ⚠️ {error}
              </div>
            )}

            <div className="modern-login-actions">
              <button className="modern-btn-signin" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

