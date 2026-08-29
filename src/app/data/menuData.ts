// ─── COMPLETE RESTAURANT & CATERING MENU DATA ────────────────────────────────

export interface MenuItem {
  name: string;
  description: string;
  tags?: string[]; // 'V' | 'M' | 'N' | 'O' | 'J' | 'S'
  isLive?: boolean;
}

export interface MenuCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  items: MenuItem[];
}

export interface MenuUpgradeItem {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: 'fixed' | 'per_person' | 'per_hour' | 'per_dish';
  priceLabel: string;
  icon: string;
}

// ─── 1. LIVE DOSA STATION MENU & PRICING ──────────────────────────────────────
// ─── 1. LIVE DOSA STATION MENUS & PRICING ─────────────────────────────────────
export const LIVE_DOSA_OPTION_1 = {
  id: 'live-dosa-1',
  title: 'Live Dosa Option 1',
  tagline: 'Each item is prepared fresh on the spot with theatrical flair',
  subtitle: 'Crisp & golden, the classic live counter experience (2 Hours Service)',
  durationHours: 2,
  pricing: {
    weekday: {
      days: 'Week days (Monday to Friday)',
      pricePerPerson: 11.00,
      minGuests: 35,
      minCallOutCharge: 385.00,
      description: '£11.00 / per person, 35 people minimum (Minimum call out charge: £385)',
    },
    weekend: {
      days: 'Week Ends & Bank Holidays',
      pricePerPerson: 12.00,
      minGuests: 40,
      minCallOutCharge: 480.00,
      description: '£12.00 / per person, 40 people minimum (Minimum call out charge: £480)',
    },
    disclaimer: 'Minimum call out charge (£385 on Weekdays / £480 on Weekends) can be reached by the number of people or by the menu/upgrades.',
  },
  items: [
    { name: 'Idly Or Veg Biryani', description: 'Fresh steamed hot idlies or fragrant spiced vegetable biryani', isLive: true, tags: ['V', 'M'] },
    { name: 'Meduvada (Live)', description: 'Crisp golden lentil fritters fried fresh on the spot', isLive: true, tags: ['V', 'M'] },
    { name: 'Masala Dosa (Live)', description: 'Crisp crepe filled with traditional spiced potato masala', isLive: true, tags: ['M', 'O', 'J'] },
    { name: 'Plain Dosa (Live)', description: 'Golden crispy South Indian rice & lentil crepe', isLive: true, tags: ['M', 'O', 'J'] },
    { name: 'Onion Dosa (Live)', description: 'Crisp crepe sprinkled with finely chopped shallots', isLive: true, tags: ['M', 'O'] },
    { name: 'PodiDosa (Live)', description: 'Spicy gun-powder roasted ghee dosa', isLive: true, tags: ['M', 'S', 'O', 'J'] },
    { name: 'Onion Uthappam (Live)', description: 'Thick fluffy pancake topped with caramelized onions', isLive: true, tags: ['M', 'O'] },
    { name: 'Capsicum Uthappam (Live)', description: 'Thick savory pancake loaded with crunchy bell peppers', isLive: true, tags: ['M', 'O', 'J'] },
    { name: 'Chilli Uthappam (Live)', description: 'Zesty pancake topped with fresh green chillies', isLive: true, tags: ['M'] },
    { name: 'Plain Uthappam (Live)', description: 'Soft & spongy traditional thick pancake', isLive: true, tags: ['M', 'O', 'J'] },
    { name: 'PodiUthappam (Live)', description: 'Thick pancake generously dusted with podi spices', isLive: true, tags: ['M', 'S', 'O', 'J'] },
    { name: 'Coconut Chutney, Tomato & Onion Chutney and Sambar', description: 'Fresh coconut chutney, tangy tomato chutney and hot aromatic sambar', isLive: true, tags: ['V'] },
  ],
};

export const LIVE_DOSA_OPTION_2 = {
  id: 'live-dosa-2',
  title: 'Live Dosa Option 2',
  tagline: 'Standard Live Dosa Station + 1 Main Course + 1 Dessert (3 Hours Service)',
  subtitle: 'Full theatrical live station with extra courses & 3 hours chef service',
  durationHours: 3,
  pricing: {
    weekday: {
      days: 'Week days (Monday to Friday)',
      pricePerPerson: 16.50,
      minGuests: 35,
      minCallOutCharge: 577.50,
      description: '£16.50 / per person, 35 people minimum (Minimum call out charge: £577.50)',
    },
    weekend: {
      days: 'Week Ends & Bank Holidays',
      pricePerPerson: 17.50,
      minGuests: 40,
      minCallOutCharge: 700.00,
      description: '£17.50 / per person, 40 people minimum (Minimum call out charge: £700)',
    },
    disclaimer: 'Minimum call out charge (£577.50 on Weekdays / £700 on Weekends) can be reached by the number of people or by the menu/upgrades.',
  },
  inclusions: [
    'Standard Menu (Idly Or Veg Biryani, Meduvada, Dosas, Uthappams, Chutneys and Sambar)',
    'One Main Course Dish (from menu selection)',
    'One Dessert (from menu selection)',
    'Will Stay for Three (3) Hours instead of Two Hours',
  ],
  items: [
    ...LIVE_DOSA_OPTION_1.items,
    { name: 'One Main Course Dish', description: 'Select 1 delicious main curry/course from our rich banquet menu', isLive: false, tags: ['V', 'M'] },
    { name: 'One Dessert', description: 'Select 1 authentic dessert (Gulab Jamun, Rasmalai, Payasam, etc.)', isLive: false, tags: ['V', 'N'] },
  ],
};

// Aliases for backwards compatibility
export const LIVE_DOSA_MENU = LIVE_DOSA_OPTION_1;

// ─── DYNAMIC MENU UPGRADES ──────────────────────────────────────────────────
export const MENU_UPGRADES: {
  title: string;
  subtitle: string;
  items: MenuUpgradeItem[];
} = {
  title: 'Upgrades',
  subtitle: 'Elevate your event with bespoke upgrades and dedicated service',
  items: [
    {
      id: 'gazebo',
      name: 'Gazebo Setup',
      description: 'Upgrade Your Menu With A Gazebo at an extra cost of £70/.',
      price: 70.00,
      unit: 'fixed',
      priceLabel: '£70.00 Fixed',
      icon: '⛺',
    },
    {
      id: 'waiter',
      name: 'Waiter for Serving',
      description: 'Upgrade Your Menu With A Waiter for Serving at an extra cost of £70/.',
      price: 70.00,
      unit: 'fixed',
      priceLabel: '£70.00 / Waiter',
      icon: '🤵',
    },
    {
      id: 'crockery',
      name: 'Crockery (Ceramic Plates / Bowls / Steel Spoons)',
      description: 'Upgrade Your Menu With Crockery (Ceramic plates / Ceramic Bowls / Steel Spoons) at an extra cost of £3.00 / per person.',
      price: 3.00,
      unit: 'per_person',
      priceLabel: '£3.00 / person',
      icon: '🍽️',
    },
    {
      id: 'extra_hour',
      name: 'Extra Hour for Serving / Cooking',
      description: 'Upgrade Your Menu With Extra Hour For Serving/Cooking At A Cost Of £100/ Per Hour.',
      price: 100.00,
      unit: 'per_hour',
      priceLabel: '£100.00 / hour',
      icon: '⏱️',
    },
    {
      id: 'more_dishes',
      name: 'More Dishes from the Menu',
      description: 'Upgrade Your Menu With More Dishes From The Below List At An Extra Cost.',
      price: 2.50,
      unit: 'per_dish',
      priceLabel: 'From £2.00 / dish',
      icon: '🍲',
    },
  ],
};

export interface LiveDosaPricingBreakdown {
  tier: 'weekday' | 'weekend';
  tierLabel: string;
  optionTitle: string;
  durationHours: number;
  pricePerPerson: number;
  minGuests: number;
  minCallOutCharge: number;
  guests: number;
  peopleTotal: number;
  upgradesTotal: number;
  subtotalBeforeFloor: number;
  callOutAdjustment: number;
  finalSubtotal: number;
}

export function isWeekendOrBankHoliday(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6;
  } catch {
    return false;
  }
}

export function calculateLiveDosaPrice(
  dateOrType: string | 'weekday' | 'weekend',
  guests: number,
  upgradesTotal: number = 0,
  optionChoice: 'option-1' | 'option-2' | 'live-dosa' | 'live-dosa-1' | 'live-dosa-2' | string = 'option-1',
  customPricing?: typeof LIVE_DOSA_OPTION_1.pricing
): LiveDosaPricingBreakdown {
  const isWeekend = dateOrType === 'weekend' || isWeekendOrBankHoliday(dateOrType);
  const isOption2 = optionChoice === 'option-2' || optionChoice === 'live-dosa-2' || (typeof optionChoice === 'string' && optionChoice.toLowerCase().includes('option 2'));
  
  const baseOption = isOption2 ? LIVE_DOSA_OPTION_2 : LIVE_DOSA_OPTION_1;
  const pricing = customPricing || baseOption.pricing;
  const tier: 'weekday' | 'weekend' = isWeekend ? 'weekend' : 'weekday';
  const tierConfig = isWeekend ? pricing.weekend : pricing.weekday;

  const pricePerPerson = tierConfig.pricePerPerson;
  const minGuests = tierConfig.minGuests;
  const minCallOutCharge = tierConfig.minCallOutCharge;
  const tierLabel = isWeekend ? 'Week Ends & Bank Holidays' : 'Week days (Monday to Friday)';
  const optionTitle = baseOption.title;
  const durationHours = baseOption.durationHours;

  const validGuests = Math.max(0, guests);
  const peopleTotal = validGuests * pricePerPerson;
  const subtotalBeforeFloor = peopleTotal + upgradesTotal;
  const finalSubtotal = Math.max(minCallOutCharge, subtotalBeforeFloor);
  const callOutAdjustment = Math.max(0, minCallOutCharge - subtotalBeforeFloor);

  return {
    tier,
    tierLabel,
    optionTitle,
    durationHours,
    pricePerPerson,
    minGuests,
    minCallOutCharge,
    guests: validGuests,
    peopleTotal,
    upgradesTotal,
    subtotalBeforeFloor,
    callOutAdjustment,
    finalSubtotal,
  };
}

