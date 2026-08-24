'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Icon from '@/components/ui/AppIcon';
import { collection, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
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

type MenuTab = 'indian' | 'srilankan' | 'live' | 'packages';

export default function HomePage() {
  const [isMenuOrderModalOpen, setIsMenuOrderModalOpen] = useState(false);
  const [selectedPackageForModal, setSelectedPackageForModal] = useState<string>('Gold Package');

  const [menus, setMenus] = useState({
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
  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>('packages');
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
      if (selectedPkg) {
        baseAmount = selectedPkg.pricePerPerson * guestCount;
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
            <optgroup label="── Buffet Packages ──">
              {(menus.BANQUET_PACKAGES || BANQUET_PACKAGES).map((pkg) => (
                <option key={pkg.id} value={pkg.name}>
                  {pkg.name} — £{pkg.pricePerPerson}/person
                </option>
              ))}
            </optgroup>
            <optgroup label="── Venue & Hire ──">
              <option value="Venue Hall">Venue Hall</option>
              <option value="Dry Hire">Dry Hire</option>
              <option value="Kids Pricing">Kids Pricing</option>
            </optgroup>
            <optgroup label="── Extras ──">
              {((menus.LIVE_COUNTER_PACKAGE?.extras) || (LIVE_COUNTER_PACKAGE?.extras) || []).map((extra, idx) => (
                <option key={idx} value={extra.name}>
                  {extra.name} — £{extra.price}
                </option>
              ))}
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

      {/* Hero — two-column layout */}
      <section className="pt-24 pb-4 px-6 relative overflow-hidden bg-surface">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, #9B1B30 0%, transparent 40%), radial-gradient(circle at bottom left, #C8860A 0%, transparent 40%)' }}></div>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-12 py-6 lg:py-10 relative z-10">

          {/* ── Left: Text content ── */}
          <div className="flex-1 text-center lg:text-left pt-2 lg:pt-4">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4" style={{ background: 'rgba(155, 27, 48, 0.1)', color: '#9B1B30' }}>
              Banquet &amp; Catering
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-gray-900 leading-tight mb-4 tracking-tight">
              Make Your Event<br />
              <span style={{ color: '#9B1B30' }}>Unforgettable</span>
            </h1>
            <p className="text-base md:text-lg mb-6 max-w-xl lg:mx-0 mx-auto text-gray-600 leading-relaxed">
              Authentic Indian &amp; Sri Lankan cuisine. Elegant banquet hall. Seamless outdoor catering for all occasions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <a href="#menus" className="text-white font-semibold px-7 py-3 rounded-xl transition-all shadow-md hover:shadow-lg bg-maroon-primary hover:bg-maroon-dark text-sm sm:text-base">
                View Menus &amp; Packages
              </a>
              <a href="#book" className="border border-gray-300 font-semibold px-7 py-3 rounded-xl transition-colors text-gray-700 hover:text-maroon-primary hover:border-maroon-primary text-sm sm:text-base">
                Book Now
              </a>
            </div>

            {/* Key Trust Badges to balance vertical space */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto lg:mx-0 pt-4 border-t border-gray-200/70 text-left">
              <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur-xs p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                <span className="text-lg">⭐</span>
                <div>
                  <div className="text-xs font-bold text-gray-900">4.9★ Rated</div>
                  <div className="text-[11px] text-gray-500">500+ Happy Events</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur-xs p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                <span className="text-lg">🍲</span>
                <div>
                  <div className="text-xs font-bold text-gray-900">Authentic Taste</div>
                  <div className="text-[11px] text-gray-500">Indian &amp; Sri Lankan</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur-xs p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                <span className="text-lg">🏛️</span>
                <div>
                  <div className="text-xs font-bold text-gray-900">500 Capacity</div>
                  <div className="text-[11px] text-gray-500">Hall &amp; Outdoor</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Booking form card ── */}
          <div id="book" className="w-full lg:w-[490px] flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-gray-100">
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

      {/* Quick Stats */}
      <div className="py-6 px-6" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { value: '500+', label: 'Events Hosted' },
            { value: '500', label: 'Guest Capacity' },
            { value: '4.9★', label: 'Customer Rating' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/70 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MENUS & PACKAGES SECTION ─── */}
      <section id="menus" className="py-16 px-4 md:px-6" style={{ background: '#FAFAF8' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3" style={{ background: 'rgba(200,134,10,0.1)', color: '#C8860A' }}>
              Our Menus
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Menus &amp; Packages</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Authentic flavours, carefully crafted packages. Choose your menu and let us handle the rest.</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {([
              { id: 'packages', label: '🎁 Banquet Packages' },
              { id: 'indian', label: '🍛 Indian Menu' },
              { id: 'srilankan', label: '🌴 Sri Lankan Menu' },
              { id: 'live', label: '🎪 Live Counter' },
            ] as { id: MenuTab; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMenuTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeMenuTab === tab.id ? 'text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-400'}`}
                style={activeMenuTab === tab.id ? { background: 'linear-gradient(135deg, #C8860A, #F0A830)' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── BANQUET PACKAGES ─── */}
          {activeMenuTab === 'packages' && (
            <div className="space-y-8">
              {/* Standard Setup */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">Standard Setup Includes</h3>
                <p className="text-center text-sm font-semibold mb-4" style={{ color: '#C8860A' }}>(Minimum {STANDARD_SETUP.minimumAdults} Adults Chargeable)</p>
                <div className="flex flex-wrap justify-center gap-3 mb-4">
                  {STANDARD_SETUP.includes.map((item) => (
                    <span key={item} className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-1.5 rounded-full">{item}</span>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-700">
                  {STANDARD_SETUP.hallInfo.map((h) => (
                    <span key={h.type}><strong>{h.type}</strong> ({h.detail})</span>
                  ))}
                </div>
              </div>

              {/* 5 Hour Event label */}
              <div className="text-center">
                <span className="inline-block bg-gray-900 text-white text-xs font-semibold uppercase tracking-widest px-5 py-2 rounded-full">5 Hour Event — Buffet Packages (Excl. VAT)</span>
              </div>

              {/* Package Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {BANQUET_PACKAGES.map((pkg) => (
                  <div key={pkg.id} className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-shadow flex flex-col`}
                    style={{ borderColor: pkg.id === 'gold' ? '#C8860A' : pkg.id === 'srilalitha' ? '#7C3AED' : '#E5E7EB' }}>
                    <div className="p-5 flex-1">
                      {pkg.tag && (
                        <div className="mb-2">
                          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: pkg.id === 'srilalitha' ? '#7C3AED' : 'rgba(200,134,10,0.1)', color: pkg.id === 'srilalitha' ? 'white' : '#C8860A' }}>
                            {pkg.tag}
                          </span>
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-0.5">{pkg.name}</h3>
                      <div className="text-3xl font-bold mb-1" style={{ color: pkg.color }}>£{pkg.pricePerPerson}<span className="text-base font-normal text-gray-500"> /person</span></div>
                      {pkg.guestLabel && <p className="text-xs text-gray-500 mb-3">{pkg.guestLabel}</p>}

                      <div className="space-y-3 mt-4">
                        {'canapes' in pkg && pkg.canapes && (
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Canapés</div>
                            <div className="text-sm text-gray-700">{pkg.canapes.veg} Vegetarian · {pkg.canapes.nonVeg} Non-vegetarian</div>
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Starters</div>
                          <div className="text-sm text-gray-700">{pkg.starters.veg} Vegetarian · {pkg.starters.nonVeg} Non-vegetarian</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Mains</div>
                          <div className="text-sm text-gray-700">{pkg.mains.veg} Vegetarian · {pkg.mains.nonVeg} Non-vegetarian</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Desserts</div>
                          {pkg.desserts.map((d) => <div key={d} className="text-sm text-gray-700">{d}</div>)}
                        </div>
                        {pkg.drinks.length > 0 && (
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Drinks</div>
                            {pkg.drinks.map((d) => <div key={d} className="text-sm text-gray-700">{d}</div>)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="px-5 pb-5 space-y-2">
                      <button
                        onClick={() => {
                          setSelectedPackageForModal(pkg.name);
                          setIsMenuOrderModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' }}
                      >
                        <Icon name="SparklesIcon" size={14} />
                        Select Menu &amp; Order Online
                      </button>
                      <button
                        onClick={() => handleEnquireNow(pkg.name)}
                        className="w-full flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-xl transition-colors border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Send Enquiry
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Venue & Dry Hire Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Venue Hall Charges */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">"Venue" Hall Charges</h3>
                  <div className="overflow-x-auto flex-grow mb-6">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {VENUE_HALL_CHARGES.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 pr-4 font-semibold text-gray-800">{row.day}</td>
                            <td className="py-3 font-bold text-right" style={{ color: '#C8860A' }}>{row.charge}</td>
                            {row.note && <td className="py-3 text-gray-500 italic text-xs text-right pl-2">({row.note})</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => handleEnquireNow('Venue Hall')}
                      className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] mb-4"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' }}
                    >
                      Enquire Now
                    </button>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-amber-800 mb-1">🍷 ALCOHOL</p>
                      <p className="text-sm text-amber-700">{TERMS_AND_CONDITIONS.alcohol}</p>
                    </div>
                  </div>
                </div>

                {/* Dry Hire */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Dry Hire</h3>
                  <div className="overflow-x-auto flex-grow mb-6">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {DRY_HIRE_PRICES?.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 pr-4 font-semibold text-gray-800">{row.day}</td>
                            <td className="py-3 pr-4 text-gray-600 text-right">{row.session}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => handleEnquireNow('Dry Hire')}
                      className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' }}
                    >
                      Enquire Now
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Service & Kids Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Table Service <span className="text-sm font-normal text-gray-500">(Extra Charges Apply)</span></h3>
                  <div className="grid grid-cols-2 gap-3 mt-4 flex-grow">
                    {TABLE_SERVICE.map((ts) => (
                      <div key={ts.service} className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500 mb-0.5">{ts.service}</div>
                        <div className="text-sm font-bold" style={{ color: '#C8860A' }}>{ts.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Kids Pricing <span className="text-sm font-normal text-gray-500">(Only Applies for over 50 Adults)</span></h3>
                  <div className="overflow-x-auto mt-4 mb-6">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {KIDS_PRICING.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 pr-4 font-semibold text-gray-800">{row.ageRange}</td>
                            <td className="py-3 font-bold text-right" style={{ color: '#C8860A' }}>{row.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-auto">
                    <button
                      onClick={() => handleEnquireNow('Kids Pricing')}
                      className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] mb-3"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' }}
                    >
                      Enquire Now
                    </button>
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                      <strong>NOTE:</strong> Minimum Number of Guests will be charged as agreed. As per our policy and food safety, we don't allow any food takeaway from Banquet Venue.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── INDIAN MENU ─── */}
          {activeMenuTab === 'indian' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Indian Menu</h3>
                <p className="text-sm text-gray-500 mt-1">Tick as per your Selected Package</p>
              </div>

              {/* Starters */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 text-white text-center font-bold text-lg" style={{ background: 'linear-gradient(135deg, #7B1D1D, #991B1B)' }}>
                  STARTERS
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Vegetarian Starters</h4>
                    <ul className="space-y-2">
                      {INDIAN_MENU.starters.vegetarian.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Non-Vegetarian Starters</h4>
                    <ul className="space-y-2">
                      {INDIAN_MENU.starters.nonVegetarian.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Main Course */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 text-white text-center font-bold text-lg" style={{ background: 'linear-gradient(135deg, #7B1D1D, #991B1B)' }}>
                  MAIN COURSE
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Vegetarian Mains</h4>
                    <ul className="space-y-2">
                      {INDIAN_MENU.mains.vegetarian.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Non-Vegetarian Mains</h4>
                    <ul className="space-y-2">
                      {INDIAN_MENU.mains.nonVegetarian.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {/* Sundries */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <h4 className="text-base font-bold text-gray-900 mb-2 text-center">Sundries</h4>
                  <div className="flex flex-wrap justify-center gap-4">
                    {INDIAN_MENU.sundries.map((item) => (
                      <span key={item} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Desserts */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 text-white text-center font-bold text-lg" style={{ background: 'linear-gradient(135deg, #7B1D1D, #991B1B)' }}>
                  DESSERT
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-3">
                    {INDIAN_MENU.desserts.map((item) => (
                      <span key={item} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Allergy Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">ALLERGY NOTICE</p>
                <p className="text-xs text-amber-700">{INDIAN_MENU.allergyNotice}</p>
              </div>

              <div className="text-center">
                <a href="#book"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' }}>
                  Enquire Now
                </a>
              </div>
            </div>
          )}

          {/* ─── SRI LANKAN MENU ─── */}
          {activeMenuTab === 'srilankan' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Sri Lankan Menu</h3>
                <p className="text-sm text-gray-500 mt-1">Tick as per your Selected Package</p>
              </div>

              {/* Starters */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 text-white text-center font-bold text-lg" style={{ background: 'linear-gradient(135deg, #7B1D1D, #991B1B)' }}>
                  STARTERS
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Vegetarian Starters</h4>
                    <ul className="space-y-2">
                      {SRI_LANKAN_MENU.starters.vegetarian.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Non-Vegetarian Starters</h4>
                    <ul className="space-y-2">
                      {SRI_LANKAN_MENU.starters.nonVegetarian.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Main Course */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 text-white text-center font-bold text-lg" style={{ background: 'linear-gradient(135deg, #7B1D1D, #991B1B)' }}>
                  MAIN COURSE
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Vegetarian Mains</h4>
                    <ul className="space-y-2">
                      {SRI_LANKAN_MENU.mains.vegetarian.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Non-Vegetarian Mains</h4>
                    <ul className="space-y-2">
                      {SRI_LANKAN_MENU.mains.nonVegetarian.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <h4 className="text-base font-bold text-gray-900 mb-2 text-center">Sundries</h4>
                  <div className="flex flex-wrap justify-center gap-4">
                    {SRI_LANKAN_MENU.sundries.map((item) => (
                      <span key={item} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Desserts */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 text-white text-center font-bold text-lg" style={{ background: 'linear-gradient(135deg, #7B1D1D, #991B1B)' }}>
                  DESSERT
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-3">
                    {SRI_LANKAN_MENU.desserts.map((item) => (
                      <span key={item} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Allergy Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">ALLERGY NOTICE</p>
                <p className="text-xs text-amber-700">{SRI_LANKAN_MENU.allergyNotice}</p>
              </div>

              <div className="text-center">
                <a href="#book"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' }}>
                  Enquire Now
                </a>
              </div>
            </div>
          )}

          {/* ─── LIVE COUNTER PACKAGE ─── */}
          {activeMenuTab === 'live' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Live Counter Package</h3>
                <p className="text-sm text-gray-500 mt-1">Tick as per your Selected Package — Price per person</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Sri Lankan & South Indian */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>Srilankan &amp; South Indian</h4>
                  <ul className="space-y-2">
                    {LIVE_COUNTER_PACKAGE.srilankanSouthIndian.map((item) => (
                      <li key={item.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item.name}
                        </span>
                        <span className="font-semibold" style={{ color: '#C8860A' }}>£{item.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* North Indian */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2" style={{ borderColor: '#C8860A' }}>North Indian</h4>
                  <ul className="space-y-2">
                    {LIVE_COUNTER_PACKAGE.northIndian.map((item) => (
                      <li key={item.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-700">
                          <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block" />
                          {item.name}
                        </span>
                        <span className="font-semibold" style={{ color: '#C8860A' }}>£{item.price.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Extras */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 text-center" style={{ borderColor: '#C8860A' }}>Extra</h4>
                <ul className="space-y-3 max-w-lg mx-auto">
                  {LIVE_COUNTER_PACKAGE.extras.map((item) => (
                    <li key={item.name} className="flex items-start justify-between text-sm gap-4">
                      <span className="flex items-start gap-2 text-gray-700">
                        <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 inline-block mt-0.5" />
                        <span>
                          {item.name}
                          {'note' in item && item.note && <span className="block text-xs text-gray-400 italic">({item.note})</span>}
                        </span>
                      </span>
                      <span className="font-semibold flex-shrink-0" style={{ color: '#C8860A' }}>£{item.price.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Allergy Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">ALLERGY NOTICE</p>
                <p className="text-xs text-amber-700">{INDIAN_MENU.allergyNotice}</p>
              </div>

              <div className="text-center">
                <a href="#book"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' }}>
                  Enquire Now
                </a>
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