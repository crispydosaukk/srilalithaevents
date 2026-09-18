// Configuration & Defaults for Dynamic Website Content (Hero, Stats Ribbon, Menu Header, Terms & Conditions)

export interface TrustBadge {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  enabled: boolean;
}

export interface HeroButton {
  text: string;
  link: string;
  enabled: boolean;
}

export interface HeroConfig {
  headlinePart1: string;
  headlinePart2: string;
  headlinePart2Color: string;
  subtitle: string;
  primaryButton: HeroButton;
  secondaryButton: HeroButton;
  backgroundImage: string;
  trustBadges: TrustBadge[];
}

export interface StatItem {
  id: string;
  icon: string;
  value: string;
  label: string;
  enabled: boolean;
}

export interface StatsRibbonConfig {
  enabled: boolean;
  items: StatItem[];
}

export interface MenuHeaderConfig {
  enabled: boolean;
  badgeText: string;
  title: string;
  subtitle: string;
}

export interface TermsSection {
  id: string;
  title: string;
  items: string[];
  enabled: boolean;
}

export interface TermsConfig {
  enabled: boolean;
  badgeText: string;
  title: string;
  sections: TermsSection[];
  notesTitle: string;
  notes: string[];
}

export interface WebsiteContentConfig {
  hero: HeroConfig;
  statsRibbon: StatsRibbonConfig;
  menuHeader: MenuHeaderConfig;
  termsAndConditions: TermsConfig;
}

export const DEFAULT_WEBSITE_CONTENT: WebsiteContentConfig = {
  hero: {
    headlinePart1: 'Make Your Event',
    headlinePart2: 'Unforgettable',
    headlinePart2Color: '#FF334B',
    subtitle: 'Authentic Pure Vegetarian Indian cuisine. Seamless outdoor catering for all occasions.',
    primaryButton: {
      text: 'View Menus & Packages',
      link: '#menus',
      enabled: true,
    },
    secondaryButton: {
      text: 'Book Now',
      link: '#book',
      enabled: true,
    },
    backgroundImage: '/assets/images/hero_live_catering_bg.jpg',
    trustBadges: [
      {
        id: 'badge-1',
        icon: '⭐',
        title: '4.9★ Rated',
        subtitle: '500+ Happy Events',
        enabled: true,
      },
      {
        id: 'badge-2',
        icon: '🍲',
        title: 'Authentic Taste',
        subtitle: 'Pure Indian Vegetarian',
        enabled: true,
      },
      {
        id: 'badge-3',
        icon: '🏛️',
        title: '500 Capacity',
        subtitle: 'Hall & Outdoor',
        enabled: false, // Disabled by default as indicated by the user's green 'X' on Image 1
      },
    ],
  },
  statsRibbon: {
    enabled: true,
    items: [
      {
        id: 'stat-1',
        icon: '🎪',
        value: '500+',
        label: 'Events Catered',
        enabled: true,
      },
      {
        id: 'stat-2',
        icon: '🥞',
        value: '34+',
        label: 'Dosa Varieties',
        enabled: true,
      },
      {
        id: 'stat-3',
        icon: '👑',
        value: '16+ Yrs',
        label: 'Culinary Heritage',
        enabled: true,
      },
      {
        id: 'stat-4',
        icon: '⭐',
        value: '4.9★',
        label: 'Customer Rating',
        enabled: true,
      },
    ],
  },
  menuHeader: {
    enabled: true,
    badgeText: 'Authentic Culinary Experience',
    title: 'Our Menus & Specials',
    subtitle: 'Explore our freshly prepared vegetarian delicacies and live dosa stations.',
  },
  termsAndConditions: {
    enabled: false, // Default to false so it goes off immediately as requested by the user
    badgeText: 'Legal',
    title: 'Terms & Conditions',
    sections: [
      {
        id: 'payments',
        title: 'PAYMENTS, CANCELLATIONS & REFUND POLICY',
        enabled: true,
        items: [
          'A deposit of 50% must be paid to confirm and hold the booking date.',
          'Any cancellations made 30 days prior to event will receive 50% refund of deposit.',
          'Any cancellations made less than 30 days prior will forfeit the full deposit.',
          'Final Balance must be cleared at least 7 days prior to the event date.',
          'Failure to make full payment 3-5 days before, management reserves the right to cancel the Event.',
          'VAT is not included in price, any card payments/ Bank transfer will be charged 20% VAT on total amount.',
        ],
      },
      {
        id: 'menu',
        title: 'MENU & GUESTS CHANGES',
        enabled: true,
        items: [
          'Any changes to event or menu needs to be done 10 days in advance.',
          'Food and Seating would be only provided to Minimum guaranteed guests.',
          'Any extra guests would require minimum 24 hours prior notification.',
        ],
      },
      {
        id: 'client',
        title: 'CLIENT RESPONSIBILITIES',
        enabled: true,
        items: [
          'Any damages to the property or equipments the party organisers will be held responsible and would require to pay the costs towards damages.',
          'Any food allergies or special dietary requirements to be booked in advance and management will not hold any responsibility if not informed in advance.',
        ],
      },
      {
        id: 'sound',
        title: "SRILALITHA SOUND LIMITER'S",
        enabled: true,
        items: [
          'DJ to Maintain Policy or will be held responsible. Before 10:00 pm - Upto 90dB | After 10:00 pm - Upto 85dB.',
          'DJ and Client will be liable and responsible if not adhered to the sound and timings as agreed and will be fined if any licensing are in breach during an Event.',
        ],
      },
    ],
    notesTitle: 'NOTE',
    notes: [
      'Minimum Number of Guests will be charged as agreed.',
      "As per our policy and food safety, we don't allow any food takeaway from Banquet Venue.",
    ],
  },
};