// ─── 2. MADRAS THALI / SOUTH INDIAN MEALS / ANDHRA BHOJANAM (OPTION 3) ────────
export interface ThaliAdditionItem {
  name: string;
  price: number;
  category: string;
}

export const MADRAS_THALI_OPTION_3 = {
  id: 'madras-thali-3',
  title: 'Madras Thali or South Indian Meals or Andhra Bhojanam',
  shortTitle: 'Madras Thali (Option 3)',
  tagline: 'Traditional South Indian full meals with authentic accompaniments and customizable flavours',
  subtitle: 'Complete South Indian feast experience at £10.99 / per person',
  pricePerPerson: 10.99,
  coreDishes: [
    { name: 'Plain Rice', description: 'Steamed premium aromatic ponni rice' },
    { name: 'Sambar', description: 'Slow-simmered lentil curry with your choice of fresh vegetable' },
    { name: 'Rasam', description: 'Traditional zesty tangy herbal broth' },
    { name: 'Koottu', description: 'Nutritious lentil & vegetable stew' },
    { name: 'Poriyal', description: 'Dry sautéed vegetable with freshly grated coconut & mustard seeds' },
    { name: 'Kaarakolambu', description: 'Spicy, tangy tamarind gravy specialty' },
    { name: 'Sweet', description: 'Traditional celebratory dessert' },
    { name: 'Pappad', description: 'Crispy fried South Indian papadum' },
    { name: 'Yoghurt', description: 'Fresh set natural curd' },
    { name: 'Pickle', description: 'Authentic spiced South Indian pickle' },
    { name: 'Veg Kurma', description: 'Rich coconut and spiced vegetable curry' },
    { name: 'Poori (1)', description: 'Puffed golden wholewheat fried bread (1 piece)' },
  ],
  variantOptions: {
    sambarOptions: [
      'Aubergine Sambar',
      'Lady Finger Sambar',
      'Tinde Sambar',
      'Capsicum / Potato / Carrot Sambar',
    ],
    rasamOptions: [
      'Garlic Rasam',
      'Pepper Rasam',
      'Lemon Rasam',
      'Pineapple Rasam',
    ],
    koottuOptions: [
      'Cabbage Koottu',
      'Tomato Koottu',
      'Nine Dhalls Koottu',
      'Pappali Koottu (Papaya)',
      'Sorakka Koottu (Bottle Gourd)',
    ],
    poriyalOptions: [
      'Cabbage Poriyal',
      'Mix Veg Poriyal',
      'Potato Poriyal',
      'Raddish Poriyal',
    ],
    kaarakolambuOptions: [
      'Ennakathirikka (Guthivankaya)',
      'Lady Finger Kaarakolambu',
      'Paruppu Urundai (Lentil Dumplings)',
      'Pakoda Kaarakolambu',
      'Potato Kaarakolambu',
    ],
    sweetOptions: [
      'Pineapple Kesari',
      'Apple Kesari',
      'Banana Kesari',
      'Semiya Kheer',
      'Sabhudhana Kheer',
      'Rice Kheer',
    ],
  },
  additions: [
    { name: 'Bisibela Bath', price: 2.50, category: 'Rice Specialty' },
    { name: 'Bagala Bath', price: 2.50, category: 'Rice Specialty' },
    { name: 'Lemon Rice', price: 2.50, category: 'Rice Specialty' },
    { name: 'Sambar Rice', price: 2.50, category: 'Rice Specialty' },
    { name: 'Puliyodarai (Tamarind Rice)', price: 2.50, category: 'Rice Specialty' },
    { name: 'Curd Rice', price: 2.50, category: 'Rice Specialty' },
    { name: 'Veg Biriyani', price: 3.00, category: 'Rice Specialty' },
    { name: 'Veg Pulao', price: 2.50, category: 'Rice Specialty' },
    { name: 'Paneer Fried Rice', price: 3.00, category: 'Indo-Chinese' },
    { name: 'Jeera Rice', price: 2.50, category: 'Rice Specialty' },
    { name: 'Veg Fried Rice', price: 2.50, category: 'Indo-Chinese' },
    { name: 'Veg Noodles', price: 2.50, category: 'Indo-Chinese' },
    { name: 'Hakka Noodles', price: 2.50, category: 'Indo-Chinese' },
    { name: 'Szechuan Noodles', price: 3.00, category: 'Indo-Chinese' },
    { name: 'Gulab Jamun', price: 2.50, category: 'Dessert' },
    { name: 'Rasa Malai', price: 3.00, category: 'Dessert' },
    { name: 'Rasa Gulla', price: 2.50, category: 'Dessert' },
    { name: 'Pineapple / Apple / Banana / Plain Kesari', price: 2.50, category: 'Dessert' },
    { name: 'Semiya / Sabudhana / Rice Kheer', price: 2.50, category: 'Dessert' },
    { name: 'Badam Halwa', price: 3.50, category: 'Dessert' },
    { name: 'Chennai Srilalithas Special Moar Kolambu with fried lady finger & raw banana (matoki)', price: 3.00, category: 'Special Curry' },
    { name: 'Traditional Avial', price: 3.00, category: 'Special Curry' },
  ],
};

// ─── 4. TAILOR YOUR OWN MENU (OPTION 4) ──────────────────────────────────────
export const TAILOR_MENU_OPTION_4 = {
  id: 'tailor-menu-4',
  title: 'Tailor Your Own Menu',
  shortTitle: 'Tailor Your Menu (Option 4)',
  tagline: 'Tailor Your Own Menu from the List Mentioned Below with Signature Live Stations',
  subtitle: 'Live Stations for Jilebi & Paan Along with Live Station for Dosa & Vada',
  priceLabel: 'Depends on the menu you tailor',
  liveStationsFeatured: [
    { name: 'Live Station for Jilebi', icon: '🍯', description: 'Hot, crisp, spiral jilebis fried and dipped in fragrant saffron syrup on the spot' },
    { name: 'Live Station for Paan', icon: '🍃', description: 'Authentic royal sweet paan made fresh with aromatic mukhwas and gulkand' },
    { name: 'Live Station for Dosa', icon: '🥞', description: 'Golden, crispy Dosas tossed fresh with customized spiced fillings' },
    { name: 'Live Station for Vada', icon: '🍩', description: 'Piping hot Meduvadas fried golden and served crunchy with chutneys' },
  ],
  whatWeBring: [
    'All equipment necessary for live on-site cooking',
    'Bain Marie food warmers to keep all dishes piping hot',
    'Disposable compartment plastic plates (9 inches)',
    'Disposable spoons and serviettes',
    'Note: We do not bring drinking water or water glasses',
  ],
  whatWeNeedFromYou: [
    'One Serving table of any size',
    'One power plug point (standard 240V socket)',
    '50 to 60 square feet or 3×3 meters empty space for cooking with shade or cover on top and lighting',
    'Empty space can be at any part of your Home (Kitchen, Garage, Dining room, Garden with shelter, etc.)',
  ],
  depositPolicy: {
    depositPercentage: 50,
    terms: 'At the time of booking 50% deposit need to be paid and the balance by cash after the event is over.',
  },
};

// ─── 5. DOSA FESTIVAL AT YOUR HOME (OPTION 5) ────────────────────────────────
export const DOSA_FESTIVAL_OPTION_5 = {
  id: 'dosa-festival-5',
  title: 'Dosa Festival At Your Home',
  shortTitle: 'Dosa Festival (Option 5)',
  tagline: 'First Time in London Dosa Festival At Your Home Brought To You Only By Veg Chennai Sri Lalitha Restaurant',
  subtitle: 'Quality And Trust For Sixteen (16) Years • 34+ Signature Dosa Varieties',
  pricePerPerson: 14.99,
  heritageBadge: '16 Years of Quality & Trust',
  inclusions: 'All dosas prepared live on hot tawas with fresh Coconut Chutney, Tomato & Onion Chutney, Mint Chutney, and Hot Sambar',
  dosaVarieties: [
    'Banana Dosa',
    'Masala Dosa',
    'Besan Dosa',
    'Bread Dosa',
    'Cabbage Dosa',
    'Carrot Dosa',
    'Chinese Dosa',
    'Coconut Dosa',
    'Corn Dosa',
    'Cucumber Dosa',
    'Kal Dosa',
    'Soft Dosa',
    'Soya Dosa',
    'Adai Dosa',
    'Sponge Dosa',
    'Spring Dosa',
    'Steamed Dosa',
    'Sweet Dosa',
    'Maida Dosa',
    'Methi Dosa',
    'Mixed Dal Dosa',
    'Moong Dal Dosa',
    'Neer Dosa',
    'Oats Dosa',
    'Onion Dosa',
    'Palak Dosa',
    'Pesarattu Dosa',
    'Poha Dosa',
    'Ragi Dosa',
    'Set Dosa Batter',
    'Set Dosa',
    'Tomato Dal Dosa',
    'Vegetable Dosa',
    'Wheat Dosa',
    'Rava Dosa',
  ],
};

// ─── 6. CANAPÉ SERVICE (OPTION 6) ────────────────────────────────────────────
export const CANAPE_OPTION_6 = {
  id: 'canape-6',
  title: 'Canapé Service',
  shortTitle: 'Canapé Service (Option 6)',
  tagline: 'CANAPE – We can provide canape service for a variety of our menu',
  subtitle: 'Cocktail & Event Canapés with Finger Food Service',
  description: 'We can provide canape service for a variety of our menu. A few suggestions are like Chilli Paneer, Mogo, Masala Mogo, Paneer 65, Gobi 65 and lots more. Please check our extensive menu and contact us for further information.',
  pricePerPerson: 8.99,
  suggestedItems: [
    'Chilli Paneer',
    'Mogo',
    'Masala Mogo',
    'Paneer 65',
    'Gobi 65',
    'Cocktail Vegetable Samosas',
    'Crispy Spring Rolls',
    'Aloo Tikki Bites with Mint Chutney',
    'Hara Bhara Kebab',
    'Medu Vada Canapé with Chutney',
    'Cocktail Idli Skewers',
    'Mini Uttappam Bites',
  ],
};

