'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Icon from '@/components/ui/AppIcon';

interface HeaderProps {
  onOpenModal?: () => void;
}

const Header: React.FC<HeaderProps> = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-amber-950/10 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/home" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
          <div className="flex items-center justify-center py-0.5">
            <Image
              src="/assets/images/srilalitha.png"
              alt="SriLalitha logo"
              width={190}
              height={64}
              className="object-contain h-11 sm:h-13 w-auto drop-shadow-xs"
              priority
            />
          </div>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-gray-700">
          <a href="#menus" className="hover:text-amber-600 transition-colors flex items-center gap-1.5">
            <span>📋</span>
            <span>Live Menus</span>
          </a>
          <a href="#book" className="hover:text-amber-600 transition-colors flex items-center gap-1.5">
            <span>📅</span>
            <span>Book Event</span>
          </a>
          <a href="/admin" className="text-gray-500 hover:text-amber-600 transition-colors flex items-center gap-1">
            <Icon name="LockClosedIcon" size={14} />
            <span>Admin</span>
          </a>
          <a
            href="#book"
            className="text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 text-xs uppercase tracking-wider"
            style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
          >
            Get Free Quote
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <Icon name={menuOpen ? 'XMarkIcon' : 'Bars3Icon'} size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/98 backdrop-blur-xl border-t border-gray-100 px-6 py-5 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <a href="#menus" className="text-gray-800 font-semibold hover:text-amber-600 text-sm flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <span>📋</span>
            <span>Live Menus &amp; Packages</span>
          </a>
          <a href="#book" className="text-gray-800 font-semibold hover:text-amber-600 text-sm flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <span>📅</span>
            <span>Book Catering Event</span>
          </a>
          <a href="/admin" className="text-gray-500 font-semibold hover:text-amber-600 text-sm flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            <Icon name="LockClosedIcon" size={16} />
            <span>Staff Admin</span>
          </a>
          <a
            href="#book"
            className="text-white font-bold py-3 rounded-xl text-sm text-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
            onClick={() => setMenuOpen(false)}
          >
            Get Free Quote
          </a>
        </div>
      )}
    </nav>
  );
};

export default Header;