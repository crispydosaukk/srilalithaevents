'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Icon from '@/components/ui/AppIcon';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  MENU_CATEGORIES,
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
  INDIAN_MENU as DEFAULT_INDIAN_MENU,
  SRI_LANKAN_MENU as DEFAULT_SRI_LANKAN_MENU,
  LIVE_COUNTER_PACKAGE as DEFAULT_LIVE_COUNTER_PACKAGE,
  BANQUET_PACKAGES as DEFAULT_BANQUET_PACKAGES,
  VENUE_HALL_CHARGES as DEFAULT_VENUE_HALL_CHARGES,
  TABLE_SERVICE as DEFAULT_TABLE_SERVICE,
  KIDS_PRICING as DEFAULT_KIDS_PRICING,
  STANDARD_SETUP as DEFAULT_STANDARD_SETUP,
  TERMS_AND_CONDITIONS as DEFAULT_TERMS_AND_CONDITIONS,
  DRY_HIRE_PRICES as DEFAULT_DRY_HIRE_PRICES,
  MenuCategory,
  MenuItem,
  MenuUpgradeItem,
} from '@/app/data/menuData';
import {
  DEFAULT_FORM_CONFIG,
  BookingFormConfig,
  FormField,
  DEFAULT_TIME_SLOTS,
  DEFAULT_EVENT_TYPES,
  DEFAULT_OUTDOOR_TIME_SLOTS,
  DEFAULT_SLOT_CAPACITY,
  SlotCapacityConfig,
} from '@/app/data/formConfig';
import {
  DeliveryLocationConfig,
  DEFAULT_DELIVERY_CONFIG,
  calculateDistanceMiles,
  calculateDeliveryCharge,
  DeliveryCalculationResult,
} from '@/app/data/deliveryConfig';
import GoogleLocationInput from '@/components/GoogleLocationInput';
import InteractiveMenuOrderModal from '@/components/InteractiveMenuOrderModal';

type MenuTab = 'full-menu' | 'live-dosa-1' | 'live-dosa-2' | 'madras-thali' | 'tailor-menu' | 'dosa-festival' | 'canape' | 'north-indian' | 'gujarati' | 'punjabi' | 'live-dosa';

