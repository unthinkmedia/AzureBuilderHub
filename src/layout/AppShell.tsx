import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button } from "@fluentui/react-components";
import "./AppShell.css";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, login, logout } = useAuth();

  return (
    <div className="abh-shell">
      {/* Header */}
      <header className="abh-shell__header">
        <div className="abh-shell__brand">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect width="20" height="20" rx="4" fill="#0078d4" />
            <path d="M5 7h10M5 10h10M5 13h7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="abh-shell__title">Azure Builder Hub</span>
        </div>
        <nav className="abh-shell__nav" aria-label="Main navigation">
          <NavLink
            to="/my-projects"
            className={({ isActive }) => `abh-shell__link ${isActive ? "abh-shell__link--active" : ""}`}
          >
            My Projects
          </NavLink>
          <NavLink
            to="/library"
            className={({ isActive }) => `abh-shell__link ${isActive ? "abh-shell__link--active" : ""}`}
          >
            Library
          </NavLink>
          <NavLink
            to="/collections"
            className={({ isActive }) => `abh-shell__link ${isActive ? "abh-shell__link--active" : ""}`}
          >
            Collections
          </NavLink>
          <NavLink
            to="/community"
            className={({ isActive }) => `abh-shell__link ${isActive ? "abh-shell__link--active" : ""}`}
          >
            Community
          </NavLink>
        </nav>
        <div className="abh-shell__actions">
          {user ? (
            <div className="abh-shell__user">
              <div className="abh-shell__avatar" aria-hidden="true">
                {user.userDetails.charAt(0).toUpperCase()}
              </div>
              <span className="abh-shell__user-name">{user.userDetails}</span>
              <Button appearance="subtle" onClick={logout}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button appearance="primary" onClick={login}>
              Sign in
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="abh-shell__main">{children}</main>
    </div>
  );
};
