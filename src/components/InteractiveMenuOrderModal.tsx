'use client';

import React, { useState, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import GoogleLocationInput from '@/components/GoogleLocationInput';
import {
  BANQUET_PACKAGES,
  INDIAN_MENU,
  SRI_LANKAN_MENU,
  LIVE_DOSA_OPTION_1,
  LIVE_DOSA_OPTION_2,
  LIVE_DOSA_MENU,
  MADRAS_THALI_OPTION_3,
  TAILOR_MENU_OPTION_4,
  DOSA_FESTIVAL_OPTION_5,
  CANAPE_OPTION_6,
  NORTH_INDIAN_OPTION_7,
  GUJARATI_OPTION_8,
  PUNJABI_OPTION_9,
  MENU_UPGRADES,
  calculateLiveDosaPrice,
  isWeekendOrBankHoliday,
  MenuUpgradeItem,
} from '@/app/data/menuData';
import {
  DeliveryLocationConfig,
  DEFAULT_DELIVERY_CONFIG,
  calculateDistanceMiles,
  calculateDeliveryCharge,
  DeliveryCalculationResult,
} from '@/app/data/deliveryConfig';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface InteractiveMenuOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackage?: string;
  deliveryConfig?: DeliveryLocationConfig;
}

export default function InteractiveMenuOrderModal({
  isOpen,
  onClose,
  initialPackage,
  deliveryConfig = DEFAULT_DELIVERY_CONFIG,
}: InteractiveMenuOrderModalProps) {
  // Step State: 1 = Package & Schedule, 2 = Dish Selection & Upgrades, 3 = Review & Payment
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Details
  const [selectedPackageId, setSelectedPackageId] = useState<string>(() => {
    if (initialPackage) {
      const lower = initialPackage.toLowerCase();
      if (lower.includes('option 6') || lower.includes('canape')) return 'canape-6';
      if (lower.includes('option 7') || lower.includes('north indian')) return 'north-indian-7';
      if (lower.includes('option 8') || lower.includes('gujarati')) return 'gujarati-8';
      if (lower.includes('option 9') || lower.includes('punjabi')) return 'punjabi-9';
      if (lower.includes('option 4') || lower.includes('tailor')) return 'tailor-menu-4';
      if (lower.includes('option 5') || lower.includes('festival')) return 'dosa-festival-5';
      if (lower.includes('option 2')) return 'live-dosa-2';
      if (lower.includes('option 3') || lower.includes('thali') || lower.includes('meals') || lower.includes('bhojanam')) return 'madras-thali-3';
      if (lower.includes('option 1') || lower.includes('live dosa')) return 'live-dosa-1';
    }
    return 'live-dosa-1';
  });

  const [cuisineType, setCuisineType] = useState<'indian' | 'srilankan'>('indian');
  const [guests, setGuests] = useState<number>(50);
  const [eventDate, setEventDate] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('Dinner (6:00pm – 11:00pm)');
  const [venueAddress, setVenueAddress] = useState<string>('');
  const [deliveryResult, setDeliveryResult] = useState<DeliveryCalculationResult | null>(null);

  // Customer Contact Info
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentChoice, setPaymentChoice] = useState<'deposit' | 'full'>('deposit');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Dishes Storage for Banquet packages
  const [selectedDishes, setSelectedDishes] = useState<{
    canapesVeg: string[];
    canapesNonVeg: string[];
    startersVeg: string[];
    startersNonVeg: string[];
    mainsVeg: string[];
    mainsNonVeg: string[];
    desserts: string[];
    sundries: string[];
  }>({
    canapesVeg: [],
    canapesNonVeg: [],
    startersVeg: [],
    startersNonVeg: [],
    mainsVeg: [],
    mainsNonVeg: [],
    desserts: [],
    sundries: ['Rice - Plain, Pulao, Jeera', 'Assorted Naan Plain/ Butter'],
  });

  // Dynamic Upgrades State
  const [selectedUpgrades, setSelectedUpgrades] = useState<{
    gazebo: boolean;
    waiterCount: number;
    crockery: boolean;
    extraHours: number;
    moreDishes: string[];
  }>({
    gazebo: false,
    waiterCount: 0,
    crockery: false,
    extraHours: 0,
    moreDishes: [],
  });

  const [liveDosaStarterChoice, setLiveDosaStarterChoice] = useState<'Idly' | 'Veg Biryani'>('Idly');

  // Madras Thali Option 3 Customization State
  const [selectedThaliVariants, setSelectedThaliVariants] = useState<{
    sambar: string;
    rasam: string;
    koottu: string;
    poriyal: string;
    kaarakolambu: string;
    sweet: string;
  }>({
    sambar: 'Aubergine Sambar',
    rasam: 'Garlic Rasam',
    koottu: 'Cabbage Koottu',
    poriyal: 'Mix Veg Poriyal',
    kaarakolambu: 'Ennakathirikka (Guthivankaya)',
    sweet: 'Pineapple Kesari',
  });
  const [selectedThaliAdditions, setSelectedThaliAdditions] = useState<string[]>([]);

  // Option 4: Tailor Your Own Menu State
  const [selectedTailorStations, setSelectedTailorStations] = useState<string[]>([
    'Live Station for Jilebi',
    'Live Station for Paan',
    'Live Station for Dosa',
    'Live Station for Vada',
  ]);
  const [tailorSelectedDishes, setTailorSelectedDishes] = useState<string[]>([]);

  // Option 5: Dosa Festival State
  const [selectedFestivalDosas, setSelectedFestivalDosas] = useState<string[]>([
    'Banana Dosa',
    'Masala Dosa',
    'Rava Dosa',
    'Set Dosa',
    'Spring Dosa',
    'Pesarattu Dosa',
  ]);

  // Option 6: Canapé State
  const [selectedCanapes, setSelectedCanapes] = useState<string[]>([
    'Chilli Paneer',
    'Mogo',
    'Paneer 65',
    'Cocktail Vegetable Samosas',
  ]);

  // Option 7: North Indian State
  const [selectedNorthIndian, setSelectedNorthIndian] = useState<{
    bread: string;
    subji1: string;
    subji2: string;
    dal: string;
    rice: string;
  }>({
    bread: 'Tava Roti',
    subji1: 'Paneer Butter Masala',
    subji2: 'Aloo Gobi',
    dal: 'Tadka Dal',
    rice: 'Veg Biryani',
  });

  // Option 8: Gujarati Menu State
  const [selectedGujaratiMithai, setSelectedGujaratiMithai] = useState<string[]>(['Gulab Jamun', 'Mohanthal (square)']);
  const [selectedGujaratiFarsan, setSelectedGujaratiFarsan] = useState<string[]>(['Dhokla (yellow)', 'Bateta Vada']);
  const [selectedGujaratiShaak, setSelectedGujaratiShaak] = useState<string[]>(['Undhiyu (original)', 'Bharelu Ringan Bateta']);
  const [selectedGujaratiDal, setSelectedGujaratiDal] = useState<string>('Gujarati Sweet & Sour Daal');
  const [selectedGujaratiBread, setSelectedGujaratiBread] = useState<string>('Puri');
  const [selectedGujaratiRice, setSelectedGujaratiRice] = useState<string>('Vegetable Pilau');
  const [selectedGujaratiCondiments, setSelectedGujaratiCondiments] = useState<string[]>(['Cucumber Raita', 'Green Chutney', 'Khajur Amli Chutney']);

  // Option 9: Punjabi Menu State
  const [selectedPunjabiStarters, setSelectedPunjabiStarters] = useState<string[]>(['Aloo Papri Chaat', 'Paneer Tikka Shashlik']);
  const [selectedPunjabiSubjies, setSelectedPunjabiSubjies] = useState<string[]>(['Paneer Butter Masala', 'Amritsari Chole / Chana Masala']);
  const [selectedPunjabiDal, setSelectedPunjabiDal] = useState<string>('Dal Makhani (Slow-cooked black lentils)');
  const [selectedPunjabiBread, setSelectedPunjabiBread] = useState<string>('Butter Naan');
  const [selectedPunjabiRice, setSelectedPunjabiRice] = useState<string>('Vegetable Dum Biryani');
  const [selectedPunjabiMithai, setSelectedPunjabiMithai] = useState<string[]>(['Gulab Jamun', 'Gajar Ka Halwa']);
  const [selectedPunjabiAccompaniments, setSelectedPunjabiAccompaniments] = useState<string[]>(['Boondi Raita', 'Fresh Mint & Coriander Chutney']);

  const isLiveDosa1 = selectedPackageId === 'live-dosa' || selectedPackageId === 'live-dosa-1';
  const isLiveDosa2 = selectedPackageId === 'live-dosa-2';
  const isLiveDosa = isLiveDosa1 || isLiveDosa2;
  const isThali = selectedPackageId === 'madras-thali' || selectedPackageId === 'madras-thali-3';
  const isTailorMenu = selectedPackageId === 'tailor-menu' || selectedPackageId === 'tailor-menu-4';
  const isDosaFestival = selectedPackageId === 'dosa-festival' || selectedPackageId === 'dosa-festival-5';
  const isCanape = selectedPackageId === 'canape' || selectedPackageId === 'canape-6';
  const isNorthIndian = selectedPackageId === 'north-indian' || selectedPackageId === 'north-indian-7';
  const isGujarati = selectedPackageId === 'gujarati' || selectedPackageId === 'gujarati-8';
  const isPunjabi = selectedPackageId === 'punjabi' || selectedPackageId === 'punjabi-9';

  const activePackage = useMemo(() => {
    if (isCanape) {
      return {
        id: 'canape-6',
        name: 'Canapé Service (Option 6)',
        pricePerPerson: 8.99,
        color: '#E11D48',
        tag: 'Passed Finger Food & Cocktail Service',
        guestLabel: 'From £8.99 / per person',
        durationHours: 2,
        starters: { veg: 0, nonVeg: 0 },
        mains: { veg: 0, nonVeg: 0 },
        desserts: [],
        drinks: [],
        extras: [],
      };
    }
    if (isNorthIndian) {
      return {
        id: 'north-indian-7',
        name: 'North Indian Standard Menu (Option 7)',
        pricePerPerson: 12.00,
        color: '#4F46E5',
        tag: '1 Roti/Naan + 2 Subjies + Dal + Rice (Min 25)',
        guestLabel: '£12.00 / per person · Min 25 guests',
        durationHours: 2,
        starters: { veg: 0, nonVeg: 0 },
        mains: { veg: 2, nonVeg: 0 },
        desserts: [],
        drinks: [],
        extras: [],
      };
    }
    if (isGujarati) {
      return {
        id: 'gujarati-8',
        name: 'Gujarati Menu (Option 8)',
        pricePerPerson: 14.99,
        color: '#0D9488',
        tag: 'Traditional Gujarati Thaal & Farsan Feast',
        guestLabel: '£14.99 / per person',
        durationHours: 3,
        starters: { veg: 0, nonVeg: 0 },
        mains: { veg: 0, nonVeg: 0 },
        desserts: [],
        drinks: [],
        extras: [],
      };
    }
    if (isPunjabi) {
      return {
        id: 'punjabi-9',
        name: 'Punjabi Menu (Option 9)',
        pricePerPerson: 13.99,
        color: '#D97706',
        tag: 'Royal Punjabi Celebration Feast',
        guestLabel: '£13.99 / per person',
        durationHours: 3,
        starters: { veg: 0, nonVeg: 0 },
        mains: { veg: 0, nonVeg: 0 },
        desserts: [],
        drinks: [],
        extras: [],
      };
    }
    if (isTailorMenu) {
      return {
        id: 'tailor-menu-4',
        name: 'Tailor Your Own Menu (Option 4)',
        pricePerPerson: 15.00,
        color: '#B45309',
        tag: 'Bespoke Menu with 4 Live Stations',
        guestLabel: '50% Deposit Required',
        durationHours: 3,
        starters: { veg: 0, nonVeg: 0 },
        mains: { veg: 0, nonVeg: 0 },
        desserts: [],
        drinks: [],
        extras: [],
      };
    }
    if (isDosaFestival) {
      return {
        id: 'dosa-festival-5',
        name: 'Dosa Festival At Your Home (Option 5)',
        pricePerPerson: 14.99,
        color: '#EA580C',
        tag: 'London Dosa Festival · 34+ Varieties',
        guestLabel: '16 Years of Quality & Trust',
        durationHours: 3,
        starters: { veg: 0, nonVeg: 0 },
        mains: { veg: 0, nonVeg: 0 },
        desserts: [],
        drinks: [],
        extras: [],
      };
    }
    if (isThali) {
      return {
        id: 'madras-thali-3',
        name: 'Madras Thali (Option 3)',
        pricePerPerson: 10.99,
        color: '#D97706',
        tag: 'South Indian Meals / Andhra Bhojanam',
        guestLabel: '£10.99 / per person',
        durationHours: 2,
        starters: { veg: 0, nonVeg: 0 },
        mains: { veg: 0, nonVeg: 0 },
        desserts: [],
        drinks: [],
        extras: [],
      };
    }
    if (isLiveDosa2) {
      return {
        id: 'live-dosa-2',
        name: 'Live Dosa Option 2',
        pricePerPerson: 16.50,
        color: '#C8860A',
        tag: 'Live Counter + 1 Main + 1 Dessert (3 Hours)',
        guestLabel: 'Weekdays min 35 · Weekends min 40',
        durationHours: 3,
        starters: { veg: 0, nonVeg: 0 },
        mains: { veg: 1, nonVeg: 0 },
        desserts: ['1 Dessert'],
        drinks: [],
        extras: [],
      };
    }
    return {
      id: 'live-dosa-1',
      name: 'Live Dosa Option 1',
      pricePerPerson: 11,
      color: '#C8860A',
      tag: 'Theatrical Live Cooking (2 Hours)',
      guestLabel: 'Weekdays min 35 · Weekends min 40',
      durationHours: 2,
      starters: { veg: 0, nonVeg: 0 },
      mains: { veg: 0, nonVeg: 0 },
      desserts: [],
      drinks: [],
      extras: [],
    };
  }, [selectedPackageId, isLiveDosa1, isLiveDosa2, isThali, isTailorMenu, isDosaFestival, isCanape, isNorthIndian, isGujarati, isPunjabi]);

  const activeMenu = cuisineType === 'indian' ? INDIAN_MENU : SRI_LANKAN_MENU;

  // Upgrades & Additions Pricing Calculation
  const gazeboTotal = selectedUpgrades.gazebo ? 70.00 : 0;
  const waiterTotal = selectedUpgrades.waiterCount * 70.00;
  const crockeryTotal = selectedUpgrades.crockery ? 3.00 * guests : 0;
  const extraHoursTotal = selectedUpgrades.extraHours * 100.00;
  const moreDishesTotal = selectedUpgrades.moreDishes.length * 2.50;
  const upgradesTotal = gazeboTotal + waiterTotal + crockeryTotal + extraHoursTotal + moreDishesTotal;

  const thaliAdditionsTotal = isThali
    ? selectedThaliAdditions.reduce((sum, name) => {
        const found = MADRAS_THALI_OPTION_3.additions.find(a => a.name === name);
        return sum + (found ? found.price : 2.50);
      }, 0)
    : 0;

  // Live Dosa Calculation
  const liveDosaCalc = useMemo(() => {
    return calculateLiveDosaPrice(
      eventDate || 'weekday',
      guests,
      upgradesTotal,
      isLiveDosa2 ? 'live-dosa-2' : 'live-dosa-1'
    );
  }, [eventDate, guests, upgradesTotal, isLiveDosa2]);

  const packageRatePerPerson = isLiveDosa
    ? liveDosaCalc.pricePerPerson
    : isThali
    ? MADRAS_THALI_OPTION_3.pricePerPerson
    : isTailorMenu
    ? (15.00 + tailorSelectedDishes.length * 2.50)
    : isDosaFestival
    ? DOSA_FESTIVAL_OPTION_5.pricePerPerson
    : isCanape
    ? (8.99 + (selectedCanapes.length > 4 ? (selectedCanapes.length - 4) * 1.50 : 0))
    : isNorthIndian
    ? 12.00
    : isGujarati
    ? 14.99
    : isPunjabi
    ? 13.99
    : (activePackage.pricePerPerson || 0);

  // Overall Financials
  const packageTotal = isLiveDosa
    ? liveDosaCalc.peopleTotal
    : isThali
    ? (MADRAS_THALI_OPTION_3.pricePerPerson * Math.max(1, guests))
    : isTailorMenu
    ? ((15.00 + tailorSelectedDishes.length * 2.50) * Math.max(1, guests))
    : isDosaFestival
    ? (DOSA_FESTIVAL_OPTION_5.pricePerPerson * Math.max(1, guests))
    : isCanape
    ? ((8.99 + (selectedCanapes.length > 4 ? (selectedCanapes.length - 4) * 1.50 : 0)) * Math.max(1, guests))
    : isNorthIndian
    ? (12.00 * Math.max(25, guests))
    : isGujarati
    ? (14.99 * Math.max(1, guests))
    : isPunjabi
    ? (13.99 * Math.max(1, guests))
    : ((activePackage.pricePerPerson || 0) * Math.max(1, guests));

  const callOutAdjustment = isLiveDosa ? liveDosaCalc.callOutAdjustment : 0;
  const foodAndUpgradesTotal = isLiveDosa
    ? liveDosaCalc.finalSubtotal
    : (packageTotal + thaliAdditionsTotal + upgradesTotal);
  const deliveryCharge = deliveryResult?.charge || 0;
  const grandTotal = foodAndUpgradesTotal + deliveryCharge;
  const depositAmount = isTailorMenu
    ? Math.round(grandTotal * 0.5 * 100) / 100
    : Math.round(grandTotal * 0.3 * 100) / 100;
  const amountToPay = paymentChoice === 'deposit' ? depositAmount : grandTotal;

  // Quotas based on active package
  const quotas = useMemo(() => {
    if (isLiveDosa2) {
      return {
        canapesVeg: 0,
        canapesNonVeg: 0,
        startersVeg: 0,
        startersNonVeg: 0,
        mainsVeg: 1,
        mainsNonVeg: 0,
        desserts: 1,
      };
    }
    if (isLiveDosa1) {
      return {
        canapesVeg: 0,
        canapesNonVeg: 0,
        startersVeg: 0,
        startersNonVeg: 0,
        mainsVeg: 0,
        mainsNonVeg: 0,
        desserts: 0,
      };
    }
    return {
      canapesVeg: (activePackage as any).canapes ? ((activePackage as any).canapes.veg || 0) + ((activePackage as any).canapes.nonVeg || 0) : 0,
      canapesNonVeg: 0,
      startersVeg: (activePackage.starters.veg || 0) + (activePackage.starters.nonVeg || 0),
      startersNonVeg: 0,
      mainsVeg: (activePackage.mains.veg || 0) + (activePackage.mains.nonVeg || 0),
      mainsNonVeg: 0,
      desserts: Array.isArray(activePackage.desserts) ? activePackage.desserts.length : 1,
    };
  }, [activePackage, isLiveDosa1, isLiveDosa2]);

  // Toggle dish selection helper with strict quota enforcement (auto-swap if limit is 1)
  const toggleDish = (
    category: 'canapesVeg' | 'canapesNonVeg' | 'startersVeg' | 'startersNonVeg' | 'mainsVeg' | 'mainsNonVeg' | 'desserts' | 'sundries',
    dish: string,
    maxLimit: number
  ) => {
    setSelectedDishes(prev => {
      const currentList = prev[category] || [];
      if (currentList.includes(dish)) {
        return { ...prev, [category]: currentList.filter(d => d !== dish) };
      }
      if (maxLimit === 1) {
        // If max limit is 1, selecting another item automatically swaps it
        return { ...prev, [category]: [dish] };
      }
      if (maxLimit > 0 && currentList.length >= maxLimit) {
        return prev;
      }
      return { ...prev, [category]: [...currentList, dish] };
    });
  };

  const toggleMoreDishUpgrade = (dish: string) => {
    setSelectedUpgrades(prev => {
      const exists = prev.moreDishes.includes(dish);
      if (exists) {
        return { ...prev, moreDishes: prev.moreDishes.filter(d => d !== dish) };
      }
      return { ...prev, moreDishes: [...prev.moreDishes, dish] };
    });
  };

  // Location handler
  const handleLocationSelected = (address: string, coords?: { lat: number; lng: number; postcode?: string }) => {
    setVenueAddress(address);
    if (coords && coords.lat && coords.lng && deliveryConfig.venueLat && deliveryConfig.venueLng) {
      const dist = calculateDistanceMiles(
        deliveryConfig.venueLat,
        deliveryConfig.venueLng,
        coords.lat,
        coords.lng
      );
      const res = calculateDeliveryCharge(dist, deliveryConfig);
      setDeliveryResult(res);
    } else {
      setDeliveryResult(null);
    }
  };

  // Step 1 Validation & Proceed to Step 2
  const handleStep1Next = () => {
    if (!customerName.trim()) {
      setErrorMessage('Please enter your Full Name to proceed.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Please enter your WhatsApp Phone Number to proceed.');
      return;
    }
    if (!eventDate) {
      setErrorMessage('Please select your Event Date.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  // Submit and Redirect to Stripe Checkout
  const handleProceedToStripe = async () => {
    if (!customerName.trim()) {
      setErrorMessage('Please enter your Full Name.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Please enter your WhatsApp Phone Number.');
      return;
    }
    if (!eventDate) {
      setErrorMessage('Please select your Event Date.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Build upgrades descriptions
      const upgradesSummaryList = [
        selectedUpgrades.gazebo ? { name: 'Gazebo Setup', amount: 70.00 } : null,
        selectedUpgrades.waiterCount > 0 ? { name: `${selectedUpgrades.waiterCount} Waiter(s) for Serving`, amount: selectedUpgrades.waiterCount * 70.00 } : null,
        selectedUpgrades.crockery ? { name: `Crockery Service (${guests} guests)`, amount: 3.00 * guests } : null,
        selectedUpgrades.extraHours > 0 ? { name: `${selectedUpgrades.extraHours} Extra Hour(s) for Serving/Cooking`, amount: selectedUpgrades.extraHours * 100.00 } : null,
        ...selectedUpgrades.moreDishes.map(d => ({ name: `Extra Dish: ${d}`, amount: 2.50 })),
      ].filter(Boolean) as { name: string; amount: number }[];

      // 1. Prepare menu details
      const liveDosaMenuDetails = isLiveDosa ? {
        starterChoice: liveDosaStarterChoice,
        liveDosaItems: LIVE_DOSA_OPTION_1.items.map(i => i.name),
        selectedMain: isLiveDosa2 ? selectedDishes.mainsVeg : [],
        selectedDessert: isLiveDosa2 ? selectedDishes.desserts : [],
        durationHours: liveDosaCalc.durationHours,
      } : null;

      const thaliMenuDetails = isThali ? {
        coreDishes: MADRAS_THALI_OPTION_3.coreDishes.map(d => d.name),
        selectedVariants: selectedThaliVariants,
        selectedAdditions: selectedThaliAdditions,
      } : null;

      const tailorMenuDetails = isTailorMenu ? {
        liveStations: selectedTailorStations,
        customDishes: tailorSelectedDishes,
        whatWeBring: TAILOR_MENU_OPTION_4.whatWeBring,
        whatWeNeedFromYou: TAILOR_MENU_OPTION_4.whatWeNeedFromYou,
        depositPolicy: '50% deposit at booking, balance in cash after event',
      } : null;

      const dosaFestivalDetails = isDosaFestival ? {
        selectedDosas: selectedFestivalDosas,
        inclusions: DOSA_FESTIVAL_OPTION_5.inclusions,
      } : null;

      const canapeDetails = isCanape ? {
        selectedCanapes,
      } : null;

      const northIndianDetails = isNorthIndian ? {
        ...selectedNorthIndian,
        inclusions: NORTH_INDIAN_OPTION_7.inclusions,
      } : null;

      const gujaratiDetails = isGujarati ? {
        mithai: selectedGujaratiMithai,
        farsan: selectedGujaratiFarsan,
        shaak: selectedGujaratiShaak,
        dal: selectedGujaratiDal,
        bread: selectedGujaratiBread,
        rice: selectedGujaratiRice,
        condiments: selectedGujaratiCondiments,
      } : null;

      const punjabiDetails = isPunjabi ? {
        starters: selectedPunjabiStarters,
        subjies: selectedPunjabiSubjies,
        dal: selectedPunjabiDal,
        bread: selectedPunjabiBread,
        rice: selectedPunjabiRice,
        mithai: selectedPunjabiMithai,
        accompaniments: selectedPunjabiAccompaniments,
      } : null;

      const selectedMenuPayload = isLiveDosa
        ? liveDosaMenuDetails
        : isThali
        ? thaliMenuDetails
        : isTailorMenu
        ? tailorMenuDetails
        : isDosaFestival
        ? dosaFestivalDetails
        : isCanape
        ? canapeDetails
        : isNorthIndian
        ? northIndianDetails
        : isGujarati
        ? gujaratiDetails
        : isPunjabi
        ? punjabiDetails
        : selectedDishes;

      let generatedOrderId = `ORD_${Date.now()}`;
      try {
        const orderRef = await addDoc(collection(db, 'booking_requests'), {
          name: customerName,
          email: customerEmail || '',
          phone: customerPhone,
          eventType: isLiveDosa
            ? `${activePackage.name} Booking`
            : isThali
            ? 'Madras Thali Booking'
            : isTailorMenu
            ? 'Tailor Your Own Menu Booking'
            : isDosaFestival
            ? 'Dosa Festival Booking'
            : isCanape
            ? 'Canapé Service Booking'
            : isNorthIndian
            ? 'North Indian Standard Menu Booking'
            : isGujarati
            ? 'Gujarati Feast Booking'
            : isPunjabi
            ? 'Punjabi Feast Booking'
            : 'Online Custom Menu Order',
          package: activePackage.name,
          packageName: activePackage.name,
          cuisineType,
          guests: Number(guests),
          date: eventDate,
          time: eventTime,
          timeOfDay: eventTime,
          location: venueAddress || 'Catering Delivery',
          distanceMiles: deliveryResult?.distanceMiles || 0,
          deliveryCharge,
          selectedMenuDishes: selectedMenuPayload,
          selectedUpgrades,
          selectedThaliVariants: isThali ? selectedThaliVariants : null,
          selectedThaliAdditions: isThali ? selectedThaliAdditions : null,
          isLiveDosa,
          isThali,
          isTailorMenu,
          isDosaFestival,
          isCanape,
          isNorthIndian,
          isGujarati,
          isPunjabi,
          liveDosaOption: isLiveDosa2 ? 'option-2' : isLiveDosa1 ? 'option-1' : null,
          liveDosaPricingTier: isLiveDosa ? liveDosaCalc.tier : null,
          callOutAdjustment,
          baseAmount: grandTotal,
          totalEstimatedAmount: grandTotal,
          deposit: depositAmount,
          depositPaid: false,
          finalPaymentPaid: false,
          paymentChoice,
          amountToPay,
          status: 'deposit_pending',
          isOnlineOrder: true,
          notes,
          extraCharges: upgradesSummaryList,
          createdAt: new Date().toISOString(),
          enquiryDate: new Date().toISOString().split('T')[0],
        });
        generatedOrderId = orderRef.id;
      } catch (dbErr) {
        console.warn('Could not write order pre-record to Firestore, will record on verification:', dbErr);
      }

      // 2. Call Stripe API to create Checkout Session
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: generatedOrderId,
          customerName,
          customerEmail,
          customerPhone,
          packageName: activePackage.name,
          guests: Number(guests),
          eventDate,
          eventTime,
          location: venueAddress,
          deliveryCharge,
          selectedMenuDishes: selectedMenuPayload,
          totalAmount: grandTotal,
          paymentType: paymentChoice,
          amountToPay,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start Stripe checkout session. Please try again.');
      }

      // 3. Redirect user to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'An error occurred while redirecting to Stripe payment.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl border border-gray-100 my-4 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
              <Icon name="SparklesIcon" size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                  {isLiveDosa ? 'Live Dosa Option 1 & Upgrades' : 'Custom Catering & Menu Ordering'}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                  Instant Quote
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Select your package, bespoke upgrades, and book online with live pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-3 border-b border-gray-100 text-xs font-bold bg-gray-50/60">
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setStep(1);
            }}
            className={`py-3 px-4 flex items-center justify-center gap-2 transition-all border-b-2 cursor-pointer ${
              step === 1 ? 'border-[#C8860A] text-[#C8860A] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
              step === 1 ? 'bg-[#C8860A] text-white' : 'bg-gray-200 text-gray-600'
            }`}>1</span>
            <span>Details &amp; Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                handleStep1Next();
              } else {
                setErrorMessage(null);
                setStep(2);
              }
            }}
            className={`py-3 px-4 flex items-center justify-center gap-2 transition-all border-b-2 cursor-pointer ${
              step === 2 ? 'border-[#C8860A] text-[#C8860A] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
              step === 2 ? 'bg-[#C8860A] text-white' : 'bg-gray-200 text-gray-600'
            }`}>2</span>
            <span>Menu &amp; Upgrades</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (step === 1 && (!customerName.trim() || !customerPhone.trim() || !eventDate)) {
                handleStep1Next();
              } else {
                setErrorMessage(null);
                setStep(3);
              }
            }}
            className={`py-3 px-4 flex items-center justify-center gap-2 transition-all border-b-2 cursor-pointer ${
              step === 3 ? 'border-[#C8860A] text-[#C8860A] bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
              step === 3 ? 'bg-[#C8860A] text-white' : 'bg-gray-200 text-gray-600'
            }`}>3</span>
            <span>Review &amp; Pay</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Icon name="ExclamationTriangleIcon" size={16} className="text-rose-600 flex-shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-800 font-bold px-1.5 py-0.5 rounded text-xs cursor-pointer"
                title="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}

          {/* ══════════ STEP 1: PACKAGE & EVENT DETAILS ══════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5">
                  1. Select Menu Package / Experience
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Live Dosa Option 1 Card */}
                  <div
                    onClick={() => setSelectedPackageId('live-dosa-1')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isLiveDosa1
                        ? 'border-[#C8860A] bg-amber-50/60 shadow-md ring-2 ring-[#C8860A]/20'
                        : 'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🎪</span>
                        <h3 className="font-bold text-gray-900 text-sm">Live Dosa Option 1</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        2 Hrs Live
                      </span>
                    </div>

                    <div className="space-y-1 my-2">
                      <div className="text-[11px] font-bold text-gray-800 flex items-center justify-between">
                        <span>📅 Weekday (Mon–Fri):</span>
                        <span className="text-[#C8860A] font-extrabold">£11.00/pp (Min 35)</span>
                      </div>
                      <div className="text-[11px] font-bold text-gray-800 flex items-center justify-between">
                        <span>🌟 Weekend &amp; Holidays:</span>
                        <span className="text-[#C8860A] font-extrabold">£12.00/pp (Min 40)</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-amber-200/60 pt-1.5">
                      12 Live on-the-spot specialties with chutneys &amp; sambar. Min call-out £385 / £480.
                    </div>
                  </div>

                  {/* Live Dosa Option 2 Card */}
                  <div
                    onClick={() => setSelectedPackageId('live-dosa-2')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isLiveDosa2
                        ? 'border-[#C8860A] bg-amber-50/60 shadow-md ring-2 ring-[#C8860A]/20'
                        : 'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">👑</span>
                        <h3 className="font-bold text-gray-900 text-sm">Live Dosa Option 2</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                        3 Hrs + Main + Dessert
                      </span>
                    </div>

                    <div className="space-y-1 my-2">
                      <div className="text-[11px] font-bold text-gray-800 flex items-center justify-between">
                        <span>📅 Weekday (Mon–Fri):</span>
                        <span className="text-[#C8860A] font-extrabold">£16.50/pp (Min 35)</span>
                      </div>
                      <div className="text-[11px] font-bold text-gray-800 flex items-center justify-between">
                        <span>🌟 Weekend &amp; Holidays:</span>
                        <span className="text-[#C8860A] font-extrabold">£17.50/pp (Min 40)</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-amber-200/60 pt-1.5">
                      12 Live Specialties + 1 Main Course + 1 Dessert + 3 Hours Service. Min call-out £577.50 / £700.
                    </div>
                  </div>

                  {/* Option 3: Madras Thali Card */}
                  <div
                    onClick={() => setSelectedPackageId('madras-thali-3')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isThali
                        ? 'border-[#C8860A] bg-amber-50/60 shadow-md ring-2 ring-[#C8860A]/20'
                        : 'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🍲</span>
                        <h3 className="font-bold text-gray-900 text-sm">Madras Thali (Option 3)</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                        £10.99 / pp
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-amber-900 my-1.5">
                      South Indian Meals / Andhra Bhojanam
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-amber-200/60 pt-1.5 leading-relaxed">
                      12 Core Traditional items with customizable Sambar, Rasam, Koottu, Poriyal, Kaarakolambu &amp; Sweet + Additions.
                    </div>
                  </div>

                  {/* Option 4: Tailor Your Own Menu Card */}
                  <div
                    onClick={() => setSelectedPackageId('tailor-menu-4')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isTailorMenu
                        ? 'border-[#B45309] bg-amber-50/60 shadow-md ring-2 ring-[#B45309]/20'
                        : 'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🎨</span>
                        <h3 className="font-bold text-gray-900 text-sm">Tailor Your Menu (Option 4)</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        50% Deposit
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-gray-800 my-1.5">
                      Live Jilebi &amp; Paan + Live Dosa &amp; Vada
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-amber-200/60 pt-1.5 leading-relaxed">
                      Bespoke menu builder with 4 live stations, Bain Marie warmers &amp; full equipment. Balance by cash post-event.
                    </div>
                  </div>

                  {/* Option 5: Dosa Festival At Your Home Card */}
                  <div
                    onClick={() => setSelectedPackageId('dosa-festival-5')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isDosaFestival
                        ? 'border-[#EA580C] bg-orange-50/60 shadow-md ring-2 ring-[#EA580C]/20'
                        : 'border-gray-200 hover:border-orange-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🥞</span>
                        <h3 className="font-bold text-gray-900 text-sm">Dosa Festival (Option 5)</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-200 text-orange-950">
                        £14.99 / pp
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-orange-900 my-1.5">
                      London Dosa Festival · 34+ Varieties
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-orange-200/60 pt-1.5 leading-relaxed">
                      16 Years of Quality &amp; Trust. 34+ artisan live dosas, chutneys &amp; sambar cooked fresh on tawas at your home.
                    </div>
                  </div>

                  {/* Option 6: Canapé Service Card */}
                  <div
                    onClick={() => setSelectedPackageId('canape-6')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isCanape
                        ? 'border-[#E11D48] bg-rose-50/60 shadow-md ring-2 ring-[#E11D48]/20'
                        : 'border-gray-200 hover:border-rose-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🍢</span>
                        <h3 className="font-bold text-gray-900 text-sm">Canapé Service (Option 6)</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900">
                        From £8.99 / pp
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-rose-900 my-1.5">
                      Cocktail &amp; Passed Canapés
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-rose-200/60 pt-1.5 leading-relaxed">
                      Chilli Paneer, Mogo, Masala Mogo, Paneer 65, Gobi 65, Cocktail Samosas &amp; more finger food delights.
                    </div>
                  </div>

                  {/* Option 7: North Indian Standard Menu Card */}
                  <div
                    onClick={() => setSelectedPackageId('north-indian-7')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isNorthIndian
                        ? 'border-[#4F46E5] bg-indigo-50/60 shadow-md ring-2 ring-[#4F46E5]/20'
                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🍛</span>
                        <h3 className="font-bold text-gray-900 text-sm">North Indian Menu (Option 7)</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                        £12.00 / pp
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-indigo-900 my-1.5">
                      Min 25 Guests • Complete Comfort Feast
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-indigo-200/60 pt-1.5 leading-relaxed">
                      1 Tava Roti or Nan, 2 Subjies, Dal, Veg Biryani or Pulao, Salad, Pappad and Pickle.
                    </div>
                  </div>

                  {/* Option 8: Gujarati Menu Card */}
                  <div
                    onClick={() => setSelectedPackageId('gujarati-8')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isGujarati
                        ? 'border-[#0D9488] bg-teal-50/60 shadow-md ring-2 ring-[#0D9488]/20'
                        : 'border-gray-200 hover:border-teal-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">🪔</span>
                        <h3 className="font-bold text-gray-900 text-sm">Gujarati Menu (Option 8)</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900">
                        £14.99 / pp
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-teal-900 my-1.5">
                      Authentic Gujarati Thaal &amp; Farsan
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-teal-200/60 pt-1.5 leading-relaxed">
                      Mithai (40+ sweets), Farsan (20+ savouries), Shaak (Undhiyu), Dal, Kadhi, Breads &amp; Chutneys.
                    </div>
                  </div>

                  {/* Option 9: Punjabi Menu Card */}
                  <div
                    onClick={() => setSelectedPackageId('punjabi-9')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                      isPunjabi
                        ? 'border-[#D97706] bg-amber-50/60 shadow-md ring-2 ring-[#D97706]/20'
                        : 'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">👑</span>
                        <h3 className="font-bold text-gray-900 text-sm">Punjabi Menu (Option 9)</h3>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                        £13.99 / pp
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-amber-900 my-1.5">
                      Royal Punjabi Celebration Feast
                    </div>

                    <div className="text-[10px] text-gray-500 border-t border-amber-200/60 pt-1.5 leading-relaxed">
                      Chaats, Paneer Tikkas, Subjies, Dal Makhani, Stuffed Kulchas, Tandoori Breads &amp; Mithai.
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Dosa Dynamic Pricing Notice */}
              {isLiveDosa && (
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
                  <span className="text-xl flex-shrink-0">{isLiveDosa2 ? '👑' : '🥞'}</span>
                  <div className="space-y-1">
                    <div className="font-bold text-amber-950">
                      {liveDosaCalc.optionTitle} — {liveDosaCalc.tierLabel} Pricing: £{liveDosaCalc.pricePerPerson.toFixed(2)}/person
                    </div>
                    <p className="text-amber-800 text-[11px]">
                      Service Duration: <strong>{liveDosaCalc.durationHours} Hours</strong> • Minimum guaranteed guests: {liveDosaCalc.minGuests} people • Minimum call out charge: £{liveDosaCalc.minCallOutCharge.toFixed(2)} (can be reached by number of people or by the menu &amp; upgrades).
                    </p>
                  </div>
                </div>
              )}

              {/* Schedule & Contact Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Number of Guests *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={guests}
                    onChange={(e) => {
                      setGuests(Math.max(1, parseInt(e.target.value) || 1));
                      setErrorMessage(null);
                    }}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  />
                  {isLiveDosa && guests < liveDosaCalc.minGuests && (
                    <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                      ℹ️ Minimum {liveDosaCalc.minGuests} guests or min callout £{liveDosaCalc.minCallOutCharge} applies
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setEventDate(e.target.value);
                      setErrorMessage(null);
                    }}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  />
                  {eventDate && (
                    <span className="text-[10px] text-gray-500 font-semibold mt-1 block">
                      {isWeekendOrBankHoliday(eventDate) ? '🌟 Weekend / Bank Holiday' : '📅 Weekday (Mon–Fri)'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Time of Day *
                  </label>
                  <select
                    value={eventTime}
                    onChange={(e) => {
                      setEventTime(e.target.value);
                      setErrorMessage(null);
                    }}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  >
                    <option value="Lunch (12:00pm – 4:00pm)">Lunch (12:00pm – 4:00pm)</option>
                    <option value="Dinner (6:00pm – 11:00pm)">Dinner (6:00pm – 11:00pm)</option>
                    <option value="All Day (10:00am – 10:00pm)">All Day (10:00am – 10:00pm)</option>
                  </select>
                </div>

                {/* 2. Customer Contact Details Section directly in Step 1 */}
                <div className="sm:col-span-3 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                    <label className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                      <span>👤</span>
                      <span>Your Contact Details (For Booking &amp; WhatsApp Updates)</span>
                    </label>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#C8860A] text-white">
                      Instant Confirmation
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Full Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setErrorMessage(null);
                        }}
                        placeholder="e.g. Priya Sharma"
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        WhatsApp Phone Number <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          setErrorMessage(null);
                        }}
                        placeholder="e.g. +44 7700 900000"
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => {
                          setCustomerEmail(e.target.value);
                          setErrorMessage(null);
                        }}
                        placeholder="e.g. priya@example.com"
                        className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Event Venue Location / UK Postcode
                  </label>
                  <GoogleLocationInput
                    value={venueAddress}
                    placeholder="Enter event venue address or UK postcode..."
                    onChange={(addr, coords) => {
                      handleLocationSelected(addr, coords);
                      setErrorMessage(null);
                    }}
                    onCoordinatesChange={(coords) => {
                      if (coords && coords.lat && coords.lng && deliveryConfig.venueLat && deliveryConfig.venueLng) {
                        const dist = calculateDistanceMiles(
                          deliveryConfig.venueLat,
                          deliveryConfig.venueLng,
                          coords.lat,
                          coords.lng
                        );
                        const res = calculateDeliveryCharge(dist, deliveryConfig);
                        setDeliveryResult(res);
                      }
                    }}
                  />
                  {deliveryResult && (
                    <div className="mt-2 text-xs font-semibold text-gray-700 flex items-center justify-between bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <span>🚚 Delivery Distance: {deliveryResult.distanceMiles} miles</span>
                      <span className="font-bold text-[#C8860A]">Delivery Fee: £{deliveryResult.charge.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Next Step Button */}
              <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Estimated Food &amp; Base: <strong className="text-gray-900 text-sm">£{foodAndUpgradesTotal.toFixed(2)}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="px-6 py-3 rounded-xl font-bold text-white text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                >
                  <span>Select Menu &amp; Upgrades</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════ STEP 2: DISH SELECTION & DYNAMIC UPGRADES ══════════ */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Package Summary Header */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#C8860A] uppercase tracking-wider block">Currently Selected:</span>
                  <div className="text-sm font-extrabold text-gray-900">
                    {activePackage.name} — £{packageRatePerPerson.toFixed(2)}/person
                  </div>
                  <span className="text-[11px] text-gray-500">
                    👥 {guests} Guests • 📅 {eventDate || 'Date to be confirmed'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-[#C8860A] hover:underline self-start sm:self-center cursor-pointer"
                >
                  Change Package / Date
                </button>
              </div>

              {/* LIVE DOSA ITEMS (IF LIVE DOSA SELECTED) */}
              {isLiveDosa && (
                <div className="space-y-4">
                  {/* Service duration banner */}
                  <div className="bg-amber-100/70 border border-amber-300 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-950">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⏱️</span>
                      <span>
                        Service Duration: <strong>{liveDosaCalc.durationHours} Hours Cooking &amp; Serving</strong> {isLiveDosa2 ? '(Extended 3 Hours service)' : '(Standard 2 Hours)'}
                      </span>
                    </div>
                    {isLiveDosa2 && (
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-200 text-purple-900">
                        + 1 Main Course + 1 Dessert Included
                      </span>
                    )}
                  </div>

                  {/* 12 Live items card */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span>🥞</span>
                        <span>Standard Live Dosa Menu (12 Dishes Included Fresh on Spot)</span>
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        All 12 Included
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {/* Item 1: Idly / Veg Biryani with Selector */}
                      <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="w-5 h-5 rounded-full bg-[#C8860A] text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                            1
                          </span>
                          <span className="text-[10px] font-extrabold text-[#C8860A] uppercase">Your Choice:</span>
                        </div>
                        <div className="text-xs font-bold text-gray-900">Idly Or Veg Biryani</div>
                        <div className="flex gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setLiveDosaStarterChoice('Idly')}
                            className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              liveDosaStarterChoice === 'Idly'
                                ? 'bg-[#C8860A] text-white shadow-2xs'
                                : 'bg-white border border-gray-200 text-gray-700'
                            }`}
                          >
                            ✓ Idly
                          </button>
                          <button
                            type="button"
                            onClick={() => setLiveDosaStarterChoice('Veg Biryani')}
                            className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              liveDosaStarterChoice === 'Veg Biryani'
                                ? 'bg-[#C8860A] text-white shadow-2xs'
                                : 'bg-white border border-gray-200 text-gray-700'
                            }`}
                          >
                            ✓ Veg Biryani
                          </button>
                        </div>
                      </div>

                      {/* Remaining 11 Live Items */}
                      {LIVE_DOSA_OPTION_1.items.slice(1).map((dish, i) => (
                        <div
                          key={dish.name}
                          className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 flex items-center gap-2.5"
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-[#C8860A] font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                            {i + 2}
                          </span>
                          <div className="truncate">
                            <span className="text-xs font-bold text-gray-900 block truncate">{dish.name}</span>
                            <span className="text-[10px] text-gray-500 truncate block">Prepared live with chutneys &amp; sambar</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Option 2 Extra Inclusions: 1 Main Course & 1 Dessert */}
                  {isLiveDosa2 && (
                    <div className="space-y-4">
                      {/* Select 1 Main Course */}
                      <div className="bg-white p-5 rounded-2xl border border-purple-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>🍛</span>
                            <span>Select 1 Main Course Dish (Included in Option 2)</span>
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            selectedDishes.mainsVeg.length === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-900'
                          }`}>
                            {selectedDishes.mainsVeg.length} of 1 Selected
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {activeMenu.mains.vegetarian.map((dish) => {
                            const isChecked = selectedDishes.mainsVeg.includes(dish);
                            return (
                              <label
                                key={dish}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-purple-50 border-purple-400 font-semibold text-purple-950 shadow-2xs'
                                    : 'bg-white border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="option2Main"
                                  checked={isChecked}
                                  onChange={() => setSelectedDishes(prev => ({ ...prev, mainsVeg: [dish] }))}
                                  className="text-purple-700 focus:ring-purple-600"
                                />
                                <span className="text-xs truncate">{dish}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Select 1 Dessert */}
                      <div className="bg-white p-5 rounded-2xl border border-purple-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>🍮</span>
                            <span>Select 1 Dessert (Included in Option 2)</span>
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            selectedDishes.desserts.length === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-900'
                          }`}>
                            {selectedDishes.desserts.length} of 1 Selected
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {activeMenu.desserts.map((dish) => {
                            const isChecked = selectedDishes.desserts.includes(dish);
                            return (
                              <label
                                key={dish}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-purple-50 border-purple-400 font-semibold text-purple-950 shadow-2xs'
                                    : 'bg-white border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="option2Dessert"
                                  checked={isChecked}
                                  onChange={() => setSelectedDishes(prev => ({ ...prev, desserts: [dish] }))}
                                  className="text-purple-700 focus:ring-purple-600"
                                />
                                <span className="text-xs truncate">{dish}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── MADRAS THALI (OPTION 3) CUSTOMIZATION & DISHES ─── */}
              {isThali && (
                <div className="space-y-5">
                  {/* Header & Tagline */}
                  <div
                    className="p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #78350F 0%, #92400E 50%, #D97706 100%)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍲</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-white">
                          Madras Thali / South Indian Meals / Andhra Bhojanam
                        </h3>
                      </div>
                      <p className="text-xs text-amber-200 mt-1">
                        12 Traditional core items, 6 customizable flavour courses, plus optional additions and upgrades.
                      </p>
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-amber-300 text-gray-950 self-start sm:self-auto shadow-xs">
                      £10.99 / person
                    </span>
                  </div>

                  {/* 12 Core Inclusions Grid */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="font-bold text-gray-900 flex items-center gap-1.5 text-xs sm:text-sm">
                        <span>🍛</span>
                        <span>12 Core Traditional Items Included:</span>
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        All 12 Included
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {MADRAS_THALI_OPTION_3.coreDishes.map((dish, i) => (
                        <div key={dish.name} className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/40 flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="truncate">
                            <span className="text-xs font-bold text-gray-900 block truncate">{dish.name}</span>
                            <span className="text-[10px] text-gray-500 truncate block">{dish.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6 Custom Flavour Course Selectors */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-4">
                    <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Select Your 6 Flavour Preparations</h4>
                        <p className="text-xs text-gray-500">Pick your preferred style/ingredients for each traditional course</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-900">
                        Customized at no extra cost
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {/* Sambar */}
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1.5">
                        <label className="block text-xs font-extrabold text-amber-950">
                          1. Option for Sambar:
                        </label>
                        <select
                          value={selectedThaliVariants.sambar}
                          onChange={(e) => setSelectedThaliVariants(prev => ({ ...prev, sambar: e.target.value }))}
                          className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-gray-900 focus:ring-2 focus:ring-[#C8860A]"
                        >
                          {MADRAS_THALI_OPTION_3.variantOptions.sambarOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Rasam */}
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1.5">
                        <label className="block text-xs font-extrabold text-amber-950">
                          2. Options for Rasam:
                        </label>
                        <select
                          value={selectedThaliVariants.rasam}
                          onChange={(e) => setSelectedThaliVariants(prev => ({ ...prev, rasam: e.target.value }))}
                          className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-gray-900 focus:ring-2 focus:ring-[#C8860A]"
                        >
                          {MADRAS_THALI_OPTION_3.variantOptions.rasamOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Koottu */}
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1.5">
                        <label className="block text-xs font-extrabold text-amber-950">
                          3. Options for Koottu:
                        </label>
                        <select
                          value={selectedThaliVariants.koottu}
                          onChange={(e) => setSelectedThaliVariants(prev => ({ ...prev, koottu: e.target.value }))}
                          className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-gray-900 focus:ring-2 focus:ring-[#C8860A]"
                        >
                          {MADRAS_THALI_OPTION_3.variantOptions.koottuOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Poriyal */}
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1.5">
                        <label className="block text-xs font-extrabold text-amber-950">
                          4. Options for Poriyal:
                        </label>
                        <select
                          value={selectedThaliVariants.poriyal}
                          onChange={(e) => setSelectedThaliVariants(prev => ({ ...prev, poriyal: e.target.value }))}
                          className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-gray-900 focus:ring-2 focus:ring-[#C8860A]"
                        >
                          {MADRAS_THALI_OPTION_3.variantOptions.poriyalOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Kaarakolambu */}
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1.5">
                        <label className="block text-xs font-extrabold text-amber-950">
                          5. Options for Kaarakolambu:
                        </label>
                        <select
                          value={selectedThaliVariants.kaarakolambu}
                          onChange={(e) => setSelectedThaliVariants(prev => ({ ...prev, kaarakolambu: e.target.value }))}
                          className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-gray-900 focus:ring-2 focus:ring-[#C8860A]"
                        >
                          {MADRAS_THALI_OPTION_3.variantOptions.kaarakolambuOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sweet */}
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1.5">
                        <label className="block text-xs font-extrabold text-amber-950">
                          6. Options for Sweet:
                        </label>
                        <select
                          value={selectedThaliVariants.sweet}
                          onChange={(e) => setSelectedThaliVariants(prev => ({ ...prev, sweet: e.target.value }))}
                          className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-lg p-2 text-gray-900 focus:ring-2 focus:ring-[#C8860A]"
                        >
                          {MADRAS_THALI_OPTION_3.variantOptions.sweetOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additions Section for Madras Thali */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Additions &amp; More Dishes (Optional)</h4>
                        <p className="text-xs text-gray-500">Add variety rices, noodles, sweets, or specialty curries</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {selectedThaliAdditions.length} Selected (+£{thaliAdditionsTotal.toFixed(2)})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                      {MADRAS_THALI_OPTION_3.additions.map((addition) => {
                        const isSelected = selectedThaliAdditions.includes(addition.name);
                        return (
                          <label
                            key={addition.name}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-50 border-[#C8860A] font-semibold text-gray-900 shadow-2xs'
                                : 'bg-white border-gray-200 hover:border-amber-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedThaliAdditions(prev =>
                                    prev.includes(addition.name)
                                      ? prev.filter(a => a !== addition.name)
                                      : [...prev, addition.name]
                                  );
                                }}
                                className="rounded text-[#C8860A] focus:ring-[#C8860A]"
                              />
                              <span className="text-xs truncate">{addition.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-[#C8860A] whitespace-nowrap">
                              +£{addition.price.toFixed(2)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── OPTION 4: TAILOR YOUR OWN MENU CUSTOMIZER ─── */}
              {isTailorMenu && (
                <div className="space-y-5">
                  {/* Hero Banner */}
                  <div
                    className="p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎨</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-white">
                          Tailor Your Own Menu (Option 4)
                        </h3>
                      </div>
                      <p className="text-xs text-amber-200 mt-1">
                        Tailor your bespoke feast with 4 Signature Live Stations, full catering equipment &amp; Bain Marie warmers.
                      </p>
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-amber-300 text-gray-950 self-start sm:self-auto shadow-xs">
                      50% Deposit at Booking
                    </span>
                  </div>

                  {/* 4 Signature Live Stations */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          <span>🎪</span>
                          <span>Signature Live Stations Featured:</span>
                        </h4>
                        <p className="text-xs text-gray-500">Live theatrical chef counters included in your tailored event</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {selectedTailorStations.length} Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {TAILOR_MENU_OPTION_4.liveStationsFeatured.map((stn) => {
                        const isSelected = selectedTailorStations.includes(stn.name);
                        return (
                          <label
                            key={stn.name}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                              isSelected
                                ? 'bg-amber-50/70 border-[#C8860A] shadow-2xs'
                                : 'bg-gray-50/50 border-gray-200 opacity-60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedTailorStations(prev =>
                                  prev.includes(stn.name)
                                    ? prev.filter(s => s !== stn.name)
                                    : [...prev, stn.name]
                                );
                              }}
                              className="mt-0.5 rounded text-[#C8860A] focus:ring-[#C8860A]"
                            />
                            <div>
                              <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                <span>{stn.icon}</span>
                                <span>{stn.name}</span>
                              </span>
                              <p className="text-[11px] text-gray-600 mt-0.5">{stn.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Logistics: What We Bring & What We Need */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* What We Bring */}
                    <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-2">
                      <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <span>🚚</span>
                        <span>What We Bring:</span>
                      </span>
                      <ul className="text-xs text-gray-700 space-y-1.5">
                        {TAILOR_MENU_OPTION_4.whatWeBring.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* What We Need From You */}
                    <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-2">
                      <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                        <span>🔌</span>
                        <span>What We Need From You:</span>
                      </span>
                      <ul className="text-xs text-gray-700 space-y-1.5">
                        {TAILOR_MENU_OPTION_4.whatWeNeedFromYou.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tailor Dishes Multi-Picker */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Select Your Tailored Dishes (From Menu)</h4>
                        <p className="text-xs text-gray-500">Pick any combination of starters, curries, rices, and sweets</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        {tailorSelectedDishes.length} Dishes Selected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                      {activeMenu.starters.vegetarian.concat(activeMenu.mains.vegetarian).concat(activeMenu.desserts).map((dish) => {
                        const isChecked = tailorSelectedDishes.includes(dish);
                        return (
                          <label
                            key={dish}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-amber-50 border-[#C8860A] font-semibold text-gray-900 shadow-2xs'
                                : 'bg-white border-gray-200 hover:border-amber-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setTailorSelectedDishes(prev =>
                                  prev.includes(dish)
                                    ? prev.filter(d => d !== dish)
                                    : [...prev, dish]
                                );
                              }}
                              className="rounded text-[#C8860A] focus:ring-[#C8860A]"
                            />
                            <span className="text-xs truncate">{dish}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── OPTION 5: DOSA FESTIVAL AT YOUR HOME CUSTOMIZER ─── */}
              {isDosaFestival && (
                <div className="space-y-5">
                  {/* Hero Banner */}
                  <div
                    className="p-5 sm:p-6 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #7C2D12 0%, #EA580C 60%, #F97316 100%)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🥞</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-white">
                          First Time in London Dosa Festival At Your Home
                        </h3>
                      </div>
                      <p className="text-xs text-orange-200 mt-1">
                        Brought To You Only By Veg Chennai Sri Lalitha Restaurant • Quality &amp; Trust For 16 Years.
                      </p>
                    </div>
                    <div className="text-right self-start sm:self-auto">
                      <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-orange-200 text-orange-950 block shadow-xs">
                        £14.99 / person
                      </span>
                    </div>
                  </div>

                  {/* 34+ Signature Dosa Varieties Selector */}
                  <div className="bg-white p-5 rounded-2xl border border-orange-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          <span>✨</span>
                          <span>Select Your Festival Dosa Varieties (34+ Signature Dosas)</span>
                        </h4>
                        <p className="text-xs text-gray-500">Served live with Coconut chutney, Tomato-Onion chutney, Mint chutney &amp; Sambar</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFestivalDosas(DOSA_FESTIVAL_OPTION_5.dosaVarieties)}
                          className="text-[10px] font-bold text-orange-800 bg-orange-100 px-2 py-1 rounded-md hover:bg-orange-200 cursor-pointer"
                        >
                          Select All 34
                        </button>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                          {selectedFestivalDosas.length} Selected
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
                      {DOSA_FESTIVAL_OPTION_5.dosaVarieties.map((dosa) => {
                        const isChecked = selectedFestivalDosas.includes(dosa);
                        return (
                          <label
                            key={dosa}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-orange-50 border-orange-400 font-semibold text-orange-950 shadow-2xs'
                                : 'bg-white border-gray-200 hover:border-orange-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedFestivalDosas(prev =>
                                  prev.includes(dosa)
                                    ? prev.filter(d => d !== dosa)
                                    : [...prev, dosa]
                                );
                              }}
                              className="rounded text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-xs truncate">{dosa}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── OPTION 6: CANAPÉ SERVICE CUSTOMIZER ─── */}
              {isCanape && (
                <div className="space-y-5">
                  <div
                    className="p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #881337 0%, #BE123C 50%, #E11D48 100%)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍢</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-white">
                          Canapé Service (Option 6)
                        </h3>
                      </div>
                      <p className="text-xs text-rose-200 mt-1">
                        Deluxe live passed &amp; cocktail station canapés. Select your signature finger food items.
                      </p>
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-rose-200 text-rose-950 self-start sm:self-auto shadow-xs">
                      From £8.99 / person
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-rose-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Select Canapé Items</h4>
                        <p className="text-xs text-gray-500">Pick delicious vegetarian cocktail finger foods</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900">
                        {selectedCanapes.length} Items Selected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {CANAPE_OPTION_6.suggestedItems.map((item) => {
                        const isChecked = selectedCanapes.includes(item);
                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-rose-50 border-rose-300 font-semibold text-rose-950 shadow-2xs'
                                : 'bg-white border-gray-200 hover:border-rose-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedCanapes(prev =>
                                  prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                                );
                              }}
                              className="rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span className="text-xs truncate">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── OPTION 7: NORTH INDIAN STANDARD MENU CUSTOMIZER ─── */}
              {isNorthIndian && (
                <div className="space-y-5">
                  <div
                    className="p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #312E81 0%, #4338CA 50%, #4F46E5 100%)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍛</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-white">
                          North Indian Standard Menu (Option 7)
                        </h3>
                      </div>
                      <p className="text-xs text-indigo-200 mt-1">
                        1 Bread + 2 Subjies + Dal + Veg Biryani/Pulao + Salad + Pappad + Pickle.
                      </p>
                    </div>
                    <div className="text-right self-start sm:self-auto">
                      <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-indigo-200 text-indigo-950 block shadow-xs">
                        £12.00 / person (Min 25)
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-indigo-200 space-y-4">
                    <h4 className="font-bold text-gray-900 text-base">Select Your Meal Courses:</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Bread */}
                      <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                        <label className="block text-xs font-bold text-indigo-950">1. Choice of Bread (1):</label>
                        <select
                          value={selectedNorthIndian.bread}
                          onChange={(e) => setSelectedNorthIndian(prev => ({ ...prev, bread: e.target.value }))}
                          className="w-full text-sm font-semibold bg-white border border-indigo-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                        >
                          {NORTH_INDIAN_OPTION_7.breadOptions.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>

                      {/* Dal */}
                      <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                        <label className="block text-xs font-bold text-indigo-950">2. Choice of Dal (1):</label>
                        <select
                          value={selectedNorthIndian.dal}
                          onChange={(e) => setSelectedNorthIndian(prev => ({ ...prev, dal: e.target.value }))}
                          className="w-full text-sm font-semibold bg-white border border-indigo-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                        >
                          {NORTH_INDIAN_OPTION_7.dalOptions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>

                      {/* Subji 1 */}
                      <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                        <label className="block text-xs font-bold text-indigo-950">3. First Subji (1):</label>
                        <select
                          value={selectedNorthIndian.subji1}
                          onChange={(e) => setSelectedNorthIndian(prev => ({ ...prev, subji1: e.target.value }))}
                          className="w-full text-sm font-semibold bg-white border border-indigo-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                        >
                          {NORTH_INDIAN_OPTION_7.subjiOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {/* Subji 2 */}
                      <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5">
                        <label className="block text-xs font-bold text-indigo-950">4. Second Subji (2):</label>
                        <select
                          value={selectedNorthIndian.subji2}
                          onChange={(e) => setSelectedNorthIndian(prev => ({ ...prev, subji2: e.target.value }))}
                          className="w-full text-sm font-semibold bg-white border border-indigo-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                        >
                          {NORTH_INDIAN_OPTION_7.subjiOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {/* Rice */}
                      <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1.5 sm:col-span-2">
                        <label className="block text-xs font-bold text-indigo-950">5. Choice of Rice Specialty (1):</label>
                        <select
                          value={selectedNorthIndian.rice}
                          onChange={(e) => setSelectedNorthIndian(prev => ({ ...prev, rice: e.target.value }))}
                          className="w-full text-sm font-semibold bg-white border border-indigo-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                        >
                          {NORTH_INDIAN_OPTION_7.riceOptions.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 font-semibold flex items-center gap-2">
                      <span>✓</span>
                      <span>Included with all orders: Fresh Garden Salad, Crisp Fried Pappad, and Spicy Mixed Pickle.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── OPTION 8: GUJARATI MENU CUSTOMIZER ─── */}
              {isGujarati && (
                <div className="space-y-5">
                  <div
                    className="p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #115E59 0%, #0F766E 50%, #0D9488 100%)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🪔</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-white">
                          Gujarati Menu (Option 8)
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-teal-200 mt-1">
                        Authentic Gujarati Thaal with 40+ Mithai, 20+ Farsan, 30+ Shaak &amp; Traditional Kadhi.
                      </p>
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-teal-200 text-teal-950 self-start sm:self-auto shadow-xs">
                      £14.99 / person
                    </span>
                  </div>

                  {/* Mithai Multi-Select */}
                  <div className="bg-white p-5 rounded-2xl border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h4 className="font-bold text-gray-900 text-base">1. Select Gujarati Mithai (Sweets)</h4>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-900">{selectedGujaratiMithai.length} Selected</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {GUJARATI_OPTION_8.categories.mithai.map((item) => {
                        const isChecked = selectedGujaratiMithai.includes(item);
                        return (
                          <label key={item} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-sm ${isChecked ? 'bg-teal-50 border-teal-400 font-bold text-teal-950 shadow-2xs' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => setSelectedGujaratiMithai(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])} className="rounded text-teal-600 focus:ring-teal-500" />
                            <span className="truncate">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Farsan Multi-Select */}
                  <div className="bg-white p-5 rounded-2xl border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h4 className="font-bold text-gray-900 text-base">2. Select Gujarati Farsan (Savouries)</h4>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-900">{selectedGujaratiFarsan.length} Selected</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {GUJARATI_OPTION_8.categories.farsan.map((item) => {
                        const isChecked = selectedGujaratiFarsan.includes(item);
                        return (
                          <label key={item} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-sm ${isChecked ? 'bg-teal-50 border-teal-400 font-bold text-teal-950 shadow-2xs' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => setSelectedGujaratiFarsan(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])} className="rounded text-teal-600 focus:ring-teal-500" />
                            <span className="truncate">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shaak Multi-Select */}
                  <div className="bg-white p-5 rounded-2xl border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h4 className="font-bold text-gray-900 text-base">3. Select Gujarati Shaak (Curries)</h4>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-900">{selectedGujaratiShaak.length} Selected</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {GUJARATI_OPTION_8.categories.shaak.map((item) => {
                        const isChecked = selectedGujaratiShaak.includes(item);
                        return (
                          <label key={item} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-sm ${isChecked ? 'bg-teal-50 border-teal-400 font-bold text-teal-950 shadow-2xs' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => setSelectedGujaratiShaak(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])} className="rounded text-teal-600 focus:ring-teal-500" />
                            <span className="truncate">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dal, Bread & Rice selections */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-3.5 bg-white border border-teal-200 rounded-2xl space-y-1.5">
                      <label className="block text-xs font-bold text-teal-950">4. Dal / Kadhi:</label>
                      <select value={selectedGujaratiDal} onChange={e => setSelectedGujaratiDal(e.target.value)} className="w-full text-sm font-semibold bg-teal-50/40 border border-teal-200 rounded-lg p-2 text-gray-900">
                        {GUJARATI_OPTION_8.categories.dal.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="p-3.5 bg-white border border-teal-200 rounded-2xl space-y-1.5">
                      <label className="block text-xs font-bold text-teal-950">5. Breads:</label>
                      <select value={selectedGujaratiBread} onChange={e => setSelectedGujaratiBread(e.target.value)} className="w-full text-sm font-semibold bg-teal-50/40 border border-teal-200 rounded-lg p-2 text-gray-900">
                        {GUJARATI_OPTION_8.categories.breads.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="p-3.5 bg-white border border-teal-200 rounded-2xl space-y-1.5">
                      <label className="block text-xs font-bold text-teal-950">6. Rice:</label>
                      <select value={selectedGujaratiRice} onChange={e => setSelectedGujaratiRice(e.target.value)} className="w-full text-sm font-semibold bg-teal-50/40 border border-teal-200 rounded-lg p-2 text-gray-900">
                        {GUJARATI_OPTION_8.categories.rice.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── OPTION 9: PUNJABI MENU CUSTOMIZER ─── */}
              {isPunjabi && (
                <div className="space-y-5">
                  <div
                    className="p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">👑</span>
                        <h3 className="font-extrabold text-base sm:text-lg text-white">
                          Punjabi Menu (Option 9)
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-200 mt-1">
                        Royal Punjabi Celebration Feast with Tandoori Starters, Paneer Specialities, Dal Makhani &amp; Breads.
                      </p>
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-amber-200 text-amber-950 self-start sm:self-auto shadow-xs">
                      £13.99 / person
                    </span>
                  </div>

                  {/* Starters & Chaats */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h4 className="font-bold text-gray-900 text-base">1. Select Punjabi Starters &amp; Chaats</h4>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">{selectedPunjabiStarters.length} Selected</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {PUNJABI_OPTION_9.categories.starters.map((item) => {
                        const isChecked = selectedPunjabiStarters.includes(item);
                        return (
                          <label key={item} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-sm ${isChecked ? 'bg-amber-50 border-amber-400 font-bold text-amber-950 shadow-2xs' : 'bg-white border-gray-200 hover:border-amber-300'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => setSelectedPunjabiStarters(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])} className="rounded text-[#C8860A] focus:ring-[#C8860A]" />
                            <span className="truncate">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Punjabi Subjies */}
                  <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h4 className="font-bold text-gray-900 text-base">2. Select Punjabi Subjies &amp; Curries</h4>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">{selectedPunjabiSubjies.length} Selected</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {PUNJABI_OPTION_9.categories.subjies.map((item) => {
                        const isChecked = selectedPunjabiSubjies.includes(item);
                        return (
                          <label key={item} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-sm ${isChecked ? 'bg-amber-50 border-amber-400 font-bold text-amber-950 shadow-2xs' : 'bg-white border-gray-200 hover:border-amber-300'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => setSelectedPunjabiSubjies(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])} className="rounded text-[#C8860A] focus:ring-[#C8860A]" />
                            <span className="truncate">{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dal, Bread & Rice selections */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-3.5 bg-white border border-amber-200 rounded-2xl space-y-1.5">
                      <label className="block text-xs font-bold text-amber-950">3. Choice of Dal:</label>
                      <select value={selectedPunjabiDal} onChange={e => setSelectedPunjabiDal(e.target.value)} className="w-full text-sm font-semibold bg-amber-50/40 border border-amber-200 rounded-lg p-2 text-gray-900">
                        {PUNJABI_OPTION_9.categories.dal.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="p-3.5 bg-white border border-amber-200 rounded-2xl space-y-1.5">
                      <label className="block text-xs font-bold text-amber-950">4. Choice of Bread:</label>
                      <select value={selectedPunjabiBread} onChange={e => setSelectedPunjabiBread(e.target.value)} className="w-full text-sm font-semibold bg-amber-50/40 border border-amber-200 rounded-lg p-2 text-gray-900">
                        {PUNJABI_OPTION_9.categories.breads.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="p-3.5 bg-white border border-amber-200 rounded-2xl space-y-1.5">
                      <label className="block text-xs font-bold text-amber-950">5. Choice of Rice:</label>
                      <select value={selectedPunjabiRice} onChange={e => setSelectedPunjabiRice(e.target.value)} className="w-full text-sm font-semibold bg-amber-50/40 border border-amber-200 rounded-lg p-2 text-gray-900">
                        {PUNJABI_OPTION_9.categories.rice.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* BANQUET DISHES SELECTOR (IF NOT LIVE DOSA, NOT THALI, NOT TAILOR, NOT FESTIVAL, NOT CANAPE, NOT NORTH INDIAN, NOT GUJARATI, NOT PUNJABI) */}
              {!isLiveDosa && !isThali && !isTailorMenu && !isDosaFestival && !isCanape && !isNorthIndian && !isGujarati && !isPunjabi && (
                <div className="space-y-4">
                  {/* Starters Veg */}
                  {quotas.startersVeg > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Vegetarian Starters
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          selectedDishes.startersVeg.length === quotas.startersVeg
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {selectedDishes.startersVeg.length} of {quotas.startersVeg} Selected
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {activeMenu.starters.vegetarian.map((dish) => {
                          const isChecked = selectedDishes.startersVeg.includes(dish);
                          const isMaxReached = !isChecked && selectedDishes.startersVeg.length >= quotas.startersVeg;
                          return (
                            <label
                              key={dish}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-50/80 border-emerald-300 font-semibold text-emerald-950'
                                  : isMaxReached
                                  ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed'
                                  : 'bg-white border-gray-200 hover:border-amber-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={isMaxReached}
                                checked={isChecked}
                                onChange={() => toggleDish('startersVeg', dish, quotas.startersVeg)}
                                className="rounded text-[#C8860A] focus:ring-[#C8860A]"
                              />
                              <span className="text-xs truncate">{dish}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mains Veg */}
                  {quotas.mainsVeg > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Vegetarian Mains
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          selectedDishes.mainsVeg.length === quotas.mainsVeg
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {selectedDishes.mainsVeg.length} of {quotas.mainsVeg} Selected
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {activeMenu.mains.vegetarian.map((dish) => {
                          const isChecked = selectedDishes.mainsVeg.includes(dish);
                          const isMaxReached = !isChecked && selectedDishes.mainsVeg.length >= quotas.mainsVeg;
                          return (
                            <label
                              key={dish}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-50/80 border-emerald-300 font-semibold text-emerald-950'
                                  : isMaxReached
                                  ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed'
                                  : 'bg-white border-gray-200 hover:border-amber-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={isMaxReached}
                                checked={isChecked}
                                onChange={() => toggleDish('mainsVeg', dish, quotas.mainsVeg)}
                                className="rounded text-[#C8860A] focus:ring-[#C8860A]"
                              />
                              <span className="text-xs truncate">{dish}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Desserts */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="font-bold text-gray-900">🍨 Desserts</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                        {selectedDishes.desserts.length} Selected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {activeMenu.desserts.map((dish) => {
                        const isChecked = selectedDishes.desserts.includes(dish);
                        return (
                          <label
                            key={dish}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-amber-50 border-amber-300 font-semibold text-amber-950'
                                : 'bg-white border-gray-200 hover:border-amber-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleDish('desserts', dish, 2)}
                              className="rounded text-[#C8860A] focus:ring-[#C8860A]"
                            />
                            <span className="text-xs truncate">{dish}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── DYNAMIC UPGRADES SECTION ─── */}
              <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-5 rounded-3xl border-2 border-amber-200 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-200 pb-3 gap-2">
                  <div>
                    <span className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                      <span>✨</span>
                      <span>Event Upgrades</span>
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      Enhance your event with gazebo, serving staff, crockery, extra cooking hours, or extra dishes
                    </span>
                  </div>
                  {upgradesTotal > 0 && (
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                      Upgrades Total: +£{upgradesTotal.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Upgrade 1: Gazebo */}
                  <div className={`p-3.5 rounded-2xl border-2 transition-all flex items-start justify-between gap-3 ${
                    selectedUpgrades.gazebo ? 'border-[#C8860A] bg-amber-50/50 shadow-xs' : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl">⛺</span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Gazebo Setup</h4>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          Upgrade Your Menu With A Gazebo at an extra cost of £70/.
                        </p>
                        <span className="text-xs font-extrabold text-[#C8860A] mt-1 block">£70.00 Fixed</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUpgrades.gazebo}
                      onChange={(e) => setSelectedUpgrades(prev => ({ ...prev, gazebo: e.target.checked }))}
                      className="mt-1 rounded text-[#C8860A] focus:ring-[#C8860A] w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {/* Upgrade 2: Waiter for Serving */}
                  <div className={`p-3.5 rounded-2xl border-2 transition-all flex items-start justify-between gap-3 ${
                    selectedUpgrades.waiterCount > 0 ? 'border-[#C8860A] bg-amber-50/50 shadow-xs' : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl">🤵</span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Waiter for Serving</h4>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          Upgrade Your Menu With A Waiter for Serving at an extra cost of £70/.
                        </p>
                        <span className="text-xs font-extrabold text-[#C8860A] mt-1 block">£70.00 / Waiter</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedUpgrades(prev => ({ ...prev, waiterCount: Math.max(0, prev.waiterCount - 1) }))}
                        className="w-6 h-6 rounded-lg bg-white text-gray-700 font-bold text-xs flex items-center justify-center hover:bg-gray-200 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-gray-900">{selectedUpgrades.waiterCount}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedUpgrades(prev => ({ ...prev, waiterCount: prev.waiterCount + 1 }))}
                        className="w-6 h-6 rounded-lg bg-white text-gray-700 font-bold text-xs flex items-center justify-center hover:bg-gray-200 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Upgrade 3: Crockery */}
                  <div className={`p-3.5 rounded-2xl border-2 transition-all flex items-start justify-between gap-3 ${
                    selectedUpgrades.crockery ? 'border-[#C8860A] bg-amber-50/50 shadow-xs' : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl">🍽️</span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Premium Crockery Set</h4>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          Upgrade Your Menu With Crockery (Ceramic plates / Ceramic Bowls / Steel Spoons) at an extra cost of £3.00 / per person.
                        </p>
                        <span className="text-xs font-extrabold text-[#C8860A] mt-1 block">
                          £3.00 / person (+£{(3 * guests).toFixed(2)})
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUpgrades.crockery}
                      onChange={(e) => setSelectedUpgrades(prev => ({ ...prev, crockery: e.target.checked }))}
                      className="mt-1 rounded text-[#C8860A] focus:ring-[#C8860A] w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {/* Upgrade 4: Extra Hour */}
                  <div className={`p-3.5 rounded-2xl border-2 transition-all flex items-start justify-between gap-3 ${
                    selectedUpgrades.extraHours > 0 ? 'border-[#C8860A] bg-amber-50/50 shadow-xs' : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl">⏱️</span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Extra Serving / Cooking Hours</h4>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          Upgrade Your Menu With Extra Hour For Serving/Cooking At A Cost Of £100/ Per Hour.
                        </p>
                        <span className="text-xs font-extrabold text-[#C8860A] mt-1 block">£100.00 / Hour</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setSelectedUpgrades(prev => ({ ...prev, extraHours: Math.max(0, prev.extraHours - 1) }))}
                        className="w-6 h-6 rounded-lg bg-white text-gray-700 font-bold text-xs flex items-center justify-center hover:bg-gray-200 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-gray-900">{selectedUpgrades.extraHours}h</span>
                      <button
                        type="button"
                        onClick={() => setSelectedUpgrades(prev => ({ ...prev, extraHours: prev.extraHours + 1 }))}
                        className="w-6 h-6 rounded-lg bg-white text-gray-700 font-bold text-xs flex items-center justify-center hover:bg-gray-200 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upgrade 5: More Dishes from Menu */}
                <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <span>🍲</span>
                        <span>Upgrade Your Menu With More Dishes From The Below List At An Extra Cost (£2.50/dish)</span>
                      </h4>
                      <span className="text-[11px] text-gray-500">Pick any additional specialties to add to your spread</span>
                    </div>
                    {selectedUpgrades.moreDishes.length > 0 && (
                      <span className="text-xs font-bold text-[#C8860A]">
                        +{selectedUpgrades.moreDishes.length} Extra Dish(es) (+£{(selectedUpgrades.moreDishes.length * 2.5).toFixed(2)})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {[
                      'Paneer Butter Masala',
                      'Vegetable Biryani',
                      'Dal Makhani',
                      'Medu Vada (Extra Portion)',
                      'Pani Puri Platter',
                      'Gulab Jamun (Extra Tray)',
                      'Rasmalai Delight',
                      'Chole Bhature Live',
                      'Pav Bhaji Tawa Counter',
                      'Mango Lassi Pitcher',
                    ].map((dish) => {
                      const isChecked = selectedUpgrades.moreDishes.includes(dish);
                      return (
                        <label
                          key={dish}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-amber-100/70 border-amber-400 font-bold text-amber-950'
                              : 'bg-gray-50 border-gray-200 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleMoreDishUpgrade(dish)}
                              className="rounded text-[#C8860A] focus:ring-[#C8860A]"
                            />
                            <span className="text-xs truncate">{dish}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-bold">+£2.50</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom navigation */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 text-xs hover:bg-gray-50 cursor-pointer"
                >
                  ← Back to Details
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-3 rounded-xl font-bold text-white text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                >
                  <span>Review &amp; Proceed to Payment</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════ STEP 3: REVIEW & STRIPE PAYMENT ══════════ */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Customer Contact & Booking Confirmation Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span>👤</span>
                    <span>Customer &amp; Contact Details</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setStep(1);
                    }}
                    className="text-[11px] font-bold text-[#C8860A] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Edit in Step 1</span>
                    <span>✏️</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="e.g. Priya Sharma"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      WhatsApp Phone Number <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="+44 7700 900000"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="priya@example.com"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Special Dietary / Event Notes</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Mild spice preference, 2 Jain vegetarian meals required, parking instructions..."
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary Box */}
              <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="font-bold text-amber-950 text-sm">
                    {activePackage.name} Summary
                  </span>
                  <span className="text-xs text-amber-900 font-bold">
                    👥 {guests} Guests • 📅 {eventDate || 'Date TBD'} ({isWeekendOrBankHoliday(eventDate) ? 'Weekend' : 'Weekday'})
                  </span>
                </div>

                {isLiveDosa ? (
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div>
                      <strong className="text-amber-900">Live Station (12 Dishes):</strong> Meduvada, Masala Dosa, Plain Dosa, Onion Dosa, Podi Dosa, Uthappams (Onion, Capsicum, Chilli, Plain, Podi), Chutneys &amp; Sambar
                    </div>
                    <div>
                      <strong className="text-amber-900">Selected Specialty:</strong> {liveDosaStarterChoice}
                    </div>
                    {isLiveDosa2 && (
                      <>
                        <div>
                          <strong className="text-purple-900">Selected Main Course:</strong> {selectedDishes.mainsVeg.join(', ') || 'Vegetarian Main'}
                        </div>
                        <div>
                          <strong className="text-purple-900">Selected Dessert:</strong> {selectedDishes.desserts.join(', ') || 'Traditional Dessert'}
                        </div>
                      </>
                    )}
                    <div>
                      <strong className="text-amber-900">Chef Service Duration:</strong> {liveDosaCalc.durationHours} Hours on-site
                    </div>
                  </div>
                ) : isThali ? (
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div>
                      <strong className="text-amber-900">12 Core Traditional Items Included:</strong> Plain Rice, Sambar, Rasam, Koottu, Poriyal, Kaarakolambu, Sweet, Pappad, Yoghurt, Pickle, Veg Kurma, Poori (1)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                      <div><strong className="text-amber-800">Sambar:</strong> {selectedThaliVariants.sambar}</div>
                      <div><strong className="text-amber-800">Rasam:</strong> {selectedThaliVariants.rasam}</div>
                      <div><strong className="text-amber-800">Koottu:</strong> {selectedThaliVariants.koottu}</div>
                      <div><strong className="text-amber-800">Poriyal:</strong> {selectedThaliVariants.poriyal}</div>
                      <div><strong className="text-amber-800">Kaarakolambu:</strong> {selectedThaliVariants.kaarakolambu}</div>
                      <div><strong className="text-amber-800">Sweet:</strong> {selectedThaliVariants.sweet}</div>
                    </div>
                    {selectedThaliAdditions.length > 0 && (
                      <div className="pt-1 text-emerald-900">
                        <strong>Selected Additions:</strong> {selectedThaliAdditions.join(', ')} (+£{thaliAdditionsTotal.toFixed(2)})
                      </div>
                    )}
                  </div>
                ) : isTailorMenu ? (
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div>
                      <strong className="text-amber-900">4 Signature Live Stations:</strong> {selectedTailorStations.join(', ')}
                    </div>
                    {tailorSelectedDishes.length > 0 && (
                      <div>
                        <strong className="text-amber-900">Tailored Dishes ({tailorSelectedDishes.length}):</strong> {tailorSelectedDishes.join(', ')}
                      </div>
                    )}
                    <div className="text-emerald-800 font-semibold pt-1">
                      ✓ All cooking equipment, Bain Marie warmers &amp; disposable 9-inch compartment plates provided.
                    </div>
                    <div className="text-amber-900 font-bold">
                      ℹ️ 50% deposit paid online at booking. Balance to be settled in cash after event.
                    </div>
                  </div>
                ) : isDosaFestival ? (
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div>
                      <strong className="text-orange-950">London Dosa Festival:</strong> {selectedFestivalDosas.length} Artisan Dosa varieties selected
                    </div>
                    <div className="text-[11px] text-gray-600 line-clamp-2">
                      {selectedFestivalDosas.join(', ')}
                    </div>
                    <div className="text-emerald-800 font-semibold pt-0.5">
                      ✓ Cooked fresh on hot live tawas with Coconut, Tomato-Onion &amp; Mint Chutneys + Piping Hot Sambar.
                    </div>
                  </div>
                ) : isCanape ? (
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div>
                      <strong className="text-rose-950">Canapé Service ({selectedCanapes.length} Items):</strong> {selectedCanapes.join(', ')}
                    </div>
                    <div className="text-emerald-800 font-semibold pt-0.5">
                      ✓ Passed &amp; stationary finger food service for receptions and cocktail events.
                    </div>
                  </div>
                ) : isNorthIndian ? (
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div><strong className="text-indigo-950">Bread:</strong> {selectedNorthIndian.bread}</div>
                    <div><strong className="text-indigo-950">Subjies:</strong> {selectedNorthIndian.subji1}, {selectedNorthIndian.subji2}</div>
                    <div><strong className="text-indigo-950">Dal:</strong> {selectedNorthIndian.dal}</div>
                    <div><strong className="text-indigo-950">Rice:</strong> {selectedNorthIndian.rice}</div>
                    <div className="text-emerald-800 font-semibold pt-0.5">
                      ✓ Includes Fresh Salad, Crisp Pappad, and Pickle.
                    </div>
                  </div>
                ) : isGujarati ? (
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div><strong className="text-teal-950">Mithai:</strong> {selectedGujaratiMithai.join(', ')}</div>
                    <div><strong className="text-teal-950">Farsan:</strong> {selectedGujaratiFarsan.join(', ')}</div>
                    <div><strong className="text-teal-950">Shaak:</strong> {selectedGujaratiShaak.join(', ')}</div>
                    <div><strong className="text-teal-950">Dal &amp; Breads:</strong> {selectedGujaratiDal}, {selectedGujaratiBread}, {selectedGujaratiRice}</div>
                  </div>
                ) : isPunjabi ? (
                  <div className="text-xs text-gray-700 space-y-1.5">
                    <div><strong className="text-amber-950">Starters &amp; Chaat:</strong> {selectedPunjabiStarters.join(', ')}</div>
                    <div><strong className="text-amber-950">Punjabi Subjies:</strong> {selectedPunjabiSubjies.join(', ')}</div>
                    <div><strong className="text-amber-950">Dal &amp; Bread:</strong> {selectedPunjabiDal}, {selectedPunjabiBread}, {selectedPunjabiRice}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-700">
                    {selectedDishes.startersVeg.length > 0 && (
                      <div>
                        <strong className="text-emerald-800">Veg Starters:</strong> {selectedDishes.startersVeg.join(', ')}
                      </div>
                    )}
                    {selectedDishes.mainsVeg.length > 0 && (
                      <div>
                        <strong className="text-emerald-800">Veg Mains:</strong> {selectedDishes.mainsVeg.join(', ')}
                      </div>
                    )}
                    {selectedDishes.desserts.length > 0 && (
                      <div>
                        <strong className="text-amber-800">Desserts:</strong> {selectedDishes.desserts.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Upgrades List in Summary */}
                {upgradesTotal > 0 && (
                  <div className="pt-2 border-t border-amber-200/60 text-xs text-amber-950 space-y-0.5">
                    <strong className="block text-amber-900 mb-1">Selected Upgrades:</strong>
                    {selectedUpgrades.gazebo && <div>• Gazebo Setup (+£70.00)</div>}
                    {selectedUpgrades.waiterCount > 0 && <div>• {selectedUpgrades.waiterCount} Waiter(s) for Serving (+£{(selectedUpgrades.waiterCount * 70).toFixed(2)})</div>}
                    {selectedUpgrades.crockery && <div>• Crockery Service for {guests} guests (+£{(3 * guests).toFixed(2)})</div>}
                    {selectedUpgrades.extraHours > 0 && <div>• {selectedUpgrades.extraHours} Extra Hour(s) for Serving/Cooking (+£{(selectedUpgrades.extraHours * 100).toFixed(2)})</div>}
                    {selectedUpgrades.moreDishes.length > 0 && (
                      <div>• Extra Dishes: {selectedUpgrades.moreDishes.join(', ')} (+£{(selectedUpgrades.moreDishes.length * 2.5).toFixed(2)})</div>
                    )}
                  </div>
                )}
              </div>

              {/* Financial Calculation Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden text-xs shadow-xs">
                <div className="p-3.5 bg-gradient-to-r from-gray-50 to-amber-50/40 border-b border-gray-200 font-bold text-gray-800 flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Icon name="ReceiptPercentIcon" size={16} className="text-[#C8860A]" />
                    Itemized Cart &amp; Tax Breakdown
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">All figures in GBP (£)</span>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      {activePackage.name} (£{packageRatePerPerson.toFixed(2)} × {guests} guests)
                    </span>
                    <span className="font-semibold text-gray-900">£{packageTotal.toFixed(2)}</span>
                  </div>

                  {/* Minimum Call Out Floor Adjustment (if guest count/menu is under floor) */}
                  {callOutAdjustment > 0 && (
                    <div className="flex justify-between text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                      <div>
                        <span className="font-bold block">Minimum Call-Out Guarantee Adjustment</span>
                        <span className="text-[10px] text-amber-700">
                          Guaranteed minimum charge of £{liveDosaCalc.minCallOutCharge.toFixed(2)} for {liveDosaCalc.tierLabel}
                        </span>
                      </div>
                      <span className="font-extrabold text-amber-900 self-center">+£{callOutAdjustment.toFixed(2)}</span>
                    </div>
                  )}

                  {thaliAdditionsTotal > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Extra Additions ({selectedThaliAdditions.length} dishes)</span>
                      <span className="font-semibold text-gray-900">+£{thaliAdditionsTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {upgradesTotal > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Selected Upgrades (Gazebo / Waiters / Crockery / Hours / Dishes)</span>
                      <span className="font-semibold text-gray-900">+£{upgradesTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {deliveryCharge > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Travel &amp; Delivery Fee ({deliveryResult?.distanceMiles} miles from UB2 4BN)</span>
                      <span className="font-semibold text-gray-900">+£{deliveryCharge.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-500 text-[11px] pt-1 border-t border-gray-100">
                    <span>Tax / VAT (Included in Total):</span>
                    <span className="font-semibold text-gray-700">£{(grandTotal * 0.20 / 1.20).toFixed(2)} (20% VAT)</span>
                  </div>

                  <div className="border-t border-gray-200 pt-2.5 flex justify-between text-sm font-extrabold text-gray-900">
                    <span>Grand Total:</span>
                    <span className="text-base text-[#C8860A]">£{grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Payment Breakdown Cards */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">Deposit Payable Now ({isTailorMenu ? '50%' : '30%'})</span>
                      <span className="text-sm font-extrabold text-amber-950">£{depositAmount.toFixed(2)}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider">Remaining Balance Due</span>
                      <span className="text-sm font-extrabold text-gray-900">£{(grandTotal - depositAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Choose Online Payment Option (Stripe)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      paymentChoice === 'deposit'
                        ? 'border-[#C8860A] bg-amber-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      checked={paymentChoice === 'deposit'}
                      onChange={() => setPaymentChoice('deposit')}
                      className="mt-0.5 text-[#C8860A] focus:ring-[#C8860A]"
                    />
                    <div>
                      <div className="font-bold text-gray-900 text-xs">
                        Pay 30% Booking Deposit (£{depositAmount.toFixed(2)})
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Secures your date immediately. Remaining £{(grandTotal - depositAmount).toFixed(2)} due 14 days before event.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      paymentChoice === 'full'
                        ? 'border-[#C8860A] bg-amber-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      checked={paymentChoice === 'full'}
                      onChange={() => setPaymentChoice('full')}
                      className="mt-0.5 text-[#C8860A] focus:ring-[#C8860A]"
                    />
                    <div>
                      <div className="font-bold text-gray-900 text-xs">
                        Pay Full Amount (£{grandTotal.toFixed(2)})
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Pay 100% upfront for complete peace of mind and priority kitchen scheduling.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Proceed to Stripe Checkout Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 text-xs hover:bg-gray-50 cursor-pointer"
                >
                  ← Edit Menu &amp; Upgrades
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleProceedToStripe}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-white text-sm shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #635BFF, #4F46E5)' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Redirecting to Stripe...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="LockClosedIcon" size={16} />
                      <span>Pay £{amountToPay.toFixed(2)} with Stripe Checkout</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
