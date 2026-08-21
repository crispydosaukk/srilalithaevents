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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="/home" className="flex items-center gap-2.5">
          <Image
            src="/assets/images/srilalitha.png"
            alt="SriLalitha logo"
            width={120}
            height={48}
            className="object-contain"
            style={{ maxHeight: '48px', width: 'auto' }}
          />
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 text-sm text-surface-text">
          <a href="#services" className="hover:text-maroon-primary transition-colors">Services</a>
          <a href="#book" className="hover:text-maroon-primary transition-colors">Book Now</a>
          <a href="/admin" className="text-surface-text hover:text-maroon-primary transition-colors">Admin</a>
          <a href="#book" className="bg-maroon-primary hover:bg-maroon-dark text-white font-semibold px-5 py-2 rounded-lg transition-colors">
            Get a Quote
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-surface-text"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <Icon name={menuOpen ? 'XMarkIcon' : 'Bars3Icon'} size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface border-t border-surface-border px-6 py-4 flex flex-col gap-4">
          <a href="#services" className="text-surface-text hover:text-maroon-primary text-sm" onClick={() => setMenuOpen(false)}>Services</a>
          <a href="#book" className="text-surface-text hover:text-maroon-primary text-sm" onClick={() => setMenuOpen(false)}>Book Now</a>
          <a href="/admin" className="text-surface-text hover:text-maroon-primary text-sm" onClick={() => setMenuOpen(false)}>Admin</a>
          <a href="#book" className="bg-maroon-primary text-white font-semibold px-5 py-2.5 rounded-lg text-sm text-center" onClick={() => setMenuOpen(false)}>
            Get a Quote
          </a>
        </div>
      )}
    </nav>
  );
};

export default Header;