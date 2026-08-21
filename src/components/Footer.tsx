import React from 'react';
import Image from 'next/image';

const Footer: React.FC = () => {
  return (
    <footer className="bg-surface border-t border-surface-border py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Image
            src="/assets/images/srilalitha.png"
            alt="SriLalitha logo"
            width={120}
            height={48}
            className="object-contain"
            style={{ maxHeight: '48px', width: 'auto' }}
          />
          <span className="text-surface-text text-sm ml-3">© 2026</span>
        </div>
        <div className="flex items-center gap-5 text-sm text-surface-text">
          <a href="#" className="hover:text-maroon-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-maroon-primary transition-colors">Terms</a>
          <a href="mailto:hello@srilalitha.com" className="hover:text-maroon-primary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;