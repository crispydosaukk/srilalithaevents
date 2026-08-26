'use client';

import React, { useState, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import GoogleLocationInput from '@/components/GoogleLocationInput';
import {
  BANQUET_PACKAGES,
  INDIAN_MENU,
  SRI_LANKAN_MENU,
  LIVE_COUNTER_PACKAGE,
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
  // Step State: 1 = Package & Schedule, 2 = Dish Selection, 3 = Review & Payment
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Details
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    initialPackage
      ? (BANQUET_PACKAGES.find(p => p.name.toLowerCase().includes(initialPackage.toLowerCase()))?.id || 'gold')
      : 'gold'
  );
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

  // Selected Dishes Storage
  const [selectedDishes, setSelectedDishes] = useState<{
    canapesVeg: string[];
    canapesNonVeg: string[];
    startersVeg: string[];
    startersNonVeg: string[];
    mainsVeg: string[];
    mainsNonVeg: string[];
    desserts: string[];
    sundries: string[];
    selectedExtras: { name: string; price: number; perPerson?: boolean }[];
  }>({
    canapesVeg: [],
    canapesNonVeg: [],
    startersVeg: [],
    startersNonVeg: [],
    mainsVeg: [],
    mainsNonVeg: [],
    desserts: [],
    sundries: ['Rice - Plain, Pulao, Jeera', 'Assorted Naan Plain/ Butter'],
    selectedExtras: [],
  });

  const activePackage = useMemo(() => {
    return BANQUET_PACKAGES.find(p => p.id === selectedPackageId) || BANQUET_PACKAGES[3]; // default Gold
  }, [selectedPackageId]);

  const activeMenu = cuisineType === 'indian' ? INDIAN_MENU : SRI_LANKAN_MENU;

  // Quotas based on active package (combining veg + non-veg count for pure vegetarian banquet selection)
  const quotas = useMemo(() => {
    return {
      canapesVeg: (activePackage as any).canapes ? ((activePackage as any).canapes.veg || 0) + ((activePackage as any).canapes.nonVeg || 0) : 0,
      canapesNonVeg: 0,
      startersVeg: (activePackage.starters.veg || 0) + (activePackage.starters.nonVeg || 0),
      startersNonVeg: 0,
      mainsVeg: (activePackage.mains.veg || 0) + (activePackage.mains.nonVeg || 0),
      mainsNonVeg: 0,
      desserts: activePackage.desserts.length || 1,
    };
  }, [activePackage]);

  // Pricing calculations
  const packageTotal = (activePackage.pricePerPerson || 0) * Math.max(1, guests);
  const extrasTotal = selectedDishes.selectedExtras.reduce((sum, item) => {
    return sum + (item.perPerson ? item.price * guests : item.price);
  }, 0);
  const deliveryCharge = deliveryResult?.charge || 0;
  const grandTotal = packageTotal + extrasTotal + deliveryCharge;
  const depositAmount = Math.round(grandTotal * 0.3 * 100) / 100;
  const amountToPay = paymentChoice === 'deposit' ? depositAmount : grandTotal;

  // Toggle dish selection helper
  const toggleDish = (
    category: 'canapesVeg' | 'canapesNonVeg' | 'startersVeg' | 'startersNonVeg' | 'mainsVeg' | 'mainsNonVeg' | 'desserts' | 'sundries',
    dish: string,
    maxLimit: number
  ) => {
    setSelectedDishes(prev => {
      const currentList = prev[category];
      if (currentList.includes(dish)) {
        return { ...prev, [category]: currentList.filter(d => d !== dish) };
      }
      if (maxLimit > 0 && currentList.length >= maxLimit) {
        // Replace first if limit reached for single choice, or return current
        if (maxLimit === 1) {
          return { ...prev, [category]: [dish] };
        }
        return prev;
      }
      return { ...prev, [category]: [...currentList, dish] };
    });
  };

  const toggleExtra = (extra: { name: string; price: number; perPerson?: boolean }) => {
    setSelectedDishes(prev => {
      const exists = prev.selectedExtras.some(e => e.name === extra.name);
      if (exists) {
        return {
          ...prev,
          selectedExtras: prev.selectedExtras.filter(e => e.name !== extra.name),
        };
      }
      return {
        ...prev,
        selectedExtras: [...prev.selectedExtras, extra],
      };
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

  // Submit and Redirect to Stripe Checkout
  const handleProceedToStripe = async () => {
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setErrorMessage('Please fill in your Full Name, Email, and WhatsApp Phone Number.');
      return;
    }
    if (!eventDate) {
      setErrorMessage('Please select your Event Date.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create order record in Firestore
      const orderRef = await addDoc(collection(db, 'booking_requests'), {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        eventType: 'Online Custom Menu Order',
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
        selectedMenuDishes: selectedDishes,
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
        extraCharges: selectedDishes.selectedExtras.map(e => ({
          name: e.name,
          amount: e.perPerson ? e.price * guests : e.price,
        })),
        createdAt: new Date().toISOString(),
        enquiryDate: new Date().toISOString().split('T')[0],
      });

      // 2. Call Stripe API to create Checkout Session
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderRef.id,
          customerName,
          customerEmail,
          customerPhone,
          packageName: activePackage.name,
          guests: Number(guests),
          eventDate,
          eventTime,
          location: venueAddress,
          deliveryCharge,
          selectedMenuDishes: selectedDishes,
          totalAmount: grandTotal,
          paymentType: paymentChoice,
          amountToPay,
          origin: window.location.origin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start Stripe checkout session');
      }

      // 3. Redirect user to Stripe
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'An error occurred while redirecting to Stripe payment.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 my-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/70 via-white to-amber-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#C8860A] flex items-center justify-center flex-shrink-0 font-bold">
              <Icon name="SparklesIcon" size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Self-Service Menu Customizer &amp; Online Order
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Choose your exact dishes, calculate instant pricing, and pay securely via Stripe
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>

        {/* Multi-Step Indicator */}
        <div className="px-6 py-2.5 bg-gray-50/90 border-b border-gray-100 flex items-center justify-center gap-3 sm:gap-8 text-xs font-semibold flex-shrink-0">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 transition-colors ${step === 1 ? 'text-[#C8860A] font-bold' : 'text-gray-400'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-[#C8860A] text-white' : 'bg-gray-200 text-gray-600'}`}>1</span>
            <span>Package &amp; Event</span>
          </button>
          <span className="text-gray-300">→</span>
          <button
            onClick={() => setStep(2)}
            className={`flex items-center gap-1.5 transition-colors ${step === 2 ? 'text-[#C8860A] font-bold' : 'text-gray-400'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-[#C8860A] text-white' : 'bg-gray-200 text-gray-600'}`}>2</span>
            <span>Select Menu Dishes</span>
          </button>
          <span className="text-gray-300">→</span>
          <button
            onClick={() => setStep(3)}
            className={`flex items-center gap-1.5 transition-colors ${step === 3 ? 'text-[#C8860A] font-bold' : 'text-gray-400'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-[#C8860A] text-white' : 'bg-gray-200 text-gray-600'}`}>3</span>
            <span>Review &amp; Pay (Stripe)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Icon name="ExclamationCircleIcon" size={18} className="text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ══════════ STEP 1: PACKAGE & EVENT DETAILS ══════════ */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2.5">
                  1. Select Banquet Catering Package
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {BANQUET_PACKAGES.map(pkg => {
                    const isSelected = pkg.id === selectedPackageId;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#C8860A] bg-amber-50/40 shadow-md ring-2 ring-[#C8860A]/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-gray-900 text-sm">{pkg.name}</h3>
                          <span className="text-base font-extrabold" style={{ color: pkg.color }}>
                            £{pkg.pricePerPerson}
                            <span className="text-[10px] font-normal text-gray-500">/pp</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mb-2">{pkg.guestLabel || 'Authentic Catering'}</p>
                        <div className="text-[10px] text-gray-600 space-y-0.5 border-t border-gray-100 pt-2">
                          <div>• {pkg.starters.veg} Veg &amp; {pkg.starters.nonVeg} Non-Veg Starters</div>
                          <div>• {pkg.mains.veg} Veg &amp; {pkg.mains.nonVeg} Non-Veg Mains</div>
                          <div>• {pkg.desserts.length} Dessert + Sundries &amp; Breads</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cuisine Preference */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <label className="font-bold text-gray-900 text-xs block">Select Cuisine Style</label>
                  <span className="text-[11px] text-gray-500">Switch between North/South Indian and Sri Lankan recipes</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCuisineType('indian')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      cuisineType === 'indian'
                        ? 'bg-[#C8860A] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    🍛 Indian Menu
                  </button>
                  <button
                    type="button"
                    onClick={() => setCuisineType('srilankan')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      cuisineType === 'srilankan'
                        ? 'bg-[#C8860A] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    🌴 Sri Lankan Menu
                  </button>
                </div>
              </div>

              {/* Schedule & Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Number of Guests *
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={guests}
                    onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Time of Day *
                  </label>
                  <select
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  >
                    <option value="Lunch (12:00pm – 4:00pm)">Lunch (12:00pm – 4:00pm)</option>
                    <option value="Dinner (6:00pm – 11:00pm)">Dinner (6:00pm – 11:00pm)</option>
                    <option value="All Day (10:00am – 10:00pm)">All Day (10:00am – 10:00pm)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Event Venue Location / UK Postcode
                  </label>
                  <GoogleLocationInput
                    value={venueAddress}
                    placeholder="Enter event venue address or UK postcode..."
                    onChange={(addr, coords) => handleLocationSelected(addr, coords)}
                    onCoordinatesChange={(coords) => {
                      if (coords && coords.lat && coords.lng && deliveryConfig.venueLat && deliveryConfig.venueLng) {
                        const dist = calculateDistanceMiles(
                          deliveryConfig.venueLat,
                          deliveryConfig.venueLng,
                          coords.lat,
                          coords.lng
                        );
                        setDeliveryResult(calculateDeliveryCharge(dist, deliveryConfig));
                      }
                    }}
                  />

                  {deliveryResult && venueAddress && (
                    <div className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      deliveryResult.isFree
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <Icon name="MapPinIcon" size={14} className={deliveryResult.isFree ? 'text-emerald-600' : 'text-[#C8860A]'} />
                        <span>Distance: {deliveryResult.distanceMiles} miles from restaurant</span>
                      </span>
                      <span className="font-bold">
                        {deliveryResult.isFree ? 'FREE Delivery' : `+£${deliveryResult.charge.toFixed(2)} Delivery Fee`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl font-bold text-white text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                >
                  <span>Continue to Dish Selection ({activePackage.name})</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════ STEP 2: DISH SELECTION ══════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-amber-950 text-sm">
                    {activePackage.name} Menu Customizer ({cuisineType === 'indian' ? 'Indian' : 'Sri Lankan'})
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Select your dishes below based on package limits. Sundries and Rice are automatically included!
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-[#C8860A] hover:underline self-start sm:self-center"
                >
                  Change Package
                </button>
              </div>

              {/* 1. Vegetarian Starters */}
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

              {/* 2. Non-Vegetarian Starters */}
              {quotas.startersNonVeg > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Non-Vegetarian Starters
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      selectedDishes.startersNonVeg.length === quotas.startersNonVeg
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {selectedDishes.startersNonVeg.length} of {quotas.startersNonVeg} Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {activeMenu.starters.nonVegetarian.map((dish) => {
                      const isChecked = selectedDishes.startersNonVeg.includes(dish);
                      const isMaxReached = !isChecked && selectedDishes.startersNonVeg.length >= quotas.startersNonVeg;
                      return (
                        <label
                          key={dish}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-rose-50/80 border-rose-300 font-semibold text-rose-950'
                              : isMaxReached
                              ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed'
                              : 'bg-white border-gray-200 hover:border-amber-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={isMaxReached}
                            checked={isChecked}
                            onChange={() => toggleDish('startersNonVeg', dish, quotas.startersNonVeg)}
                            className="rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-xs truncate">{dish}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Vegetarian Mains */}
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

              {/* 4. Non-Vegetarian Mains */}
              {quotas.mainsNonVeg > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Non-Vegetarian Mains
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      selectedDishes.mainsNonVeg.length === quotas.mainsNonVeg
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {selectedDishes.mainsNonVeg.length} of {quotas.mainsNonVeg} Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {activeMenu.mains.nonVegetarian.map((dish) => {
                      const isChecked = selectedDishes.mainsNonVeg.includes(dish);
                      const isMaxReached = !isChecked && selectedDishes.mainsNonVeg.length >= quotas.mainsNonVeg;
                      return (
                        <label
                          key={dish}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-rose-50/80 border-rose-300 font-semibold text-rose-950'
                              : isMaxReached
                              ? 'opacity-40 border-gray-200 bg-gray-50 cursor-not-allowed'
                              : 'bg-white border-gray-200 hover:border-amber-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={isMaxReached}
                            checked={isChecked}
                            onChange={() => toggleDish('mainsNonVeg', dish, quotas.mainsNonVeg)}
                            className="rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-xs truncate">{dish}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. Desserts */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="font-bold text-gray-900">🍨 Desserts</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    selectedDishes.desserts.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                  }`}>
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

              {/* 6. Optional Live Counters & Extras */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div>
                    <span className="font-bold text-gray-900">🎪 Optional Live Counters &amp; Event Extras</span>
                    <span className="text-[11px] text-gray-500 block">Add hot live cooking stations to impress your guests</span>
                  </div>
                  {selectedDishes.selectedExtras.length > 0 && (
                    <span className="text-xs font-bold text-[#C8860A]">
                      +{selectedDishes.selectedExtras.length} Selected (+£{extrasTotal})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {LIVE_COUNTER_PACKAGE.srilankanSouthIndian.slice(0, 6).map((extra) => {
                    const isChecked = selectedDishes.selectedExtras.some(e => e.name === extra.name);
                    return (
                      <label
                        key={extra.name}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-amber-100/60 border-amber-400 font-bold text-amber-950 shadow-2xs'
                            : 'bg-white border-gray-200 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleExtra({ name: extra.name, price: extra.price, perPerson: true })}
                            className="rounded text-[#C8860A] focus:ring-[#C8860A]"
                          />
                          <span className="text-xs truncate">{extra.name}</span>
                        </div>
                        <span className="text-[11px] text-gray-600 font-semibold flex-shrink-0">
                          £{extra.price}/pp
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Bottom navigation */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 text-xs hover:bg-gray-50"
                >
                  ← Back to Details
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-3 rounded-xl font-bold text-white text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2"
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
              {/* Customer Contact Info Form */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">
                  Contact Information for Order Confirmation
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp Phone *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+44 7700 900000"
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

              {/* Order Summary & Chosen Dishes Pill Box */}
              <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="font-bold text-amber-950 text-sm">Selected Menu Summary ({activePackage.name})</span>
                  <span className="text-xs text-amber-900 font-bold">👥 {guests} Guests • 📅 {eventDate || 'Date TBD'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-gray-700">
                  {selectedDishes.startersVeg.length > 0 && (
                    <div>
                      <strong className="text-emerald-800">Veg Starters:</strong> {selectedDishes.startersVeg.join(', ')}
                    </div>
                  )}
                  {selectedDishes.startersNonVeg.length > 0 && (
                    <div>
                      <strong className="text-rose-800">Non-Veg Starters:</strong> {selectedDishes.startersNonVeg.join(', ')}
                    </div>
                  )}
                  {selectedDishes.mainsVeg.length > 0 && (
                    <div>
                      <strong className="text-emerald-800">Veg Mains:</strong> {selectedDishes.mainsVeg.join(', ')}
                    </div>
                  )}
                  {selectedDishes.mainsNonVeg.length > 0 && (
                    <div>
                      <strong className="text-rose-800">Non-Veg Mains:</strong> {selectedDishes.mainsNonVeg.join(', ')}
                    </div>
                  )}
                  {selectedDishes.desserts.length > 0 && (
                    <div>
                      <strong className="text-amber-800">Desserts:</strong> {selectedDishes.desserts.join(', ')}
                    </div>
                  )}
                  {selectedDishes.selectedExtras.length > 0 && (
                    <div>
                      <strong className="text-purple-800">Live Counters/Extras:</strong> {selectedDishes.selectedExtras.map(e => e.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Calculation Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden text-xs">
                <div className="p-3.5 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex justify-between">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>{activePackage.name} (£{activePackage.pricePerPerson} × {guests} guests)</span>
                    <span className="font-semibold text-gray-900">£{packageTotal.toFixed(2)}</span>
                  </div>

                  {extrasTotal > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Selected Live Counters &amp; Extras</span>
                      <span className="font-semibold text-gray-900">+£{extrasTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {deliveryCharge > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Travel &amp; Delivery Fee ({deliveryResult?.distanceMiles} miles)</span>
                      <span className="font-semibold text-gray-900">+£{deliveryCharge.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-bold text-gray-900">
                    <span>Grand Total:</span>
                    <span className="text-base text-[#C8860A]">£{grandTotal.toFixed(2)}</span>
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
                  className="px-5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 text-xs hover:bg-gray-50"
                >
                  ← Edit Menu Dishes
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
