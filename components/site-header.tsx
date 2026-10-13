'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { MapPin, Menu, X, ChevronDown } from 'lucide-react';

export type HeaderUser = { name: string | null; role: string } | null;

export const STAFF_ROLES = ['CLEANER', 'LAUNDRY', 'DELIVERY', 'PARTNER'] as const;

export function isStaffRole(role?: string | null): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

export function SiteHeader({ user }: { user: HeaderUser }) {
  const path = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const staff = isStaffRole(user?.role);

  const links: Array<{ href: string; label: string }> = [
    { href: '/', label: 'Home' },
    { href: '/book', label: 'Book a Service' },
    ...(user ? [{ href: '/bookings', label: 'My Bookings' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
    ...(staff ? [{ href: '/staff', label: 'My Jobs' }] : []),
  ];

  const signInHref = '/sign-in?callbackUrl=%2Faccount';
  const greeting = `Hello, ${user?.name?.trim().split(/\s+/)[0] || 'there'}`;

  const navLink = (href: string, label: string, onClick?: () => void) => (
    <Link
      key={`${href}-${label}`}
      href={href}
      className={path === href ? 'active' : ''}
      aria-current={path === href ? 'page' : undefined}
      onClick={onClick}
    >
      {label}
    </Link>
  );

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
          <Image className="brand-logo" src="/images/logo.png" alt="" width={56} height={56} loading="eager" />
          <span>
            <strong>Klean Ur Mind</strong>
            <small>CARE &amp; WASH</small>
          </span>
        </Link>

        <span className="location">
          <MapPin size={13} /> Kozhikode, Kerala
        </span>

        <nav className="nav nav-desktop" aria-label="Main navigation">
          {links.map((link) => navLink(link.href, link.label))}
        </nav>

        <div className="header-actions">
          <Link href="/book" className="btn primary-action">Book a Service</Link>
          {user ? (
            <div className="account">
              <Link href="/account" className="btn secondary account-greeting" aria-label={`${greeting}. Open your account portal`} onClick={() => { setMenuOpen(false); setAccountOpen(false); }}>
                <span>{greeting}</span>
              </Link>
              <button
                type="button"
                className="btn secondary account-trigger"
                aria-expanded={accountOpen}
                aria-label="Account options"
                aria-controls="account-options"
                onClick={() => setAccountOpen((open) => !open)}
              >
                <ChevronDown size={16} aria-hidden="true"/>
              </button>
              {accountOpen && (
                <div id="account-options" className="account-panel" onKeyDown={event => { if (event.key === 'Escape') setAccountOpen(false); }}>
                  {navLink('/bookings', 'Dashboard', () => setAccountOpen(false))}
                  {navLink('/bookings?tab=upcoming', 'My Bookings', () => setAccountOpen(false))}
                  {navLink('/account', 'Profile', () => setAccountOpen(false))}
                  {isAdmin && navLink('/admin', 'Admin', () => setAccountOpen(false))}
                  {staff && navLink('/staff', 'My Jobs', () => setAccountOpen(false))}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      void signOut({ callbackUrl: '/' });
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href={signInHref} className="btn secondary">
              Sign in / Create account
            </Link>
          )}

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="container">
          <nav id="mobile-menu" className="nav mobile-menu" aria-label="Mobile navigation">
            {links.map((link) => navLink(link.href, link.label, () => setMenuOpen(false)))}
            {user ? (
              <>
                {navLink('/account', 'Profile', () => setMenuOpen(false))}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut({ callbackUrl: '/' });
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <Link href={signInHref} onClick={() => setMenuOpen(false)}>
                Sign in / Create account
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
