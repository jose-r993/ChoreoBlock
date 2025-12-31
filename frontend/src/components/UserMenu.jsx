import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import '../styles/UserMenu.scss';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Get user's initials for avatar
  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  // Get display name (use email for now)
  const getDisplayName = () => {
    if (!user?.email) return 'User';
    return user.email;
  };

  if (!user) return null;

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <div className="user-avatar">{getInitials()}</div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`chevron ${isOpen ? 'open' : ''}`}
        >
          <path d="M4.427 5.427a.6.6 0 0 1 .849 0L8 8.151l2.724-2.724a.6.6 0 1 1 .849.849l-3.149 3.148a.6.6 0 0 1-.848 0L4.427 6.276a.6.6 0 0 1 0-.849z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-avatar large">{getInitials()}</div>
            <div className="user-info">
              <div className="user-email">{getDisplayName()}</div>
              <div className="user-label">Signed in</div>
            </div>
          </div>

          <div className="user-menu-divider"></div>

          <button
            className="user-menu-item sign-out"
            onClick={handleSignOut}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11 4a1 1 0 0 1 1-1h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-1a1 1 0 1 1 0-2h1a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1a1 1 0 0 1-1-1z"/>
              <path d="M4.414 8l2.293 2.293a1 1 0 0 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414l4-4a1 1 0 0 1 1.414 1.414L4.414 6H11a1 1 0 1 1 0 2H4.414z"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
