import React, { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function navLink(to, label) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          isActive ? 'z-nav-link z-nav-link--active' : 'z-nav-link'
        }
      >
        {label}
      </NavLink>
    );
  }

  const roleColor = {
    ADMIN:  '#8b6f47',
    DOCTOR: '#4a7c6f',
    NURSE:  '#6f4a7c',
    PATIENT:'#4a5f7c',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Montserrat:wght@300;400;500&display=swap');

        .z-navbar {
          font-family: 'Montserrat', sans-serif;
          background: #fff;
          border-bottom: 1px solid #e8e8e8;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2.5rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .z-navbar-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 300;
          letter-spacing: 0.3em;
          color: #111;
          text-decoration: none;
          text-transform: uppercase;
        }

        .z-nav-links {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .z-nav-link {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #999;
          text-decoration: none;
          padding: 0 1.25rem;
          height: 56px;
          display: flex;
          align-items: center;
          border-bottom: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s;
          white-space: nowrap;
        }

        .z-nav-link:hover {
          color: #111;
        }

        .z-nav-link--active {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #111;
          text-decoration: none;
          padding: 0 1.25rem;
          height: 56px;
          display: flex;
          align-items: center;
          border-bottom: 2px solid #111;
          transition: color 0.2s, border-color 0.2s;
          white-space: nowrap;
        }

        .z-navbar-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .z-user-name {
          font-size: 11px;
          letter-spacing: 0.08em;
          color: #555;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .z-role-badge {
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 2px 8px;
          border: 1px solid currentColor;
          opacity: 0.7;
        }

        .z-logout-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #111;
          background: transparent;
          border: 1px solid #111;
          padding: 6px 16px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: color 0.3s;
        }

        .z-logout-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: #111;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.77,0,0.18,1);
          z-index: 0;
        }

        .z-logout-btn:hover::after { transform: scaleX(1); }
        .z-logout-btn:hover { color: #fff; }
        .z-logout-btn span { position: relative; z-index: 1; }

        .z-login-link {
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #111;
          text-decoration: none;
          border-bottom: 1px solid #111;
        }

        @media (max-width: 768px) {
          .z-nav-links { display: none; }
          .z-navbar { padding: 0 1.25rem; }
        }
      `}</style>

      <nav className="z-navbar">
        <Link to="/" className="z-navbar-brand">HPMS</Link>

        {user && (
          <div className="z-nav-links">
            {navLink('/', 'Dashboard')}
            {(user.role === 'PATIENT' || user.role === 'DOCTOR' || user.role === 'ADMIN') &&
              navLink('/appointments', 'Appointments')}
            {(user.role === 'PATIENT' || user.role === 'DOCTOR' || user.role === 'NURSE') &&
              navLink('/ehr', 'EHR')}
            {(user.role === 'PATIENT' || user.role === 'ADMIN' || user.role === 'NURSE') &&
              navLink('/billing', 'Billing')}
          </div>
        )}

        <div className="z-navbar-right">
          {user ? (
            <>
              <div className="z-user-name">
                {user.full_name}
                <span className="z-role-badge" style={{ color: roleColor[user.role] || '#888' }}>
                  {user.role}
                </span>
              </div>
              <button className="z-logout-btn" onClick={handleLogout}>
                <span>Log out</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="z-login-link">Log in</Link>
          )}
        </div>
      </nav>
    </>
  );
}