export function sanitizeWebsiteContent(data: any): WebsiteContentConfig {
  if (!data || typeof data !== 'object') {
    return DEFAULT_WEBSITE_CONTENT;
  }

  const def = DEFAULT_WEBSITE_CONTENT;
  const rawHero = data.hero || {};
  const rawStats = data.statsRibbon || {};
  const rawMenuHeader = data.menuHeader || {};
  const rawTerms = data.termsAndConditions || {};

  return {
    hero: {
      headlinePart1: typeof rawHero.headlinePart1 === 'string' ? rawHero.headlinePart1 : def.hero.headlinePart1,
      headlinePart2: typeof rawHero.headlinePart2 === 'string' ? rawHero.headlinePart2 : def.hero.headlinePart2,
      headlinePart2Color: typeof rawHero.headlinePart2Color === 'string' ? rawHero.headlinePart2Color : def.hero.headlinePart2Color,
      subtitle: typeof rawHero.subtitle === 'string' ? rawHero.subtitle : def.hero.subtitle,
      primaryButton: {
        text: rawHero.primaryButton?.text ?? def.hero.primaryButton.text,
        link: rawHero.primaryButton?.link ?? def.hero.primaryButton.link,
        enabled: rawHero.primaryButton?.enabled ?? def.hero.primaryButton.enabled,
      },
      secondaryButton: {
        text: rawHero.secondaryButton?.text ?? def.hero.secondaryButton.text,
        link: rawHero.secondaryButton?.link ?? def.hero.secondaryButton.link,
        enabled: rawHero.secondaryButton?.enabled ?? def.hero.secondaryButton.enabled,
      },
      backgroundImage: typeof rawHero.backgroundImage === 'string' && rawHero.backgroundImage.trim()
        ? rawHero.backgroundImage
        : def.hero.backgroundImage,
      trustBadges: Array.isArray(rawHero.trustBadges) && rawHero.trustBadges.length > 0
        ? rawHero.trustBadges.map((b: any, i: number) => ({
            id: b.id || `badge-${i}`,
            icon: b.icon || '⭐',
            title: b.title || '',
            subtitle: b.subtitle || '',
            enabled: b.enabled !== undefined ? !!b.enabled : true,
          }))
        : def.hero.trustBadges,
    },
    statsRibbon: {
      enabled: rawStats.enabled !== undefined ? !!rawStats.enabled : def.statsRibbon.enabled,
      items: Array.isArray(rawStats.items) && rawStats.items.length > 0
        ? rawStats.items.map((s: any, i: number) => ({
            id: s.id || `stat-${i}`,
            icon: s.icon || '⭐',
            value: s.value || '',
            label: s.label || '',
            enabled: s.enabled !== undefined ? !!s.enabled : true,
          }))
        : def.statsRibbon.items,
    },
    menuHeader: {
      enabled: rawMenuHeader.enabled !== undefined ? !!rawMenuHeader.enabled : def.menuHeader.enabled,
      badgeText: typeof rawMenuHeader.badgeText === 'string' ? rawMenuHeader.badgeText : def.menuHeader.badgeText,
      title: typeof rawMenuHeader.title === 'string' ? rawMenuHeader.title : def.menuHeader.title,
      subtitle: typeof rawMenuHeader.subtitle === 'string' ? rawMenuHeader.subtitle : def.menuHeader.subtitle,
    },
    termsAndConditions: {
      enabled: rawTerms.enabled !== undefined ? !!rawTerms.enabled : def.termsAndConditions.enabled,
      badgeText: typeof rawTerms.badgeText === 'string' ? rawTerms.badgeText : def.termsAndConditions.badgeText,
      title: typeof rawTerms.title === 'string' ? rawTerms.title : def.termsAndConditions.title,
      sections: Array.isArray(rawTerms.sections) && rawTerms.sections.length > 0
        ? rawTerms.sections.map((sec: any, i: number) => ({
            id: sec.id || `sec-${i}`,
            title: sec.title || '',
            items: Array.isArray(sec.items) ? sec.items : [],
            enabled: sec.enabled !== undefined ? !!sec.enabled : true,
          }))
        : def.termsAndConditions.sections,
      notesTitle: typeof rawTerms.notesTitle === 'string' ? rawTerms.notesTitle : def.termsAndConditions.notesTitle,
      notes: Array.isArray(rawTerms.notes) ? rawTerms.notes : def.termsAndConditions.notes,
    },
  };
}