// ─── 7. NORTH INDIAN STANDARD MENU (OPTION 7) ────────────────────────────────
export const NORTH_INDIAN_OPTION_7 = {
  id: 'north-indian-7',
  title: 'North Indian Standard Menu',
  shortTitle: 'North Indian Menu (Option 7)',
  tagline: 'Authentic North Indian & Punjabi Comfort Feasts',
  subtitle: 'One Tava Roti or Nan, Two Subjies, Dal, Veg Biryani or Pulao, Salad, Pappad and Pickle',
  pricePerPerson: 12.00,
  minGuests: 25,
  inclusions: [
    'One Tava Roti or Nan (1)',
    'Two North Indian or Punjabi Subjies (2)',
    'Dal',
    'Veg Biryani or Veg Pulao',
    'Fresh Salad',
    'Pappad',
    'Pickle',
  ],
  breadOptions: ['Tava Roti', 'Tandoori Naan', 'Butter Naan', 'Garlic Naan', 'Bhatura'],
  subjiOptions: [
    'Paneer Butter Masala',
    'Palak Paneer',
    'Kadai Paneer',
    'Shahi Paneer',
    'Mutter Paneer',
    'Chana Masala / Amritsari Chole',
    'Aloo Gobi',
    'Baingan Bharta',
    'Mixed Vegetable Curry',
    'Navratan Korma',
    'Bhindi Do Pyaza',
  ],
  dalOptions: ['Tadka Dal', 'Dal Makhani', 'Panchmel Dal', 'Yellow Moong Dal', 'Palak Dal'],
  riceOptions: ['Veg Biryani', 'Veg Pulao', 'Jeera Rice', 'Peas Pulao', 'Plain Basmati Rice'],
};

// ─── 8. GUJARATI MENU (OPTION 8) ─────────────────────────────────────────────
export const GUJARATI_OPTION_8 = {
  id: 'gujarati-8',
  title: 'Gujarati Menu',
  shortTitle: 'Gujarati Menu (Option 8)',
  tagline: 'Authentic Gujarati Thaal & Festive Catering',
  subtitle: 'Traditional Mithai, Crispy Farsan, Classic Shaak, Dal, Breads, Rice & Condiments',
  pricePerPerson: 14.99,
  categories: {
    mithai: [
      'Amrat Paak',
      'Amrat Paak (loose)',
      'Anjir Barfi',
      'Aradia',
      'Badam Paak',
      'Badshahi Seero',
      'Barfi Churmu',
      'Boondi & Mini Jambu Mix',
      'Boondi (loose)',
      'Boondi Ladoo',
      'Cassata Barfi',
      'Chocolate Barfi',
      'Churma Na Ladoo',
      'Coconut Barfi',
      'Cutlet Jamun',
      'Dosa Na Ladoo',
      'Dudhi Halwa',
      'Gajar Halwa',
      'Ganga Jamna Halwa',
      'Gulab Jamun',
      'Kaju Barfi',
      'Kaju Rolls',
      'Keri No Ras',
      'Kesar Jalebi',
      'Kesar Mani',
      'Kheer',
      'Kit Kat Barfi',
      'Madras Paak',
      'Marble Ladoo',
      'Mithi Sev',
      'Mohanthal (loose)',
      'Mohanthal (square)',
      'Motichur Ladoo',
      'Motiya Ladoo',
      'Penda (kesar)',
      'Penda (mawa)',
      'Ras Gulla',
      'Ras Malai',
      'Shrikhand (kesar)',
      'Shrikhand (mango)',
      'Tutti Frutti Barfi',
    ],
    farsan: [
      'Bateta Pava',
      'Bateta Pava Makai',
      'Bateta Vada',
      'Chilli Paneer',
      'Chilli Paneer & Mogo Mix',
      'Crispy Bhajia',
      'Daal Bhajia',
      'Dahi Vada',
      'Dhokla & Patra Mix',
      'Dhokla (yellow)',
      'Kachori (daal)',
      'Kachori (peas)',
      'Mix Bhajia',
      'Peas Pettis',
      'Samosa (paneer)',
      'Samosa (vegetables)',
      'Sev Boondi Kaju',
      'Sev Khaman',
      'Spring Rolls (vegetable)',
      'Stuffed Chilli Bhajia',
      'Vegetable Pottli',
    ],
    shaak: [
      'Baby Potato & Cashewnuts',
      'Bharelu Ringan Bateta',
      'Bhindi & Capsicums',
      'Black Eye Beans',
      'Cauliflower & Peas',
      'Channa Bateta',
      'Corn on the Cob',
      'Dudhi Channa Daal',
      'Kabuli Channa',
      'Kala Channa',
      'Potato Curry',
      'Makai Patra',
      'Mixed Green Beans',
      'Mutter Bateta',
      'Mutter Methi Malai',
      'Oro',
      'Palak Paneer',
      'Panch Ratna Kathor',
      'Paneer & Makai',
      'Posho & Mutter',
      'Rajma',
      'Rajma & Makai',
      'Ringan Bateta',
      'Ringan, Methi & Tomatoes',
      'Tindora, Makai Kaju',
      'Turia Patra',
      'Tuver Valor',
      'Tuver, Ringan & Valor',
      'Undhiyu (original)',
    ],
    dal: [
      'Daal Makhani',
      'Kadhi Pakora',
      'Mix Daal',
      'Palak Daal',
      'Tadka Daal',
      'Gujarati Sweet & Sour Daal',
      'Gujarati Kadhi',
    ],
    breads: [
      'Paratha',
      'Methi Bhatura',
      'Tandoori Naan',
      'Rotli (Phulka)',
      'Puri',
    ],
    rice: [
      'Corn Rice',
      'Vegetable Biryani',
      'Jeera Rice',
      'Lemon Rice',
      'Plain Rice',
      'Vegetable Pilau',
    ],
    condiments: [
      'Boondi Raita',
      'Cucumber Raita',
      'Pineapple Raita',
      'Garlic Chutney',
      'Green Chutney',
      'Khajur Amli Chutney',
      'Lime Pickle',
      'Mango Pickle',
      'Mixed Green Salad',
      'Red Chutney',
      'Tomato Chutney',
      'Tomato, Onion & Chilli Salad',
    ],
  },
};

// ─── 9. PUNJABI MENU (OPTION 9) ──────────────────────────────────────────────
export const PUNJABI_OPTION_9 = {
  id: 'punjabi-9',
  title: 'Punjabi Menu',
  shortTitle: 'Punjabi Menu (Option 9)',
  tagline: 'Hearty, Rich & Authentic Punjabi Celebration Feast',
  subtitle: 'Signature Chaats, Tandoori Starters, Royal Subjies, Dal Makhani, Breads & Desserts',
  pricePerPerson: 13.99,
  categories: {
    starters: [
      'Aloo Papri Chaat',
      'Aloo Tikki with Chole',
      'Bombay Bhel',
      'Paneer Tikka Shashlik',
      'Hara Bhara Kebab',
      'Samosa Chaat',
      'Chilli Paneer',
      'Veg Seekh Kebab',
      'Crispy Mix Bhajia',
      'Dahi Bhalla',
      'Spring Rolls',
    ],
    subjies: [
      'Paneer Butter Masala',
      'Palak Paneer',
      'Kadai Paneer',
      'Shahi Paneer',
      'Amritsari Chole / Chana Masala',
      'Mutter Paneer',
      'Baingan Ka Bharta',
      'Aloo Gobi Adraki',
      'Methi Malai Mutter',
      'Navratan Korma',
      'Sarson Ka Saag',
      'Mushroom Do Pyaza',
    ],
    dal: [
      'Dal Makhani (Slow-cooked black lentils)',
      'Dal Tadka (Yellow lentils with ghee & cumin)',
      'Panchmel Dal',
      'Dhabha Style Chana Dal',
      'Kadhi Pakora',
    ],
    mithai: [
      'Gulab Jamun',
      'Ras Malai',
      'Gajar Ka Halwa',
      'Rice Kheer',
      'Badam Halwa',
      'Kesar Jalebi',
      'Moong Dal Halwa',
      'Kaju Barfi',
      'Rasgulla',
    ],
    breads: [
      'Tandoori Roti',
      'Butter Naan',
      'Garlic Naan',
      'Stuffed Aloo Kulcha',
      'Lachha Paratha',
      'Amritsari Bhatura',
      'Puri',
    ],
    rice: [
      'Vegetable Dum Biryani',
      'Vegetable Pulao',
      'Jeera Rice',
      'Peas Pulao',
      'Steamed Basmati Rice',
    ],
    condiments: [
      'Boondi Raita',
      'Cucumber Mint Raita',
      'Mixed Green Salad',
      'Mango Pickle',
      'Mixed Spicy Pickle',
      'Roasted Punjabi Papad',
      'Fresh Mint & Coriander Chutney',
      'Tamarind Saunth Chutney',
      'Spicy Onion & Green Chilli Salad',
    ],
  },
};

