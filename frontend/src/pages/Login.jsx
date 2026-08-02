import { useState } from 'react';
import '../CMAStyles.css';
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
    <>
      <div className="cma-login-root">
        <div className="grid-overlay" />

        {/* Top Bar */}
        <div className="login-topbar">
          <div className="login-topbar-logo">
            <div className="logo-emblem">
              <img src={cmaLogo} alt="CMA Logo" />
            </div>
            <div>
              <div className="logo-text-main">CMA — CCU</div>
              <div className="logo-text-sub">Condominium Management Authority</div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="login-main">
          <form className="login-card" onSubmit={handleLogin}>
            <div className="login-card-header">
              <div className="login-card-emblem">
                <img src={cmaLogo} alt="CMA Logo" />
              </div>
              <h1>CMA_CCU</h1>
              <p>Enter your username and password to continue</p>
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="text-input"
                type="text"
                name="username"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="pw-field-wrap">
                <input
                  id="password"
                  className="pw-input"
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
                  className="pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="pw-error">
                ⚠️ {error}
              </div>
            )}

            <button className="pw-submit-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <div className="login-footer">
          © Condominium Management Authority
        </div>
      </div>
    </>
  );
}

