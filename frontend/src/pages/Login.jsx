import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .z-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'Montserrat', sans-serif;
          background: #fff;
        }
        @media (max-width: 768px) {
          .z-page { grid-template-columns: 1fr; }
          .z-left { display: none; }
          .z-right { padding: 3rem 2rem; }
        }

        .z-left {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
          animation: z-fade 0.5s ease forwards;
        }
        .z-left-bg {
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&q=80&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          filter: brightness(0.55);
          z-index: 0;
        }
        .z-left > *:not(.z-left-bg) { position: relative; z-index: 1; }

        .z-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          font-weight: 300;
          letter-spacing: 0.35em;
          color: #fff;
          text-transform: uppercase;
        }
        .z-tagline {
          font-family: 'Cormorant Garamond', serif;
          font-size: 46px;
          font-weight: 300;
          font-style: italic;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }
        .z-left-footer {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
        }

        .z-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 5rem 4rem;
          animation: z-fade 0.7s ease forwards;
        }
        .z-eyebrow {
          font-size: 10px;
          letter-spacing: 0.3em;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 2.5rem;
        }
        .z-heading {
          font-family: 'Cormorant Garamond', serif;
          font-size: 36px;
          font-weight: 300;
          color: #111;
          letter-spacing: 0.02em;
          margin-bottom: 0.25rem;
        }
        .z-subheading {
          font-size: 11px;
          letter-spacing: 0.15em;
          color: #bbb;
          text-transform: uppercase;
          margin-bottom: 3rem;
        }
        .z-error {
          font-size: 11px;
          color: #c00;
          letter-spacing: 0.05em;
          margin-bottom: 1.25rem;
          padding: 0.75rem 0;
          border-top: 1px solid #f0cece;
          border-bottom: 1px solid #f0cece;
        }
        .z-field { margin-bottom: 1.75rem; }
        .z-label {
          display: block;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 0.6rem;
        }
        .z-input {
          width: 100%;
          border: none;
          border-bottom: 1px solid #ddd;
          padding: 0.5rem 0;
          font-size: 13px;
          letter-spacing: 0.05em;
          color: #111;
          font-family: 'Montserrat', sans-serif;
          font-weight: 300;
          background: transparent;
          outline: none;
          transition: border-color 0.3s;
        }
        .z-input:focus { border-bottom-color: #111; }
        .z-input::placeholder { color: #ccc; font-weight: 300; }

        .z-btn {
          width: 100%;
          height: 46px;
          background: transparent;
          border: 1px solid #111;
          color: #111;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 0.5rem;
          transition: background 0.3s, color 0.3s;
          position: relative;
          overflow: hidden;
        }
        .z-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: #111;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.35s cubic-bezier(0.77,0,0.18,1);
          z-index: 0;
        }
        .z-btn:hover::after { transform: scaleX(1); }
        .z-btn:hover { color: #fff; }
        .z-btn span { position: relative; z-index: 1; }
        .z-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .z-btn:disabled::after { display: none; }

        .z-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.75rem 0;
        }
        .z-divider-line { flex: 1; height: 1px; background: #eee; }
        .z-divider-text {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: #ccc;
          text-transform: uppercase;
        }
        .z-register {
          text-align: center;
          font-size: 11px;
          color: #999;
          letter-spacing: 0.05em;
        }
        .z-register a {
          color: #111;
          text-decoration: none;
          letter-spacing: 0.1em;
          border-bottom: 1px solid #111;
        }

        @keyframes z-fade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="z-page">
        <div className="z-left">
          <div className="z-left-bg" />
          <div className="z-brand">HPMS</div>
          <div className="z-tagline">Patient care,<br />precisely<br />managed.</div>
          <div className="z-left-footer">Hospital Patient Management System · Secure Access</div>
        </div>

        <div className="z-right">
          <div className="z-eyebrow">Account Access</div>
          <div className="z-heading">LOG IN</div>
          <div className="z-subheading">Welcome back</div>

          {error && <div className="z-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="z-field">
              <label className="z-label" htmlFor="email">Email address</label>
              <input className="z-input" id="email" type="email" required placeholder="your@email.com"
                autoComplete="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="z-field">
              <label className="z-label" htmlFor="password">Password</label>
              <input className="z-input" id="password" type="password" required placeholder="••••••••"
                autoComplete="current-password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="z-btn" type="submit" disabled={submitting}>
              <span>{submitting ? 'Signing in…' : 'LOG IN'}</span>
            </button>
          </form>

          <div className="z-divider">
            <div className="z-divider-line" />
            <span className="z-divider-text">or</span>
            <div className="z-divider-line" />
          </div>

          <div className="z-register">
            New patient? &nbsp;<Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </>
  );
}