// ─── 10. SOUTH INDIAN SPECIAL BUFFET ─────────────────────────────────────────
export const SOUTH_INDIAN_BUFFET = {
  title: 'South Indian Special Buffet',
  weekday: {
    days: 'Monday – Friday',
    slots: ['11:00 AM – 3:15 PM', '5:45 PM – 10:15 PM'],
    price: '£11.99',
    chargeNote: '+10% Eat-in Charges',
  },
  weekend: {
    days: 'Saturday, Sunday & Public Holidays',
    slots: ['11:00 AM – 10:15 PM'],
    price: '£13.99',
    chargeNote: '+10% Eat-in Charges',
  },
  items: [
    { name: 'Idly', tags: ['M', 'OJ'], description: 'Steamed fluffy rice and lentil cakes' },
    { name: 'Sada Dosa', tags: ['M', 'OJ'], description: 'Crisp and golden classic plain crepe' },
    { name: 'Masala Dosa', tags: ['M', 'OJ'], description: 'Stuffed with spiced potato and onion masala' },
    { name: 'Plain Uthappam', tags: ['M', 'OJ'], description: 'Thick, soft savory South Indian pancake' },
    { name: 'Onion Chilli Uthappam', tags: ['M'], description: 'Topped with fresh chopped onions and green chillies' },
    { name: 'Medhu Vada', tags: ['M', 'OJ'], description: 'Crisp golden fried lentil donuts' },
    { name: 'Sambar Vada', tags: ['M', 'OJ'], description: 'Golden lentil vadas dipped in piping hot sambar' },
    { name: 'Rasa Vada', tags: ['V'], description: 'Crispy vadas immersed in tangy pepper-tomato rasam' },
    { name: 'Curd Vada', tags: ['M', 'OJ'], description: 'Soaked in seasoned chilled whipped yogurt' },
    { name: 'Pongal / Rava Kitchadi', tags: ['N', 'M', 'OJ'], description: 'Ghee-tempered comfort pongal or savory spiced semolina kitchadi' },
    { name: 'Upma', tags: ['M', 'OJ'], description: 'Traditional roasted semolina with mustard and curry leaves' },
    { name: 'Sweet of the Day', tags: ['M', 'N'], description: "Chef's freshly prepared authentic sweet specialty" },
    { name: 'Jeera Rice or Plain Rice', tags: ['M', 'N', 'V'], description: 'Aromatic cumin-infused basmati or steamed plain rice' },
    { name: 'Veg Salad', tags: ['V'], description: 'Freshly sliced crisp garden vegetables' },
  ],
};