export default function HomePage() {
  const [isMenuOrderModalOpen, setIsMenuOrderModalOpen] = useState(false);
  const [selectedPackageForModal, setSelectedPackageForModal] = useState<string>('Live Dosa Option 1');

  const [menus, setMenus] = useState({
    LIVE_DOSA_OPTION_1: LIVE_DOSA_OPTION_1,
    LIVE_DOSA_OPTION_2: LIVE_DOSA_OPTION_2,
    LIVE_DOSA_MENU: LIVE_DOSA_MENU,
    MADRAS_THALI_OPTION_3: MADRAS_THALI_OPTION_3,
    TAILOR_MENU_OPTION_4: TAILOR_MENU_OPTION_4,
    DOSA_FESTIVAL_OPTION_5: DOSA_FESTIVAL_OPTION_5,
    CANAPE_OPTION_6: CANAPE_OPTION_6,
    NORTH_INDIAN_OPTION_7: NORTH_INDIAN_OPTION_7,
    GUJARATI_OPTION_8: GUJARATI_OPTION_8,
    PUNJABI_OPTION_9: PUNJABI_OPTION_9,
    MENU_UPGRADES: MENU_UPGRADES,
    INDIAN_MENU: DEFAULT_INDIAN_MENU,
    SRI_LANKAN_MENU: DEFAULT_SRI_LANKAN_MENU,
    LIVE_COUNTER_PACKAGE: DEFAULT_LIVE_COUNTER_PACKAGE,
    BANQUET_PACKAGES: DEFAULT_BANQUET_PACKAGES,
    VENUE_HALL_CHARGES: DEFAULT_VENUE_HALL_CHARGES,
    TABLE_SERVICE: DEFAULT_TABLE_SERVICE,
    KIDS_PRICING: DEFAULT_KIDS_PRICING,
    STANDARD_SETUP: DEFAULT_STANDARD_SETUP,
    TERMS_AND_CONDITIONS: DEFAULT_TERMS_AND_CONDITIONS,
    DRY_HIRE_PRICES: DEFAULT_DRY_HIRE_PRICES,
  });

  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [formConfig, setFormConfig] = useState<BookingFormConfig>(DEFAULT_FORM_CONFIG);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryLocationConfig>(DEFAULT_DELIVERY_CONFIG);
  const [customerLocationCoords, setCustomerLocationCoords] = useState<{ lat: number; lng: number; postcode?: string } | null>(null);
  const [deliveryResult, setDeliveryResult] = useState<DeliveryCalculationResult | null>(null);

  React.useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'booking_form_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<BookingFormConfig>;
        let fields = (data.fields && data.fields.length > 0) ? [...data.fields] : [...DEFAULT_FORM_CONFIG.fields];

        // Ensure location field is present if not in database
        if (!fields.some(f => f.id === 'location' || f.type === 'location')) {
          const locField = DEFAULT_FORM_CONFIG.fields.find(f => f.id === 'location');
          if (locField) {
            const eventTypeIdx = fields.findIndex(f => f.id === 'eventType');
            if (eventTypeIdx !== -1) {
              fields.splice(eventTypeIdx + 1, 0, locField);
            } else {
              fields.push(locField);
            }
          }
        }

        // Remove legacy service_type field
        fields = fields.filter(f => f.id !== 'service_type' && f.id !== 'serviceType');

        setFormConfig({
          formTitle: data.formTitle || DEFAULT_FORM_CONFIG.formTitle,
          formSubtitle: data.formSubtitle || DEFAULT_FORM_CONFIG.formSubtitle,
          submitButtonText: data.submitButtonText || DEFAULT_FORM_CONFIG.submitButtonText,
          fields,
          slotCapacity: data.slotCapacity || DEFAULT_FORM_CONFIG.slotCapacity || DEFAULT_SLOT_CAPACITY,
        });
      }
    });
  }, []);

  React.useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'delivery_settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<DeliveryLocationConfig>;
        setDeliveryConfig(prev => ({
          ...prev,
          ...data,
        }));
      }
    });
  }, []);

  React.useEffect(() => {
    return onSnapshot(collection(db, 'booking_requests'), (snapshot) => {
      const bks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setExistingBookings(bks);
    });
  }, []);

  React.useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'menus'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMenus({
          LIVE_DOSA_OPTION_1: data.LIVE_DOSA_OPTION_1 || data.LIVE_DOSA_MENU || LIVE_DOSA_OPTION_1,
          LIVE_DOSA_OPTION_2: data.LIVE_DOSA_OPTION_2 || LIVE_DOSA_OPTION_2,
          LIVE_DOSA_MENU: data.LIVE_DOSA_OPTION_1 || data.LIVE_DOSA_MENU || LIVE_DOSA_MENU,
          MADRAS_THALI_OPTION_3: data.MADRAS_THALI_OPTION_3 || MADRAS_THALI_OPTION_3,
          TAILOR_MENU_OPTION_4: data.TAILOR_MENU_OPTION_4 || TAILOR_MENU_OPTION_4,
          DOSA_FESTIVAL_OPTION_5: data.DOSA_FESTIVAL_OPTION_5 || DOSA_FESTIVAL_OPTION_5,
          CANAPE_OPTION_6: data.CANAPE_OPTION_6 || CANAPE_OPTION_6,
          NORTH_INDIAN_OPTION_7: data.NORTH_INDIAN_OPTION_7 || NORTH_INDIAN_OPTION_7,
          GUJARATI_OPTION_8: data.GUJARATI_OPTION_8 || GUJARATI_OPTION_8,
          PUNJABI_OPTION_9: data.PUNJABI_OPTION_9 || PUNJABI_OPTION_9,
          MENU_UPGRADES: data.MENU_UPGRADES || MENU_UPGRADES,
          INDIAN_MENU: data.INDIAN_MENU || DEFAULT_INDIAN_MENU,
          SRI_LANKAN_MENU: data.SRI_LANKAN_MENU || DEFAULT_SRI_LANKAN_MENU,
          LIVE_COUNTER_PACKAGE: data.LIVE_COUNTER_PACKAGE || DEFAULT_LIVE_COUNTER_PACKAGE,
          BANQUET_PACKAGES: data.BANQUET_PACKAGES || DEFAULT_BANQUET_PACKAGES,
          VENUE_HALL_CHARGES: data.VENUE_HALL_CHARGES || DEFAULT_VENUE_HALL_CHARGES,
          TABLE_SERVICE: data.TABLE_SERVICE || DEFAULT_TABLE_SERVICE,
          KIDS_PRICING: data.KIDS_PRICING || DEFAULT_KIDS_PRICING,
          STANDARD_SETUP: data.STANDARD_SETUP || DEFAULT_STANDARD_SETUP,
          TERMS_AND_CONDITIONS: data.TERMS_AND_CONDITIONS || DEFAULT_TERMS_AND_CONDITIONS,
          DRY_HIRE_PRICES: data.DRY_HIRE_PRICES || DEFAULT_DRY_HIRE_PRICES,
        });
      }
    });
  }, []);

  const [pricingDetails, setPricingDetails] = useState({
    depositPercentage: 30,
  });

  React.useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'pricing_details'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPricingDetails({
          depositPercentage: data.depositPercentage !== undefined ? data.depositPercentage : 30,
        });
      }
    });
  }, []);

  React.useEffect(() => {
    return onSnapshot(collection(db, 'blocked_dates'), (snapshot) => {
      const dates = snapshot.docs.map(doc => doc.id);
      setBlockedDates(dates);
    });
  }, []);

  const { INDIAN_MENU, SRI_LANKAN_MENU, LIVE_COUNTER_PACKAGE, BANQUET_PACKAGES, VENUE_HALL_CHARGES, TABLE_SERVICE, KIDS_PRICING, STANDARD_SETUP, TERMS_AND_CONDITIONS, DRY_HIRE_PRICES } = menus;

  const [bookingForm, setBookingForm] = useState<Record<string, any>>({
    name: '', email: '', phone: '', eventType: '', date: '', timeOfDay: '', guests: '', message: '', selectedPackage: '',
  });

  const isOutdoorCateringSelected = (form: Record<string, any>) => {
    return Object.values(form).some((val) => {
      if (typeof val === 'string') {
        const lower = val.toLowerCase().trim();
        return (
          lower.includes('outdoor') ||
          lower.includes('out door') ||
          lower.includes('categroing') ||
          lower.includes('catering')
        );
      }
      return false;
    });
  };

  const isOutdoorActive = isOutdoorCateringSelected(bookingForm);
  const activeSlotConfig: SlotCapacityConfig = formConfig.slotCapacity || DEFAULT_SLOT_CAPACITY;
  const maxSlotCapacity = isOutdoorActive 
    ? (activeSlotConfig.maxOutdoorCateringPerSlot || 4) 
    : (activeSlotConfig.maxHallBookingsPerSlot || 1);

  const dynamicTimeSlots = isOutdoorActive
    ? (activeSlotConfig.outdoorCateringTimeSlots && activeSlotConfig.outdoorCateringTimeSlots.length > 0 
        ? activeSlotConfig.outdoorCateringTimeSlots 
        : DEFAULT_OUTDOOR_TIME_SLOTS)
    : (formConfig.fields.find(f => f.id === 'timeOfDay')?.options && (formConfig.fields.find(f => f.id === 'timeOfDay')?.options?.length || 0) > 0
        ? formConfig.fields.find(f => f.id === 'timeOfDay')!.options!
        : (activeSlotConfig.standardTimeSlots || DEFAULT_TIME_SLOTS));

  const getSlotOccupancy = (slotName: string) => {
    if (!bookingForm.date) return { count: 0, full: false, remaining: maxSlotCapacity };
    const count = existingBookings.filter((b) => {
      if (b.date !== bookingForm.date) return false;
      if (b.status === 'cancelled' || b.status === 'rejected') return false;
      const bSlot = b.timeOfDay || b.time || '';
      if (bSlot !== slotName) return false;
      const bIsOutdoor = isOutdoorCateringSelected(b.customFields ? { ...b, ...b.customFields } : b);
      return isOutdoorActive ? bIsOutdoor : !bIsOutdoor;
    }).length;
    const full = count >= maxSlotCapacity;
    const remaining = Math.max(0, maxSlotCapacity - count);
    return { count, full, remaining };
  };

  const handleLocationSelected = (address: string, coords?: { lat: number; lng: number; postcode?: string }) => {
    setBookingForm(prev => ({ ...prev, location: address }));
    if (coords && coords.lat && coords.lng && deliveryConfig.venueLat && deliveryConfig.venueLng) {
      setCustomerLocationCoords(coords);
      const dist = calculateDistanceMiles(
        deliveryConfig.venueLat,
        deliveryConfig.venueLng,
        coords.lat,
        coords.lng
      );
      const res = calculateDeliveryCharge(dist, deliveryConfig);
      setDeliveryResult(res);
    } else {
      if (coords && coords.lat && coords.lng) {
        setCustomerLocationCoords(coords);
      } else if (!address) {
        setCustomerLocationCoords(null);
      }
      setDeliveryResult(null);
    }
  };

  const handleEnquireNow = (packageName: string) => {
    setBookingForm(prev => ({ ...prev, selectedPackage: packageName }));
    const el = document.getElementById('book');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [submitted, setSubmitted] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>('full-menu');
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'V' | 'OJ' | 'M' | 'N'>('all');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customHomeAlert, setCustomHomeAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [phoneError, setPhoneError] = useState('');

  // UK phone validation: 07xxxxxxxxx (11 digits) or +447xxxxxxxxx
  const validateUKPhone = (digits: string) => {
    const cleaned = digits.replace(/\s/g, '');
    return /^(07\d{9}|7\d{9})$/.test(cleaned) || cleaned === '';
  };

  const handlePhoneChange = (digits: string) => {
    const sanitized = digits.replace(/[^\d\s]/g, '');
    setBookingForm(prev => ({ ...prev, phone: sanitized }));
    if (sanitized && !validateUKPhone(sanitized)) {
      setPhoneError('Enter a valid UK number (e.g. 07700 900000)');
    } else {
      setPhoneError('');
    }
  };

  const [submittedBookingId, setSubmittedBookingId] = useState<string>('');
  const [submittedIsWaitlist, setSubmittedIsWaitlist] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<{ date: string; timeOfDay: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingForm.phone && !validateUKPhone(bookingForm.phone)) {
      setPhoneError('Enter a valid UK number (e.g. 07700 900000)');
      return;
    }

    if (bookingForm.location && /^\d{6}$/.test(bookingForm.location.trim())) {
      setCustomHomeAlert({
        message: "The entered venue location appears to be an Indian pincode. Sri Lalitha provides catering services across London & the UK. Please enter a valid UK postcode or venue address.",
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    setCustomHomeAlert(null);

    if (bookingForm.date && blockedDates.includes(bookingForm.date)) {
      setCustomHomeAlert({
        message: "This date is unfortunately fully booked or unavailable. Please choose another date.",
        type: 'error'
      });
      setIsSubmitting(false);
      return;
    }

    let isWaitlist = false;
    if (bookingForm.date && bookingForm.timeOfDay) {
      const { full } = getSlotOccupancy(bookingForm.timeOfDay);
      if (full) {
        isWaitlist = true;
      }
    }

    try {
      const fullPhone = bookingForm.phone ? `+44${String(bookingForm.phone).replace(/^0/, '').replace(/\s/g, '')}` : '';
      const guestCount = Number(bookingForm.guests) || 0;
      const selectedPkg = BANQUET_PACKAGES.find(p => p.name === bookingForm.selectedPackage);
      const selectedExtra = LIVE_COUNTER_PACKAGE?.extras?.find(e => e.name === bookingForm.selectedPackage);
      
      let baseAmount = 0;
      const pkgLower = (bookingForm.selectedPackage || '').toLowerCase();

      if (pkgLower.includes('live dosa')) {
        const isOption2 = pkgLower.includes('option 2');
        const liveCalc = calculateLiveDosaPrice(
          bookingForm.date,
          guestCount,
          0,
          isOption2 ? 'live-dosa-2' : 'live-dosa-1',
          isOption2 ? menus.LIVE_DOSA_OPTION_2?.pricing : menus.LIVE_DOSA_OPTION_1?.pricing
        );
        baseAmount = liveCalc.finalSubtotal;
      } else if (pkgLower.includes('thali') || pkgLower.includes('meals') || pkgLower.includes('bhojanam') || pkgLower.includes('option 3')) {
        baseAmount = (menus.MADRAS_THALI_OPTION_3?.pricePerPerson || 10.99) * guestCount;
      } else if (pkgLower.includes('tailor') || pkgLower.includes('option 4')) {
        baseAmount = 15.00 * guestCount;
      } else if (pkgLower.includes('festival') || pkgLower.includes('option 5')) {
        baseAmount = (menus.DOSA_FESTIVAL_OPTION_5?.pricePerPerson || 14.99) * guestCount;
      } else if (pkgLower.includes('canape') || pkgLower.includes('option 6')) {
        baseAmount = (menus.CANAPE_OPTION_6?.pricePerPerson || 8.99) * guestCount;
      } else if (pkgLower.includes('north indian') || pkgLower.includes('option 7')) {
        baseAmount = (menus.NORTH_INDIAN_OPTION_7?.pricePerPerson || 12.00) * Math.max(25, guestCount);
      } else if (pkgLower.includes('gujarati') || pkgLower.includes('option 8')) {
        baseAmount = (menus.GUJARATI_OPTION_8?.pricePerPerson || 14.99) * guestCount;
      } else if (pkgLower.includes('punjabi') || pkgLower.includes('option 9')) {
        baseAmount = (menus.PUNJABI_OPTION_9?.pricePerPerson || 13.99) * guestCount;
      } else if (selectedPkg) {
        baseAmount = selectedPkg.pricePerPerson * guestCount;
      } else if (pkgLower.includes('buffet') && pkgLower.includes('weekday')) {
        baseAmount = 11.99 * guestCount;
      } else if (pkgLower.includes('buffet') && (pkgLower.includes('weekend') || pkgLower.includes('holiday'))) {
        baseAmount = 13.99 * guestCount;
      } else if (pkgLower.includes('gazebo')) {
        baseAmount = 70.00;
      } else if (pkgLower.includes('waiter')) {
        baseAmount = 70.00;
      } else if (pkgLower.includes('crockery')) {
        baseAmount = 3.00 * guestCount;
      } else if (pkgLower.includes('extra hour')) {
        baseAmount = 100.00;
      } else if (pkgLower.includes('paan counter')) {
        baseAmount = 350.00;
      } else if (pkgLower.includes('music setup')) {
        baseAmount = 350.00;
      } else if (pkgLower.includes('dance floor')) {
        baseAmount = 250.00;
      } else if (pkgLower.includes('4k led screen')) {
        baseAmount = 750.00;
      } else if (pkgLower.includes('360 camera')) {
        baseAmount = 300.00;
      } else if (pkgLower.includes('candy floss')) {
        baseAmount = 100.00;
      } else if (pkgLower.includes('venue hall')) {
        if (pkgLower.includes('monday to thursday')) baseAmount = 100.00;
        else if (pkgLower.includes('saturday dinner')) baseAmount = 500.00;
        else baseAmount = 250.00;
      } else if (selectedExtra) {
        baseAmount = selectedExtra.price;
      }

      const deliveryFee = deliveryResult ? deliveryResult.charge : 0;
      const totalAmount = baseAmount + deliveryFee;

      const depositPercent = pricingDetails.depositPercentage || 30;
      const depositAmount = Math.round((baseAmount * depositPercent) / 100);

      // Collect custom fields
      const standardKeys = ['name', 'email', 'phone', 'eventType', 'location', 'date', 'timeOfDay', 'guests', 'message', 'selectedPackage'];
      const customFields: Record<string, any> = {};
      Object.entries(bookingForm).forEach(([k, v]) => {
        if (!standardKeys.includes(k) && v !== undefined && v !== '') {
          customFields[k] = v;
        }
      });

      const docRef = await addDoc(collection(db, 'booking_requests'), {
        name: (bookingForm.name || '').trim(),
        email: (bookingForm.email || '').trim().toLowerCase(),
        phone: fullPhone,
        eventType: bookingForm.eventType || 'Other',
        location: bookingForm.location || '',
        customerCoords: customerLocationCoords || null,
        distanceMiles: deliveryResult ? deliveryResult.distanceMiles : 0,
        deliveryCharge: deliveryFee,
        deliveryBreakdown: deliveryResult ? deliveryResult.breakdownText : '',
        totalEstimatedAmount: totalAmount,
        date: bookingForm.date || '',
        timeOfDay: bookingForm.timeOfDay || '',
        guests: guestCount,
        message: bookingForm.message || '',
        package: bookingForm.selectedPackage || 'Not Selected',
        baseAmount,
        deposit: depositAmount,
        depositPercentage: depositPercent,
        extraCharges: deliveryFee > 0 ? [{ description: `Travel & Delivery Fee (${deliveryResult?.distanceMiles} miles)`, amount: deliveryFee }] : [],
        customFields,
        ...customFields,
        isWaitlist,
        capacityStatus: isWaitlist ? 'exceeded_capacity' : 'normal',
        waitlistNote: isWaitlist ? 'Submitted for high-demand / full-capacity slot - Customer requesting schedule adjustment' : '',
        status: 'new_enquiry',
        createdAt: new Date().toISOString(),
      });

      setSubmittedBookingId(docRef.id);
      setSubmittedIsWaitlist(isWaitlist);
      setSubmittedDetails({
        date: bookingForm.date || '',
        timeOfDay: bookingForm.timeOfDay || '',
      });
      setSubmitted(true);
      setPhoneError('');
      // Reset form
      const resetObj: Record<string, any> = {
        name: '', email: '', phone: '', eventType: '', location: '', date: '', timeOfDay: '', guests: '', message: '', selectedPackage: '',
      };
      formConfig.fields.forEach(f => {
        resetObj[f.id] = '';
      });
      setBookingForm(resetObj);
      setCustomerLocationCoords(null);
      setDeliveryResult(null);
    } catch (error: any) {
      console.error("Error adding booking document: ", error);
      setCustomHomeAlert({
        message: error?.message || "There was an error submitting your request. Please check Firestore rules or try again.",
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField, isCompact: boolean = false) => {
    if (!field.enabled) return null;

    // Responsive column span in a 12-column grid
    let colSpanClass = 'col-span-12';
    if (field.width === 'half') {
      colSpanClass = 'col-span-12 sm:col-span-6';
    } else if (field.width === 'third') {
      colSpanClass = 'col-span-12 sm:col-span-4';
    }

    const inputBaseClass = `w-full border border-gray-300 rounded-xl ${
      isCompact ? 'px-3 py-2.5 text-sm' : 'px-4 py-3 text-sm'
    } focus:outline-none focus:ring-2 focus:border-yellow-500 bg-white transition-all`;

    return (
      <div key={field.id} className={colSpanClass}>
        <label className={`block ${isCompact ? 'text-xs' : 'text-sm'} font-medium text-gray-700 mb-1 flex items-center gap-1.5`}>
          {field.id === 'phone' && (
            <svg viewBox="0 0 24 24" fill="#25D366" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.428a.75.75 0 0 0 .921.921l5.684-1.47A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.694 9.694 0 0 1-4.946-1.356l-.355-.211-3.676.95.974-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
            </svg>
          )}
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>

        {field.type === 'location' && (
          <div>
            <GoogleLocationInput
              value={bookingForm[field.id] || ''}
              placeholder={field.placeholder || 'Enter venue address or UK postcode (e.g. EC1A 1BB)'}
              required={field.required}
              onChange={(address, coords) => handleLocationSelected(address, coords)}
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
                } else {
                  setDeliveryResult(null);
                }
              }}
            />

            {/* Dynamic Distance & Delivery Pricing Badge */}
            {deliveryResult && bookingForm[field.id] && (
              <div className={`mt-2 p-3 rounded-xl border text-xs leading-relaxed transition-all animate-in fade-in duration-200 ${
                deliveryResult.isFree
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : deliveryResult.isOutOfRange
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center justify-between font-bold text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <Icon name="MapPinIcon" size={14} className={deliveryResult.isFree ? 'text-emerald-600' : 'text-[#C8860A]'} />
                    <span>Distance: {deliveryResult.distanceMiles} miles from Restaurant</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                    deliveryResult.isFree
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {deliveryResult.isFree ? 'FREE Delivery' : `+£${deliveryResult.charge.toFixed(2)} Delivery Fee`}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {deliveryResult.breakdownText}
                  {deliveryResult.isOutOfRange && (
                    <span className="block text-rose-700 font-semibold mt-0.5">
                      ⚠️ Note: Event is over {deliveryConfig.maxDeliveryRadiusMiles} miles. Custom long-distance arrangements will be confirmed with you.
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {field.type === 'text' && (
          <input
            type="text"
            required={field.required}
            value={bookingForm[field.id] || ''}
            onChange={(e) => setBookingForm({ ...bookingForm, [field.id]: e.target.value })}
            className={inputBaseClass}
            placeholder={field.placeholder || ''}
          />
        )}

        {field.type === 'email' && (
          <input
            type="email"
            required={field.required}
            value={bookingForm[field.id] || ''}
            onChange={(e) => setBookingForm({ ...bookingForm, [field.id]: e.target.value })}
            className={inputBaseClass}
            placeholder={field.placeholder || 'your@email.com'}
          />
        )}

        {field.type === 'tel' && (
          <div>
            <div className={`flex items-center rounded-xl overflow-hidden border ${phoneError ? 'border-red-400' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-yellow-400 focus-within:border-yellow-500 bg-white`}>
              <span className={`${isCompact ? 'px-3 py-2.5 text-xs sm:text-sm' : 'px-3.5 py-3 text-sm'} bg-gray-50 font-semibold text-gray-600 border-r border-gray-300 select-none whitespace-nowrap`}>
                +44
              </span>
              <input
                type="tel"
                value={bookingForm[field.id] || ''}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`flex-1 ${isCompact ? 'px-3 py-2.5 text-sm' : 'px-4 py-3 text-sm'} focus:outline-none bg-white`}
                placeholder={field.placeholder || '07700 900000'}
                maxLength={12}
              />
            </div>
            {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
          </div>
        )}

        {field.type === 'number' && (
          <input
            type="number"
            required={field.required}
            min={field.min ?? 1}
            max={field.max ?? 500}
            value={bookingForm[field.id] || ''}
            onChange={(e) => setBookingForm({ ...bookingForm, [field.id]: e.target.value })}
            className={inputBaseClass}
            placeholder={field.placeholder || 'e.g. 100'}
          />
        )}

        {field.type === 'date' && (
          <div>
            <input
              type="date"
              required={field.required}
              min={new Date().toISOString().split('T')[0]}
              value={bookingForm[field.id] || ''}
              onChange={(e) => setBookingForm({ ...bookingForm, [field.id]: e.target.value })}
              className={`${inputBaseClass} ${
                bookingForm[field.id] && blockedDates.includes(bookingForm[field.id])
                  ? 'border-red-500 ring-2 ring-red-100 bg-red-50/10'
                  : ''
              }`}
            />
            {bookingForm[field.id] && blockedDates.includes(bookingForm[field.id]) && (
              <span className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                <Icon name="ExclamationTriangleIcon" size={12} className="text-red-500 flex-shrink-0" />
                Unavailable / Fully Booked
              </span>
            )}
          </div>
        )}

        {field.type === 'select' && (
          <select
            required={field.required}
            value={bookingForm[field.id] || ''}
            onChange={(e) => setBookingForm({ ...bookingForm, [field.id]: e.target.value })}
            className={inputBaseClass}
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {(field.options && field.options.length > 0 ? field.options : DEFAULT_EVENT_TYPES).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {field.type === 'time_select' && (
          <div>
            <select
              required={field.required}
              value={bookingForm[field.id] || ''}
              onChange={(e) => setBookingForm({ ...bookingForm, [field.id]: e.target.value })}
              className={`${inputBaseClass} ${isOutdoorActive ? 'border-amber-400 bg-amber-50/10' : ''}`}
            >
              <option value="">{field.placeholder || 'Select time'}</option>
              {dynamicTimeSlots.map((slot) => {
                const { count, full, remaining } = getSlotOccupancy(slot);
                return (
                  <option key={slot} value={slot} className={full ? 'text-amber-800 bg-amber-50/60 font-semibold' : ''}>
                    {slot}
                    {bookingForm.date
                      ? full
                        ? ` — (High Demand / Full Capacity - Special Request)`
                        : isOutdoorActive
                        ? ` — (${remaining} of ${maxSlotCapacity} slots left)`
                        : count > 0
                        ? ` — (Booked - Special Request)`
                        : ` — (Available)`
                      : isOutdoorActive
                      ? ` (Up to ${maxSlotCapacity} bookings / slot)`
                      : ''}
                  </option>
                );
              })}
            </select>

            {/* High Demand Warning Banner when selected slot is full */}
            {bookingForm.date && bookingForm.timeOfDay && getSlotOccupancy(bookingForm.timeOfDay).full && (
              <div className="flex items-start gap-2.5 text-xs text-amber-950 mt-2 bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 p-3 rounded-xl border border-amber-300 shadow-2xs animate-in fade-in duration-200">
                <span className="text-base flex-shrink-0">✨</span>
                <div>
                  <span className="font-bold block text-amber-950">High Demand Slot — We'll Strive to Accommodate You!</span>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    This time slot has reached standard booking capacity for this date. You can still submit your request! Our senior event coordinators will review our schedule and contact you within 24 hours to do our very best to adjust timings and accommodate your event.
                  </p>
                </div>
              </div>
            )}

            {isOutdoorActive && !(bookingForm.date && bookingForm.timeOfDay && getSlotOccupancy(bookingForm.timeOfDay).full) && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 mt-1.5 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                <Icon name="ClockIcon" size={13} className="text-amber-600 flex-shrink-0" />
                <span>Outdoor Catering: {dynamicTimeSlots.length} dynamic time slots ({maxSlotCapacity} bookings per slot capacity)</span>
              </div>
            )}
          </div>
        )}

        {field.type === 'package_select' && (
          <select
            value={bookingForm.selectedPackage || ''}
            onChange={(e) => setBookingForm({ ...bookingForm, selectedPackage: e.target.value })}
            className={inputBaseClass}
            style={
              bookingForm.selectedPackage
                ? { borderColor: '#C8860A', boxShadow: '0 0 0 1px rgba(200,134,10,0.3)' }
                : {}
            }
          >
            <option value="">{field.placeholder || 'No specific package – help me choose'}</option>
            
            <optgroup label="── 🎪 Live Dosa Stations ──">
              <option value="Live Dosa Option 1 (Weekday: Mon-Fri)">Live Dosa Option 1 (Weekday: Mon-Fri) — £11.00/person (Min 35 guests / £385 min)</option>
              <option value="Live Dosa Option 1 (Weekend & Holidays)">Live Dosa Option 1 (Weekend &amp; Holidays) — £12.00/person (Min 40 guests / £480 min)</option>
              <option value="Live Dosa Option 2 (Weekday: Mon-Fri)">Live Dosa Option 2 (Weekday: Mon-Fri) — £16.50/person (Min 35 guests / £577.50 min)</option>
              <option value="Live Dosa Option 2 (Weekend & Holidays)">Live Dosa Option 2 (Weekend &amp; Holidays) — £17.50/person (Min 40 guests / £700 min)</option>
            </optgroup>

            <optgroup label="── 🍲 Traditional Meals &amp; Thali ──">
              <option value="Madras Thali (Option 3) — £10.99/pp">Madras Thali / South Indian Meals / Andhra Bhojanam — £10.99/person</option>
            </optgroup>

            <optgroup label="── 🎨 Bespoke &amp; Festival Experiences ──">
              <option value="Tailor Your Own Menu (Option 4)">Tailor Your Own Menu (Option 4) — 4 Live Stations (50% Deposit)</option>
              <option value="Dosa Festival At Your Home (Option 5)">Dosa Festival At Your Home (Option 5) — 34+ Varieties (£14.99/person)</option>
            </optgroup>

            <optgroup label="── 🍢 Cocktail &amp; Regional Feasts ──">
              <option value="Canapé Service (Option 6)">Canapé Service (Option 6) — Passed Finger Foods (From £8.99/pp)</option>
              <option value="North Indian Standard Menu (Option 7)">North Indian Standard Menu (Option 7) — £12.00/person (Min 25)</option>
              <option value="Gujarati Menu (Option 8)">Gujarati Menu (Option 8) — 40+ Mithai &amp; Farsan (£14.99/person)</option>
              <option value="Punjabi Menu (Option 9)">Punjabi Menu (Option 9) — Royal Feast (£13.99/person)</option>
            </optgroup>

            <optgroup label="── ✨ Premium Upgrades ──">
              <option value="Gazebo Setup — £70">Gazebo Setup — £70.00</option>
              <option value="Waiter for Serving — £70">Waiter for Serving — £70.00</option>
              <option value="Crockery (Plates/Bowls/Spoons) — £3/person">Crockery (Plates/Bowls/Spoons) — £3.00/person</option>
              <option value="Extra Hour for Serving/Cooking — £100/hr">Extra Hour for Serving/Cooking — £100.00/hr</option>
            </optgroup>
          </select>
        )}

        {field.type === 'textarea' && (
          <textarea
            rows={isCompact ? 2 : 3}
            required={field.required}
            value={bookingForm[field.id] || ''}
            onChange={(e) => setBookingForm({ ...bookingForm, [field.id]: e.target.value })}
            className={`${inputBaseClass} resize-none`}
            placeholder={field.placeholder || 'Special requests, preferred menu, dietary needs...'}
          />
        )}

        {field.helperText && (
          <p className="text-[11px] text-gray-400 mt-1">{field.helperText}</p>
        )}
      </div>
    );
  };

  const toggleSection = (key: string) => {
    setExpandedSection(prev => prev === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header onOpenModal={() => {}} />

      {/* Hero — Modern Luxury Live Catering Showcase with Image Background */}
      <section className="pt-16 sm:pt-20 pb-6 sm:pb-8 px-4 sm:px-6 relative overflow-hidden bg-neutral-900 text-white">
        {/* Cinematic Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/images/hero_live_catering_bg.jpg')" }}
        />
        {/* Light & Transparent Overlay to keep the image clearly visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-between gap-6 lg:gap-10 py-2 sm:py-4 relative z-10">

          {/* ── Left: Original Text Content & Trust Badges ── */}
          <div className="flex-1 text-center lg:text-left pt-2 lg:pt-4">
            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-white leading-tight mb-4 tracking-tight drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
              Make Your Event<br />
              <span style={{ color: '#FF334B' }} className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Unforgettable</span>
            </h1>
            <p className="text-base md:text-lg mb-6 max-w-xl lg:mx-0 mx-auto text-white leading-relaxed font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              Authentic Pure Vegetarian Indian cuisine. Seamless outdoor catering for all occasions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <a href="#menus" className="text-white font-semibold px-7 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl bg-maroon-primary hover:bg-maroon-dark text-sm sm:text-base cursor-pointer">
                View Menus &amp; Packages
              </a>
              <a href="#book" className="bg-black/40 backdrop-blur-md border border-white/60 font-semibold px-7 py-3 rounded-xl transition-all text-white hover:bg-white/20 text-sm sm:text-base shadow-md">
                Book Now
              </a>
            </div>

            {/* Key Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto lg:mx-0 pt-4 border-t border-white/30 text-left">
              <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md p-2.5 rounded-xl border border-white/20 shadow-md">
                <span className="text-lg">⭐</span>
                <div>
                  <div className="text-xs font-bold text-white">4.9★ Rated</div>
                  <div className="text-[11px] text-gray-200">500+ Happy Events</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md p-2.5 rounded-xl border border-white/20 shadow-md">
                <span className="text-lg">🍲</span>
                <div>
                  <div className="text-xs font-bold text-white">Authentic Taste</div>
                  <div className="text-[11px] text-gray-200">Pure Indian Vegetarian</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md p-2.5 rounded-xl border border-white/20 shadow-md">
                <span className="text-lg">🏛️</span>
                <div>
                  <div className="text-xs font-bold text-white">500 Capacity</div>
                  <div className="text-[11px] text-gray-200">Hall &amp; Outdoor</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Booking form card (Ultra-Premium Glass Finish) ── */}
          <div id="book" className="w-full lg:w-[490px] flex-shrink-0">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-5 sm:p-6 border border-white/80 ring-1 ring-black/10 text-gray-900">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-1">
                {formConfig.formTitle || 'Request a Booking'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 text-center mb-4">
                {formConfig.formSubtitle || "Fill in your details and we'll get back to you within 24 hours"}
              </p>

              {submitted ? (
                submittedIsWaitlist ? (
                  <div className="text-center py-7 px-4 sm:px-6 rounded-2xl border border-amber-300 shadow-md bg-gradient-to-b from-amber-50/90 to-amber-100/40 animate-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 bg-amber-100 border border-amber-300 shadow-inner">
                      <Icon name="SparklesIcon" size={26} className="text-[#C8860A]" />
                    </div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-200 text-amber-900 mb-2">
                      Priority Review Request Received
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Thank You for Your Request!</h3>
                    <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                      We have received your enquiry for <strong className="text-amber-950 font-semibold">{submittedDetails?.date}</strong> during <strong className="text-amber-950 font-semibold">{submittedDetails?.timeOfDay}</strong>.
                    </p>
                    <div className="bg-white/95 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 mb-4 text-left leading-relaxed shadow-2xs">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-950">
                        <Icon name="InformationCircleIcon" size={14} className="text-[#C8860A] flex-shrink-0" />
                        Custom Scheduling &amp; Accommodation
                      </div>
                      This time slot is currently at standard capacity, but our senior event coordinators will personally review our schedule and contact you directly within 24 hours to do our very best to adjust timings and accommodate your event.
                    </div>
                    {submittedBookingId && (
                      <div className="bg-white border border-amber-200 rounded-xl p-2.5 inline-block max-w-full text-left mb-3 shadow-2xs">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Booking Reference</span>
                        <span className="text-xs font-mono font-bold text-gray-800 break-all">{submittedBookingId}</span>
                      </div>
                    )}
                    <div>
                      <button
                        onClick={() => { setSubmitted(false); setSubmittedBookingId(''); setSubmittedIsWaitlist(false); }}
                        className="text-xs font-semibold hover:underline block mx-auto py-1"
                        style={{ color: '#C8860A' }}
                      >
                        Submit another enquiry
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 rounded-2xl border animate-in zoom-in-95 duration-200" style={{ background: 'rgba(200,134,10,0.04)', borderColor: 'rgba(200,134,10,0.2)' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(200,134,10,0.1)' }}>
                      <Icon name="CheckCircleIcon" size={28} style={{ color: '#C8860A' }} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Request Received!</h3>
                    <p className="text-gray-500 text-sm mb-3">We'll contact you within 24 hours to confirm your booking.</p>
                    {submittedBookingId && (
                      <div className="bg-white border border-amber-200 rounded-xl p-3 inline-block max-w-full text-left mb-3">
                        <span className="text-xs text-gray-400 block uppercase font-semibold">Booking Reference</span>
                        <span className="text-sm font-mono font-bold text-gray-800 break-all">{submittedBookingId}</span>
                      </div>
                    )}
                    <div>
                      <button onClick={() => { setSubmitted(false); setSubmittedBookingId(''); setSubmittedIsWaitlist(false); }} className="text-sm font-medium hover:underline block mx-auto" style={{ color: '#C8860A' }}>
                        Submit another request
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div>
                  {/* Option to Customize Menu & Pay Online */}
                  <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border border-amber-300 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base flex-shrink-0">🍽️</span>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Choose Menu Dishes &amp; Pay Online</span>
                        <span className="text-[10px] text-gray-500">Pick dishes &amp; pay deposit online via Stripe</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMenuOrderModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs hover:shadow-md transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                    >
                      <span>Build Menu</span>
                      <span>→</span>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {customHomeAlert && (
                      <div className={`p-3 rounded-xl text-xs font-medium border ${customHomeAlert.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {customHomeAlert.message}
                      </div>
                    )}
                    <div className="grid grid-cols-12 gap-3">
                      {formConfig.fields
                        .filter((f) => f.enabled)
                        .sort((a, b) => a.order - b.order)
                        .map((field) => renderField(field, true))}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                          Submitting...
                        </span>
                      ) : (
                        <>
                          <Icon name="CalendarDaysIcon" size={16} />
                          {formConfig.submitButtonText || 'Submit Booking Request'}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Quick Stats Ribbon */}
      <div className="py-7 px-4 sm:px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #A86208 0%, #C8860A 50%, #E69D24 100%)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {[
            { value: '500+', label: 'Events Catered', icon: '🎪' },
            { value: '34+', label: 'Dosa Varieties', icon: '🥞' },
            { value: '16+ Yrs', label: 'Culinary Heritage', icon: '👑' },
            { value: '4.9★', label: 'Customer Rating', icon: '⭐' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">{stat.value}</div>
              <div className="text-xs text-amber-100/90 font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MENUS & PACKAGES SECTION ─── */}
      <section id="menus" className="py-16 px-4 md:px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3" style={{ background: 'rgba(200,134,10,0.1)', color: '#C8860A' }}>
              Authentic Culinary Experience
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Our Menus &amp; Specials</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
              Explore our freshly prepared vegetarian delicacies and live dosa stations.
            </p>
          </div>

          {/* Top Main Navigation Tabs */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {([
              { id: 'full-menu', label: '📋 Full Menu', count: `${MENU_CATEGORIES.reduce((acc, c) => acc + c.items.length, 0)}+` },
              { id: 'live-dosa-1', label: '🎪 Live Dosa 1', count: '£11/pp' },
              { id: 'live-dosa-2', label: '👑 Live Dosa 2', count: '£16.50/pp' },
              { id: 'madras-thali', label: '🍲 Option 3: Thali', count: '£10.99/pp' },
              { id: 'tailor-menu', label: '🎨 Option 4: Tailor', count: '4 Stations' },
              { id: 'dosa-festival', label: '🥞 Option 5: Festival', count: '34+ Dosas' },
              { id: 'canape', label: '🍢 Option 6: Canapés', count: 'From £8.99' },
              { id: 'north-indian', label: '🍛 Option 7: North Indian', count: '£12.00/pp' },
              { id: 'gujarati', label: '🪔 Option 8: Gujarati', count: '£14.99/pp' },
              { id: 'punjabi', label: '👑 Option 9: Punjabi', count: '£13.99/pp' },
            ] as { id: MenuTab; label: string; count: string }[]).map((tab) => {
              const isActive = activeMenuTab === tab.id || (activeMenuTab === 'live-dosa' && tab.id === 'live-dosa-1');
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMenuTab(tab.id)}
                  className={`px-3 sm:px-3.5 py-2 rounded-2xl text-xs sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-white shadow-md scale-[1.02]'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-amber-400 hover:bg-amber-50/40 shadow-xs'
                  }`}
                  style={isActive ? { background: 'linear-gradient(135deg, #C8860A, #F0A830)' } : {}}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TAB 1: COMPLETE RESTAURANT MENU (WITH 9 EXACT CATEGORY BUTTONS)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'full-menu' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Search & Dietary Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Icon name="MagnifyingGlassIcon" size={16} />
                  </span>
                  <input
                    type="text"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    placeholder="Search dishes (e.g. Dosa, Paneer, Mogo, Chaat)..."
                    className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                  />
                  {menuSearchQuery && (
                    <button
                      onClick={() => setMenuSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dietary Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-start md:justify-end">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">Filter:</span>
                  {[
                    { id: 'all', label: 'All Items' },
                    { id: 'V', label: '🌿 Vegan' },
                    { id: 'OJ', label: '🪷 Jain / No Onion' },
                    { id: 'M', label: '🥛 Dairy' },
                    { id: 'N', label: '🥜 Contains Nuts' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setDietaryFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        dietaryFilter === f.id
                          ? 'bg-gray-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Menu Grid: Left Category Sidebar + Right Dish List */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── Left Category Buttons Column (Matching User Screenshot Layout & Colors) ── */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-2.5 bg-white p-3.5 sm:p-4 rounded-3xl border border-gray-200 shadow-sm sticky top-20 z-10">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 pb-1 border-b border-gray-100 flex items-center justify-between">
                    <span>Categories</span>
                    <span className="text-[10px] text-[#C8860A] font-bold">{MENU_CATEGORIES.length} Menus</span>
                  </div>

                  <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
                    {MENU_CATEGORIES.map((cat, idx) => {
                      const isSelected = selectedCategoryIndex === idx && !menuSearchQuery;
                      
                      // Exact button background colors matching the user screenshot
                      let buttonBg = '#C8860A'; // Default warm caramel / terracotta
                      if (cat.id === 'super-starters') buttonBg = '#3D2614'; // Dark chocolate brown
                      if (cat.id === 'chat-corners') buttonBg = '#4CAF50'; // Green

                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategoryIndex(idx);
                            setMenuSearchQuery('');
                          }}
                          className={`w-full text-center px-4 py-3.5 rounded-xl font-bold text-white text-xs sm:text-sm tracking-wide transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-between group flex-shrink-0 lg:flex-shrink ${
                            isSelected
                              ? 'ring-3 ring-amber-400 ring-offset-2 scale-[1.02] shadow-md font-extrabold'
                              : 'opacity-95 hover:opacity-100 hover:scale-[1.01]'
                          }`}
                          style={{
                            background: buttonBg,
                          }}
                        >
                          <span className="truncate flex-1 text-center font-bold text-sm">
                            {cat.title}
                          </span>
                          <span className="text-[10px] bg-black/20 text-white/90 px-2 py-0.5 rounded-full ml-2 font-mono flex-shrink-0">
                            {cat.items.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Shortcut to Live Dosa */}
                  <div className="pt-2 border-t border-gray-100 space-y-1.5 hidden lg:block">
                    <button
                      onClick={() => setActiveMenuTab('live-dosa')}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100/70 transition-colors flex items-center justify-between border border-amber-200 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🎪</span>
                        <span>Live Dosa Option 1</span>
                      </span>
                      <span className="text-[10px] font-semibold text-[#C8860A]">View 12 Live →</span>
                    </button>
                  </div>
                </div>

                {/* ── Right Content: Selected Category or Search Results ── */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                  {(() => {
                    const currentCategory = MENU_CATEGORIES[selectedCategoryIndex];

                    // If user is searching, filter across all categories; otherwise filter within active category
                    let itemsToDisplay: { item: MenuItem; categoryTitle: string }[] = [];

                    if (menuSearchQuery.trim()) {
                      const q = menuSearchQuery.toLowerCase().trim();
                      MENU_CATEGORIES.forEach((cat) => {
                        cat.items.forEach((item) => {
                          if (
                            item.name.toLowerCase().includes(q) ||
                            item.description.toLowerCase().includes(q)
                          ) {
                            itemsToDisplay.push({ item, categoryTitle: cat.title });
                          }
                        });
                      });
                    } else {
                      itemsToDisplay = currentCategory.items.map((item) => ({
                        item,
                        categoryTitle: currentCategory.title,
                      }));
                    }

                    // Apply Dietary Filter
                    if (dietaryFilter !== 'all') {
                      itemsToDisplay = itemsToDisplay.filter(({ item }) => {
                        if (!item.tags || item.tags.length === 0) return false;
                        if (dietaryFilter === 'V') return item.tags.includes('V');
                        if (dietaryFilter === 'M') return item.tags.includes('M');
                        if (dietaryFilter === 'N') return item.tags.includes('N');
                        if (dietaryFilter === 'OJ') return item.tags.some(t => ['OJ', 'O', 'J'].includes(t));
                        return true;
                      });
                    }

                    return (
                      <>
                        {/* Category Banner */}
                        <div
                          className="p-5 sm:p-6 rounded-3xl text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          style={{
                            background: menuSearchQuery
                              ? 'linear-gradient(135deg, #1F2937, #374151)'
                              : selectedCategoryIndex === 0
                              ? 'linear-gradient(135deg, #3D2614, #5C381E)'
                              : selectedCategoryIndex === 1
                              ? 'linear-gradient(135deg, #2E7D32, #4CAF50)'
                              : 'linear-gradient(135deg, #A06A05, #C8860A)',
                          }}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{menuSearchQuery ? '🔍' : currentCategory.icon}</span>
                              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                                {menuSearchQuery ? `Search Results for "${menuSearchQuery}"` : currentCategory.title}
                              </h3>
                            </div>
                            <p className="text-xs sm:text-sm text-white/80 max-w-xl">
                              {menuSearchQuery
                                ? `Found ${itemsToDisplay.length} matching dishes across our entire menu.`
                                : currentCategory.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold text-white whitespace-nowrap">
                              {itemsToDisplay.length} Dishes Shown
                            </span>
                          </div>
                        </div>

                        {/* Dietary Tag Legend */}
                        <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 text-[11px] text-gray-500 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                          <span className="font-bold text-gray-700">Dietary Guide:</span>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> <strong>V</strong> = Vegan</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> <strong>M</strong> = Milk / Dairy</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> <strong>N</strong> = Nuts</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> <strong>O</strong> = Onion-Free</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> <strong>J</strong> = Jain</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> <strong>S</strong> = Signature</span>
                          </div>
                        </div>

                        {/* Dishes Grid */}
                        {itemsToDisplay.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <span className="text-4xl block mb-2">🍽️</span>
                            <h4 className="text-base font-bold text-gray-900 mb-1">No dishes found</h4>
                            <p className="text-xs text-gray-500 mb-4">Try clearing your search query or adjusting the dietary filter.</p>
                            <button
                              onClick={() => { setMenuSearchQuery(''); setDietaryFilter('all'); }}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
                              style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                            >
                              Reset Filters
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                            {itemsToDisplay.map(({ item, categoryTitle }, idx) => (
                              <div
                                key={`${item.name}-${idx}`}
                                className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs hover:shadow-md transition-all hover:border-amber-300 flex flex-col justify-between group"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <h4 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-[#9B1B30] transition-colors">
                                      {item.name}
                                    </h4>
                                    
                                    {/* Dietary Badges */}
                                    {item.tags && item.tags.length > 0 && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {item.tags.map((tag) => {
                                          let bg = 'bg-gray-100 text-gray-700';
                                          if (tag === 'V') bg = 'bg-emerald-100 text-emerald-800';
                                          if (tag === 'M') bg = 'bg-blue-100 text-blue-800';
                                          if (tag === 'N') bg = 'bg-amber-100 text-amber-800';
                                          if (tag === 'O' || tag === 'OJ') bg = 'bg-purple-100 text-purple-800';
                                          if (tag === 'J') bg = 'bg-indigo-100 text-indigo-800';
                                          if (tag === 'S') bg = 'bg-rose-100 text-rose-800';
                                          return (
                                            <span
                                              key={tag}
                                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${bg}`}
                                              title={`Dietary: ${tag}`}
                                            >
                                              {tag}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  <p className="text-xs text-gray-600 leading-relaxed mb-3">
                                    {item.description}
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                                  <span className="text-gray-400 font-medium">
                                    {categoryTitle}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBookingForm((prev) => ({
                                        ...prev,
                                        message: prev.message
                                          ? `${prev.message}\nInterested dish: ${item.name}`
                                          : `Interested dish: ${item.name}`,
                                      }));
                                      const el = document.getElementById('book');
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="text-amber-700 hover:text-amber-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Enquire Dish</span>
                                    <span>→</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2: LIVE DOSA OPTION 1 (THEATRICAL ON-THE-SPOT COOKING - 2 HOURS)
              ══════════════════════════════════════════════════════════════ */}
          {(activeMenuTab === 'live-dosa-1' || activeMenuTab === 'live-dosa') && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Theatrical Hero Banner */}
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #2E1B0E 0%, #4A2E18 50%, #C8860A 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  🥞
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      🔥 2 Hours Live Station
                    </span>
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      12 Live Dishes
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {LIVE_DOSA_OPTION_1.title}
                  </h3>
                  <p className="text-amber-200 font-medium text-sm sm:text-base mb-3">
                    {LIVE_DOSA_OPTION_1.tagline}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
                    Our master chefs prepare fresh, crispy, golden dosas, live meduvada, and fluffy uthappams live in front of your guests for 2 continuous hours.
                  </p>

                  {/* Pricing Tiers Highlight */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                    <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3.5 rounded-2xl text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-amber-300">📅 Week days (Mon – Fri)</span>
                        <span className="text-sm font-extrabold text-white">£11.00 <span className="text-[10px] font-normal text-gray-300">/ person</span></span>
                      </div>
                      <p className="text-[11px] text-gray-300 mb-1">35 people minimum guarantee</p>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 border border-amber-400/30">
                        Min. call out: £385
                      </span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3.5 rounded-2xl text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-amber-300">🌟 Week Ends &amp; Bank Holidays</span>
                        <span className="text-sm font-extrabold text-white">£12.00 <span className="text-[10px] font-normal text-gray-300">/ person</span></span>
                      </div>
                      <p className="text-[11px] text-gray-300 mb-1">40 people minimum guarantee</p>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 border border-amber-400/30">
                        Min. call out: £480
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-200/90 italic mb-5">
                    ℹ️ Minimum call out charge (£385 on Weekdays / £480 on Weekends) can be reached by the number of people or by the menu &amp; upgrades.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Live Dosa Option 1');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3 rounded-xl font-bold text-gray-900 bg-amber-400 hover:bg-amber-300 transition-all text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Book Live Dosa Option 1</span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => setActiveMenuTab('live-dosa-2')}
                      className="px-5 py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-xs sm:text-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>👑 View Option 2 (3 Hours + Main + Dessert) →</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 12 Live Dosa Items Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">12 Live Dishes Included (Option 1)</h4>
                    <p className="text-xs text-gray-500">Every item is prepared live to order with authentic chutneys and piping hot sambar</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    2 Hours Live Service
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LIVE_DOSA_OPTION_1.items.map((item, idx) => (
                    <div
                      key={item.name}
                      className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 shadow-sm hover:shadow-md transition-all hover:border-amber-400 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-400 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-0.5 rounded-bl-xl shadow-xs">
                        Live Prep
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5 mb-2 pr-14">
                          <span className="w-7 h-7 rounded-full bg-amber-100 text-[#C8860A] flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                          <h5 className="font-bold text-gray-900 text-base">{item.name}</h5>
                        </div>

                        <p className="text-sm font-medium text-gray-600 mb-3 leading-snug">
                          {item.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {item.tags?.map((t) => (
                            <span key={t} className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-[#C8860A]">
                          Hot &amp; Crisp Live
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── DYNAMIC UPGRADES SECTION ─── */}
              <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-3xl border-2 border-amber-200/80 p-6 sm:p-8 shadow-sm">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 mb-2">
                    ✨ Bespoke Event Enhancements
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Upgrades</h4>
                  <p className="text-sm text-gray-600">
                    Elevate your event with luxury gazebo setup, dedicated waitstaff, crockery, extra cooking hours, and additional dishes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(menus.MENU_UPGRADES?.items || MENU_UPGRADES.items).map((upgrade) => (
                    <div
                      key={upgrade.id}
                      className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs hover:shadow-md transition-all hover:border-amber-400 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            {upgrade.icon}
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-100/70 text-amber-900 border border-amber-200">
                            {upgrade.priceLabel}
                          </span>
                        </div>
                        <h5 className="font-bold text-gray-900 text-base mb-1.5">{upgrade.name}</h5>
                        <p className="text-sm text-gray-600 leading-relaxed mb-4">
                          {upgrade.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPackageForModal('Live Dosa Option 1');
                          setIsMenuOrderModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-50 group-hover:bg-[#C8860A] text-[#C8860A] group-hover:text-white border border-amber-200 group-hover:border-[#C8860A] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>Add to Booking</span>
                        <span>+</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3: LIVE DOSA OPTION 2 (3 HOURS SERVICE + 1 MAIN + 1 DESSERT)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'live-dosa-2' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Option 2 Premium Hero Banner */}
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #3B1C32 0%, #5E2648 50%, #C8860A 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  👑
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-purple-400/20 text-purple-200 border border-purple-400/30">
                      👑 Premium Live Dosa Package
                    </span>
                    <span className="inline-block text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                      ⏱️ 3 Hours Service Duration
                    </span>
                    <span className="inline-block text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                      + 1 Main Course + 1 Dessert
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {LIVE_DOSA_OPTION_2.title}
                  </h3>
                  <p className="text-amber-200 font-semibold text-base sm:text-lg mb-3">
                    {LIVE_DOSA_OPTION_2.tagline}
                  </p>
                  <p className="text-sm sm:text-base text-gray-200 leading-relaxed mb-4">
                    The ultimate live dining spectacle. Includes the full standard 12 live dishes (Idly Or Veg Biryani, Live Meduvada, Dosas, Uthappams, Chutneys and Sambar) plus <strong>One Main Course Dish</strong> and <strong>One Dessert</strong> with our master chefs staying for <strong>Three (3) Hours</strong> instead of Two Hours.
                  </p>

                  {/* Option 2 Pricing Tiers Highlight */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                    <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-4 rounded-2xl text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-amber-300">📅 Week days (Mon – Fri)</span>
                        <span className="text-base font-extrabold text-white">£16.50 <span className="text-xs font-normal text-gray-300">/ person</span></span>
                      </div>
                      <p className="text-xs text-gray-300 mb-1.5">35 people minimum guarantee</p>
                      <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 border border-amber-400/30">
                        Min. call out: £577.50
                      </span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-4 rounded-2xl text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-amber-300">🌟 Week Ends &amp; Bank Holidays</span>
                        <span className="text-base font-extrabold text-white">£17.50 <span className="text-xs font-normal text-gray-300">/ person</span></span>
                      </div>
                      <p className="text-xs text-gray-300 mb-1.5">40 people minimum guarantee</p>
                      <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-200 border border-amber-400/30">
                        Min. call out: £700.00
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-amber-200/90 italic mb-5">
                    ℹ️ Minimum call out charge (£577.50 on Weekdays / £700 on Weekends) can be reached by the number of people or by the menu &amp; upgrades.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Live Dosa Option 2');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3.5 rounded-xl font-bold text-gray-900 bg-amber-400 hover:bg-amber-300 transition-all text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Book Live Dosa Option 2</span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => setActiveMenuTab('live-dosa-1')}
                      className="px-5 py-3.5 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>← Switch to Option 1 (£11 / £12)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Option 2 Inclusions Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-3xl border-2 border-amber-200 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-2 text-[#C8860A] font-bold text-base">
                    <span className="text-2xl">🥞</span>
                    <span>12 Live Dishes Included</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">
                    Idly Or Veg Biryani, Live Meduvada, 5 Live Dosa Varieties, 5 Live Uthappam Varieties, Chutneys &amp; Sambar.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-purple-200 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-base">
                    <span className="text-2xl">🍛</span>
                    <span>1 Main Course Dish</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">
                    Your choice of 1 authentic rich vegetarian curry / main course dish from our comprehensive restaurant menu.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-purple-200 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-2 text-purple-700 font-bold text-base">
                    <span className="text-2xl">🍮</span>
                    <span>1 Dessert &amp; 3 Hours Service</span>
                  </div>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">
                    1 mouth-watering traditional sweet plus full chef cooking and serving station for 3 continuous hours.
                  </p>
                </div>
              </div>

              {/* 12 Live Dosa Items Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900">Standard 12 Live Dishes (Option 2)</h4>
                    <p className="text-sm text-gray-500">Includes Idly Or Veg Biryani and on-the-spot live dosas and uthappams</p>
                  </div>
                  <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                    3 Hours Extended Cooking
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {LIVE_DOSA_OPTION_2.items.map((item, idx) => (
                    <div
                      key={item.name}
                      className="bg-white rounded-2xl border-2 border-purple-200/80 p-5 shadow-sm hover:shadow-md transition-all hover:border-purple-400 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-purple-400 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-bl-xl shadow-xs">
                        {item.isLive ? 'Live Prep' : 'Included Course'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5 mb-2 pr-14">
                          <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </span>
                          <h5 className="font-bold text-gray-900 text-base">{item.name}</h5>
                        </div>

                        <p className="text-sm font-medium text-gray-600 mb-3 leading-snug">
                          {item.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {item.tags?.map((t) => (
                            <span key={t} className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200">
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-purple-700">
                          {item.isLive ? 'Hot & Crisp Live' : 'Special Inclusions'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── DYNAMIC UPGRADES SECTION FOR OPTION 2 ─── */}
              <div className="bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 rounded-3xl border-2 border-purple-200/80 p-6 sm:p-8 shadow-sm">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 mb-2">
                    ✨ Bespoke Event Enhancements
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Upgrades</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Combine your Live Dosa Option 2 booking with Gazebo, extra waitstaff, crockery, or extra cooking time.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(menus.MENU_UPGRADES?.items || MENU_UPGRADES.items).map((upgrade) => (
                    <div
                      key={upgrade.id}
                      className="bg-white rounded-2xl border border-purple-200/80 p-5 shadow-xs hover:shadow-md transition-all hover:border-purple-400 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            {upgrade.icon}
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-purple-100/70 text-purple-900 border border-purple-200">
                            {upgrade.priceLabel}
                          </span>
                        </div>
                        <h5 className="font-bold text-gray-900 text-sm mb-1.5">{upgrade.name}</h5>
                        <p className="text-xs text-gray-600 leading-relaxed mb-4">
                          {upgrade.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPackageForModal('Live Dosa Option 2');
                          setIsMenuOrderModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-purple-50 group-hover:bg-[#C8860A] text-purple-900 group-hover:text-white border border-purple-200 group-hover:border-[#C8860A] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>Add to Option 2 Booking</span>
                        <span>+</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 4: MADRAS THALI / SOUTH INDIAN MEALS / ANDHRA BHOJANAM (OPTION 3)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'madras-thali' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Thali Hero Banner */}
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #451A03 0%, #78350F 50%, #C8860A 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  🍲
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      🍲 Option 3 Full Meals
                    </span>
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      12 Core Items Included
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {MADRAS_THALI_OPTION_3.title}
                  </h3>
                  <p className="text-amber-200 font-medium text-sm sm:text-base mb-3">
                    {MADRAS_THALI_OPTION_3.tagline}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-5">
                    An authentic South Indian royal feast. Includes Plain Rice, Sambar, Rasam, Koottu, Poriyal, Kaarakolambu, Sweet, Pappad, Yoghurt, Pickle, Veg Kurma, and 1 Poori, with full flexibility to customize your favourite vegetable styles and add extra dishes.
                  </p>

                  {/* Price Banner Card */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <span className="text-xs text-amber-300 font-bold block uppercase tracking-wide">Per Person Rate</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-white">£10.99</span>
                        <span className="text-xs text-gray-300">/ per person</span>
                      </div>
                    </div>
                    <p className="text-xs text-amber-100 max-w-xs leading-snug">
                      *Price dynamically updates when additions or extra event upgrades are selected.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Madras Thali (Option 3)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3 rounded-xl font-bold text-gray-900 bg-amber-400 hover:bg-amber-300 transition-all text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Book Madras Thali (£10.99/pp)</span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Madras Thali (Option 3)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-5 py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-xs sm:text-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>✨ Choose Custom Variants &amp; Upgrades</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 12 Core Included Dishes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">12 Core Traditional Items Included</h4>
                    <p className="text-xs text-gray-500">Every plate comes standard with all 12 authentic South Indian elements</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    Standard Inclusions
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {MADRAS_THALI_OPTION_3.coreDishes.map((dish, idx) => (
                    <div
                      key={dish.name}
                      className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 shadow-xs hover:shadow-sm transition-all flex items-start gap-3"
                    >
                      <span className="w-7 h-7 rounded-full bg-amber-100 text-[#C8860A] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm sm:text-base">{dish.name}</h5>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5 leading-snug">{dish.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6 Custom Flavour Options Showcase */}
              <div className="bg-white rounded-3xl border-2 border-amber-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 mb-1 inline-block">
                      Bespoke Flavour Varieties
                    </span>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900">Customizable Dish Options</h4>
                    <p className="text-sm text-gray-500">Choose your favorite vegetable styles and preparations when booking</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Included in £10.99
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Sambar Options */}
                  <div className="p-5 rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 space-y-3">
                    <span className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                      <span className="text-lg">🥣</span>
                      <span>Sambar Options:</span>
                    </span>
                    <ul className="text-sm font-medium text-gray-800 space-y-1.5">
                      {MADRAS_THALI_OPTION_3.variantOptions.sambarOptions.map(opt => (
                        <li key={opt} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Rasam Options */}
                  <div className="p-5 rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 space-y-3">
                    <span className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                      <span className="text-lg">🌶️</span>
                      <span>Rasam Options:</span>
                    </span>
                    <ul className="text-sm font-medium text-gray-800 space-y-1.5">
                      {MADRAS_THALI_OPTION_3.variantOptions.rasamOptions.map(opt => (
                        <li key={opt} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Koottu Options */}
                  <div className="p-5 rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 space-y-3">
                    <span className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                      <span className="text-lg">🥗</span>
                      <span>Koottu Options:</span>
                    </span>
                    <ul className="text-sm font-medium text-gray-800 space-y-1.5">
                      {MADRAS_THALI_OPTION_3.variantOptions.koottuOptions.map(opt => (
                        <li key={opt} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Poriyal Options */}
                  <div className="p-5 rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 space-y-3">
                    <span className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                      <span className="text-lg">🥥</span>
                      <span>Poriyal Options:</span>
                    </span>
                    <ul className="text-sm font-medium text-gray-800 space-y-1.5">
                      {MADRAS_THALI_OPTION_3.variantOptions.poriyalOptions.map(opt => (
                        <li key={opt} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Kaarakolambu Options */}
                  <div className="p-5 rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 space-y-3">
                    <span className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                      <span className="text-lg">🍛</span>
                      <span>Kaarakolambu Options:</span>
                    </span>
                    <ul className="text-sm font-medium text-gray-800 space-y-1.5">
                      {MADRAS_THALI_OPTION_3.variantOptions.kaarakolambuOptions.map(opt => (
                        <li key={opt} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Sweet Options */}
                  <div className="p-5 rounded-2xl border-2 border-amber-200/80 bg-amber-50/40 space-y-3">
                    <span className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                      <span className="text-lg">🍮</span>
                      <span>Sweet Options:</span>
                    </span>
                    <ul className="text-sm font-medium text-gray-800 space-y-1.5">
                      {MADRAS_THALI_OPTION_3.variantOptions.sweetOptions.map(opt => (
                        <li key={opt} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Additions List Showcase */}
              <div className="bg-white rounded-3xl border-2 border-amber-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900">Additions &amp; Extra Courses</h4>
                    <p className="text-sm text-gray-500">Upgrade your Madras Thali with extra rice varieties, Indo-Chinese noodles, sweets, or specialty curries</p>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                    From £2.50 / dish
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {MADRAS_THALI_OPTION_3.additions.map((addition) => (
                    <div
                      key={addition.name}
                      className="p-3.5 rounded-2xl border-2 border-amber-200/60 bg-amber-50/30 flex items-center justify-between gap-3 hover:border-amber-400 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-900 truncate">{addition.name}</span>
                      <span className="text-xs font-bold text-[#C8860A] whitespace-nowrap bg-white px-2 py-1 rounded-lg border border-amber-200">
                        +£{addition.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Upgrades for Madras Thali */}
              <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-3xl border-2 border-amber-200/80 p-6 sm:p-8 shadow-sm">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 mb-2">
                    ✨ Bespoke Event Enhancements
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Upgrades</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Elevate your Thali feast with luxury Gazebo setup, dedicated waitstaff, crockery, or extra serving time.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(menus.MENU_UPGRADES?.items || MENU_UPGRADES.items).map((upgrade) => (
                    <div
                      key={upgrade.id}
                      className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs hover:shadow-md transition-all hover:border-amber-400 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            {upgrade.icon}
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-100/70 text-amber-900 border border-amber-200">
                            {upgrade.priceLabel}
                          </span>
                        </div>
                        <h5 className="font-bold text-gray-900 text-sm mb-1.5">{upgrade.name}</h5>
                        <p className="text-xs text-gray-600 leading-relaxed mb-4">
                          {upgrade.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPackageForModal('Madras Thali (Option 3)');
                          setIsMenuOrderModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-50 group-hover:bg-[#C8860A] text-[#C8860A] group-hover:text-white border border-amber-200 group-hover:border-[#C8860A] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>Add to Thali Booking</span>
                        <span>+</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: TAILOR YOUR OWN MENU (OPTION 4)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'tailor-menu' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Option 4 Hero Banner */}
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #451A03 0%, #78350F 50%, #B45309 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  🎨
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      🎨 Option 4 Bespoke Catering
                    </span>
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-300/20 text-amber-200 border border-amber-300/30">
                      4 Live Stations Included
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {TAILOR_MENU_OPTION_4.title}
                  </h3>
                  <p className="text-amber-200 font-medium text-sm sm:text-base mb-3">
                    {TAILOR_MENU_OPTION_4.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-5">
                    Create your dream personalized event menu with theatrical Live Jilebi, Live Sweet Paan, Live Dosa, and Live Vada stations. We provide full commercial cooking gear, Bain Marie food warmers, and high-quality 9-inch compartment plates.
                  </p>

                  {/* Pricing & Deposit Banner Card */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <span className="text-xs text-amber-300 font-bold block uppercase tracking-wide">Pricing Policy</span>
                      <div className="text-xl sm:text-2xl font-black text-white">
                        {TAILOR_MENU_OPTION_4.priceLabel}
                      </div>
                    </div>
                    <div className="bg-amber-400/20 border border-amber-300/40 px-3.5 py-2 rounded-xl text-xs text-amber-100 max-w-xs leading-snug">
                      <strong>50% Deposit:</strong> Paid online at booking. Balance paid by cash after event completion.
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Tailor Your Own Menu (Option 4)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3 rounded-xl font-bold text-gray-900 bg-amber-400 hover:bg-amber-300 transition-all text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Tailor Your Menu Online</span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Tailor Your Own Menu (Option 4)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-5 py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-xs sm:text-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>✨ Choose Live Stations &amp; Upgrades</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Signature Live Stations Showcase */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">4 Signature Live Stations</h4>
                    <p className="text-xs text-gray-500">Live on-the-spot theatrical cooking stations for your event</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    4 Live Counters
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {TAILOR_MENU_OPTION_4.liveStationsFeatured.map((stn) => (
                    <div
                      key={stn.name}
                      className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mb-3">
                          {stn.icon}
                        </div>
                        <h5 className="font-bold text-gray-900 text-sm mb-1.5">{stn.name}</h5>
                        <p className="text-xs text-gray-600 leading-relaxed">{stn.description}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-[#C8860A]">
                        <span>✓ Live Chef Cooking</span>
                        <span>Included</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logistics Grid: What We Bring & What We Need From You */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* What We Bring */}
                <div className="bg-emerald-50/70 border-2 border-emerald-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🚚</span>
                    <div>
                      <h4 className="font-bold text-emerald-950 text-base sm:text-lg">WHAT WE BRING ?</h4>
                      <p className="text-xs text-emerald-800">Complete professional catering equipment provided</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700">
                    {TAILOR_MENU_OPTION_4.whatWeBring.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold text-base leading-none">✓</span>
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What We Need From You */}
                <div className="bg-amber-50/70 border-2 border-amber-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔌</span>
                    <div>
                      <h4 className="font-bold text-amber-950 text-base sm:text-lg">WHAT WE NEED FROM YOU ?</h4>
                      <p className="text-xs text-amber-800">Venue requirements for smooth event setup</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-gray-700">
                    {TAILOR_MENU_OPTION_4.whatWeNeedFromYou.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#C8860A] font-bold text-base leading-none">•</span>
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Dynamic Upgrades for Option 4 */}
              <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-3xl border-2 border-amber-200/80 p-6 sm:p-8 shadow-sm">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 mb-2">
                    ✨ Bespoke Event Enhancements
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Upgrades</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Enhance your tailored package with luxury Gazebo marquee, extra waiters, ceramic crockery, or extra cooking time.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(menus.MENU_UPGRADES?.items || MENU_UPGRADES.items).map((upgrade) => (
                    <div
                      key={upgrade.id}
                      className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs hover:shadow-md transition-all hover:border-amber-400 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            {upgrade.icon}
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-amber-100/70 text-amber-900 border border-amber-200">
                            {upgrade.priceLabel}
                          </span>
                        </div>
                        <h5 className="font-bold text-gray-900 text-sm mb-1.5">{upgrade.name}</h5>
                        <p className="text-xs text-gray-600 leading-relaxed mb-4">
                          {upgrade.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPackageForModal('Tailor Your Own Menu (Option 4)');
                          setIsMenuOrderModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-50 group-hover:bg-[#C8860A] text-[#C8860A] group-hover:text-white border border-amber-200 group-hover:border-[#C8860A] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>Add to Tailor Booking</span>
                        <span>+</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: DOSA FESTIVAL AT YOUR HOME (OPTION 5)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'dosa-festival' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Option 5 Hero Banner */}
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #7C2D12 0%, #C2410C 50%, #EA580C 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  🥞
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-orange-300/20 text-orange-200 border border-orange-300/30">
                      🥞 Option 5 London Dosa Festival
                    </span>
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-300/20 text-amber-200 border border-amber-300/30">
                      🏆 16 Years Quality &amp; Trust
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {DOSA_FESTIVAL_OPTION_5.title}
                  </h3>
                  <p className="text-orange-200 font-semibold text-sm sm:text-base mb-3 leading-snug">
                    {DOSA_FESTIVAL_OPTION_5.tagline}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-100 leading-relaxed mb-5">
                    Experience London's ultimate Dosa celebration at your home. Over 34 signature artisan Dosa varieties fried golden and crispy on hot live tawas, served alongside fresh chutneys and boiling hot sambar.
                  </p>

                  {/* Price Banner Card */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <span className="text-xs text-orange-200 font-bold block uppercase tracking-wide">Festival Package Rate</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-white">£14.99</span>
                        <span className="text-xs text-gray-200">/ per person</span>
                      </div>
                    </div>
                    <p className="text-xs text-orange-100 max-w-xs leading-snug">
                      Includes continuous live tawa cooking with Coconut, Tomato-Onion, and Mint chutneys + Sambar.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Dosa Festival At Your Home (Option 5)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3 rounded-xl font-bold text-gray-950 bg-orange-300 hover:bg-orange-200 transition-all text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Book Dosa Festival (£14.99/pp)</span>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Dosa Festival At Your Home (Option 5)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-5 py-3 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-xs sm:text-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>✨ View 34+ Varieties &amp; Upgrades</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 34+ Signature Dosa Varieties Grid */}
              <div className="bg-white rounded-3xl border-2 border-orange-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-orange-100 text-orange-900 mb-1 inline-block">
                      Artisan Varieties
                    </span>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900">
                      34+ Signature Festival Dosa Varieties
                    </h4>
                    <p className="text-xs text-gray-500">
                      From traditional ferments to creative gourmet fillings, made live on hot tawas
                    </p>
                  </div>
                  <span className="text-xs font-bold text-orange-900 bg-orange-100 px-3 py-1 rounded-full border border-orange-200">
                    34 Varieties
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {DOSA_FESTIVAL_OPTION_5.dosaVarieties.map((dosa, idx) => (
                    <div
                      key={dosa}
                      className="p-3 rounded-xl border border-orange-200/80 bg-orange-50/40 hover:bg-orange-50 hover:border-orange-400 transition-all flex items-center gap-2 group"
                    >
                      <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-900 font-bold text-[10px] flex items-center justify-center flex-shrink-0 group-hover:bg-[#C8860A] group-hover:text-white transition-colors">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-900 truncate">{dosa}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Upgrades for Option 5 */}
              <div className="bg-gradient-to-br from-orange-50/80 via-white to-orange-50/40 rounded-3xl border-2 border-orange-200/80 p-6 sm:p-8 shadow-sm">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-orange-100 text-orange-900 border border-orange-300 mb-2">
                    ✨ Bespoke Event Enhancements
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Upgrades</h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Elevate your Dosa Festival with our all-weather Gazebo marquee, extra chefs, tableware, or extended hours.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(menus.MENU_UPGRADES?.items || MENU_UPGRADES.items).map((upgrade) => (
                    <div
                      key={upgrade.id}
                      className="bg-white rounded-2xl border border-orange-200/80 p-5 shadow-xs hover:shadow-md transition-all hover:border-orange-400 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            {upgrade.icon}
                          </div>
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-orange-100/70 text-orange-900 border border-orange-200">
                            {upgrade.priceLabel}
                          </span>
                        </div>
                        <h5 className="font-bold text-gray-900 text-sm mb-1.5">{upgrade.name}</h5>
                        <p className="text-xs text-gray-600 leading-relaxed mb-4">
                          {upgrade.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPackageForModal('Dosa Festival At Your Home (Option 5)');
                          setIsMenuOrderModalOpen(true);
                        }}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-orange-50 group-hover:bg-[#C8860A] text-orange-900 group-hover:text-white border border-orange-200 group-hover:border-[#C8860A] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <span>Add to Festival Booking</span>
                        <span>+</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: CANAPÉ SERVICE (OPTION 6)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'canape' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #4C0519 0%, #881337 50%, #BE123C 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  🍢
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-rose-400/20 text-rose-200 border border-rose-400/30">
                      🍢 Option 6 Cocktail Catering
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {CANAPE_OPTION_6.title}
                  </h3>
                  <p className="text-rose-200 font-semibold text-sm sm:text-base mb-3 leading-snug">
                    {CANAPE_OPTION_6.tagline}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-5">
                    {CANAPE_OPTION_6.description}
                  </p>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <span className="text-xs text-rose-200 font-bold block uppercase tracking-wide">Starting Price</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-white">£8.99</span>
                        <span className="text-xs text-gray-200">/ per person</span>
                      </div>
                    </div>
                    <p className="text-xs text-rose-100 max-w-xs leading-snug">
                      Passed canapés &amp; interactive cocktail table setups for weddings, receptions, and birthday bashes.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Canapé Service (Option 6)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3 rounded-xl font-bold text-gray-950 bg-rose-200 hover:bg-rose-100 transition-all text-xs sm:text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Book Canapé Service</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Canapé Suggestions Grid */}
              <div className="bg-white rounded-3xl border-2 border-rose-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <span>🍢</span>
                      <span>Popular Canapé Suggestions</span>
                    </h4>
                    <p className="text-sm text-gray-500">Live passed hors d&apos;oeuvres and interactive cocktail table stations</p>
                  </div>
                  <span className="text-xs font-bold text-rose-900 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
                    {CANAPE_OPTION_6.suggestedItems.length} Suggestions
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {CANAPE_OPTION_6.suggestedItems.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border-2 border-rose-200/70 bg-rose-50/40 font-semibold text-sm text-rose-950 flex items-center gap-2.5 hover:border-rose-400 hover:bg-rose-50/80 transition-all">
                      <span className="w-6 h-6 rounded-full bg-rose-200 text-rose-900 font-bold text-xs flex items-center justify-center flex-shrink-0">✓</span>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: NORTH INDIAN STANDARD MENU (OPTION 7)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'north-indian' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  🍛
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-indigo-400/20 text-indigo-200 border border-indigo-400/30">
                      🍛 Option 7 North Indian Standard Menu
                    </span>
                    <span className="inline-block text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                      Min 25 People
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {NORTH_INDIAN_OPTION_7.title}
                  </h3>
                  <p className="text-indigo-200 font-semibold text-base sm:text-lg mb-3 leading-snug">
                    {NORTH_INDIAN_OPTION_7.subtitle}
                  </p>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <span className="text-xs sm:text-sm text-indigo-200 font-bold block uppercase tracking-wide">Fixed Package Price</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-white">£12.00</span>
                        <span className="text-sm text-gray-200">/ per person</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-indigo-100 max-w-sm leading-relaxed">
                      Includes 1 Tava Roti or Nan, 2 North Indian/Punjabi Subjies, Dal, Veg Biryani/Pulao, Salad, Pappad and Pickle.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('North Indian Standard Menu (Option 7)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3.5 rounded-xl font-bold text-gray-950 bg-indigo-200 hover:bg-indigo-100 transition-all text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Book North Indian Menu (£12/pp)</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Inclusions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border-2 border-indigo-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                  <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-lg inline-block">1. Breads</span>
                  <div className="text-lg font-bold text-gray-900">One Tava Roti or Nan</div>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">Tava Roti, Plain Naan, Butter Naan, Garlic Naan</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border-2 border-indigo-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                  <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-lg inline-block">2. Subjies</span>
                  <div className="text-lg font-bold text-gray-900">Two Punjabi Subjies</div>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">Paneer Butter Masala, Palak Paneer, Aloo Gobi, Chana Masala, etc.</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border-2 border-indigo-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                  <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-lg inline-block">3. Dal &amp; Rice</span>
                  <div className="text-lg font-bold text-gray-900">Dal &amp; Veg Biryani / Pulao</div>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">Yellow Tadka Dal or Dal Makhani served with fragrant basmati</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border-2 border-indigo-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
                  <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-lg inline-block">4. Accompaniments</span>
                  <div className="text-lg font-bold text-gray-900">Salad, Pappad &amp; Pickle</div>
                  <p className="text-sm font-medium text-gray-600 leading-relaxed">Crisp poppadoms, fresh garden salad, traditional mango/lime pickle</p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: GUJARATI MENU (OPTION 8)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'gujarati' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #042F2E 0%, #115E59 50%, #0F766E 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  🪔
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-teal-400/20 text-teal-200 border border-teal-400/30">
                      🪔 Option 8 Gujarati Menu
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {GUJARATI_OPTION_8.title}
                  </h3>
                  <p className="text-teal-200 font-semibold text-base sm:text-lg mb-3 leading-snug">
                    {GUJARATI_OPTION_8.subtitle}
                  </p>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <span className="text-xs sm:text-sm text-teal-200 font-bold block uppercase tracking-wide">Package Price</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-white">£14.99</span>
                        <span className="text-sm text-gray-200">/ per person</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-teal-100 max-w-sm leading-relaxed">
                      40+ Mithai, 20+ Farsan, 30+ Shaak including Undhiyu, Bharelu Ringan Bateta, Kadhi, Gujarati Dal &amp; Fresh Rotlis.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Gujarati Menu (Option 8)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3.5 rounded-xl font-bold text-gray-950 bg-teal-200 hover:bg-teal-100 transition-all text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Book Gujarati Menu (£14.99/pp)</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Gujarati Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border-2 border-teal-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                    <h4 className="font-bold text-teal-950 text-lg flex items-center gap-2">
                      <span className="text-xl">🍬</span>
                      <span>Mithai (40+ Sweets)</span>
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                      {GUJARATI_OPTION_8.categories.mithai.length} Items
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-800 font-medium max-h-80 overflow-y-auto pr-1">
                    {GUJARATI_OPTION_8.categories.mithai.map(m => (
                      <li key={m} className="flex items-start gap-2.5 leading-snug">
                        <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0 mt-1.5" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-teal-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                    <h4 className="font-bold text-teal-950 text-lg flex items-center gap-2">
                      <span className="text-xl">🥟</span>
                      <span>Farsan (20+ Savouries)</span>
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                      {GUJARATI_OPTION_8.categories.farsan.length} Items
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-800 font-medium max-h-80 overflow-y-auto pr-1">
                    {GUJARATI_OPTION_8.categories.farsan.map(f => (
                      <li key={f} className="flex items-start gap-2.5 leading-snug">
                        <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0 mt-1.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-6 rounded-3xl border-2 border-teal-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                    <h4 className="font-bold text-teal-950 text-lg flex items-center gap-2">
                      <span className="text-xl">🥘</span>
                      <span>Shaak &amp; Curries (30+)</span>
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                      {GUJARATI_OPTION_8.categories.shaak.length} Items
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-800 font-medium max-h-80 overflow-y-auto pr-1">
                    {GUJARATI_OPTION_8.categories.shaak.map(s => (
                      <li key={s} className="flex items-start gap-2.5 leading-snug">
                        <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0 mt-1.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB: PUNJABI MENU (OPTION 9)
              ══════════════════════════════════════════════════════════════ */}
          {activeMenuTab === 'punjabi' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div
                className="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #451A03 0%, #78350F 50%, #B45309 100%)' }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                  👑
                </div>
                <div className="relative z-10 max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-block text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                      👑 Option 9 Punjabi Feast
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                    {PUNJABI_OPTION_9.title}
                  </h3>
                  <p className="text-amber-200 font-semibold text-base sm:text-lg mb-3 leading-snug">
                    {PUNJABI_OPTION_9.subtitle}
                  </p>

                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <span className="text-xs sm:text-sm text-amber-200 font-bold block uppercase tracking-wide">Package Price</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-white">£13.99</span>
                        <span className="text-sm text-gray-200">/ per person</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-100 max-w-sm leading-relaxed">
                      Paneer Tikka Shashlik, Chaats, Paneer Butter Masala, Amritsari Chole, Dal Makhani, Tandoori Breads &amp; Sweets.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedPackageForModal('Punjabi Menu (Option 9)');
                        setIsMenuOrderModalOpen(true);
                      }}
                      className="px-6 py-3.5 rounded-xl font-bold text-gray-950 bg-amber-300 hover:bg-amber-200 transition-all text-sm shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Book Punjabi Feast (£13.99/pp)</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Punjabi Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Starters & Chaats Card */}
                <div className="bg-white p-6 rounded-3xl border-2 border-amber-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                    <h4 className="font-bold text-amber-950 text-lg flex items-center gap-2">
                      <span className="text-xl">🍢</span>
                      <span>Starters &amp; Chaats</span>
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {PUNJABI_OPTION_9.categories.starters.length} Varieties
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-800 font-medium">
                    {PUNJABI_OPTION_9.categories.starters.map(s => (
                      <li key={s} className="flex items-start gap-2.5 leading-snug">
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Royal Subjies Card */}
                <div className="bg-white p-6 rounded-3xl border-2 border-amber-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                    <h4 className="font-bold text-amber-950 text-lg flex items-center gap-2">
                      <span className="text-xl">🥘</span>
                      <span>Royal Subjies</span>
                    </h4>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {PUNJABI_OPTION_9.categories.subjies.length} Specialties
                    </span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-800 font-medium">
                    {PUNJABI_OPTION_9.categories.subjies.map(s => (
                      <li key={s} className="flex items-start gap-2.5 leading-snug">
                        <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Breads, Dal & Desserts Card */}
                <div className="bg-white p-6 rounded-3xl border-2 border-amber-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                  <div className="border-b border-amber-100 pb-3">
                    <h4 className="font-bold text-amber-950 text-lg flex items-center gap-2">
                      <span className="text-xl">🍞</span>
                      <span>Breads, Dal &amp; Desserts</span>
                    </h4>
                  </div>
                  <div className="space-y-4 text-sm text-gray-800">
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-amber-950">🥣 Dal Specialties</div>
                      <p className="font-semibold text-gray-900 leading-relaxed text-sm">
                        {PUNJABI_OPTION_9.categories.dal.join(', ')}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-amber-950">🍞 Tandoori &amp; Tawa Breads</div>
                      <p className="font-semibold text-gray-900 leading-relaxed text-sm">
                        {PUNJABI_OPTION_9.categories.breads.join(', ')}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-amber-950">🍮 Mithai &amp; Desserts</div>
                      <p className="font-semibold text-gray-900 leading-relaxed text-sm">
                        {PUNJABI_OPTION_9.categories.mithai.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── TERMS & CONDITIONS ─── */}
      <section id="terms" className="py-16 px-4 md:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3" style={{ background: 'rgba(200,134,10,0.1)', color: '#C8860A' }}>
              Legal
            </span>
            <h2 className="text-3xl font-bold text-gray-900">Terms &amp; Conditions</h2>
          </div>

          <div className="space-y-3">
            {[
              { key: 'payments', title: TERMS_AND_CONDITIONS.payments.title, items: TERMS_AND_CONDITIONS.payments.items },
              { key: 'menu', title: TERMS_AND_CONDITIONS.menuGuests.title, items: TERMS_AND_CONDITIONS.menuGuests.items },
              { key: 'client', title: TERMS_AND_CONDITIONS.clientResponsibilities.title, items: TERMS_AND_CONDITIONS.clientResponsibilities.items },
              { key: 'sound', title: TERMS_AND_CONDITIONS.soundLimiter.title, items: TERMS_AND_CONDITIONS.soundLimiter.items },
            ].map((section) => (
              <div key={section.key} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-sm" style={{ color: '#C8860A' }}>{section.title}</span>
                  <Icon name={expandedSection === section.key ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={18} className="text-gray-400 flex-shrink-0" />
                </button>
                {expandedSection === section.key && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <ul className="space-y-2 mt-3">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">NOTE</p>
            {TERMS_AND_CONDITIONS.notes.map((note, i) => (
              <p key={i} className="text-sm text-gray-700 mb-1">{note}</p>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BOOKING FORM ─── */}
      <section id="book" className="py-16 px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {formConfig.formTitle || 'Request a Booking'}
          </h2>
          <p className="text-gray-500 text-center mb-10">
            {formConfig.formSubtitle || "Fill in your details and we'll get back to you within 24 hours"}
          </p>

          {submitted ? (
            submittedIsWaitlist ? (
              <div className="text-center py-10 px-6 rounded-2xl border border-amber-300 shadow-md bg-gradient-to-b from-amber-50/90 to-amber-100/40 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-amber-100 border border-amber-300 shadow-inner">
                  <Icon name="SparklesIcon" size={30} className="text-[#C8860A]" />
                </div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-amber-200 text-amber-900 mb-2.5">
                  Priority Review Request Received
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You for Your Request!</h3>
                <p className="text-sm text-gray-700 mb-4 max-w-md mx-auto leading-relaxed">
                  We have received your enquiry for <strong className="text-amber-950 font-semibold">{submittedDetails?.date}</strong> during <strong className="text-amber-950 font-semibold">{submittedDetails?.timeOfDay}</strong>.
                </p>
                <div className="bg-white/95 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 mb-5 text-left max-w-lg mx-auto leading-relaxed shadow-2xs">
                  <div className="font-bold flex items-center gap-1.5 mb-1.5 text-amber-950 text-sm">
                    <Icon name="InformationCircleIcon" size={16} className="text-[#C8860A] flex-shrink-0" />
                    Custom Scheduling &amp; Accommodation
                  </div>
                  This time slot has currently reached standard booking capacity, but our senior event coordinators will personally review our schedule and contact you directly within 24 hours to explore custom arrangements and do our very best to adjust timings and accommodate your event.
                </div>
                {submittedBookingId && (
                  <div className="bg-white border border-amber-200 rounded-xl p-3 inline-block max-w-full text-left mb-4 shadow-2xs">
                    <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">Booking Reference</span>
                    <span className="text-sm font-mono font-bold text-gray-800 break-all">{submittedBookingId}</span>
                  </div>
                )}
                <div>
                  <button
                    onClick={() => { setSubmitted(false); setSubmittedBookingId(''); setSubmittedIsWaitlist(false); }}
                    className="text-sm font-semibold hover:underline block mx-auto py-1"
                    style={{ color: '#C8860A' }}
                  >
                    Submit another request
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl border animate-in zoom-in-95 duration-200" style={{ background: 'rgba(200,134,10,0.04)', borderColor: 'rgba(200,134,10,0.2)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(200,134,10,0.1)' }}>
                  <Icon name="CheckCircleIcon" size={32} style={{ color: '#C8860A' }} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Received!</h3>
                <p className="text-gray-500">We'll contact you within 24 hours to confirm your booking.</p>
                {submittedBookingId && (
                  <div className="bg-white border border-amber-200 rounded-xl p-3 inline-block max-w-full text-left mt-3 mb-2 shadow-2xs">
                    <span className="text-xs text-gray-400 block uppercase font-semibold">Booking Reference</span>
                    <span className="text-sm font-mono font-bold text-gray-800 break-all">{submittedBookingId}</span>
                  </div>
                )}
                <div className="mt-4">
                  <button onClick={() => { setSubmitted(false); setSubmittedBookingId(''); setSubmittedIsWaitlist(false); }} className="font-medium hover:underline" style={{ color: '#C8860A' }}>
                    Submit another request
                  </button>
                </div>
              </div>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                {formConfig.fields
                  .filter((f) => f.enabled)
                  .sort((a, b) => a.order - b.order)
                  .map((field) => renderField(field, false))}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Submitting...
                  </span>
                ) : (
                  <>
                    <Icon name="CalendarDaysIcon" size={18} />
                    {formConfig.submitButtonText || 'Submit Booking Request'}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Admin Link */}
      <div className="bg-gray-50 border-t border-gray-200 py-4 px-6 text-center">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-yellow-600 transition-colors flex items-center justify-center gap-1.5">
          <Icon name="LockClosedIcon" size={14} />
          Staff / Admin Login
        </Link>
      </div>

      {/* Interactive Menu Customizer & Online Order Modal */}
      <InteractiveMenuOrderModal
        isOpen={isMenuOrderModalOpen}
        onClose={() => setIsMenuOrderModalOpen(false)}
        initialPackage={selectedPackageForModal}
        deliveryConfig={deliveryConfig}
      />

      <Footer />
      {/* ─── CUSTOM ALERT MODAL ─── */}
      {customHomeAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${customHomeAlert.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              <Icon name={customHomeAlert.type === 'success' ? 'CheckIcon' : 'ExclamationTriangleIcon'} size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{customHomeAlert.type === 'success' ? 'Success' : 'Notice'}</h3>
            <p className="text-sm text-gray-500 mb-5">{customHomeAlert.message}</p>
            <button
              onClick={() => setCustomHomeAlert(null)}
              className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}