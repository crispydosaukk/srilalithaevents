'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';

const Footer: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const scrollToSection = (sectionId: string) => {
    if (pathname === '/') {
      // Already on home page — just scroll
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // Navigate to home page with anchor
      router.push(`/#${sectionId}`);
    }
  };

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
          <button
            type="button"
            onClick={() => scrollToSection('terms')}
            className="hover:text-maroon-primary transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('terms')}
            className="hover:text-maroon-primary transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            Terms
          </button>
          <a
            href="mailto:admin@vegchennaisrilalitha.co.uk"
            className="hover:text-maroon-primary transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;