// ─── 3. COMPLETE 9 MENU CATEGORIES ───────────────────────────────────────────
export const MENU_CATEGORIES: MenuCategory[] = [
  {
    id: 'super-starters',
    title: 'Super Staters',
    icon: '⚡',
    color: '#3D2614',
    description: 'Crispy, crunchy, and flavor-packed starters prepared with chef secret spices',
    items: [
      { name: 'Veg Cheese Frankie', description: 'Classic veg Frankie with grated cheese, tamarind & mint sauce', tags: ['M'] },
      { name: 'Palak Roll', description: 'Fried spring rolls stuffed with spicy spinach stuffing', tags: ['V'] },
      { name: 'Chilli Honey Potato', description: "Fried potato fingers tossed in sesame honey chilly sauce that's sweet & spicy", tags: ['V'] },
      { name: 'Paneer Popcorn', description: 'KFC style snack, deep fried paneer coated with seasoned corn flour', tags: ['M'] },
      { name: 'Falafel', description: 'Deep fried balls made with ground chickpeas, herbs & spices', tags: ['V'] },
      { name: 'Kurkuri Bhindi Fry', description: 'Thinly sliced okra coated with besan and spices, deep fried crispy', tags: ['V'] },
      { name: 'Cabbage Pakora', description: 'Deep fried fritters made from cabbage, gram flour, and rice flour', tags: ['V'] },
      { name: 'Veg Dumplings', description: 'Steamed dumplings with mixed vegetables and aromatic herbs', tags: ['V'] },
      { name: 'Veg Lollipop', description: 'Crispy fried balls made with mix veg fillings dipped in spiced batter', tags: ['V'] },
      { name: 'Hara Bhara Kabab', description: 'Fried patties made from spinach, potato & green peas', tags: ['V'] },
      { name: 'Veg Frankie', description: 'Mix veg stuffing wrapped in a thin chapati served with sauces', tags: ['V'] },
      { name: 'Paneer Schezwan Frankie', description: 'Spicy cottage cheese stuffing wrapped in a thin chapati with hot sauce spread', tags: ['M'] },
      { name: 'Plain Chips / French Fries', description: 'Classic crispy golden fried potato chips', tags: ['V'] },
      { name: 'Masala Chips', description: 'Spiced French fries with capsicum, onion & fried garlic', tags: ['V'] },
      { name: 'Vegetable Spring Roll', description: 'Fried spring rolls stuffed with vegetables & vermicelli noodles', tags: ['V'] },
      { name: 'Crispy Bajia', description: 'Spicy potato fritters served with authentic chutney', tags: ['V'] },
      { name: 'Plain Mogo', description: 'Mogo is fried, dipped and sprinkled with salt & pepper', tags: ['V'] },
      { name: 'Masala Mogo', description: 'Mogo is fried, dipped, mixed with special chutney powder', tags: ['V'] },
      { name: 'Chilli Garlic Mogo', description: 'Mogo is fried, dipped, mixed with special gravy and garnished', tags: ['V'] },
      { name: 'Crispy Vegetables', description: 'Variety of vegetables dipped in batter and fried, like pakoras', tags: ['V'] },
      { name: 'Gobi Manchurian', description: 'Cauliflower dipped in savoury Manchurian sauce and garnished with spices', tags: ['V'] },
      { name: 'Mushroom Manchurian', description: 'Mushroom dipped in sauce and garnished with spices', tags: ['V'] },
      { name: 'Paneer Manchurian', description: 'Homemade cheese dipped in sauce and garnished with spices', tags: ['M'] },
      { name: 'Chilli Paneer', description: 'Homemade cottage cheese fried and dipped in chilli gravy/sauce', tags: ['M'] },
      { name: 'Paneer-65', description: 'Homemade cottage cheese dipped in batter and fried like pakoras', tags: ['M'] },
      { name: 'Gobi-65', description: 'Cauliflower dipped in batter and fried, like pakoras', tags: ['V'] },
      { name: 'Chilli Mushroom', description: 'Mushroom is fried, dipped, mixed with special gravy and garnished', tags: ['V'] },
      { name: 'Samosa', description: 'Mixture of vegetables garnished with spices, stuffed in batter and fried', tags: ['V'] },
      { name: 'Baby Corn-65', description: 'Baby corn dipped in batter and fried, like pakoras', tags: ['V'] },
      { name: 'Baby Corn Manchurian', description: 'Baby corn fried in batter, dipped, mixed with special gravy', tags: ['V'] },
      { name: 'Veg Bonda', description: 'Spicy mixed vegetable garnished with spices stuffed in batter and fried', tags: ['V'] },
      { name: 'South Indian Bajji (Chilli / Potato / Onion)', description: 'Chilli / potato / onion pieces dipped in gram flour batter and fried', tags: ['V'] },
      { name: 'Plain Papad', description: 'Crisp and light roasted or fried lentil crackers', tags: ['V'] },
      { name: 'Masala Papad', description: 'Crispy papad topped with spiced onion, tomato, cucumber and fresh herbs', tags: ['V'] },
      { name: 'Dhal Vada (Masala Vada)', description: 'Fried dough made with chana dal, onions, spices & herbs served with chutney', tags: ['V'] },
      { name: 'Chilli Idli', description: 'Mini Idlis fried, dipped, mixed with special gravy garnished', tags: ['V'] },
      { name: 'Paneer Bajji', description: 'Homemade cottage cheese slices pieces dipped in gram flour batter and fried', tags: ['M'] },
      { name: 'Punugulu', description: 'Deep fried balls made with rice, lentils, onions, ginger & chilis served with chutney', tags: ['V'] },
      { name: 'Idli Fingers', description: 'Idly fingers deep fried with a generous sprinkle of spice powder', tags: ['V'] },
      { name: 'Veg Kofta', description: 'Cooked vegetables are mixed with spices and besan, formed into balls and fried', tags: ['V'] },
      { name: 'Veg Momo', description: 'Finest combination of sauteed fresh vegetables wrapped in glazed dough', tags: ['V'] },
      { name: 'Paneer Momo', description: 'Fluffy paneer filling wrapped in glazed dough', tags: ['M'] },
      { name: 'Mushroom Momo', description: 'Fresh button mushrooms made in a juicy filling!', tags: ['V'] },
      { name: 'Garlic Paneer', description: 'Homemade cottage cheese fried and dipped in garlic sauce and added', tags: ['M'] },
      { name: 'Spicy Cheese Balls', description: 'Cheese & potato smashed with a touch of chili flakes, made balls deep fried', tags: ['M'] },
      { name: 'Broccoli Tikki', description: 'Fried patties made with steamed broccoli & potatoes served with chutney', tags: ['V'] },
    ],
  },
  {
    id: 'chat-corners',
    title: 'Chat Corners',
    icon: '🥙',
    color: '#4CAF50',
    description: 'Street-food favorites bursting with tangy tamarind, mint chutneys, sev, and spices',
    items: [
      { name: 'Pav Bhaji', description: 'Spiced mixture of mashed vegetables in a thick gravy, served hot with a soft white bread roll', tags: ['M', 'V'] },
      { name: 'Cheese Pav Bhaji', description: 'Spiced mixture of mashed vegetables in a thick gravy topped with cheese, served hot with butter rolls', tags: ['M'] },
      { name: 'Pani Puri', description: 'Crunchy puris, potatoes & onions served with sweet & spicy hot flavored water', tags: ['V'] },
      { name: 'Sev Puri', description: 'Puris stuffed with potatoes and onions & topped with combination of our chutneys and crispy sev', tags: ['V'] },
      { name: 'Papri Chaat', description: 'Flour crackers topped with potatoes & chickpeas with yogurt and combination of chutneys', tags: ['M', 'V'] },
      { name: 'Aloo Tikki', description: 'Pan fried potato cakes with onions, tomatoes & fresh coriander', tags: ['V'] },
      { name: 'Pakora Pops', description: 'Crunchy assorted vegetables seasoned and delicately spiced', tags: ['V'] },
      { name: 'Vada Pav', description: 'Fried potato patty flavored with various spices, served in a bread roll with chutneys', tags: ['V'] },
      { name: 'Samosa Pav', description: 'Crispy samosa served in a soft bread roll with sweet & spicy chutneys', tags: ['V'] },
      { name: 'Dabeli', description: 'Spicy, tangy & sweet potato filling served in a bread roll with peanuts and chutneys', tags: ['V', 'N'] },
      { name: 'Vada Chaat', description: 'Fried lentil donuts flavored with various spices & served with delicious chutneys and curd', tags: ['M', 'V'] },
      { name: 'Bread Pakora', description: 'Bread served with spicy potato filling dipped in chickpea flour batter and fried', tags: ['V'] },
      { name: 'Cheese Puri', description: 'Crunchy puris topped with potatoes, onion, sev, melted cheese and garnished', tags: ['M'] },
      { name: 'Fruit Chat', description: 'Combination of fresh seasonal fruits topped with delicious chaat masala and chutney', tags: ['V'] },
      { name: 'Bhel Puri', description: 'Rice puffs with onions, tomatoes with a mix of delicious tangy chutneys', tags: ['V'] },
      { name: 'Dahi Puri', description: 'Dollar sized puris stuffed with potatoes, onion topped with yogurt, chutneys and sev', tags: ['M', 'V'] },
      { name: 'Aloo Chana Chaat', description: 'Boiled chickpeas & potatoes with sweet, spicy & tangy chutneys', tags: ['V'] },
      { name: 'Kachori Chaat', description: 'Puris made with different dals and spices topped with curd and chutneys', tags: ['M', 'V'] },
      { name: 'Indian Tacos', description: 'Tacos stuffed with boiled potatoes, chickpeas & onions with house sauces', tags: ['V'] },
      { name: 'Corn Bhel', description: 'Rice puffs, onions, tomatoes served with boiled sweet corn & garnished with sev', tags: ['V'] },
      { name: 'Dal Kachori', description: 'Puris made with combinations of dals and spices served with delicious chutney', tags: ['V'] },
      { name: 'Cutlet Chaat', description: 'Pan fried vegetable patty served with sweet, spicy & tangy chutney', tags: ['V'] },
      { name: 'Masala Puri', description: 'Crushed puris with spiced peas gravy topped with chopped onions and coriander', tags: ['V'] },
      { name: 'Paneer Tikki', description: 'Pan fried potato and paneer cakes with onions, tomatoes & spices', tags: ['M'] },
      { name: 'Samosa Chana', description: 'Steamed chickpeas with Indian spices, crushed with a veg samosa & topped with chutneys', tags: ['V'] },
    ],
  },
  {
    id: 'special-soups',
    title: 'Special Soups',
    icon: '🥣',
    color: '#C8860A',
    description: 'Nourishing, fragrant, and warming broths with fresh herbs, ginger, garlic, and spices',
    items: [
      { name: 'Tomato Soup', description: 'Clear tomato soup with a dash of pepper', tags: ['V'] },
      { name: 'Cauliflower Soup', description: 'Broth with ginger, garlic, mint & steamed cauliflower vegetables', tags: ['V'] },
      { name: 'Spinach Soup', description: 'Nutritious green broth prepared from pureed spinach and fresh herbs', tags: ['V'] },
      { name: 'Pumpkin Soup', description: 'Velvety roasted pumpkin puree soup garnished with herbs and mild spices', tags: ['V'] },
      { name: 'Carrot Onion Soup', description: 'Clear soup made with shredded carrots, onion and a dash of pepper', tags: ['V'] },
      { name: 'Butternut Squash Soup', description: 'Swirled with coconut milk topped with toasted squash seeds', tags: ['V'] },
      { name: 'Baby Corn Soup', description: 'Spicy-sour broth with baby corn & minced ginger, garlic', tags: ['V'] },
      { name: 'Cream Of Veg Soup', description: 'Rich, smooth soup prepared with assorted garden vegetables', tags: ['M', 'V'] },
      { name: 'Almond Soup', description: 'Velvety soup made with milk, ground almonds and a dash of pepper', tags: ['M', 'N'] },
      { name: 'Lentil Soup', description: 'Nourishing soup made with red, green or brown lentils and fragrant spices', tags: ['V'] },
      { name: 'Pickled Soup', description: 'Zesty soup made with selected types of pickled vegetables and spices', tags: ['V'] },
      { name: 'Celery Soup', description: 'Aromatic clear soup infused with fresh celery and mild seasoning', tags: ['V'] },
      { name: 'Garlic Soup', description: 'Warming broth loaded with roasted garlic, herbs and seasonings', tags: ['V'] },
      { name: 'Spring Onion Soup', description: 'Soup made with diced spring onions, flavored with fresh ginger', tags: ['V'] },
      { name: 'Veg-Noodle Soup', description: 'Hearty vegetable broth served with thin noodles and garden vegetables', tags: ['V'] },
      { name: 'Broccoli Soup', description: 'Soup with steamed broccoli and cream with a dash of black pepper', tags: ['M', 'V'] },
      { name: 'Sweet Corn Soup', description: 'Soup made with finely diced vegetables & thickened with creamed corn', tags: ['V'] },
      { name: 'Original Tomato Soup', description: 'Traditional tomato soup slow-simmered and flavored with garlic', tags: ['V'] },
      { name: 'Coconut Soup', description: 'Made with spiced coconut milk broth with fried tofu and fresh vegetables', tags: ['V'] },
      { name: 'Chennai Special Rasam', description: 'Spicy pepper tomato broth with flavor of ginger, garlic, and curry leaves', tags: ['V', 'S'] },
      { name: 'Hot Sour Soup', description: 'Spicy-sour broth with shredded mushrooms, bamboo shoots & vegetables', tags: ['V'] },
      { name: 'Mixed Vegetable Clear Soup', description: 'Clear soup made with finely diced vegetables & dashed with black pepper', tags: ['V'] },
      { name: 'Lemon & Coriander Soup', description: 'Soup made with finely chopped coriander & splash with fresh lemon', tags: ['V'] },
      { name: 'Yellow Moong Dal Soup', description: 'Light and comforting clear soup made with steamed yellow moong dal', tags: ['V'] },
      { name: 'Cucumber & Lettuce Soup', description: 'Refreshing soup made with crisp cucumber, lettuce & a dash of ginger', tags: ['V'] },
      { name: 'Manchow Soup', description: 'Spicy dark broth with ginger, garlic, mint & finely diced vegetables topped with crispy noodles', tags: ['V'] },
    ],
  },
  {
    id: 'snacks-and-breakfast',
    title: 'Snacks and Breakfast',
    icon: '🥞',
    color: '#D48D4D',
    description: 'Authentic South Indian tiffins, steaming idlis, crispy vadas, and breakfast classics',
    items: [
      { name: 'Idly (Live / Fresh)', description: 'Steamed fluffy rice and lentil cakes served with sambar and fresh chutneys', tags: ['M', 'OJ', 'V'] },
      { name: 'Medu Vada', description: 'Crisp and golden deep fried lentil donuts with fluffy interior', tags: ['M', 'OJ', 'V'] },
      { name: 'Sambar Vada', description: 'Golden medu vada soaked in piping hot flavorful lentil sambar', tags: ['M', 'OJ'] },
      { name: 'Rasa Vada', description: 'Medu vada immersed in traditional spicy tangy pepper rasam', tags: ['V'] },
      { name: 'Curd Vada (Dahi Vada)', description: 'Lentil donuts soaked in seasoned whipped curd with tempering and chutneys', tags: ['M', 'OJ'] },
      { name: 'Pongal', description: 'Traditional South Indian comfort dish of rice and moong dal tempered with cashews, cumin and ghee', tags: ['N', 'M', 'OJ'] },
      { name: 'Rava Kitchadi', description: 'Savory roasted semolina cooked with vegetables and aromatic South Indian spices', tags: ['M'] },
      { name: 'Upma', description: 'Wholesome semolina porridge cooked with mustard seeds, curry leaves and vegetables', tags: ['M', 'OJ'] },
      { name: 'Poori Masala With Curry (3pcs)', description: 'Soft, puffed pooris served with spiced potato vegetable curry', tags: ['V', 'N'] },
      { name: 'Chole Bhatura (2pcs)', description: 'Soft, fluffy deep-fried bread served with rich spicy chickpea curry', tags: ['V', 'N'] },
      { name: 'Parotta with Kurma', description: 'Flaky layered South Indian parottas served with rich, aromatic vegetable kurma', tags: ['M'] },
      { name: 'Punugulu', description: 'Deep fried crispy dumplings made with dosa batter, onions, ginger and green chillies', tags: ['V'] },
      { name: 'Dhal Vada (Masala Vada)', description: 'Crispy crunchy patties made of coarse chana dal, onions, curry leaves and spices', tags: ['V'] },
      { name: 'Chilli Idli', description: 'Crispy mini idlis tossed in spicy chilli Indo-Chinese sauce', tags: ['V'] },
      { name: 'Idli Fingers', description: 'Idly cut into fingers, deep fried crisp and sprinkled with spicy podi', tags: ['V'] },
    ],
  },
  {
    id: 'breads',
    title: 'Breads',
    icon: '🫓',
    color: '#C68246',
    description: 'Freshly baked tandoori naans, rotis, stuffed parathas, and golden puffed pooris',
    items: [
      { name: 'Naan (1pc)', description: 'Soft, fluffy Indian flatbread baked in a tandoor', tags: ['M'] },
      { name: 'Butter Naan (1pc)', description: 'Soft tandoor-baked naan brushed with creamy butter', tags: ['M'] },
      { name: 'Garlic Naan (1pc)', description: 'Tandoor-baked naan infused with fresh garlic and coriander', tags: ['M'] },
      { name: 'Chilli Garlic Naan (1pc)', description: 'Soft naan topped with fresh garlic and spicy green chilies', tags: ['M'] },
      { name: 'Cheese Naan (1pc)', description: 'Tandoor-baked naan stuffed with melted cheese', tags: ['M'] },
      { name: 'Chilli Cheese Naan (1pc)', description: 'Soft naan filled with melted cheese and sprinkled with green chilies', tags: ['M'] },
      { name: 'Tandoori Roti (1pc)', description: 'Whole wheat flatbread baked in a tandoor', tags: ['V'] },
      { name: 'Butter Tandoori Roti (1pc)', description: 'Tandoor-baked whole wheat flatbread brushed with creamy butter', tags: ['M'] },
      { name: 'Butter Tawa Roti (1pc)', description: 'Whole wheat flatbread cooked on a tawa and brushed with butter', tags: ['M'] },
      { name: 'Tawa Roti / Tawa Chapathi (1pc)', description: 'Lightly cooked whole wheat flatbread on a tawa', tags: ['V'] },
      { name: 'Tawa Aloo Paratha (1pc)', description: 'Whole wheat flatbread stuffed with spiced mashed potatoes', tags: ['V', 'O', 'J'] },
      { name: 'Tawa Veg Paratha (1pc)', description: 'Whole wheat flatbread stuffed with a mix of spiced vegetables', tags: ['V', 'O', 'J'] },
      { name: 'Chilli Parotta', description: 'Flaky layered Indian flatbread tossed with spicy chilies and onions', tags: ['M'] },
      { name: 'Chole Bhatura (2pcs)', description: 'Soft, deep-fried bread served with spicy chickpea curry', tags: ['V', 'N'] },
      { name: 'Extra Bhature (1pc)', description: 'Additional fluffy deep-fried bread to pair with curries or chole', tags: ['V'] },
      { name: 'Extra Poori (1pc)', description: 'Light, puffed, deep-fried bread', tags: ['V'] },
      { name: 'Poori Masala With Curry (3pcs)', description: 'Soft, puffed pooris served with spiced vegetable curry', tags: ['V', 'N'] },
      { name: 'Parotta with Kurma', description: 'Flaky layered parottas served with rich, aromatic South Indian kurma', tags: ['M'] },
    ],
  },
  {
    id: 'dosas',
    title: 'Dosas',
    icon: '🥞',
    color: '#C8860A',
    description: 'Over 25 golden crispy dosas, stuffed varieties, rava dosas, and 4ft Jumbo specials',
    items: [
      { name: 'Masala Dosa', description: 'Dosa stuffed with a savoury mixture of spiced potatoes, onions, and peas', tags: ['O', 'J', 'M'] },
      { name: 'Plain Dosa', description: 'Classic thin crispy rice and lentil crepe served with sambar and chutneys', tags: ['O', 'J', 'M'] },
      { name: 'Kal Dosa With Kurma', description: 'Soft, thick dosa served with a flavourful South Indian vegetable kurma', tags: ['N', 'M'] },
      { name: 'Onion Dosa (Plain)', description: 'Thin rice & lentil crepe stuffed with raw and caramelized onions', tags: ['O', 'J', 'M'] },
      { name: 'Podi Dosa (Plain)', description: 'Dosa lightly coated with aromatic Molaga Podi (spicy South Indian powder)', tags: ['O', 'J', 'M', 'S'] },
      { name: 'Chettinad Dosa', description: 'Dosa stuffed with a bold and aromatic Chettinad-style masala, packed with spices', tags: ['M', 'N'] },
      { name: 'Gunpowder Dosa (Plain)', description: 'Dosa sprinkled with spiced fried gram dal powder (gunpowder)', tags: ['M'] },
      { name: 'Ghee Or Butter Dosa (Plain)', description: 'Dosa generously brushed with fragrant ghee or butter', tags: ['O', 'J', 'M'] },
      { name: 'Garlic Dosa (Plain)', description: 'Dosa brushed with a spiced garlic paste for a fragrant and flavorful twist', tags: ['M'] },
      { name: 'Gobi / Mushroom / Mogo / Broccoli / Baby Corn Manchurian Dosa', description: 'Stuffed with flavourful gobi, mushroom, mogo, broccoli, or baby corn Manchurian in a tangy, spicy Indo-Chinese sauce', tags: ['M'] },
      { name: 'Chocolate Dosa', description: 'Dosa filled with chocolate sauce for a rich, sweet dessert treat', tags: ['N', 'O', 'J', 'M'] },
      { name: 'Cheese And Sweet Corn Dosa', description: 'Dosa stuffed with a delightful mix of sweet corn and melted cheese', tags: ['M', 'N', 'O', 'J'] },
      { name: 'Cheese Spring Dosa (Plain)', description: 'Dosa filled with a colorful mix of carrot, capsicum, onion, cabbage, and cheese', tags: ['O', 'J', 'M'] },
      { name: 'Cheese Pepper Dosa (Plain)', description: 'Dosa sprinkled with cheese and a hint of pepper powder', tags: ['O', 'J', 'M'] },
      { name: 'Palak Dosa', description: 'Dosa infused with fresh spinach (palak) puree, packed with flavor and nutrients', tags: ['O', 'J'] },
      { name: 'Cheese Palak Dosa', description: 'Dosa infused with fresh spinach (palak) puree, packed with melted cheese', tags: ['O', 'J', 'M'] },
      { name: 'Jini Dosa', description: 'Popular Mumbai street-style dosa with vegetables, cheese, sliced into bite-sized pieces', tags: ['M', 'N'] },
      { name: 'Mysore Dosa (Plain)', description: 'Dosa spread with a special spicy Mysore chutney. A classic South Indian delight', tags: ['O', 'J', 'M'] },
      { name: 'Rava Dosa (Plain)', description: 'Lacy, crispy dosa made from rice flour, semolina (rava), cumin and chillies', tags: ['O', 'J', 'M'] },
      { name: 'Rava Masala Dosa', description: 'Crispy semolina crepe stuffed with spiced mashed potatoes, flavored with South Indian spices', tags: ['O', 'J', 'M'] },
      { name: 'Peas / Cauliflower / Mix Veg / Mushroom Masala Dosa', description: 'Dosa stuffed with a flavorful masala made from fresh peas, cauliflower, assorted vegetables, or mushrooms', tags: ['O', 'J', 'M', 'N'] },
      { name: 'Paneer Masala Dosa', description: 'Dosa stuffed with a spiced cottage cheese (paneer) mixture', tags: ['M', 'N', 'O', 'J'] },
      { name: 'Pizza Dosa (Plain)', description: 'Dosa topped with onion, capsicum, pizza sauce, and melted mozzarella cheese', tags: ['O', 'J', 'M'] },
      { name: 'Veg Chennai Srilalitha Net (Valli) Dosa', description: 'A thin, lace-like crispy dosa made by spreading batter in a net pattern, stuffed with paneer on lettuce', tags: ['N', 'M', 'S'] },
      { name: 'Dosa Combo (3 Nos Mini Dosas)', description: 'Choose any three dosas from the standard dosa selection (excluding Rava Dosa)', tags: ['O', 'J', 'M'] },
      { name: 'Paper Roast (Plain)', description: 'Paper-thin, extra crispy golden rice crepe', tags: ['O', 'J', 'M'] },
      { name: 'Jumbo Dosa (Plain)', description: 'Extra-large, 4 ft thin and crispy dosa', tags: ['O', 'J', 'M', 'S'] },
      { name: 'Jumbo Masala Dosa', description: 'Extra-large, 4 ft thin dosa stuffed with spiced potato masala', tags: ['O', 'J', 'M', 'S'] },
    ],
  },
  {
    id: 'rice-and-noodles',
    title: 'Rice and Noodles',
    icon: '🍚',
    color: '#D48D4D',
    description: 'South Indian thalis, flavored variety rices, fragrant biryanis, and Indo-Chinese noodles',
    items: [
      { name: 'Madras Thali (Only on Saturdays & Sundays)', description: 'A wholesome South Indian platter with plain rice, sambar, rasam, koottu, poriyal, kaarakolambu, sweet, pappad, yoghurt, pickle, veg kurma, and one mini chapathi', tags: ['M', 'N', 'S'] },
      { name: 'North Indian Thali (Mon to Thu)', description: 'Channa masala, tadka dal, paneer butter masala, bowl of plain rice, spring roll (1), salad, raitha, chapathi (1), pappad, sheera', tags: ['M', 'N', 'S'] },
      { name: 'Plain Rice / Basmati Rice', description: 'Steamed, fluffy basmati rice', tags: ['V'] },
      { name: 'Sambar Rice (with Papad)', description: 'Flavored rice with tangy lentil stew and vegetables, served with papad', tags: ['O', 'J', 'M'] },
      { name: 'Lemon Rice (with Papad)', description: 'Zesty lemon rice tempered with mustard, peanuts, and turmeric, served with papad', tags: ['V', 'O', 'J', 'N'] },
      { name: 'Jeera Rice (with Papad)', description: 'Cumin-scented aromatic basmati rice, served with papad', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Coconut Rice (with Papad)', description: 'Aromatic South Indian rice flavored with fresh grated coconut, served with papad', tags: ['V', 'N', 'O', 'J', 'S'] },
      { name: 'Tamarind Rice (with Papad)', description: 'Tangy and spicy South Indian tamarind rice with roasted peanuts, served with papad', tags: ['V', 'P', 'O', 'J', 'S'] },
      { name: 'Curd Rice (with Pickle)', description: 'Comforting South Indian rice mixed with fresh curd, tempered with mustard seeds and curry leaves, garnished with coriander, raisins, and cashews', tags: ['M', 'N'] },
      { name: 'Veg Fried Rice', description: 'Fluffy basmati rice sautéed with shredded vegetables and mild sauces', tags: ['V', 'O', 'J'] },
      { name: 'Szechuan Fried Rice', description: 'Spicy, fiery fried rice made with basmati, bold chili paste, and red chilies for a vibrant flavor', tags: ['V'] },
      { name: 'Mushroom Fried Rice', description: 'Fluffy basmati rice sautéed with onions, capsicum, and fresh mushrooms', tags: ['V', 'O', 'J'] },
      { name: 'Paneer Fried Rice', description: 'Basmati rice stir-fried with paneer (Indian cottage cheese), vegetables, and aromatic spices', tags: ['O', 'J', 'M'] },
      { name: 'Veg Biryani', description: 'Basmati rice slow-cooked with mixed vegetables, saffron, and rich Indian spices', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Veg Pulao', description: 'Fluffy basmati rice cooked with vegetables and mild Indian spices', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Paneer Rice Bowl', description: 'Steamed basmati rice served with paneer curry, dhal, gobi 65, and salad', tags: ['M', 'N'] },
      { name: 'Rice Bowl (Special Combo)', description: 'Bowl of sambar rice or curd rice or dum biryani – choose any 2 types of rice bowl + mango lassi', tags: ['M', 'N'] },
      { name: 'Rajma Rice Bowl', description: 'Steamed basmati rice served with rajma curry, dhal, paneer 65, and salad', tags: ['M', 'N'] },
      { name: 'Vegetable Rice Bowl', description: 'Steamed basmati rice served with mix veg curry, dhal, paneer 65, and salad', tags: ['M', 'N'] },
      { name: 'Veg Noodles / Hakka Noodles / Szechuan Noodles', description: 'Stir-fried noodles tossed with mixed vegetables, flavored with Indo-Chinese sauces. Choose from classic, hakka, or spicy Szechuan', tags: ['V', 'O', 'J'] },
      { name: 'Stir Fried Paneer Noodles', description: 'Soft noodles tossed with crisp vegetables and cubes of paneer in a savory, lightly spiced stir-fry sauce', tags: ['M', 'N'] },
    ],
  },
  {
    id: 'curries',
    title: 'Curries',
    icon: '🥘',
    color: '#C68246',
    description: 'Slow-simmered paneer specialties, Chettinad gravies, creamy kormas, and comforting dals',
    items: [
      { name: 'Aloo Gobi Masala', description: 'Steamed potatoes and cauliflower sautéed with onions and aromatic North Indian spices', tags: ['V', 'N', 'O', 'J'] },
      { name: 'Aloo Fry', description: 'Steamed potatoes lightly sautéed with onions and cracked pepper', tags: ['V', 'O', 'J'] },
      { name: 'Alu Or Palak Mutter', description: 'Choice of potatoes or spinach cooked with green peas and Indian spices', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Alu Or Paneer Palak', description: 'Choice of potatoes or homemade cottage cheese cooked with spinach and aromatic spices', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Channa Masala', description: 'Steamed chickpeas cooked in a rich, tangy onion and spice gravy', tags: ['V', 'N', 'O', 'J'] },
      { name: 'Dhal Makhani', description: 'Slow-cooked black lentils simmered overnight with butter and North Indian spices', tags: ['N', 'M'] },
      { name: 'Gobi Or Mutter Or Alu Masala', description: 'Steamed cauliflower, peas, or potatoes cooked in a spiced onion gravy', tags: ['V', 'N', 'O', 'J'] },
      { name: 'Kadai Vegetable', description: 'Mixed vegetables sautéed with onions and bold North Indian kadai spices', tags: ['V', 'N', 'O', 'J'] },
      { name: 'Kadai Paneer', description: 'Homemade cottage cheese and bell peppers cooked with bold spices', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Mix Veg Curry', description: 'Boiled mixed vegetables simmered in a homestyle spiced onion gravy', tags: ['V', 'N', 'O', 'J'] },
      { name: 'Mix Veg Kurma', description: 'Steamed vegetables cooked in a rich, creamy coconut gravy with aromatic spices', tags: ['N', 'M', 'O'] },
      { name: 'Mixed Vegetable Malai Kurma', description: 'A creamy and mildly spiced curry featuring fresh vegetables cooked in rich malai (cream)', tags: ['N', 'M'] },
      { name: 'Paneer Butter Masala', description: 'Soft homemade cottage cheese cooked in a rich, buttery tomato-based gravy', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Paneer Kurma', description: 'Soft homemade cottage cheese cooked in a rich, creamy, and flavorful gravy', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Paneer Tikka Masala', description: 'Chunks of marinated paneer grilled to perfection and simmered in a rich creamy tomato-based gravy', tags: ['M', 'N'] },
      { name: 'Shahi Paneer', description: 'Paneer cubes simmered in a rich, creamy royal gravy made with tomatoes, cream, and cashews', tags: ['N', 'M'] },
      { name: 'Chettinad Paneer / Soya / Veg / Mushroom', description: 'A rich and aromatic South Indian curry made with a blend of traditional Chettinad spices', tags: ['N', 'M'] },
      { name: 'Rajma Masala', description: 'Steamed red kidney beans cooked with onion paste and North Indian spices', tags: ['N', 'M', 'O', 'J'] },
      { name: 'Methi Mutter Malai', description: 'A creamy North Indian curry made with fresh fenugreek leaves and green peas in rich velvety malai sauce', tags: ['N', 'M'] },
      { name: 'Soya Chaaps / Alu Soya Chaaps Subzi', description: 'Choice of soya chunks or soya and potatoes cooked in a spicy, flavorful masala with traditional spices', tags: ['N'] },
      { name: 'Tadka Dhal', description: 'Lentils cooked with North Indian spices and tempered with aromatic ghee, cumin, and garlic', tags: ['M', 'O', 'J'] },
    ],
  },
  {
    id: 'desserts',
    title: 'Desserts',
    icon: '🍨',
    color: '#3D2614',
    description: 'Traditional sweets, melt-in-mouth gulab jamuns, chilled rasmalai, halwas, and kheers',
    items: [
      { name: 'Gulab Jamoon', description: 'Soft golden milk dumplings fried and soaked in warm rose and cardamom syrup', tags: ['M'] },
      { name: 'Rasmalai', description: 'Delicate cottage cheese patties soaked in chilled, saffron and cardamom flavored creamy milk', tags: ['M', 'N'] },
      { name: 'Gajar Ka Halwa', description: 'Traditional slow-cooked dessert made with grated carrots, milk, ghee, mawa and dry fruits', tags: ['M', 'N'] },
      { name: 'Sooji Ka Halwa', description: 'Warm, buttery semolina pudding cooked with pure ghee, sugar, cardamom, and roasted nuts', tags: ['M', 'N'] },
      { name: 'Pineapple Sheera', description: 'Aromatic semolina halwa cooked with ghee, juicy pineapple chunks, and saffron', tags: ['M', 'N'] },
      { name: 'Vermicelli Kheer', description: 'Classic sweet dessert of roasted vermicelli simmered in sweetened cardamom milk with nuts', tags: ['M', 'N'] },
      { name: 'Rice Kheer', description: 'Slow-simmered basmati rice pudding infused with saffron, cardamom and topped with slivered nuts', tags: ['M', 'N'] },
      { name: 'Beetroot Halwa', description: 'Vibrant and rich dessert made with grated fresh beetroot, milk, ghee, and roasted cashews', tags: ['M', 'N'] },
    ],
  },
];

// ─── 4. CATERING PACKAGES & BANQUET DATA ─────────────────────────────────────

export const INDIAN_MENU = {
  name: 'Indian Catering Menu',
  starters: {
    vegetarian: [
      'Veg Cheese Frankie', 'Palak Roll', 'Chilli Honey Potato', 'Paneer Popcorn',
      'Kurkuri Bhindi Fry', 'Cabbage Pakora', 'Veg Dumplings', 'Veg Lollipop',
      'Hara Bhara Kabab', 'Veg Frankie', 'Paneer Schezwan Frankie', 'Masala Chips',
      'Vegetable Spring Roll', 'Crispy Bajia', 'Chilli Garlic Mogo', 'Crispy Vegetables',
      'Gobi Manchurian', 'Paneer Manchurian', 'Chilli Paneer', 'Paneer-65', 'Gobi-65',
      'Chilli Mushroom', 'Samosa', 'Baby Corn-65', 'Veg Bonda', 'South Indian Bajji',
      'Dhal Vada (Masala Vada)', 'Chilli Idli', 'Paneer Bajji', 'Punugulu', 'Idli Fingers',
      'Garlic Paneer', 'Spicy Cheese Balls', 'Broccoli Tikki', 'Pav Bhaji', 'Pani Puri',
      'Sev Puri', 'Papri Chaat', 'Aloo Tikki', 'Dabeli', 'Bhel Puri', 'Dahi Puri',
    ],
    nonVegetarian: [],
  },
  mains: {
    vegetarian: [
      'Paneer Butter Masala', 'Kadai Paneer', 'Paneer Tikka Masala', 'Shahi Paneer',
      'Paneer Kurma', 'Methi Mutter Malai', 'Alu Or Paneer Palak', 'Aloo Gobi Masala',
      'Channa Masala', 'Dhal Makhani', 'Tadka Dhal', 'Rajma Masala', 'Mix Veg Kurma',
      'Mixed Vegetable Malai Kurma', 'Chettinad Paneer / Soya / Veg', 'Kadai Vegetable',
      'Soya Chaaps Subzi', 'Aloo Fry', 'Alu Or Palak Mutter',
    ],
    nonVegetarian: [],
  },
  sundries: [
    'Plain Basmati Rice', 'Jeera Rice', 'Sambar Rice', 'Lemon Rice', 'Veg Biryani',
    'Veg Pulao', 'Veg Fried Rice', 'Hakka Noodles', 'Naan (Plain / Butter)',
    'Garlic Naan', 'Chilli Garlic Naan', 'Cheese Naan', 'Tandoori Roti', 'Tawa Chapathi',
  ],
  desserts: [
    'Gulab Jamoon', 'Rasmalai', 'Gajar Ka Halwa', 'Sooji Ka Halwa', 'Pineapple Sheera',
    'Vermicelli Kheer', 'Rice Kheer', 'Beetroot Halwa',
  ],
  allergyNotice: 'Food Prepared in our restaurant may contain ingredients such as Milk, Wheat, Gluten, Mustard, Nuts, and Soya.',
};

export const SRI_LANKAN_MENU = {
  name: 'South Indian & Sri Lankan Menu',
  starters: {
    vegetarian: [
      'Medu Vada', 'Dhal Vada (Masala Vada)', 'Punugulu', 'Idli Fingers', 'Chilli Idli',
      'Crispy Bajia', 'Masala Mogo', 'Chilli Garlic Mogo', 'Gobi-65', 'Paneer-65',
      'Baby Corn-65', 'Vegetable Spring Roll', 'Samosa', 'South Indian Bajji',
      'Broccoli Tikki', 'Chilli Honey Potato',
    ],
    nonVegetarian: [],
  },
  mains: {
    vegetarian: [
      'Chettinad Paneer / Veg / Mushroom', 'Mix Veg Kurma', 'Paneer Kurma',
      'Dhal Tadka', 'Channa Masala', 'Kadai Vegetable', 'Paneer Butter Masala',
      'Aloo Gobi Masala', 'Alu Palak', 'Rajma Masala',
    ],
    nonVegetarian: [],
  },
  sundries: [
    'Steamed Rice', 'Lemon Rice', 'Coconut Rice', 'Tamarind Rice', 'Curd Rice',
    'Sambar Rice', 'Veg Biryani', 'Parotta', 'Tawa Chapathi', 'Naan',
  ],
  desserts: [
    'Gulab Jamoon', 'Rasmalai', 'Pineapple Sheera', 'Vermicelli Kheer',
    'Rice Kheer', 'Beetroot Halwa', 'Gajar Ka Halwa',
  ],
  allergyNotice: 'Food Prepared in our restaurant may contain ingredients such as Milk, Wheat, Gluten, Mustard, Nuts, and Soya.',
};

export const LIVE_COUNTER_PACKAGE = {
  name: 'Live Counter Package',
  srilankanSouthIndian: [
    { name: 'Live Dosa & Uthappam Station', price: 5.00, note: 'Made fresh with theatrical flair (Masala, Plain, Onion, Podi, Uthappam)' },
    { name: 'Live Idly & Meduvada Station', price: 4.00, note: 'Steaming idlis & crisp vadas with sambar & chutneys' },
    { name: 'Live Pani Puri & Chaat Counter', price: 3.50, note: 'Pani Puri, Sev Puri, Bhel Puri made on spot' },
    { name: 'Live Poori Bhaji / Chole Bhature', price: 4.50, note: 'Puffed pooris & bhaturas served hot' },
    { name: 'Live Pav Bhaji Counter', price: 4.00, note: 'Tawa-tossed hot pav bhaji' },
    { name: 'Live Fresh Coconut Water', price: 5.00, note: 'Fresh tender coconuts cut live' },
    { name: 'Live Paan Counter (100pcs)', price: 350.00, note: 'Traditional sweet & meetha paan' },
    { name: 'Welcome Drink', price: 2.00, note: 'Mango Lassi, Rose Milk, or Mocktails' },
  ],
  northIndian: [
    { name: 'Live Chole Bhature', price: 5.00 },
    { name: 'Live Poori Aloo Sabji', price: 4.00 },
    { name: 'Live Pani Puri', price: 3.00 },
    { name: 'Live Aloo Tikki Chat', price: 3.50 },
    { name: 'Live Pav Bhaji', price: 4.00 },
    { name: 'Live Paan Counter (100pcs)', price: 350.00 },
    { name: 'Welcome Drink', price: 2.00 },
  ],
  extras: [
    { name: 'Full Music Setup with Lighting', price: 350.00, note: 'DJ Optional If You Required + £250.00' },
    { name: '3D Led Dance Floor', price: 250.00 },
    { name: '4K LED Screen for Backdrop', price: 750.00 },
    { name: '360 Camera', price: 300.00 },
    { name: 'Candy Floss for Kids Birthday', price: 100.00 },
  ],
};

export const BANQUET_PACKAGES = [
  {
    id: 'basic',
    name: 'Basic Package',
    pricePerPerson: 25,
    tag: 'Limited Time',
    minGuests: 201,
    maxGuests: 300,
    guestLabel: 'Minimum 201-300 Guests',
    starters: { veg: 2, nonVeg: 1 },
    mains: { veg: 2, nonVeg: 1 },
    desserts: ['1 Indian Sweet Dish'],
    drinks: [],
    extras: [],
    color: '#6B7280',
  },
  {
    id: 'classic',
    name: 'Classic Package',
    pricePerPerson: 30,
    tag: '',
    minGuests: 101,
    maxGuests: 200,
    guestLabel: 'Minimum 101-200 Guests',
    starters: { veg: 2, nonVeg: 2 },
    mains: { veg: 2, nonVeg: 2 },
    desserts: ['1 Indian Sweet Dish'],
    drinks: ['1 Soft Drink & 1 Juice'],
    extras: [],
    color: '#92400E',
  },
  {
    id: 'silver',
    name: 'Silver Package',
    pricePerPerson: 35,
    tag: '',
    minGuests: 50,
    maxGuests: 100,
    guestLabel: 'Minimum 50-100 Guests',
    starters: { veg: 2, nonVeg: 3 },
    mains: { veg: 2, nonVeg: 3 },
    desserts: ['1 Indian Sweet Dish', '1 Petit Four'],
    drinks: ['2 Soft Drink & 1 Juice', 'Bottled Mineral Water'],
    extras: [],
    color: '#6B7280',
  },
  {
    id: 'gold',
    name: 'Gold Package',
    pricePerPerson: 40,
    tag: '',
    minGuests: null,
    maxGuests: null,
    guestLabel: '',
    starters: { veg: 3, nonVeg: 3 },
    mains: { veg: 3, nonVeg: 3 },
    desserts: ['1 Indian Sweet Dish', '1 Petit Four', '1 Ice-cream'],
    drinks: ['Bottled Mineral Water', '3 Soft Drink & 1 Juice', '1 Welcome Drink'],
    extras: [],
    color: '#C8860A',
  },
  {
    id: 'platinum',
    name: 'Platinum Package',
    pricePerPerson: 45,
    tag: '',
    minGuests: null,
    maxGuests: null,
    guestLabel: '',
    starters: { veg: 3, nonVeg: 4 },
    mains: { veg: 3, nonVeg: 4 },
    desserts: ['1 Indian Sweet Dish', '2 Petit Fours', 'Fruit Platter'],
    drinks: ['Bottled Mineral Water', '3 Soft Drink & 2 Juice', '1 Welcome Drink', '1 Glass of Prosecco'],
    extras: [],
    color: '#1F2937',
  },
  {
    id: 'srilalitha',
    name: 'SriLalitha Package',
    pricePerPerson: 50,
    tag: 'Grand Red Carpet Entrance',
    minGuests: null,
    maxGuests: null,
    guestLabel: '',
    canapes: { veg: 2, nonVeg: 2 },
    starters: { veg: 4, nonVeg: 4 },
    mains: { veg: 4, nonVeg: 4 },
    desserts: ['Trio of Dessert', 'Assorted Icecream', 'Fruit Platter'],
    drinks: ['Bottled Mineral Water', '3 Soft Drinks & 2 Juice', '1 Welcome Drink', '1 Glass of Prosecco'],
    extras: [],
    color: '#7C3AED',
  },
];

export const VENUE_HALL_CHARGES = [
  { day: 'Monday to Thursday', charge: '£100 + Food Packages', note: '' },
  { day: 'Friday & Sunday Hall Hire', charge: '£250 + Food Packages', note: 'Lunch + Dinner' },
  { day: 'Saturday Hall Hire', charge: '£250 + Food Packages', note: 'Lunch' },
  { day: 'Saturday Hall Hire', charge: '£500 + Food Packages', note: 'Dinner' },
];

export const TABLE_SERVICE = [
  { service: 'Canapés Service', price: '£3 per person' },
  { service: 'Starters Service', price: '£5 per person' },
  { service: 'Mains Service', price: '£5 per person' },
  { service: 'Dessert Service', price: '£3 per person' },
];

export const KIDS_PRICING = [
  { ageRange: 'Age 0-2 Yr', price: 'Free' },
  { ageRange: 'Age 3-10 Yr', price: '£20' },
  { ageRange: 'Age 11 Plus', price: 'Full Price' },
];

export const STANDARD_SETUP = {
  minimumAdults: 50,
  includes: [
    'White Tablecloths & Chair Covers',
    'Gold Sashes Ribbons',
    'Centre Piece Tree',
    'Glasses on Table',
  ],
  hallInfo: [
    { type: 'Small Hall', detail: 'Less than 140 Guests' },
    { type: 'Big Hall', detail: 'More than 150 Guests' },
  ],
};

export const TERMS_AND_CONDITIONS = {
  payments: {
    title: 'PAYMENTS, CANCELLATIONS & REFUND POLICY',
    items: [
      'As per our policy £500 Deposit (non-refundable) will be required to confirm an Event.',
      '90 days prior to Event, only date reschedule will be allowed.',
      '30 days prior to Event, no changes will be allowed.',
      'Full Payment will be required 3-5 days before the Event.',
      'Failure to make full payment 3-5 days before, management reserves the right to cancel the Event.',
      'VAT is not included in price, any card payments/ Bank transfer will be charged 20% VAT on total amount.',
    ],
  },
  menuGuests: {
    title: 'MENU & GUESTS CHANGES',
    items: [
      'Any changes to event or menu needs to be done 10 days in advance.',
      'Food and Seating would be only provided to Minimum guaranteed guests.',
      'Any extra guests would require minimum 24 hours prior notification.',
    ],
  },
  clientResponsibilities: {
    title: 'CLIENT RESPONSIBILITIES',
    items: [
      'Any damages to the property or equipments the party organisers will be held responsible and would require to pay the costs towards damages.',
      'Any food allergies or special dietary requirements to be booked in advance and management will not hold any responsibility if not informed in advance.',
    ],
  },
  soundLimiter: {
    title: "SRILALITHA SOUND LIMITER'S",
    items: [
      'DJ to Maintain Policy or will be held responsible. Before 10:00 pm - Upto 90dB | After 10:00 pm - Upto 85dB.',
      'DJ and Client will be liable and responsible if not adhered to the sound and timings as agreed and will be fined if any licensing are in breach during an Event.',
    ],
  },
  notes: [
    'Minimum Number of Guests will be charged as agreed.',
    "As per our policy and food safety, we don't allow any food takeaway from Banquet Venue.",
  ],
  alcohol: 'Corkage fee - Charges for outside Alcohol in Venue which will be discussed as per guests.',
};

export const DRY_HIRE_PRICES = [
  { day: 'Saturday',            session: 'Dinner', price: 3000 },
  { day: 'Saturday',            session: 'Lunch',  price: 2000 },
  { day: 'Friday & Sunday',     session: 'Dinner', price: 2000 },
  { day: 'Friday & Sunday',     session: 'Lunch',  price: 1500 },
  { day: 'Monday to Thursday',  session: 'Dinner', price: 1500 },
  { day: 'Monday to Thursday',  session: 'Lunch',  price: 1000 },
];
