'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  INDIAN_MENU,
  SRI_LANKAN_MENU,
  LIVE_COUNTER_PACKAGE,
  BANQUET_PACKAGES,
  VENUE_HALL_CHARGES,
  TABLE_SERVICE,
  KIDS_PRICING,
  DRY_HIRE_PRICES,
  TERMS_AND_CONDITIONS,
  STANDARD_SETUP,
  MENU_CATEGORIES,
  LIVE_DOSA_MENU,
  SOUTH_INDIAN_BUFFET,
} from '@/app/data/menuData';
import {
  DEFAULT_FORM_CONFIG,
  BookingFormConfig,
  FormField,
  FormFieldType,
  FieldWidth,
  DEFAULT_EVENT_TYPES,
  DEFAULT_TIME_SLOTS,
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
import { PaymentGatewayConfig, DEFAULT_PAYMENT_CONFIG } from '@/lib/stripe';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, doc, setDoc, deleteDoc, getDoc, getDocs, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AccessControl from '@/components/admin/AccessControl';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type BookingStatus =
  | 'new_enquiry'
  | 'menu_sent'
  | 'menu_selected'
  | 'deposit_pending'
  | 'deposit_confirmed'
  | 'event_scheduled'
  | 'event_completed'
  | 'final_invoice_sent'
  | 'final_payment_received'
  | 'completed'
  | 'cancelled'
  | 'rejected';

interface ExtraCharge {
  id?: string;
  label?: string;
  name?: string;
  amount: number;
  isPreset?: boolean;
  paid?: boolean;
}

interface Discount {
  type: 'fixed' | 'percentage';
  value: number;
  reason?: string;
}

interface DiscountRequest {
  id?: string;
  type: 'fixed' | 'percentage';
  value: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt?: string;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  eventType: string;
  location?: string;
  customerCoords?: { lat: number; lng: number; postcode?: string };
  distanceMiles?: number;
  deliveryCharge?: number;
  deliveryBreakdown?: string;
  totalEstimatedAmount?: number;
  date: string;
  time: string;
  timeOfDay?: string;
  guests: number;
  adults?: number;
  kids4to10?: number;
  kidsUnder4?: number;
  status: BookingStatus;
  notes: string;
  baseAmount: number;
  deposit: number;
  depositPaid: boolean;
  finalPaymentPaid: boolean;
  dueDate?: string;
  package: string;
  packageName?: string;
  cuisineType?: 'indian' | 'srilankan';
  selectedMenu?: string;
  selectedMenuDishes?: {
    canapesVeg?: string[];
    canapesNonVeg?: string[];
    startersVeg?: string[];
    startersNonVeg?: string[];
    mainsVeg?: string[];
    mainsNonVeg?: string[];
    desserts?: string[];
    sundries?: string[];
    selectedExtras?: { name: string; price: number; perPerson?: boolean }[];
    [key: string]: any;
  };
  isOnlineOrder?: boolean;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeCustomerEmail?: string;
  amountPaidSoFar?: number;
  paymentChoice?: 'deposit' | 'full';
  kitchenStatus?: 'received' | 'prep' | 'ready' | 'dispatched';
  kitchenNotes?: string;
  extraCharges: ExtraCharge[];
  paymentProofDeposit?: string;
  paymentProofFinal?: string;
  paymentProofExtra?: string;
  paymentMethodDeposit?: string;
  paymentMethodFinal?: string;
  discount?: Discount;
  discountRequest?: DiscountRequest;
  customFields?: Record<string, any>;
  isWaitlist?: boolean;
  capacityStatus?: string;
  waitlistNote?: string;
  enquiryDate: string;
  updatedAt?: string;
  createdAt?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastEvent: string;
  status: 'active' | 'inactive';
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STATUS_FLOW: BookingStatus[] = [
  'new_enquiry',
  'menu_sent',
  'menu_selected',
  'deposit_pending',
  'deposit_confirmed',
  'final_invoice_sent',
  'final_payment_received',
  'event_scheduled',
  'event_completed',
  'completed',
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  new_enquiry: 'New Enquiry',
  menu_sent: 'Menu Sent',
  menu_selected: 'Menu Selected',
  deposit_pending: 'Deposit Pending',
  deposit_confirmed: 'Deposit Confirmed',
  event_scheduled: 'Event Scheduled',
  event_completed: 'Event Completed',
  final_invoice_sent: 'Final Invoice Sent',
  final_payment_received: 'Final Payment Received',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  new_enquiry: 'bg-blue-50 text-blue-700 border border-blue-200',
  menu_sent: 'bg-purple-50 text-purple-700 border border-purple-200',
  menu_selected: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  deposit_pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  deposit_confirmed: 'bg-orange-50 text-orange-700 border border-orange-200',
  event_scheduled: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  event_completed: 'bg-teal-50 text-teal-700 border border-teal-200',
  final_invoice_sent: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  final_payment_received: 'bg-lime-50 text-lime-700 border border-lime-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-gray-100 text-gray-700 border border-gray-300',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
};

const STATUS_DOT: Record<BookingStatus, string> = {
  new_enquiry: 'bg-blue-500',
  menu_sent: 'bg-purple-500',
  menu_selected: 'bg-indigo-500',
  deposit_pending: 'bg-amber-400',
  deposit_confirmed: 'bg-orange-500',
  event_scheduled: 'bg-cyan-500',
  event_completed: 'bg-teal-500',
  final_invoice_sent: 'bg-yellow-500',
  final_payment_received: 'bg-lime-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-gray-400',
  rejected: 'bg-red-500',
};

const MENU_PACKAGES = [
  {
    name: 'Classic Buffet',
    price: 38,
    tag: 'Most Popular',
    items: ['Garden Salad', 'Grilled Chicken', 'Pasta Primavera', 'Seasonal Vegetables', 'Dinner Rolls', 'Dessert Station'],
  },
  {
    name: 'Premium Plated',
    price: 62,
    tag: 'Best Value',
    items: ['Soup or Salad', 'Choice of Entrée (Beef/Fish/Veg)', 'Sides', 'Bread Service', 'Plated Dessert', 'Coffee & Tea'],
  },
  {
    name: 'Cocktail Reception',
    price: 45,
    tag: '',
    items: ["Passed Hors d'Oeuvres (6 varieties)", 'Cheese & Charcuterie Board', 'Mini Desserts', 'Soft Drinks', 'Bartender Service'],
  },
  {
    name: 'Continental Breakfast',
    price: 22,
    tag: '',
    items: ['Assorted Pastries', 'Fresh Fruit Platter', 'Yogurt Parfait', 'Juice & Coffee', 'Bagels & Cream Cheese'],
  },
];

const SAMPLE_BOOKINGS: Booking[] = [
  {
    id: 'BK001', name: 'Sarah Johnson', email: 'sarah@email.com', phone: '+447700900101',
    eventType: 'Wedding', date: '2026-06-15', time: '4:00 PM', guests: 200,
    status: 'deposit_confirmed', notes: 'Floral décor, DJ required. Bride prefers white roses.',
    baseAmount: 12500, deposit: 3750, depositPaid: true, finalPaymentPaid: false,
    package: 'Premium Plated', selectedMenu: 'Premium Plated', extraCharges: [],
    paymentProofDeposit: 'proof_attached', enquiryDate: '2026-04-10',
  },
  {
    id: 'BK002', name: 'Michael Chen', email: 'mchen@corp.com', phone: '+447700900102',
    eventType: 'Corporate', date: '2026-05-20', time: '12:00 PM', guests: 80,
    status: 'menu_sent', notes: 'AV setup, buffet lunch. Projector needed.',
    baseAmount: 4800, deposit: 1200, depositPaid: false, finalPaymentPaid: false,
    package: 'Classic Buffet', selectedMenu: undefined, extraCharges: [],
    enquiryDate: '2026-04-22',
  },
  {
    id: 'BK003', name: 'Emily Rodriguez', email: 'emily@email.com', phone: '+447700900103',
    eventType: 'Birthday', date: '2026-05-28', time: '6:00 PM', guests: 50,
    status: 'new_enquiry', notes: 'Custom cake, cocktail style. 30th birthday.',
    baseAmount: 2750, deposit: 825, depositPaid: false, finalPaymentPaid: false,
    package: 'Cocktail Reception', selectedMenu: undefined, extraCharges: [],
    enquiryDate: '2026-05-01',
  },
  {
    id: 'BK004', name: 'David Park', email: 'dpark@email.com', phone: '+447700900104',
    eventType: 'Anniversary', date: '2026-07-04', time: '7:00 PM', guests: 120,
    status: 'event_scheduled', notes: 'Plated dinner, open bar. 25th anniversary.',
    baseAmount: 8200, deposit: 2460, depositPaid: true, finalPaymentPaid: false,
    package: 'Premium Plated', selectedMenu: 'Premium Plated', extraCharges: [],
    paymentProofDeposit: 'proof_attached', enquiryDate: '2026-03-15',
  },
  {
    id: 'BK005', name: 'James Wilson', email: 'jwilson@email.com', phone: '+447700900106',
    eventType: 'Wedding', date: '2026-08-22', time: '5:00 PM', guests: 180,
    status: 'deposit_pending', notes: 'Garden theme, outdoor ceremony. Backup plan needed.',
    baseAmount: 15000, deposit: 4500, depositPaid: false, finalPaymentPaid: false,
    package: 'Premium Plated', selectedMenu: 'Premium Plated', extraCharges: [],
    enquiryDate: '2026-04-05',
  },
  {
    id: 'BK006', name: 'Priya Sharma', email: 'priya@email.com', phone: '+447700900107',
    eventType: 'Corporate', date: '2026-05-30', time: '9:00 AM', guests: 60,
    status: 'event_completed', notes: 'Morning conference, continental breakfast.',
    baseAmount: 3200, deposit: 960, depositPaid: true, finalPaymentPaid: false,
    package: 'Classic Buffet', selectedMenu: 'Classic Buffet',
    extraCharges: [{ label: 'Extra 10 guests', amount: 380 }, { label: 'AV Equipment', amount: 150 }],
    paymentProofDeposit: 'proof_attached', enquiryDate: '2026-03-20',
  },
  {
    id: 'BK007', name: 'Carlos Mendez', email: 'carlos@email.com', phone: '+447700900108',
    eventType: 'Birthday', date: '2026-04-08', time: '7:00 PM', guests: 40,
    status: 'completed', notes: 'Surprise party. All went well.',
    baseAmount: 2200, deposit: 2200, depositPaid: true, finalPaymentPaid: true,
    package: 'Cocktail Reception', selectedMenu: 'Cocktail Reception', extraCharges: [],
    paymentProofDeposit: 'proof_attached', paymentProofFinal: 'proof_attached',
    enquiryDate: '2026-02-28',
  },
  {
    id: 'BK008', name: 'Aisha Patel', email: 'aisha@email.com', phone: '+447700900109',
    eventType: 'Wedding', date: '2026-09-12', time: '3:00 PM', guests: 250,
    status: 'menu_selected', notes: 'Traditional ceremony, halal menu required.',
    baseAmount: 18500, deposit: 5550, depositPaid: false, finalPaymentPaid: false,
    package: 'Premium Plated', selectedMenu: 'Premium Plated', extraCharges: [],
    enquiryDate: '2026-04-30',
  },
];



const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function buildWhatsAppLink(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

type AdminTab = 'overview' | 'online_orders' | 'enquiries' | 'bookings' | 'calendar' | 'customers' | 'payments' | 'menus' | 'history' | 'settings' | 'access' | 'discount_approvals' | 'tracker';

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditingBookingDate, setIsEditingBookingDate] = useState(false);
  const [isEditingEventType, setIsEditingEventType] = useState(false);
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [isEditingGuests, setIsEditingGuests] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [discountTab, setDiscountTab] = useState<'pending' | 'history'>('pending');
  const [trackingBookingId, setTrackingBookingId] = useState<string>('');
  const [trackerSearch, setTrackerSearch] = useState<string>('');
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<string>('');
  const [finalPaymentMethod, setFinalPaymentMethod] = useState<string>('');

  // Online Orders State
  const [selectedOnlineOrder, setSelectedOnlineOrder] = useState<Booking | null>(null);
  const [showKitchenSlipModal, setShowKitchenSlipModal] = useState<Booking | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<Booking | null>(null);
  const [onlineOrderFilter, setOnlineOrderFilter] = useState<'all' | 'paid' | 'deposit' | 'kitchen' | 'completed'>('all');
  const [onlineOrderSearch, setOnlineOrderSearch] = useState('');

  // Payment Gateway Settings State
  const [paymentGatewaySettings, setPaymentGatewaySettings] = useState<PaymentGatewayConfig>(DEFAULT_PAYMENT_CONFIG);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // New Booking Modal State
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [newBookingForm, setNewBookingForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: 'Wedding',
    date: new Date().toISOString().split('T')[0],
    time: 'Lunch (12:00pm – 4:00pm)',
    guests: '50',
    adults: '50',
    kids4to10: '0',
    kidsUnder4: '0',
    package: 'Gold Package',
    status: 'new_enquiry' as BookingStatus,
    notes: '',
  });
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Dynamic Form Config State
  const [formConfig, setFormConfig] = useState<BookingFormConfig>(DEFAULT_FORM_CONFIG);
  const [editableFormConfig, setEditableFormConfig] = useState<BookingFormConfig>(DEFAULT_FORM_CONFIG);
  const [isSavingFormConfig, setIsSavingFormConfig] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'form_builder' | 'venue' | 'location_delivery' | 'pricing' | 'stripe_gateway' | 'bank' | 'block_dates'>('form_builder');
  const [deliverySettings, setDeliverySettings] = useState<DeliveryLocationConfig>(DEFAULT_DELIVERY_CONFIG);
  const [isSavingDeliverySettings, setIsSavingDeliverySettings] = useState(false);
  const [testPostcode, setTestPostcode] = useState('');
  const [testResult, setTestResult] = useState<DeliveryCalculationResult | null>(null);
  const [editingFieldModal, setEditingFieldModal] = useState<FormField | null>(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [newOutdoorSlotInput, setNewOutdoorSlotInput] = useState('');
  const [fieldToManageOptions, setFieldToManageOptions] = useState<FormField | null>(null);
  const [newFieldForm, setNewFieldForm] = useState<Partial<FormField>>({
    id: '',
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    enabled: true,
    width: 'half',
    options: [],
    helperText: '',
  });

  useEffect(() => {
    if (selectedBooking) {
      setDepositPaymentMethod(selectedBooking.paymentMethodDeposit || '');
      setFinalPaymentMethod(selectedBooking.paymentMethodFinal || '');
    } else {
      setDepositPaymentMethod('');
      setFinalPaymentMethod('');
    }
  }, [selectedBooking?.id, selectedBooking?.paymentMethodDeposit, selectedBooking?.paymentMethodFinal]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('adminActiveTab') as AdminTab | null;
      if (savedTab) setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminActiveTab', activeTab);
    }
  }, [activeTab]);

  // Seed default site_data if database is newly initialized
  useEffect(() => {
    const seedSiteDataDefaults = async () => {
      try {
        const menuSnap = await getDoc(doc(db, 'site_data', 'menus'));
        if (!menuSnap.exists() || !menuSnap.data()?.MENU_CATEGORIES) {
          await setDoc(doc(db, 'site_data', 'menus'), {
            INDIAN_MENU,
            SRI_LANKAN_MENU,
            LIVE_COUNTER_PACKAGE,
            BANQUET_PACKAGES,
            VENUE_HALL_CHARGES,
            TABLE_SERVICE,
            KIDS_PRICING,
            DRY_HIRE_PRICES,
            TERMS_AND_CONDITIONS,
            STANDARD_SETUP,
            MENU_CATEGORIES,
            LIVE_DOSA_MENU,
            SOUTH_INDIAN_BUFFET,
          }, { merge: true });
        }

        const formConfigSnap = await getDoc(doc(db, 'site_data', 'booking_form_config'));
        if (!formConfigSnap.exists()) {
          const cleanDefault = JSON.parse(JSON.stringify(DEFAULT_FORM_CONFIG));
          await setDoc(doc(db, 'site_data', 'booking_form_config'), cleanDefault, { merge: true });
        }

        const pricingSnap = await getDoc(doc(db, 'site_data', 'pricing_details'));
        if (!pricingSnap.exists()) {
          await setDoc(doc(db, 'site_data', 'pricing_details'), {
            depositPercentage: 30,
            minimumBookingHours: 4,
            weekdayRate: 350,
            weekendRate: 550
          }, { merge: true });
        }

        const venueSnap = await getDoc(doc(db, 'site_data', 'venue_details'));
        if (!venueSnap.exists()) {
          await setDoc(doc(db, 'site_data', 'venue_details'), {
            venueName: 'SriLalitha Banquet Hall',
            maxCapacity: '500',
            contactEmail: 'hello@srilalitha.com',
            phone: '+44 7700 900000',
            whatsapp: '+447700900000',
            address: '123 Event Plaza, London, UK'
          }, { merge: true });
        }

        const bankSnap = await getDoc(doc(db, 'site_data', 'bank_details'));
        if (!bankSnap.exists()) {
          await setDoc(doc(db, 'site_data', 'bank_details'), {
            accountName: 'SriLalitha Events Ltd',
            sortCode: '20-00-00',
            accountNumber: '12345678'
          }, { merge: true });
        }
      } catch (e) {
        console.error("Note: Auto-seeding check finished or deferred.", e);
      }
    };
    seedSiteDataDefaults();
  }, []);

  // Listen to dynamic booking form configuration
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site_data', 'booking_form_config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<BookingFormConfig>;
        let fields = (data.fields && data.fields.length > 0) ? [...data.fields] : [...DEFAULT_FORM_CONFIG.fields];

        // Ensure location field is present if missing from database
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

        const merged: BookingFormConfig = {
          formTitle: data.formTitle || DEFAULT_FORM_CONFIG.formTitle,
          formSubtitle: data.formSubtitle || DEFAULT_FORM_CONFIG.formSubtitle,
          submitButtonText: data.submitButtonText || DEFAULT_FORM_CONFIG.submitButtonText,
          fields,
          slotCapacity: data.slotCapacity || DEFAULT_FORM_CONFIG.slotCapacity || DEFAULT_SLOT_CAPACITY,
        };
        setFormConfig(merged);
        setEditableFormConfig(merged);
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore sync for all bookings
  useEffect(() => {
    const q = collection(db, 'booking_requests');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveBookings: Booking[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown',
          email: data.email || 'N/A',
          phone: data.phone || 'N/A',
          eventType: data.eventType || 'N/A',
          date: data.date || 'N/A',
          time: data.timeOfDay || data.time || 'N/A',
          timeOfDay: data.timeOfDay || data.time || 'N/A',
          guests: data.guests || 0,
          adults: data.adults ?? undefined,
          kids4to10: data.kids4to10 ?? 0,
          kidsUnder4: data.kidsUnder4 ?? 0,
          status: (data.status || 'new_enquiry') as BookingStatus,
          notes: data.message || data.notes || '',
          baseAmount: data.baseAmount || 0,
          deposit: data.deposit || 0,
          depositPaid: data.depositPaid || false,
          finalPaymentPaid: data.finalPaymentPaid || false,
          package: data.package || data.packageName || 'Not Selected',
          packageName: data.packageName || data.package || 'Not Selected',
          cuisineType: data.cuisineType || 'indian',
          selectedMenu: data.selectedMenu,
          selectedMenuDishes: data.selectedMenuDishes || undefined,
          isOnlineOrder: Boolean(data.isOnlineOrder || data.stripeSessionId || data.selectedMenuDishes),
          stripeSessionId: data.stripeSessionId || '',
          stripePaymentIntentId: data.stripePaymentIntentId || '',
          stripeCustomerEmail: data.stripeCustomerEmail || '',
          amountPaidSoFar: data.amountPaidSoFar || data.deposit || 0,
          paymentChoice: data.paymentChoice,
          kitchenStatus: data.kitchenStatus || 'received',
          kitchenNotes: data.kitchenNotes || '',
          extraCharges: data.extraCharges || [],
          paymentProofDeposit: data.paymentProofDeposit,
          paymentProofFinal: data.paymentProofFinal,
          paymentProofExtra: data.paymentProofExtra,
          paymentMethodDeposit: data.paymentMethodDeposit,
          paymentMethodFinal: data.paymentMethodFinal,
          discount: data.discount,
          discountRequest: data.discountRequest,
          customFields: data.customFields || {},
          location: data.location || '',
          customerCoords: data.customerCoords || null,
          distanceMiles: data.distanceMiles || 0,
          deliveryCharge: data.deliveryCharge || 0,
          deliveryBreakdown: data.deliveryBreakdown || '',
          totalEstimatedAmount: data.totalEstimatedAmount || (data.baseAmount || 0),
          isWaitlist: Boolean(data.isWaitlist),
          capacityStatus: data.capacityStatus || (data.isWaitlist ? 'exceeded_capacity' : 'normal'),
          waitlistNote: data.waitlistNote || '',
          enquiryDate: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: (() => {
            if (data.dueDate) return data.dueDate;
            if (data.date && data.date !== 'N/A') {
              const evDate = new Date(data.date);
              const today = new Date();
              evDate.setDate(evDate.getDate() - 14);
              return (evDate < today ? today : evDate).toISOString().split('T')[0];
            }
            return '';
          })(),
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
        } as Booking;
      }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      setBookings(liveBookings);
      setLoadingBookings(false);
    }, (error) => {
      console.error("Error subscribing to bookings:", error);
      setLoadingBookings(false);
    });
    return () => unsubscribe();
  }, []);

  // Form Builder Handlers
  const saveFormConfigToDatabase = async () => {
    setIsSavingFormConfig(true);
    try {
      const cleanFields = (editableFormConfig.fields || []).map((f, idx) => {
        const cleanField: any = {
          id: String(f.id || `field_${idx + 1}`),
          label: String(f.label || ''),
          type: f.type || 'text',
          required: Boolean(f.required),
          enabled: Boolean(f.enabled),
          width: f.width || 'half',
          order: Number(f.order || idx + 1),
        };
        if (f.placeholder) cleanField.placeholder = String(f.placeholder);
        if (f.helperText) cleanField.helperText = String(f.helperText);
        if (f.isSystem !== undefined) cleanField.isSystem = Boolean(f.isSystem);
        if (Array.isArray(f.options) && f.options.length > 0) {
          cleanField.options = f.options.map(String).filter(Boolean);
        }
        if (typeof f.min === 'number' && !isNaN(f.min)) cleanField.min = f.min;
        if (typeof f.max === 'number' && !isNaN(f.max)) cleanField.max = f.max;
        return cleanField;
      });

      const slotCapacity: SlotCapacityConfig = {
        maxOutdoorCateringPerSlot: Math.max(1, Number(editableFormConfig.slotCapacity?.maxOutdoorCateringPerSlot || 4)),
        maxHallBookingsPerSlot: Math.max(1, Number(editableFormConfig.slotCapacity?.maxHallBookingsPerSlot || 1)),
        outdoorCateringTimeSlots: (editableFormConfig.slotCapacity?.outdoorCateringTimeSlots && editableFormConfig.slotCapacity.outdoorCateringTimeSlots.length > 0)
          ? editableFormConfig.slotCapacity.outdoorCateringTimeSlots
          : DEFAULT_OUTDOOR_TIME_SLOTS,
        standardTimeSlots: (editableFormConfig.slotCapacity?.standardTimeSlots && editableFormConfig.slotCapacity.standardTimeSlots.length > 0)
          ? editableFormConfig.slotCapacity.standardTimeSlots
          : (editableFormConfig.fields.find(f => f.id === 'timeOfDay')?.options || DEFAULT_TIME_SLOTS),
      };

      const payload = JSON.parse(JSON.stringify({
        formTitle: editableFormConfig.formTitle || 'Request a Booking',
        formSubtitle: editableFormConfig.formSubtitle || "Fill in your details and we'll get back to you within 24 hours",
        submitButtonText: editableFormConfig.submitButtonText || 'Submit Booking Request',
        fields: cleanFields,
        slotCapacity,
        updatedAt: new Date().toISOString(),
      }));

      await setDoc(doc(db, 'site_data', 'booking_form_config'), payload, { merge: true });
      setFormConfig(editableFormConfig);
      setCustomAlert({
        message: 'Booking form configuration successfully saved! All changes are live on the website.',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error saving booking form config:', err);
      setCustomAlert({
        message: err?.message || 'Error saving form configuration.',
        type: 'error'
      });
    } finally {
      setIsSavingFormConfig(false);
    }
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editableFormConfig.fields.length) return;
    const newFields = [...editableFormConfig.fields];
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    newFields.forEach((f, i) => {
      f.order = i + 1;
    });
    setEditableFormConfig(prev => ({ ...prev, fields: newFields }));
  };

  const handleToggleField = (fieldId: string) => {
    setEditableFormConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, enabled: !f.enabled } : f)
    }));
  };

  const handleDeleteField = (fieldId: string) => {
    setEditableFormConfig(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId).map((f, idx) => ({ ...f, order: idx + 1 }))
    }));
  };

  const handleSaveFieldModal = (field: FormField) => {
    setEditableFormConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === field.id ? field : f)
    }));
    setEditingFieldModal(null);
  };

  const handleCreateNewField = () => {
    if (!newFieldForm.label || !newFieldForm.label.trim()) {
      setCustomAlert({ message: 'Please enter a field label', type: 'error' });
      return;
    }

    const rawId = newFieldForm.id?.trim() || newFieldForm.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const finalId = rawId.startsWith('custom_') ? rawId : `custom_${rawId}`;

    if (editableFormConfig.fields.some(f => f.id === finalId)) {
      setCustomAlert({ message: 'A field with this identifier already exists.', type: 'error' });
      return;
    }

    const createdField: FormField = {
      id: finalId,
      label: newFieldForm.label.trim(),
      type: newFieldForm.type || 'text',
      placeholder: newFieldForm.placeholder?.trim() || '',
      required: !!newFieldForm.required,
      enabled: true,
      isSystem: false,
      width: newFieldForm.width || 'half',
      options: newFieldForm.options ? [...newFieldForm.options] : [],
      helperText: newFieldForm.helperText?.trim() || '',
      min: newFieldForm.min,
      max: newFieldForm.max,
      order: editableFormConfig.fields.length + 1,
    };

    setEditableFormConfig(prev => ({
      ...prev,
      fields: [...prev.fields, createdField]
    }));

    setShowAddFieldModal(false);
    setNewFieldForm({
      id: '',
      label: '',
      type: 'text',
      placeholder: '',
      required: false,
      enabled: true,
      width: 'half',
      options: [],
      helperText: '',
    });
    setCustomAlert({ message: `Field "${createdField.label}" added to form builder!`, type: 'success' });
  };
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [userPermissions, setUserPermissions] = useState<string[] | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Query by uid field (not document ID, since we use addDoc)
          const usersQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
          const usersSnap = await getDocs(usersQuery);

          if (!usersSnap.empty) {
            // Found a managed user document
            const userData = usersSnap.docs[0].data();
            let roleName = 'Staff';
            if (userData.roleId) {
              const roleDoc = await getDoc(doc(db, 'roles', userData.roleId));
              if (roleDoc.exists()) {
                roleName = roleDoc.data().name || 'Staff';
                const rolePermIds: string[] = roleDoc.data().permissionIds || [];
                // Resolve permission IDs → title strings for sidebar filtering
                const permTitles: string[] = [];
                for (const permId of rolePermIds) {
                  const permDoc = await getDoc(doc(db, 'permissions', permId));
                  if (permDoc.exists()) {
                    permTitles.push(permDoc.data().title);
                  }
                }
                setUserPermissions(permTitles);
              } else {
                setUserPermissions([]); // Role doc missing
              }
            } else {
              setUserPermissions([]); // No role assigned
            }
            setCurrentUser({ name: userData.name || 'User', email: userData.email || user.email || '', role: roleName });
          } else {
            // No user doc found → original super admin (srilalithaadmin)
            setCurrentUser({ name: 'Admin', email: user.email || '', role: 'Super Admin' });
            setUserPermissions('all');
          }
        } catch (e) {
          console.error("Error fetching permissions:", e);
          setCurrentUser({ name: 'Admin', email: user.email || '', role: 'Super Admin' });
          setUserPermissions([]);
        }
        setLoggedIn(true);
      } else {
        setLoggedIn(false);
        setCurrentUser(null);
        setUserPermissions([]);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);
  const [calendarMonth, setCalendarMonth] = useState(4);
  const [calendarYear] = useState(2026);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [extraLabel, setExtraLabel] = useState('');
  const [extraAmount, setExtraAmount] = useState('');

  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [showMenuPanel, setShowMenuPanel] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [customAlert, setCustomAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isUploadingFinalProof, setIsUploadingFinalProof] = useState(false);
  const [isUploadingExtraProof, setIsUploadingExtraProof] = useState(false);

  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockDateInput, setBlockDateInput] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'blocked_dates'), (snapshot) => {
      const dates = snapshot.docs.map(doc => doc.id);
      setBlockedDates(dates.sort());
    });
    return () => unsubscribe();
  }, []);

  const [bankDetails, setBankDetails] = useState({
    accountName: 'SriLalitha Events Ltd',
    sortCode: '20-00-00',
    accountNumber: '12345678'
  });

  useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'bank_details'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBankDetails({
          accountName: data.accountName || 'SriLalitha Events Ltd',
          sortCode: data.sortCode || '20-00-00',
          accountNumber: data.accountNumber || '12345678'
        });
      }
    });
  }, []);

  const [venueDetails, setVenueDetails] = useState({
    venueName: 'SriLalitha Banquet Hall',
    maxCapacity: '500',
    contactEmail: 'hello@srilalitha.com',
    phone: '+44 7700 900000',
    whatsapp: '+447700900000',
    address: '123 Event Plaza, London, UK'
  });

  useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'venue_details'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVenueDetails({
          venueName: data.venueName || 'SriLalitha Banquet Hall',
          maxCapacity: data.maxCapacity || '500',
          contactEmail: data.contactEmail || 'hello@srilalitha.com',
          phone: data.phone || '+44 7700 900000',
          whatsapp: data.whatsapp || '+447700900000',
          address: data.address || '123 Event Plaza, London, UK'
        });
      }
    });
  }, []);

  const [pricingDetails, setPricingDetails] = useState({
    depositPercentage: 30,
    minimumBookingHours: 4,
    weekdayRate: 350,
    weekendRate: 550
  });

  useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'pricing_details'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPricingDetails({
          depositPercentage: data.depositPercentage !== undefined ? data.depositPercentage : 30,
          minimumBookingHours: data.minimumBookingHours || 4,
          weekdayRate: data.weekdayRate || 350,
          weekendRate: data.weekendRate || 550
        });
      }
    });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'delivery_settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<DeliveryLocationConfig>;
        setDeliverySettings(prev => ({
          ...prev,
          ...data,
        }));
      }
    });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, 'site_data', 'payment_gateway_settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<PaymentGatewayConfig>;
        setPaymentGatewaySettings(prev => ({
          ...prev,
          ...data,
        }));
      }
    });
  }, []);

  const savePaymentGatewaySettings = async () => {
    setIsSavingPaymentSettings(true);
    try {
      await setDoc(doc(db, 'site_data', 'payment_gateway_settings'), paymentGatewaySettings, { merge: true });
      setCustomAlert({ message: 'Stripe Payment Gateway settings saved successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      setCustomAlert({ message: `Error saving payment settings: ${err.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsSavingPaymentSettings(false);
    }
  };

  // ─── REAL MENU EDITABLE STATE ─────────────────────────────────────────────
  // ─── REAL MENU EDITABLE STATE ─────────────────────────────────────────────
  type AdminMenuTab = 'categories' | 'live-dosa' | 'buffet' | 'banquet';
  const [adminMenuTab, setAdminMenuTab] = useState<AdminMenuTab>('categories');
  const [selectedAdminCategoryIndex, setSelectedAdminCategoryIndex] = useState<number>(0);

  // Editable restaurant categories
  const [editableMenuCategories, setEditableMenuCategories] = useState(
    MENU_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({ ...item, tags: [...(item.tags || [])] }))
    }))
  );

  // Editable Live Dosa Menu
  const [editableLiveDosaMenu, setEditableLiveDosaMenu] = useState({
    title: LIVE_DOSA_MENU.title,
    tagline: LIVE_DOSA_MENU.tagline,
    subtitle: LIVE_DOSA_MENU.subtitle,
    items: LIVE_DOSA_MENU.items.map(item => ({ ...item, tags: [...(item.tags || [])] })),
  });

  // Editable South Indian Buffet
  const [editableSouthIndianBuffet, setEditableSouthIndianBuffet] = useState({
    ...SOUTH_INDIAN_BUFFET,
    weekday: { ...SOUTH_INDIAN_BUFFET.weekday, slots: [...SOUTH_INDIAN_BUFFET.weekday.slots] },
    weekend: { ...SOUTH_INDIAN_BUFFET.weekend, slots: [...SOUTH_INDIAN_BUFFET.weekend.slots] },
    items: SOUTH_INDIAN_BUFFET.items.map(i => ({ ...i, tags: [...i.tags] })),
  });

  // Editable banquet packages
  const [editableBanquetPackages, setEditableBanquetPackages] = useState(
    BANQUET_PACKAGES.map(pkg => ({ ...pkg, desserts: [...pkg.desserts], drinks: [...pkg.drinks] }))
  );
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingPackageData, setEditingPackageData] = useState<typeof BANQUET_PACKAGES[0] | null>(null);

  // Editable venue/table/kids
  const [editableVenueCharges, setEditableVenueCharges] = useState(VENUE_HALL_CHARGES.map(v => ({ ...v })));
  const [editableTableService, setEditableTableService] = useState(TABLE_SERVICE.map(t => ({ ...t })));
  const [editableKidsPricing, setEditableKidsPricing] = useState(KIDS_PRICING.map(k => ({ ...k })));
  const [editableDryHirePrices, setEditableDryHirePrices] = useState(DRY_HIRE_PRICES.map(p => ({ ...p })));

  // New item inputs
  const [newDishName, setNewDishName] = useState('');
  const [newDishDescription, setNewDishDescription] = useState('');
  const [newDishTags, setNewDishTags] = useState('V');
  const [newLiveDosaName, setNewLiveDosaName] = useState('');
  const [newLiveDosaDesc, setNewLiveDosaDesc] = useState('');
  const [newBuffetItemName, setNewBuffetItemName] = useState('');
  const [newBuffetItemDesc, setNewBuffetItemDesc] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site_data', 'menus'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.MENU_CATEGORIES && Array.isArray(data.MENU_CATEGORIES) && data.MENU_CATEGORIES.length > 0) {
          setEditableMenuCategories(data.MENU_CATEGORIES);
        }
        if (data.LIVE_DOSA_MENU) {
          setEditableLiveDosaMenu(data.LIVE_DOSA_MENU);
        }
        if (data.SOUTH_INDIAN_BUFFET) {
          setEditableSouthIndianBuffet(data.SOUTH_INDIAN_BUFFET);
        }
        if (data.BANQUET_PACKAGES) setEditableBanquetPackages(data.BANQUET_PACKAGES);
        if (data.VENUE_HALL_CHARGES) setEditableVenueCharges(data.VENUE_HALL_CHARGES);
        if (data.TABLE_SERVICE) setEditableTableService(data.TABLE_SERVICE);
        if (data.KIDS_PRICING) setEditableKidsPricing(data.KIDS_PRICING);
        if (data.DRY_HIRE_PRICES) setEditableDryHirePrices(data.DRY_HIRE_PRICES);
      }
    });
    return () => unsub();
  }, []);

  const [isSavingMenus, setIsSavingMenus] = useState(false);
  const saveAllMenusToDatabase = async () => {
    setIsSavingMenus(true);
    try {
      await setDoc(doc(db, 'site_data', 'menus'), {
        MENU_CATEGORIES: editableMenuCategories,
        LIVE_DOSA_MENU: editableLiveDosaMenu,
        SOUTH_INDIAN_BUFFET: editableSouthIndianBuffet,
        BANQUET_PACKAGES: editableBanquetPackages,
        VENUE_HALL_CHARGES: editableVenueCharges,
        TABLE_SERVICE: editableTableService,
        KIDS_PRICING: editableKidsPricing,
        DRY_HIRE_PRICES: editableDryHirePrices,
        TERMS_AND_CONDITIONS,
        STANDARD_SETUP,
      }, { merge: true });
      setCustomAlert({ message: 'All menus & categories successfully updated on the website!', type: 'success' });
    } catch (error: any) {
      console.error(error);
      setCustomAlert({ message: `Error saving menus: ${error?.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsSavingMenus(false);
    }
  };

  const startEditPackage = (pkg: typeof BANQUET_PACKAGES[0]) => {
    setEditingPackageId(pkg.id);
    setEditingPackageData({ ...pkg, desserts: [...pkg.desserts], drinks: [...pkg.drinks] });
  };

  const saveEditPackage = () => {
    if (!editingPackageData) return;
    setEditableBanquetPackages(prev => prev.map(p => p.id === editingPackageData.id ? { ...editingPackageData } : p));
    setEditingPackageId(null);
    setEditingPackageData(null);
  };

  const buildMenuWhatsAppText = (customerName: string, customerPhone: string, menuType: string, guestCount: number) => {
    let text = `Hi ${customerName}, here are our *${menuType}* options from SriLalitha:\n\n`;
    
    const matchedCategory = editableMenuCategories.find(c => c.title.toLowerCase() === menuType.toLowerCase() || c.id === menuType);
    if (matchedCategory) {
      text += `🍽️ *${matchedCategory.title} (${matchedCategory.items.length} items):*\n\n`;
      text += matchedCategory.items.map(i => `• *${i.name}*\n  ${i.description}`).join('\n\n') + '\n\n';
    } else if (menuType === 'Live Dosa Station' || menuType === 'Live Counter') {
      text += `🎪 *Live Dosa Station Menu (12 Live Dishes):*\n\n`;
      text += editableLiveDosaMenu.items.map(i => `• *${i.name}*\n  ${i.description}`).join('\n\n') + '\n\n';
    } else if (menuType === 'South Indian Buffet') {
      text += `🍲 *South Indian Special Buffet (${editableSouthIndianBuffet.items.length} Dishes):*\n`;
      text += `• Weekday (Mon-Fri): ${editableSouthIndianBuffet.weekday.price}\n`;
      text += `• Weekend & Holidays: ${editableSouthIndianBuffet.weekend.price}\n\n`;
      text += `*Inclusions:*\n` + editableSouthIndianBuffet.items.map(i => `• ${i.name} (${i.description})`).join('\n') + '\n\n';
    } else if (menuType === 'Venue Hall Charges') {
      text += editableVenueCharges.map(row => `• *${row.day}:* ${row.charge} ${row.note ? `(${row.note})` : ''}`).join('\n') + '\n\n';
      text += `🍷 *ALCOHOL:*\nCorkage fee - Charges for outside Alcohol in Venue which will be discussed as per guests.\n\n`;
    } else if (menuType === 'Dry Hire') {
      text += editableDryHirePrices.map(row => `• *${row.day} (${row.session}):* £${row.price}`).join('\n') + '\n\n';
    } else if (menuType === 'Kids Pricing') {
      text += `(Only Applies for over 50 Adults)\n\n`;
      text += editableKidsPricing.map(kp => `• *${kp.ageRange}:* ${kp.price}`).join('\n') + '\n\n';
      text += `*NOTE:* Minimum Number of Guests will be charged as agreed. As per our policy and food safety, we don't allow any food takeaway from Banquet Venue.\n\n`;
    }

    text += `Please reply with your preferred selections. We look forward to serving you! 🙏`;
    return buildWhatsAppLink(customerPhone, text);
  };

  const buildCompletedWhatsAppText = (booking: Booking) => {
    const total = getTotalAmount(booking).toLocaleString();
    const deposit = booking.deposit.toLocaleString();
    const extraChargesTotal = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0);
    const finalPaymentPaidAmt = getTotalAmount(booking) - booking.deposit - extraChargesTotal;

    let discountText = '';
    if (booking.discount) {
      discountText = `\n• Discount (${booking.discount.reason}): -£${getDiscountAmount(booking).toLocaleString()}`;
    }

    const hallCharge = getVenueHallCharge(booking.date, booking.time);
    const hallText = hallCharge ? `\n• ${hallCharge.label}: £${hallCharge.amount.toLocaleString()}` : '';

    let extrasText = '';
    if (extraChargesTotal > 0) {
      extrasText = '\n\n*➕ Additional Adjustments:*\n' + booking.extraCharges.map(c => `• ${c.label}: +£${c.amount.toLocaleString()}`).join('\n');
    }

    const adults = booking.adults ?? booking.guests;
    const kids4to10 = booking.kids4to10 || 0;
    const kidsUnder4 = booking.kidsUnder4 || 0;
    const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
    const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;

    const guestBreakdown = `• Adults: ${adults} × £${editableBanquetPackages.find(p => p.name === (booking.selectedMenu || booking.package))?.pricePerPerson || 0}/person\n• Kids (4-10 yrs): ${kids4to10} × £${kidsPrice}/person\n• Kids (0-4 yrs): ${kidsUnder4} × Free`;

    return `Hi ${booking.name.split(' ')[0]},

Thank you so much for booking with SriLalitha Events! 🎊 Your event was a success and your booking is now fully completed.

*📝 Event Summary:*
• Event: ${booking.eventType}
• Date: ${booking.date}
• Package: ${booking.selectedMenu || booking.package}

*👥 Guest Breakdown:*
${guestBreakdown}
• Total Guests: ${adults + kids4to10 + kidsUnder4}${extrasText}

*💰 Final Invoice Details:*
• Base Amount: £${booking.baseAmount.toLocaleString()}${discountText}${hallText}
• Grand Total: £${total}

*💳 Payments Received:*
• Deposit: £${deposit}
• Main Balance Paid: £${finalPaymentPaidAmt.toLocaleString()}
${extraChargesTotal > 0 ? `• Extra Charges Paid: £${extraChargesTotal.toLocaleString()}\n` : ''}
• Status: *Paid in Full ✅*

It was an absolute pleasure serving you. We hope you and your guests had a wonderful time! We'd love to host your future events. 🙏✨`;
  };

  const buildFinalInvoiceWhatsAppText = (booking: Booking, bank: typeof bankDetails) => {
    let extrasText = '';
    if (booking.extraCharges && booking.extraCharges.length > 0) {
      extrasText = '\n\n*➕ Additional Adjustments:*\n' + booking.extraCharges.map(c => `• ${c.label}: £${c.amount.toLocaleString()}`).join('\n');
    }

    let discountText = '';
    if (booking.discount) {
      discountText = `\n\n*🏷️ Discount (${booking.discount.reason}):* -£${getDiscountAmount(booking).toLocaleString()}`;
    }

    const hallCharge = getVenueHallCharge(booking.date, booking.time);
    const hallText = hallCharge ? `\n\n*🏛️ ${hallCharge.label}:* £${hallCharge.amount.toLocaleString()}` : '';

    const dueDateText = booking.dueDate ? `\n\n*⏰ Payment Due By:* ${booking.dueDate}` : '';

    const adults = booking.adults ?? booking.guests;
    const kids4to10 = booking.kids4to10 || 0;
    const kidsUnder4 = booking.kidsUnder4 || 0;
    const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
    const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;
    const pricePerPerson = editableBanquetPackages.find(p => p.name === (booking.selectedMenu || booking.package))?.pricePerPerson || 0;

    const guestBreakdown = `*👥 Guest Breakdown:*\n• Adults: ${adults} × £${pricePerPerson}/person = £${(adults * pricePerPerson).toLocaleString()}\n• Kids (4-10 yrs): ${kids4to10} × £${kidsPrice}/person = £${(kids4to10 * kidsPrice).toLocaleString()}\n• Kids (0-4 yrs): ${kidsUnder4} × Free = £0\n• Total Guests: ${adults + kids4to10 + kidsUnder4}`;

    const grandTotal = getTotalAmount(booking);
    const extraChargesTotal = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0);
    const finalPaymentPaidAmt = grandTotal - booking.deposit - extraChargesTotal;
    
    const isDepositPaid = booking.depositPaid || !['new_enquiry', 'menu_sent', 'menu_selected', 'deposit_pending'].includes(booking.status);
    const isFinalPaid = booking.finalPaymentPaid;
    const isExtraPaid = booking.status === 'completed' || !!booking.paymentProofExtra || booking.finalPaymentPaid;
    
    const totalPaid = (isDepositPaid ? booking.deposit : 0) +
                      (isFinalPaid ? finalPaymentPaidAmt : 0) +
                      (isExtraPaid ? extraChargesTotal : 0);
                      
    const remainingBalance = grandTotal - totalPaid;
    
    const breakdownText = `*💳 Payment Breakdown:*\n` +
      `• Deposit Paid: £${booking.deposit.toLocaleString()} (${isDepositPaid ? (booking.paymentMethodDeposit ? `Paid via ${booking.paymentMethodDeposit.replace('Paid by ', '')}` : 'Paid') : 'Pending'})\n` +
      `• Final Payment (Main Balance): £${finalPaymentPaidAmt.toLocaleString()} (${isFinalPaid ? (booking.paymentMethodFinal ? `Paid via ${booking.paymentMethodFinal.replace('Paid by ', '')}` : 'Paid') : 'Pending'})\n` +
      (extraChargesTotal > 0 ? `• Extras / Adjustments: £${extraChargesTotal.toLocaleString()} (${isExtraPaid ? 'Paid' : 'Pending'})\n` : '') +
      `• Total Paid: £${totalPaid.toLocaleString()}\n` +
      `• *Remaining Balance Due: ${remainingBalance <= 0 ? 'PAID IN FULL ✓' : `£${remainingBalance.toLocaleString()}`}*`;

    return `Hi ${booking.name.split(' ')[0]}, thank you for choosing SriLalitha Events for your ${booking.eventType}! 🎉\n\nHere is your final invoice summary:\n\n*📋 Booking Ref:* ${booking.id}\n*📦 Package:* ${booking.selectedMenu || booking.package}\n\n${guestBreakdown}\n\n*💰 Base Amount:* £${booking.baseAmount.toLocaleString()}${extrasText}${discountText}${hallText}\n\n${breakdownText}${dueDateText}\n\nPlease transfer the balance to:\n🏦 Account Name: ${bank.accountName}\n📋 Sort Code: ${bank.sortCode}\n🔢 Account No: ${bank.accountNumber}\n📌 Reference: ${booking.id}\n\nOnce paid, please send a screenshot of the transfer confirmation here. Thank you!`;
  };

  const buildExtraInvoiceWhatsAppText = (booking: Booking, bank: typeof bankDetails) => {
    const nonPreset = (booking.extraCharges || []).filter(c => !c.isPreset && !(editableLiveCounter?.extras || []).some(preset => preset.name === c.label));
    const extraChargesTotal = nonPreset.reduce((sum, c) => sum + c.amount, 0);
    const extrasList = nonPreset.map(c => `• ${c.label}: £${c.amount.toLocaleString()}`).join('\n');

    return `Hi ${booking.name.split(' ')[0]},

Thank you for celebrating with us at SriLalitha Events! 🎉 We hope you had a fantastic time.

There were some additional adjustments/services added during your event:
${extrasList}

*💰 Extra Balance Due: £${extraChargesTotal.toLocaleString()}*

Please transfer this outstanding balance to:
🏦 Account Name: ${bank.accountName}
📋 Sort Code: ${bank.sortCode}
🔢 Account No: ${bank.accountNumber}
📌 Reference: ${booking.id} (Extras)

Once paid, please send a screenshot of the transfer confirmation here so we can finalize and close your booking. Thank you! 🙏`;
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setLoggedIn(true);
      setLoginError('');
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      const code = error?.code;
      if (code === 'auth/operation-not-allowed') {
        setLoginError('Email/Password provider is not enabled. Go to Firebase Console → Authentication → Sign-in method, and enable "Email/Password".');
      } else if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setLoginError('User account not found or invalid password in project (srilalitha-a0cff). Please add this user in Firebase Console → Authentication → Users.');
      } else if (code === 'auth/network-request-failed') {
        setLoginError('Network error connecting to Firebase. Please check your internet connection.');
      } else {
        setLoginError(error?.message || 'Invalid credentials or user not found in Firebase Authentication.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookingForm.name.trim()) {
      alert("Customer full name is required");
      return;
    }
    setIsCreatingBooking(true);
    try {
      const adults = Number(newBookingForm.adults) || Number(newBookingForm.guests) || 0;
      const kids4to10 = Number(newBookingForm.kids4to10) || 0;
      const kidsUnder4 = Number(newBookingForm.kidsUnder4) || 0;
      const totalGuests = (adults + kids4to10 + kidsUnder4) || Number(newBookingForm.guests) || 1;

      const selectedPkg = editableBanquetPackages.find(p => p.name === newBookingForm.package);
      const pricePerPerson = selectedPkg?.pricePerPerson || 0;
      const baseAmount = adults * pricePerPerson;
      const depositPercent = pricingDetails.depositPercentage || 30;
      const deposit = Math.round((baseAmount * depositPercent) / 100);

      const fullPhone = newBookingForm.phone ? (newBookingForm.phone.startsWith('+') ? newBookingForm.phone : `+44${newBookingForm.phone.replace(/^0/, '').replace(/\s/g, '')}`) : '';

      const docRef = await addDoc(collection(db, 'booking_requests'), {
        name: newBookingForm.name.trim(),
        email: newBookingForm.email.trim().toLowerCase(),
        phone: fullPhone,
        eventType: newBookingForm.eventType,
        date: newBookingForm.date,
        timeOfDay: newBookingForm.time,
        guests: totalGuests,
        adults,
        kids4to10,
        kidsUnder4,
        package: newBookingForm.package,
        selectedMenu: newBookingForm.package,
        message: newBookingForm.notes,
        baseAmount,
        deposit,
        depositPercentage: depositPercent,
        depositPaid: newBookingForm.status !== 'new_enquiry' && newBookingForm.status !== 'deposit_pending',
        finalPaymentPaid: newBookingForm.status === 'completed' || newBookingForm.status === 'final_payment_received',
        extraCharges: [],
        status: newBookingForm.status,
        createdAt: new Date().toISOString(),
      });

      setShowNewBookingModal(false);
      setNewBookingForm({
        name: '',
        email: '',
        phone: '',
        eventType: 'Wedding',
        date: new Date().toISOString().split('T')[0],
        time: 'Lunch (12:00pm – 4:00pm)',
        guests: '50',
        adults: '50',
        kids4to10: '0',
        kidsUnder4: '0',
        package: 'Gold Package',
        status: 'new_enquiry',
        notes: '',
      });
      setCustomAlert({ message: `Booking created successfully in database! Ref: #${docRef.id.slice(0, 6).toUpperCase()}`, type: 'success' });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      setCustomAlert({ message: `Error creating booking: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const updateStatus = async (id: string, status: BookingStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, status } : prev);
    try {
      await setDoc(doc(db, 'booking_requests', id), { status }, { merge: true });
      if (status !== 'new_enquiry') {
        const currentBooking = bookings.find(b => b.id === id);
        if (currentBooking) {
          const bookingData = {
            ...currentBooking,
            status,
            updatedAt: new Date().toISOString()
          };
          const cleanBookingData = Object.fromEntries(
            Object.entries(bookingData).filter(([_, v]) => v !== undefined)
          );
          await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
        }
      }
    } catch (error) {
      console.error('Error updating status in database:', error);
    }
  };

  const advanceStatus = async (booking: Booking) => {
    const idx = STATUS_FLOW.indexOf(booking.status);
    if (idx < STATUS_FLOW.length - 1) {
      await updateStatus(booking.id, STATUS_FLOW[idx + 1]);
    }
  };

  const handleGoBackStatus = async (id: string) => {
    const currentBooking = bookings.find(b => b.id === id);
    if (!currentBooking) return;
    const idx = STATUS_FLOW.indexOf(currentBooking.status);
    if (idx > 0) {
      const prevStatus = STATUS_FLOW[idx - 1];
      await updateStatus(id, prevStatus);
    }
  };

  const confirmDepositPaid = async (id: string, method: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, depositPaid: true, status: 'deposit_confirmed', paymentMethodDeposit: method } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, depositPaid: true, status: 'deposit_confirmed', paymentMethodDeposit: method } : prev);
    try {
      await setDoc(doc(db, 'booking_requests', id), { depositPaid: true, status: 'deposit_confirmed', paymentMethodDeposit: method }, { merge: true });
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          depositPaid: true,
          status: 'deposit_confirmed',
          paymentMethodDeposit: method,
          updatedAt: new Date().toISOString()
        };
        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
    } catch (error) {
      console.error('Error confirming deposit paid in database:', error);
    }
  };

  const handleUploadProof = async (id: string, file: File) => {
    setIsUploadingProof(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });

      const img = new window.Image();
      img.src = reader.result as string;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      const base64String = canvas.toDataURL('image/jpeg', 0.7);

      setBookings(prev => prev.map(b => b.id === id ? { ...b, paymentProofDeposit: base64String } : b));
      setSelectedBooking(prev => prev?.id === id ? { ...prev, paymentProofDeposit: base64String } : prev);

      await setDoc(doc(db, 'booking_requests', id), { paymentProofDeposit: base64String }, { merge: true });
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          paymentProofDeposit: base64String,
          updatedAt: new Date().toISOString()
        };

        // Remove undefined values which Firestore rejects
        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );

        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
      setCustomAlert({ message: 'Payment proof uploaded successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      setCustomAlert({ message: `Error uploading payment proof: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleUploadFinalProof = async (id: string, file: File) => {
    setIsUploadingFinalProof(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });

      const img = new window.Image();
      img.src = reader.result as string;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      const base64String = canvas.toDataURL('image/jpeg', 0.7);

      setBookings(prev => prev.map(b => b.id === id ? { ...b, paymentProofFinal: base64String } : b));
      setSelectedBooking(prev => prev?.id === id ? { ...prev, paymentProofFinal: base64String } : prev);

      await setDoc(doc(db, 'booking_requests', id), { paymentProofFinal: base64String }, { merge: true });
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          paymentProofFinal: base64String,
          updatedAt: new Date().toISOString()
        };

        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );

        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
      setCustomAlert({ message: 'Final payment proof uploaded successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading final payment proof:', error);
      setCustomAlert({ message: `Error uploading final payment proof: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsUploadingFinalProof(false);
    }
  };

  const handleUploadExtraProof = async (id: string, file: File) => {
    setIsUploadingExtraProof(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });

      const img = new window.Image();
      img.src = reader.result as string;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      const base64String = canvas.toDataURL('image/jpeg', 0.7);

      setBookings(prev => prev.map(b => b.id === id ? { ...b, paymentProofExtra: base64String } : b));
      setSelectedBooking(prev => prev?.id === id ? { ...prev, paymentProofExtra: base64String } : prev);

      await setDoc(doc(db, 'booking_requests', id), { paymentProofExtra: base64String }, { merge: true });
      const currentBooking = bookings.find(b => b.id === id);
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          paymentProofExtra: base64String,
          updatedAt: new Date().toISOString()
        };

        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );

        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
      setCustomAlert({ message: 'Extra payment proof uploaded successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading extra payment proof:', error);
      setCustomAlert({ message: `Error uploading extra payment proof: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsUploadingExtraProof(false);
    }
  };

  const confirmFinalPayment = async (id: string, method: string) => {
    const currentBooking = bookings.find(b => b.id === id);
    
    setBookings(prev => prev.map(b => b.id === id ? { ...b, finalPaymentPaid: true, status: 'final_payment_received', paymentMethodFinal: method } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, finalPaymentPaid: true, status: 'final_payment_received', paymentMethodFinal: method } : prev);
    try {
      await setDoc(doc(db, 'booking_requests', id), { 
        finalPaymentPaid: true, 
        status: 'final_payment_received', 
        paymentMethodFinal: method
      }, { merge: true });
      if (currentBooking) {
        const bookingData = {
          ...currentBooking,
          finalPaymentPaid: true,
          status: 'final_payment_received',
          paymentMethodFinal: method,
          updatedAt: new Date().toISOString()
        };
        const cleanBookingData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
      }
    } catch (error) {
      console.error('Error confirming final payment in database:', error);
    }
  };

  const handleDeleteBooking = (id: string, name: string) => {
    setBookingToDelete({ id, name });
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    try {
      await deleteDoc(doc(db, 'booking_requests', bookingToDelete.id));
      await deleteDoc(doc(db, 'bookings', bookingToDelete.id));
      setBookings(prev => prev.filter(b => b.id !== bookingToDelete.id));
      if (selectedBooking?.id === bookingToDelete.id) {
        setSelectedBooking(null);
      }
      setCustomAlert({ message: 'Booking deleted successfully', type: 'success' });
    } catch (error) {
      console.error('Error deleting booking:', error);
      setCustomAlert({ message: 'Error deleting booking. Please try again.', type: 'error' });
    } finally {
      setBookingToDelete(null);
    }
  };

  const addExtraCharge = async (id: string) => {
    if (!extraLabel || !extraAmount) return;
    const charge: ExtraCharge = { label: extraLabel, amount: parseFloat(extraAmount) };
    const currentBooking = bookings.find(b => b.id === id);
    if (!currentBooking) return;
    const newExtraCharges = [...(currentBooking.extraCharges || []), charge];

    setBookings(prev => prev.map(b => b.id === id ? { ...b, extraCharges: newExtraCharges } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, extraCharges: newExtraCharges } : prev);
    setExtraLabel('');
    setExtraAmount('');

    try {
      await setDoc(doc(db, 'booking_requests', id), { extraCharges: newExtraCharges }, { merge: true });
      const bookingData = {
        ...currentBooking,
        extraCharges: newExtraCharges,
        updatedAt: new Date().toISOString()
      };
      const cleanBookingData = Object.fromEntries(
        Object.entries(bookingData).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
    } catch (error) {
      console.error('Error adding extra charge to database:', error);
    }
  };

  const requestDiscount = async (id: string) => {
    if (!discountValue || !discountReason) return;
    const currentBooking = bookings.find(b => b.id === id);
    if (!currentBooking) return;

    const discountReq: DiscountRequest = {
      type: discountType,
      value: parseFloat(discountValue),
      reason: discountReason,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    setBookings(prev => prev.map(b => b.id === id ? { ...b, discountRequest: discountReq } : b));
    setSelectedBooking(prev => prev?.id === id ? { ...prev, discountRequest: discountReq } : prev);

    try {
      await setDoc(doc(db, 'booking_requests', id), { discountRequest: discountReq }, { merge: true });
      const bookingData = {
        ...currentBooking,
        discountRequest: discountReq,
        updatedAt: new Date().toISOString()
      };
      const cleanBookingData = Object.fromEntries(
        Object.entries(bookingData).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
    } catch (error) {
      console.error('Error requesting discount:', error);
    }

    setDiscountValue('');
    setDiscountReason('');
    setCustomAlert({ message: 'Request has been sent to Management. Please wait for confirmation.', type: 'success' });
  };

  const handleDiscountApproval = async (bookingId: string, approved: boolean) => {
    const b = bookings.find(x => x.id === bookingId);
    if (!b || !b.discountRequest) return;
    
    if (approved) {
      const discount: Discount = {
        type: b.discountRequest.type,
        value: b.discountRequest.value,
        reason: b.discountRequest.reason
      };
      
      const reqUpdated = { ...b.discountRequest, status: 'approved' as const };
      
      setBookings(prev => prev.map(x => x.id === bookingId ? { ...x, discount, discountRequest: reqUpdated } : x));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => prev ? { ...prev, discount, discountRequest: reqUpdated } : prev);
      }
      
      try {
        await setDoc(doc(db, 'booking_requests', bookingId), { discount, discountRequest: reqUpdated }, { merge: true });
        const cleanBookingData = { ...b, discount, discountRequest: reqUpdated, updatedAt: new Date().toISOString() };
        const finalData = Object.fromEntries(Object.entries(cleanBookingData).filter(([_, v]) => v !== undefined));
        await setDoc(doc(db, 'bookings', bookingId), finalData, { merge: true });
      } catch (e) {
        console.error(e);
      }
      setCustomAlert({ message: 'Discount approved successfully!', type: 'success' });
    } else {
      const reqUpdated = { ...b.discountRequest, status: 'rejected' as const };
      setBookings(prev => prev.map(x => x.id === bookingId ? { ...x, discountRequest: reqUpdated } : x));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => prev ? { ...prev, discountRequest: reqUpdated } : prev);
      }
      try {
        await setDoc(doc(db, 'booking_requests', bookingId), { discountRequest: reqUpdated }, { merge: true });
        const cleanBookingData = { ...b, discountRequest: reqUpdated, updatedAt: new Date().toISOString() };
        const finalData = Object.fromEntries(Object.entries(cleanBookingData).filter(([_, v]) => v !== undefined));
        await setDoc(doc(db, 'bookings', bookingId), finalData, { merge: true });
      } catch (e) {
        console.error(e);
      }
      setCustomAlert({ message: 'Discount request rejected.', type: 'success' });
    }
  };

  const removeDiscount = async (id: string) => {
    const currentBooking = bookings.find(b => b.id === id);
    if (!currentBooking) return;

    setBookings(prev => prev.map(b => {
      if (b.id === id) {
        const { discount, ...rest } = b;
        return rest as Booking;
      }
      return b;
    }));

    setSelectedBooking(prev => {
      if (prev?.id === id) {
        const { discount, ...rest } = prev;
        return rest as Booking;
      }
      return prev;
    });

    try {
      await setDoc(doc(db, 'booking_requests', id), { discount: null }, { merge: true });
      const { discount, ...restBookingData } = currentBooking;
      const bookingData = {
        ...restBookingData,
        discount: null,
        updatedAt: new Date().toISOString()
      };
      const cleanBookingData = Object.fromEntries(
        Object.entries(bookingData).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'bookings', id), cleanBookingData, { merge: true });
    } catch (error) {
      console.error('Error removing discount:', error);
    }
  };

  const removeExtraCharge = async (bookingId: string, idx: number) => {
    const currentBooking = bookings.find(b => b.id === bookingId);
    if (!currentBooking) return;
    const newExtraCharges = (currentBooking.extraCharges || []).filter((_, i) => i !== idx);

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, extraCharges: newExtraCharges } : b));
    setSelectedBooking(prev => prev?.id === bookingId ? { ...prev, extraCharges: newExtraCharges } : prev);

    try {
      await setDoc(doc(db, 'booking_requests', bookingId), { extraCharges: newExtraCharges }, { merge: true });
      const bookingData = {
        ...currentBooking,
        extraCharges: newExtraCharges,
        updatedAt: new Date().toISOString()
      };
      const cleanBookingData = Object.fromEntries(
        Object.entries(bookingData).filter(([_, v]) => v !== undefined)
      );
      await setDoc(doc(db, 'bookings', bookingId), cleanBookingData, { merge: true });
    } catch (error) {
      console.error('Error removing extra charge from database:', error);
    }
  };

  const handleBlockDate = async () => {
    if (!blockDateInput) return;
    try {
      await setDoc(doc(db, 'blocked_dates', blockDateInput), { date: blockDateInput });
      setBlockDateInput('');
    } catch (error) {
      console.error('Error blocking date:', error);
    }
  };

  const handleUnblockDate = async (dateStr: string) => {
    try {
      await deleteDoc(doc(db, 'blocked_dates', dateStr));
    } catch (error) {
      console.error('Error unblocking date:', error);
    }
  };

  const updateBankDetail = async (field: string, value: string) => {
    const updated = { ...bankDetails, [field]: value };
    setBankDetails(updated);
    try {
      await setDoc(doc(db, 'site_data', 'bank_details'), updated, { merge: true });
    } catch (error) {
      console.error('Error saving bank details:', error);
    }
  };

  const [isSavingVenueDetails, setIsSavingVenueDetails] = useState(false);

  const saveVenueDetails = async () => {
    setIsSavingVenueDetails(true);
    try {
      await setDoc(doc(db, 'site_data', 'venue_details'), venueDetails, { merge: true });
      setCustomAlert({ message: 'Venue details successfully updated on the website!', type: 'success' });
    } catch (error) {
      console.error('Error saving venue details:', error);
      setCustomAlert({ message: 'Error saving venue details.', type: 'error' });
    } finally {
      setIsSavingVenueDetails(false);
    }
  };

  const [isSavingPricingDetails, setIsSavingPricingDetails] = useState(false);

  const savePricingDetails = async () => {
    setIsSavingPricingDetails(true);
    try {
      await setDoc(doc(db, 'site_data', 'pricing_details'), pricingDetails, { merge: true });
      setCustomAlert({ message: 'Pricing & Deposits successfully updated!', type: 'success' });
    } catch (error) {
      console.error('Error saving pricing details:', error);
      setCustomAlert({ message: 'Error saving pricing details.', type: 'error' });
    } finally {
      setIsSavingPricingDetails(false);
    }
  };

  const updateAndSaveRestaurantLocation = async (address: string, coords?: { lat: number; lng: number; postcode?: string }) => {
    const updated: DeliveryLocationConfig = {
      ...deliverySettings,
      venueAddress: address,
      venueLat: coords?.lat !== undefined ? coords.lat : deliverySettings.venueLat,
      venueLng: coords?.lng !== undefined ? coords.lng : deliverySettings.venueLng,
      venuePostcode: coords?.postcode !== undefined ? coords.postcode : deliverySettings.venuePostcode,
    };
    setDeliverySettings(updated);
    try {
      await setDoc(doc(db, 'site_data', 'delivery_settings'), JSON.parse(JSON.stringify(updated)), { merge: true });
      await setDoc(doc(db, 'site_data', 'venue_details'), {
        address: updated.venueAddress,
        venueLat: updated.venueLat,
        venueLng: updated.venueLng,
      }, { merge: true });
    } catch (e) {
      console.error('Error auto-saving restaurant location:', e);
    }
  };

  const saveDeliverySettings = async () => {
    setIsSavingDeliverySettings(true);
    try {
      const cleanData = JSON.parse(JSON.stringify(deliverySettings));
      await setDoc(doc(db, 'site_data', 'delivery_settings'), cleanData, { merge: true });
      await setDoc(doc(db, 'site_data', 'venue_details'), {
        address: deliverySettings.venueAddress,
        venueLat: deliverySettings.venueLat,
        venueLng: deliverySettings.venueLng,
      }, { merge: true });
      setCustomAlert({ message: 'Restaurant location & dynamic delivery pricing rules saved successfully!', type: 'success' });
    } catch (error: any) {
      console.error('Error saving delivery settings:', error);
      setCustomAlert({ message: `Error saving delivery settings: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsSavingDeliverySettings(false);
    }
  };

  const getDiscountAmount = (b: Booking) => {
    if (!b.discount) return 0;
    const subtotal = b.baseAmount + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0);
    if (b.discount.type === 'percentage') {
      return (subtotal * b.discount.value) / 100;
    }
    return b.discount.value;
  };

  const getVenueHallCharge = (date: string, time: string): { label: string; amount: number } | null => {
    if (!date || date === 'N/A') return null;
    const d = new Date(date);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const timeLower = (time || '').toLowerCase();
    const isDinner = timeLower.includes('dinner') || timeLower.includes('evening') || timeLower.includes('pm');

    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      // Mon–Thu: £100
      return { label: 'Venue Hall Hire (Mon–Thu)', amount: 100 };
    } else if (dayOfWeek === 5) {
      // Friday: £250
      return { label: 'Venue Hall Hire (Friday)', amount: 250 };
    } else if (dayOfWeek === 0) {
      // Sunday: £250
      return { label: 'Venue Hall Hire (Sunday)', amount: 250 };
    } else if (dayOfWeek === 6) {
      // Saturday: Lunch=£250, Dinner=£500
      if (isDinner) {
        return { label: 'Venue Hall Hire (Saturday Dinner)', amount: 500 };
      } else {
        return { label: 'Venue Hall Hire (Saturday Lunch)', amount: 250 };
      }
    }
    return null;
  };

  const getFoodPackageTotal = (b: Booking) => {
    const subtotal = b.baseAmount + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0);
    return subtotal - getDiscountAmount(b);
  };

  const getTotalAmount = (b: Booking) => {
    const food = getFoodPackageTotal(b);
    const hall = getVenueHallCharge(b.date, b.time);
    return food + (hall?.amount || 0);
  };

  const downloadInvoicePDF = (bookingData: Booking, isDepositOnly: boolean = false) => {
    const booking = { ...bookingData };
    if (isDepositOnly) {
      booking.finalPaymentPaid = false;
      booking.paymentProofFinal = undefined;
      booking.paymentProofExtra = undefined;
      booking.status = 'deposit_confirmed';
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const extraChargesTotal = (booking.extraCharges || []).reduce((s, c) => s + c.amount, 0);
    const adults = booking.adults ?? booking.guests;
    const kids4to10 = booking.kids4to10 || 0;
    const kidsUnder4 = booking.kidsUnder4 || 0;
    const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
    const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;
    const pricePerPerson = editableBanquetPackages.find(p => p.name === (booking.selectedMenu || booking.package))?.pricePerPerson || 0;
    const hallCharge = getVenueHallCharge(booking.date, booking.time);
    const grandTotal = getTotalAmount(booking);
    const discountAmount = getDiscountAmount(booking);
    const finalPaymentPaidAmt = grandTotal - booking.deposit - extraChargesTotal;
    const isDepositPaid = booking.depositPaid || !['new_enquiry', 'menu_sent', 'menu_selected', 'deposit_pending'].includes(booking.status);
    const isExtraPaid = booking.status === 'completed' || !!booking.paymentProofExtra || booking.finalPaymentPaid;
    
    // Format dates
    const formattedDate = booking.date ? new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
    const formattedEnquiryDate = booking.enquiryDate ? new Date(booking.enquiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

    // Construct logo source (ensure it points to the absolute path of the domain)
    const logoUrl = window.location.origin + '/assets/images/srilalitha.png';

    // Build the proof screenshots section
    let screenshotsHTML = '';
    if (booking.paymentProofDeposit || booking.paymentProofFinal || booking.paymentProofExtra) {
      screenshotsHTML += `
        <div class="section-title">Payment Verification Screenshots</div>
        <div class="proof-container">
      `;
      if (booking.paymentProofDeposit) {
        screenshotsHTML += `
          <div class="proof-card">
            <div class="proof-label">Deposit Payment Proof</div>
            <img src="${booking.paymentProofDeposit}" alt="Deposit Proof" />
          </div>
        `;
      }
      if (booking.paymentProofFinal) {
        screenshotsHTML += `
          <div class="proof-card">
            <div class="proof-label">Final Payment Proof</div>
            <img src="${booking.paymentProofFinal}" alt="Final Proof" />
          </div>
        `;
      }
      if (booking.paymentProofExtra) {
        screenshotsHTML += `
          <div class="proof-card">
            <div class="proof-label">Extra Charges Payment Proof</div>
            <img src="${booking.paymentProofExtra}" alt="Extra Proof" />
          </div>
        `;
      }
      screenshotsHTML += `</div>`;
    }

    // Build extra charges rows
    let extrasRows = '';
    if (booking.extraCharges && booking.extraCharges.length > 0) {
      booking.extraCharges.forEach(extra => {
        extrasRows += `
          <tr>
            <td>• ${extra.label}</td>
            <td class="text-right">+£${extra.amount.toLocaleString()}</td>
          </tr>
        `;
      });
    }

    // Build html content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Booking Summary & Invoice - ${booking.name}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            margin: 0;
            padding: 40px;
            line-height: 1.5;
            font-size: 14px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #C8860A;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header-left h1 {
            margin: 0 0 5px 0;
            font-size: 24px;
            color: #1a1a1a;
            letter-spacing: -0.5px;
          }
          .header-left p {
            margin: 0;
            color: #666;
            font-size: 13px;
          }
          .logo {
            max-height: 50px;
            object-fit: contain;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
          }
          .details-card h3 {
            margin: 0 0 10px 0;
            color: #C8860A;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .details-label {
            color: #666;
            font-weight: 500;
          }
          .details-value {
            font-weight: 600;
            color: #1a1a1a;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #1a1a1a;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #eee;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
          }
          .text-right {
            text-align: right;
          }
          .totals-table {
            width: 50%;
            margin-left: auto;
          }
          .totals-table td {
            border: none;
            padding: 6px 10px;
          }
          .grand-total {
            font-size: 16px;
            font-weight: 700;
            color: #C8860A;
            border-top: 2px solid #C8860A !important;
            border-bottom: 2px solid #C8860A !important;
            padding: 10px !important;
          }
          .proof-container {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-top: 15px;
            page-break-inside: avoid;
          }
          .proof-card {
            flex: 1;
            min-width: 200px;
            max-width: 250px;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            background-color: #fdfdfd;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            text-align: center;
          }
          .proof-label {
            font-size: 12px;
            font-weight: bold;
            color: #555;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .proof-card img {
            max-width: 100%;
            max-height: 180px;
            object-fit: contain;
            border-radius: 4px;
          }
          .footer-note {
            margin-top: 50px;
            border-top: 1px solid #eee;
            padding-top: 20px;
            text-align: center;
            color: #888;
            font-size: 11px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .proof-card {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>INVOICE & ORDER SUMMARY</h1>
            <p>Booking Reference: <strong>#${booking.id}</strong></p>
            <p>Enquiry Date: ${formattedEnquiryDate}</p>
          </div>
          <img class="logo" src="${logoUrl}" alt="SriLalitha Events Logo" />
        </div>

        <div class="grid-2">
          <div class="details-card">
            <h3>Customer Details</h3>
            <div class="details-row">
              <span class="details-label">Name</span>
              <span class="details-value">${booking.name || 'N/A'}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Phone</span>
              <span class="details-value">${booking.phone || 'N/A'}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Email</span>
              <span class="details-value">${booking.email || 'N/A'}</span>
            </div>
          </div>

          <div class="details-card">
            <h3>Event Details</h3>
            <div class="details-row">
              <span class="details-label">Event Type</span>
              <span class="details-value">${booking.eventType || 'N/A'}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Date & Time</span>
              <span class="details-value">${formattedDate} (${booking.time || 'N/A'})</span>
            </div>
            <div class="details-row">
              <span class="details-label">Total Guests</span>
              <span class="details-value">${adults + kids4to10 + kidsUnder4} Guests</span>
            </div>
          </div>
        </div>

        <div class="section-title">Order Items & Package details</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Package: ${booking.selectedMenu || booking.package || 'Not Selected'}</strong>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                  • Adults: ${adults} × £${pricePerPerson}/person<br/>
                  • Kids (4-10 yrs): ${kids4to10} × £${kidsPrice}/person<br/>
                  • Kids (0-4 yrs): ${kidsUnder4} × Free
                </div>
              </td>
              <td class="text-right" style="vertical-align: middle;">£${booking.baseAmount.toLocaleString()}</td>
            </tr>
            ${hallCharge ? `
            <tr>
              <td>🏛️ ${hallCharge.label}</td>
              <td class="text-right">£${hallCharge.amount.toLocaleString()}</td>
            </tr>
            ` : ''}
            ${extrasRows}
          </tbody>
        </table>

        <div class="section-title">Payment Summary</div>
        <table class="totals-table">
          <tbody>
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">£${(booking.baseAmount + (hallCharge?.amount || 0) + extraChargesTotal).toLocaleString()}</td>
            </tr>
            ${booking.discount ? `
            <tr>
              <td style="color: #d9534f;">Discount (${booking.discount.reason}):</td>
              <td class="text-right" style="color: #d9534f;">-£${discountAmount.toLocaleString()}</td>
            </tr>
            ` : ''}
            <tr class="grand-total">
              <td>Grand Total (Incl. Hall):</td>
              <td class="text-right">£${grandTotal.toLocaleString()}</td>
            </tr>
            
            <!-- Payment Breakdown Details -->
            <tr>
              <td colspan="2" style="padding-top: 15px; padding-bottom: 5px; font-weight: bold; border-bottom: 1px solid #eee; color: #C8860A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                Payment Breakdown
              </td>
            </tr>
            <tr>
              <td style="padding-top: 8px; padding-left: 10px; color: #555;">
                • Deposit Paid:
                ${isDepositPaid && booking.paymentMethodDeposit ? `
                  <div style="font-size: 11px; color: #666; margin-left: 10px; margin-top: 2px; font-style: italic;">
                    Paid via ${booking.paymentMethodDeposit.replace('Paid by ', '')}
                  </div>
                ` : ''}
              </td>
              <td class="text-right" style="padding-top: 8px; color: ${isDepositPaid ? '#2b7a4a' : '#c86a00'}; font-weight: 500;">
                ${isDepositPaid ? `-£${booking.deposit.toLocaleString()} (Paid)` : `£${booking.deposit.toLocaleString()} (Pending)`}
              </td>
            </tr>
            <tr>
              <td style="padding-left: 10px; color: #555;">
                • Final Payment (Main Balance):
                ${booking.finalPaymentPaid && booking.paymentMethodFinal ? `
                  <div style="font-size: 11px; color: #666; margin-left: 10px; margin-top: 2px; font-style: italic;">
                    Paid via ${booking.paymentMethodFinal.replace('Paid by ', '')}
                  </div>
                ` : ''}
              </td>
              <td class="text-right" style="color: ${booking.finalPaymentPaid ? '#2b7a4a' : '#c86a00'}; font-weight: 500;">
                ${booking.finalPaymentPaid ? `-£${finalPaymentPaidAmt.toLocaleString()} (Paid)` : `£${finalPaymentPaidAmt.toLocaleString()} (Pending)`}
              </td>
            </tr>
            
            ${(booking.extraCharges || []).map(extra => `
            <tr>
              <td style="padding-left: 10px; color: #555; vertical-align: top;">
                • ${extra.label}:
                ${isExtraPaid && booking.paymentMethodFinal ? `
                  <div style="font-size: 11px; color: #666; margin-left: 10px; margin-top: 2px; font-style: italic;">
                    Paid via ${booking.paymentMethodFinal.replace('Paid by ', '')}
                  </div>
                ` : ''}
              </td>
              <td class="text-right" style="color: ${isExtraPaid ? '#2b7a4a' : '#c86a00'}; font-weight: 500; vertical-align: top;">
                ${isExtraPaid ? `-£${extra.amount.toLocaleString()} (Paid)` : `£${extra.amount.toLocaleString()} (Pending)`}
              </td>
            </tr>
            `).join('')}
            
            <tr style="border-top: 1px solid #ddd;">
              <td style="font-weight: bold; padding-top: 10px;">Total Paid:</td>
              <td class="text-right" style="font-weight: bold; color: #2b7a4a; padding-top: 10px;">
                £${(
                  (isDepositPaid ? booking.deposit : 0) +
                  (booking.finalPaymentPaid ? finalPaymentPaidAmt : 0) +
                  (isExtraPaid ? extraChargesTotal : 0)
                ).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding-bottom: 10px;">Remaining Balance Due:</td>
              <td class="text-right" style="font-weight: bold; color: ${
                (grandTotal - (
                  (isDepositPaid ? booking.deposit : 0) +
                  (booking.finalPaymentPaid ? finalPaymentPaidAmt : 0) +
                  (isExtraPaid ? extraChargesTotal : 0)
                )) <= 0 ? '#2b7a4a' : '#c86a00'
              }; padding-bottom: 10px;">
                ${(grandTotal - (
                  (isDepositPaid ? booking.deposit : 0) +
                  (booking.finalPaymentPaid ? finalPaymentPaidAmt : 0) +
                  (isExtraPaid ? extraChargesTotal : 0)
                )) <= 0 ? 'PAID IN FULL ✓' : `£${(grandTotal - (
                  (isDepositPaid ? booking.deposit : 0) +
                  (booking.finalPaymentPaid ? finalPaymentPaidAmt : 0) +
                  (isExtraPaid ? extraChargesTotal : 0)
                )).toLocaleString()}`}
              </td>
            </tr>
          </tbody>
        </table>

        ${screenshotsHTML}

        <div class="footer-note">
          Thank you for choosing SriLalitha Events. If you have any questions regarding this invoice, please contact us.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const isOnlineOrder = (b: Booking) => Boolean(b.isOnlineOrder || b.stripeSessionId || b.selectedMenuDishes);

  const enquiries = bookings.filter(b => b.status === 'new_enquiry' && !isOnlineOrder(b));
  const activeBookings = bookings.filter(b => b.status !== 'new_enquiry' && b.status !== 'completed' && !isOnlineOrder(b));
  const completedBookings = bookings.filter(b => b.status === 'completed' && !isOnlineOrder(b)).sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime());
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime());
    return bTime - aTime;
  });

  const historyBookings = bookings.filter(b => {
    const statusIndex = STATUS_FLOW.indexOf(b.status);
    return statusIndex >= STATUS_FLOW.indexOf('deposit_confirmed') || isOnlineOrder(b);
  }).sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime());
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime());
    return bTime - aTime;
  });

  // Derive real-time customers dynamically from the live bookings list
  const customers: Customer[] = useMemo(() => {
    const customerMap: Record<string, Customer> = {};

    bookings.forEach((b) => {
      const nameKey = (b.name || 'Unknown').trim().toLowerCase();
      const contactKey = (b.email || b.phone || '').trim().toLowerCase();
      const key = `${nameKey}_${contactKey}`;
      if (!key) return;

      const eventCost = getTotalAmount(b);
      const isDepositPaid = b.depositPaid || b.status === 'deposit_confirmed' || b.status === 'event_scheduled' || b.status === 'event_completed' || b.status === 'final_invoice_sent' || b.status === 'final_payment_received' || b.status === 'completed';
      const spent = isDepositPaid ? eventCost : 0;
      const isActive = b.status !== 'completed';

      if (!customerMap[key]) {
        customerMap[key] = {
          id: key,
          name: b.name || 'Unknown',
          email: b.email || 'N/A',
          phone: b.phone || 'N/A',
          totalBookings: 1,
          totalSpent: spent,
          lastEvent: b.date || 'N/A',
          status: isActive ? 'active' : 'inactive'
        };
      } else {
        const existing = customerMap[key];
        existing.totalBookings += 1;
        existing.totalSpent += spent;

        if (b.date && b.date > existing.lastEvent) {
          existing.lastEvent = b.date;
        }

        if (isActive) {
          existing.status = 'active';
        }
      }
    });

    return Object.values(customerMap);
  }, [bookings]);

  const stats = {
    total: bookings.length,
    newEnquiries: enquiries.length,
    active: activeBookings.length,
    completed: completedBookings.length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((s, b) => s + getTotalAmount(b), 0),
    depositsCollected: bookings.filter(b => b.depositPaid).reduce((s, b) => s + b.deposit, 0),
    outstanding: bookings.filter(b => b.depositPaid && !b.finalPaymentPaid && b.status !== 'new_enquiry').reduce((s, b) => s + (getTotalAmount(b) - b.deposit), 0),
  };

  const eventTypes = [...new Set(bookings.filter(b => !isOnlineOrder(b)).map(b => b.eventType))];

  const filtered = bookings.filter(b => {
    if (isOnlineOrder(b)) return false;
    const statusMatch = filterStatus === 'all' || b.status === filterStatus;
    const eventMatch = filterEvent === 'all' || b.eventType === filterEvent;
    return statusMatch && eventMatch;
  });

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const calendarBookings = bookings.filter(b => {
    const d = new Date(b.date);
    return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth && b.status !== 'new_enquiry';
  });

  const getBookingsForDay = (day: number) => {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarBookings.filter(b => b.date === dateStr);
  };

  const pendingDiscounts = bookings.filter(b => b.discountRequest?.status === 'pending');
  const onlineOrdersList = useMemo(() => {
    return bookings.filter(b => isOnlineOrder(b));
  }, [bookings]);
  
  const navItems: { id: AdminTab; label: string; icon: string; badge?: number; requiredPerm?: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'Squares2X2Icon' },
    { id: 'online_orders', label: 'Online Orders', icon: 'ShoppingBagIcon', badge: onlineOrdersList.filter(o => o.status === 'deposit_confirmed' || o.depositPaid).length || undefined, requiredPerm: 'manage_bookings' },
    { id: 'enquiries', label: 'Enquiries', icon: 'InboxIcon', badge: stats.newEnquiries, requiredPerm: 'manage_enquiries' },
    { id: 'bookings', label: 'Bookings', icon: 'CalendarDaysIcon', badge: activeBookings.length || undefined, requiredPerm: 'manage_bookings' },
    { id: 'calendar', label: 'Calendar', icon: 'CalendarIcon', requiredPerm: 'manage_calendar' },
    { id: 'customers', label: 'Customers', icon: 'UsersIcon', requiredPerm: 'manage_customers' },
    { id: 'payments', label: 'Payments', icon: 'CreditCardIcon', requiredPerm: 'manage_payments' },
    { id: 'menus', label: 'Menus', icon: 'ClipboardDocumentListIcon', requiredPerm: 'manage_menus' },
    { id: 'history', label: 'History', icon: 'ArchiveBoxIcon', requiredPerm: 'manage_history' },
    { id: 'discount_approvals', label: 'Discount Approvals', icon: 'TagIcon', badge: pendingDiscounts.length || undefined, requiredPerm: 'manage_discounts' },
    { id: 'settings', label: 'Settings', icon: 'Cog6ToothIcon', requiredPerm: 'manage_settings' },
    { id: 'access', label: 'Access Control', icon: 'ShieldCheckIcon', requiredPerm: 'manage_access' },
    { id: 'tracker', label: 'Booking Tracker', icon: 'MapIcon', requiredPerm: 'manage_tracker' },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (userPermissions === 'all') return true;
    if (!item.requiredPerm) return true; // always show overview if they log in
    return userPermissions.includes(item.requiredPerm);
  });

  // ─── AUTHENTICATION LOADING ────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-lighter">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#C8860A] border-t-transparent" />
      </div>
    );
  }

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-surface-lighter">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #F0A830, transparent)' }} />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #C8860A, transparent)' }} />
        </div>
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/assets/images/srilalitha.png"
              alt="SriLalitha logo"
              style={{ maxHeight: '60px', width: 'auto', objectFit: 'contain' }}
              className="mb-1"
            />
            <p className="text-sm text-gray-400 mt-1">Admin Portal</p>
          </div>
          <div className="border-t border-gray-100 mb-6" />
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" placeholder="srilalithaadmin@gmail.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none bg-gray-50" placeholder="••••••••" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={20} />
                </button>
              </div>
            </div>
            {loginError && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{loginError}</div>}
            <button type="submit" disabled={isLoggingIn} className="w-full text-white font-semibold py-2.5 rounded-xl transition-all text-sm shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
              {isLoggingIn ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 h-screen inset-y-0 left-0 z-50 w-60 flex-shrink-0 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} bg-surface border-r border-surface-border`}>
        <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2.5">
          <div>
            <img
              src="/assets/images/srilalitha.png"
              alt="SriLalitha logo"
              style={{ maxHeight: '40px', width: 'auto', objectFit: 'contain' }}
            />
            <div className="text-xs mt-1" style={{ color: '#A08060' }}>Admin Dashboard</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'text-white shadow-md' : 'hover:text-maroon-primary'}`}
              style={activeTab === item.id ? { background: 'linear-gradient(135deg, #C8860A, #F0A830)', color: 'white' } : { color: '#A08060' }}>
              <Icon name={item.icon as 'CalendarDaysIcon'} size={17} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? <span className="bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-surface-border">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,134,10,0.2)' }}>
              <Icon name="UserCircleIcon" size={16} style={{ color: '#F0A830' }} />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: '#F0A830' }}>{currentUser?.role || 'Super Admin'}</div>
              <div className="text-xs" style={{ color: '#A08060' }}>{currentUser?.email || ''}</div>
            </div>
          </div>
          <button
            onClick={() => setShowSignOutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:text-maroon-primary cursor-pointer"
            style={{ color: '#A08060' }}
          >
            <Icon name="ArrowRightOnRectangleIcon" size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
              <Icon name="Bars3Icon" size={22} />
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900 capitalize">{navItems.find(n => n.id === activeTab)?.label}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                {activeTab === 'overview' && 'Business at a glance'}
                {activeTab === 'enquiries' && `${stats.newEnquiries} new enquiries awaiting action`}
                {activeTab === 'bookings' && `${activeBookings.length} active bookings in progress`}
                {activeTab === 'calendar' && `${MONTHS[calendarMonth]} ${calendarYear}`}
                {activeTab === 'customers' && `${customers.length} registered customers`}
                {activeTab === 'payments' && 'Track deposits and balances'}
                {activeTab === 'menus' && 'Manage catering packages'}
                {activeTab === 'history' && `${historyBookings.length} history records`}
                {activeTab === 'settings' && 'Venue configuration'}
                {activeTab === 'access' && 'Manage roles and permissions'}
                {activeTab === 'discount_approvals' && 'Review discount requests'}
                {activeTab === 'tracker' && 'Track booking progress step-by-step'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="flex items-center gap-1.5 bg-[#C8860A] hover:bg-[#A06A08] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Icon name="PlusIcon" size={14} />
              <span>+ New Booking</span>
            </button>
            {stats.newEnquiries > 0 && (
              <button onClick={() => setActiveTab('enquiries')} className="hidden sm:flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {stats.newEnquiries} new
              </button>
            )}
          </div>
        </div>

        <div className="p-4 md:p-6">

          {/* ─── OVERVIEW ─── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'New Enquiries', value: stats.newEnquiries, icon: 'InboxIcon', color: 'text-blue-600', bg: 'bg-blue-50', change: 'Awaiting action', onClick: () => setActiveTab('enquiries') },
                  { label: 'Active Bookings', value: stats.active, icon: 'CalendarDaysIcon', color: 'text-amber-600', bg: 'bg-amber-50', change: 'In progress', onClick: () => setActiveTab('bookings') },
                  { label: 'Completed Events', value: stats.completed, icon: 'CheckCircleIcon', color: 'text-emerald-600', bg: 'bg-emerald-50', change: 'All time', onClick: () => setActiveTab('history') },
                  { label: 'Revenue Collected', value: `£${stats.depositsCollected.toLocaleString()}`, icon: 'BanknotesIcon', color: 'text-yellow-700', bg: 'bg-yellow-50', change: `£${stats.outstanding.toLocaleString()} outstanding`, onClick: () => setActiveTab('payments') },
                ].map((stat) => (
                  <button key={stat.label} onClick={stat.onClick} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow text-left">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`${stat.bg} p-2 rounded-lg`}>
                        <Icon name={stat.icon as 'CalendarDaysIcon'} size={18} className={stat.color} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
                    <div className="text-xs font-medium text-gray-500">{stat.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.change}</div>
                  </button>
                ))}
              </div>

              {/* Status pipeline */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 text-sm mb-4">Booking Status Pipeline</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {STATUS_FLOW.slice(0, 10).map((s) => {
                    const count = bookings.filter(b => b.status === s).length;
                    return (
                      <div key={s} className={`rounded-xl p-3 border text-center ${count > 0 ? STATUS_COLORS[s] : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-xs font-medium mt-0.5 leading-tight">{STATUS_LABELS[s]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* New enquiries */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 text-sm">New Enquiries</h2>
                    <button onClick={() => setActiveTab('enquiries')} className="text-xs font-medium hover:underline" style={{ color: '#C8860A' }}>View all</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {enquiries.slice(0, 3).map((b) => (
                      <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                          <span className="text-xs font-bold" style={{ color: '#C8860A' }}>{b.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{b.name}</div>
                          <div className="text-xs text-gray-400">{b.eventType} · {b.date} · {b.guests} guests</div>
                        </div>
                        <a href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, thank you for your enquiry with SriLalitha! We'd love to help with your ${b.eventType}. Could you confirm your preferred date and guest count?`)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={13} />
                          WhatsApp
                        </a>
                      </div>
                    ))}
                    {enquiries.length === 0 && <div className="px-5 py-8 text-center text-sm text-gray-400">No new enquiries</div>}
                  </div>
                </div>

                {/* Upcoming events */}
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 text-sm">Upcoming Events</h2>
                    <button onClick={() => setActiveTab('calendar')} className="text-xs font-medium hover:underline" style={{ color: '#C8860A' }}>Calendar</button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {bookings.filter(b => b.status === 'event_scheduled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map((b) => {
                      const d = new Date(b.date);
                      return (
                        <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                          <div className="w-10 text-center flex-shrink-0 rounded-lg py-1" style={{ background: 'rgba(200,134,10,0.08)' }}>
                            <div className="text-xs font-medium uppercase" style={{ color: '#C8860A' }}>{MONTHS[d.getMonth()]}</div>
                            <div className="text-lg font-bold leading-tight" style={{ color: '#A06A05' }}>{d.getDate()}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{b.name}</div>
                            <div className="text-xs text-gray-400">{b.eventType} · {b.time} · {b.guests} guests</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-700 flex-shrink-0">£{getTotalAmount(b).toLocaleString()}</div>
                        </div>
                      );
                    })}
                    {bookings.filter(b => b.status === 'event_scheduled').length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-gray-400">No scheduled events</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── ONLINE MENU ORDERS MODULE ─── */}
          {activeTab === 'online_orders' && (
            <div className="space-y-6">
              {/* Top Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold mb-1">
                    <span>Total Online Orders</span>
                    <Icon name="ShoppingBagIcon" size={18} className="text-[#C8860A]" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{onlineOrdersList.length}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Direct website menu customizer orders</div>
                </div>

                <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
                    <span>Paid via Stripe</span>
                    <Icon name="CheckBadgeIcon" size={18} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    £{onlineOrdersList.filter(o => o.depositPaid).reduce((s, o) => s + (o.deposit || o.baseAmount || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1">Instant online card &amp; Apple Pay deposits</div>
                </div>

                <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
                  <div className="flex items-center justify-between text-xs text-amber-900 font-semibold mb-1">
                    <span>Kitchen Prep Pending</span>
                    <Icon name="ClockIcon" size={18} className="text-[#C8860A]" />
                  </div>
                  <div className="text-2xl font-bold text-amber-900">
                    {onlineOrdersList.filter(o => !o.kitchenStatus || o.kitchenStatus === 'received' || o.kitchenStatus === 'prep').length}
                  </div>
                  <div className="text-[11px] text-amber-700 mt-1">Awaiting chef review &amp; preparation</div>
                </div>

                <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-sm bg-gradient-to-br from-white to-purple-50/30">
                  <div className="flex items-center justify-between text-xs text-purple-900 font-semibold mb-1">
                    <span>Total Order Value</span>
                    <Icon name="BanknotesIcon" size={18} className="text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    £{onlineOrdersList.reduce((s, o) => s + (o.totalEstimatedAmount || o.baseAmount || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-purple-700 mt-1">Total catering value of online orders</div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  {(['all', 'paid', 'deposit', 'kitchen', 'completed'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setOnlineOrderFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                        onlineOrderFilter === f
                          ? 'bg-[#C8860A] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' && `All Orders (${onlineOrdersList.length})`}
                      {f === 'paid' && `Paid Online (${onlineOrdersList.filter(o => o.depositPaid).length})`}
                      {f === 'deposit' && `Deposit Pending (${onlineOrdersList.filter(o => !o.depositPaid).length})`}
                      {f === 'kitchen' && `In Kitchen (${onlineOrdersList.filter(o => o.kitchenStatus === 'prep').length})`}
                      {f === 'completed' && `Ready / Done (${onlineOrdersList.filter(o => o.kitchenStatus === 'ready' || o.status === 'completed').length})`}
                    </button>
                  ))}
                </div>

                <div className="w-full md:w-72">
                  <input
                    type="text"
                    placeholder="Search by customer, phone, or order ID..."
                    value={onlineOrderSearch}
                    onChange={(e) => setOnlineOrderSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-gray-50"
                  />
                </div>
              </div>

              {/* Online Orders List */}
              {onlineOrdersList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#C8860A] flex items-center justify-center mx-auto">
                    <Icon name="ShoppingBagIcon" size={28} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">No Online Menu Orders Yet</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    When customers customize their menu dishes and pay their deposit online via Stripe on your website, orders will instantly appear here with complete dish lists, kitchen slips, and digital invoices.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {onlineOrdersList
                    .filter(order => {
                      if (onlineOrderFilter === 'paid') return order.depositPaid;
                      if (onlineOrderFilter === 'deposit') return !order.depositPaid;
                      if (onlineOrderFilter === 'kitchen') return order.kitchenStatus === 'prep';
                      if (onlineOrderFilter === 'completed') return order.kitchenStatus === 'ready' || order.status === 'completed';
                      return true;
                    })
                    .filter(order => {
                      if (!onlineOrderSearch.trim()) return true;
                      const q = onlineOrderSearch.toLowerCase();
                      return (
                        order.name.toLowerCase().includes(q) ||
                        (order.phone || '').toLowerCase().includes(q) ||
                        (order.email || '').toLowerCase().includes(q) ||
                        (order.id || '').toLowerCase().includes(q) ||
                        (order.package || '').toLowerCase().includes(q)
                      );
                    })
                    .map((order) => {
                      const totalAmt = order.totalEstimatedAmount || order.baseAmount || 0;
                      const paidAmt = order.deposit || order.amountPaidSoFar || (order.depositPaid ? totalAmt : 0);
                      const remAmt = Math.max(0, totalAmt - paidAmt);
                      const dishes = order.selectedMenuDishes || {};

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-5"
                        >
                          {/* Order Card Top Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#C8860A] flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {order.name ? order.name.charAt(0).toUpperCase() : 'O'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">{order.name}</h3>
                                  <span className="font-mono text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                    #{order.id.slice(-6).toUpperCase()}
                                  </span>
                                  {order.depositPaid && (
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      Stripe Paid
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-3">
                                  <span>{order.email}</span>
                                  <span>•</span>
                                  <span>{order.phone}</span>
                                  {order.createdAt && (
                                    <>
                                      <span>•</span>
                                      <span className="text-gray-400">
                                        Ordered {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                              <a
                                href={buildWhatsAppLink(
                                  order.phone,
                                  `Hi ${order.name}, thank you for your order with SriLalitha Catering (Order #${order.id})! We have received your menu selection for ${order.date} (${order.guests} guests). Everything is in our kitchen schedule!`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-xs flex items-center gap-1.5 transition-colors"
                              >
                                <Icon name="ChatBubbleLeftRightIcon" size={14} />
                                WhatsApp
                              </a>

                              <button
                                type="button"
                                onClick={() => setShowKitchenSlipModal(order)}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Icon name="ClipboardDocumentCheckIcon" size={14} className="text-[#C8860A]" />
                                Kitchen Slip
                              </button>

                              <button
                                type="button"
                                onClick={() => setShowInvoiceModal(order)}
                                className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Icon name="PrinterIcon" size={14} />
                                Invoice
                              </button>
                            </div>
                          </div>

                          {/* Event & Delivery Info Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Event Date &amp; Time</span>
                              <div className="font-bold text-gray-900">📅 {order.date}</div>
                              <div className="text-gray-600">⏰ {order.time || order.timeOfDay || 'Time TBD'}</div>
                              <div className="text-gray-600">👥 {order.guests} Guests</div>
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Package &amp; Cuisine</span>
                              <div className="font-bold text-[#C8860A]">{order.package || order.packageName || 'Banquet Package'}</div>
                              <div className="text-gray-600 capitalize">Cuisine: {order.cuisineType || 'Indian'}</div>
                              {order.notes && (
                                <div className="text-amber-900 italic mt-1 truncate">Note: &quot;{order.notes}&quot;</div>
                              )}
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Delivery &amp; Venue</span>
                              <div className="font-bold text-gray-900 truncate">📍 {order.location || 'Base Venue'}</div>
                              {order.distanceMiles && order.distanceMiles > 0 ? (
                                <div className="text-gray-600">
                                  🚗 {order.distanceMiles} miles ({order.deliveryCharge && order.deliveryCharge > 0 ? `+£${order.deliveryCharge} delivery` : 'Free delivery'})
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Selected Menu Dishes Breakdown */}
                          {dishes && Object.keys(dishes).length > 0 && (
                            <div className="space-y-2 border border-gray-100 rounded-xl p-4 bg-amber-50/20">
                              <span className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                                <Icon name="SparklesIcon" size={14} className="text-[#C8860A]" />
                                Customer Selected Menu Dishes ({order.package || 'Package'})
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
                                {Object.entries(dishes).map(([catKey, dishList]: [string, any]) => {
                                  if (!Array.isArray(dishList) || dishList.length === 0) return null;
                                  const catTitle = catKey
                                    .replace(/([A-Z])/g, ' $1')
                                    .replace(/^./, str => str.toUpperCase());

                                  return (
                                    <div key={catKey} className="p-2.5 rounded-lg bg-white border border-gray-200">
                                      <span className="font-bold text-gray-800 text-[11px] block mb-1">
                                        • {catTitle} ({dishList.length})
                                      </span>
                                      <div className="text-gray-600 space-y-0.5 pl-1">
                                        {dishList.map((d: any, dIdx: number) => {
                                          const dishText = typeof d === 'string'
                                            ? d
                                            : d?.name
                                              ? `${d.name}${d.price ? ` (+£${d.price}${d.perPerson ? '/person' : ''})` : ''}`
                                              : JSON.stringify(d);
                                          return (
                                            <div key={dIdx} className="truncate">
                                              {dishText}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Financial & Status Bar */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-4 text-xs">
                              <div>
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Bill</span>
                                <span className="font-bold text-gray-900 text-sm">£{totalAmt.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px] uppercase font-bold">Deposit / Paid</span>
                                <span className="font-bold text-emerald-700 text-sm">£{paidAmt.toFixed(2)}</span>
                              </div>
                              {remAmt > 0 && (
                                <div>
                                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Remaining Balance</span>
                                  <span className="font-bold text-amber-800 text-sm">£{remAmt.toFixed(2)}</span>
                                </div>
                              )}
                            </div>

                            {/* Kitchen Status Selector */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Kitchen Status:</label>
                              <select
                                value={order.kitchenStatus || 'received'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    await setDoc(doc(db, 'booking_requests', order.id), {
                                      kitchenStatus: newStatus,
                                      updatedAt: new Date().toISOString(),
                                    }, { merge: true });
                                    setCustomAlert({ message: `Updated order kitchen status to ${newStatus}`, type: 'success' });
                                  } catch (err: any) {
                                    setCustomAlert({ message: 'Failed to update status', type: 'error' });
                                  }
                                }}
                                className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold bg-gray-50 focus:bg-white focus:outline-none"
                              >
                                <option value="received">Order Received</option>
                                <option value="prep">👨‍🍳 Kitchen Preparing</option>
                                <option value="ready">📦 Ready for Dispatch</option>
                                <option value="dispatched">🚚 Dispatched / Delivered</option>
                                <option value="completed">✓ Event Completed</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ─── ENQUIRIES ─── */}
          {activeTab === 'enquiries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{enquiries.length} new enquiries awaiting your response</p>
              </div>
              {enquiries.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                  <Icon name="InboxIcon" size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400 text-sm">No new enquiries right now</p>
                </div>
              )}
              {enquiries.map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                        <span className="text-base font-bold" style={{ color: '#C8860A' }}>{b.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{b.name}</div>
                        <div className="text-xs text-gray-400">{b.email} · {b.phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.isWaitlist && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                          <span>✨</span> Waitlist / High Demand
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status]}`} />
                        {STATUS_LABELS[b.status]}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Event Type', value: b.eventType },
                      { label: 'Date', value: b.date },
                      { label: 'Guests', value: `${b.guests} people` },
                      { label: 'Enquiry Date', value: b.enquiryDate },
                    ].map((f) => (
                      <div key={f.label} className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-400 mb-0.5">{f.label}</div>
                        <div className="text-sm font-medium text-gray-800">{f.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Package Selection Banner */}
                  <div className="mt-3">
                    {b.package && b.package !== 'Not Selected' ? (
                      <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 border" style={{ background: 'rgba(200,134,10,0.06)', borderColor: 'rgba(200,134,10,0.25)' }}>
                        <span className="text-lg">🎁</span>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#C8860A' }}>Preferred Package</div>
                          <div className="text-sm font-bold text-gray-900">{b.package}</div>
                        </div>
                        <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,134,10,0.15)', color: '#A06A05' }}>Customer Selected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 border border-gray-100 bg-gray-50">
                        <span className="text-base">📋</span>
                        <div className="text-sm text-gray-400">No specific package selected — customer needs guidance</div>
                      </div>
                    )}
                  </div>

                  {b.location && (
                    <div className="mt-3 flex items-center justify-between gap-3 bg-amber-50/70 border border-amber-200/80 rounded-xl px-4 py-2.5 text-xs text-amber-950 flex-wrap shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Icon name="MapPinIcon" size={16} className="text-[#C8860A] flex-shrink-0" />
                        <div>
                          <span className="font-bold text-gray-900 block">{b.location}</span>
                          {b.distanceMiles ? (
                            <span className="text-[11px] text-amber-800 font-medium">
                              🚗 {b.distanceMiles} miles from base venue {b.deliveryCharge ? `(🚚 Delivery: £${b.deliveryCharge.toFixed(2)})` : '(Free Delivery)'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${deliverySettings.venueLat},${deliverySettings.venueLng}&destination=${encodeURIComponent(b.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C8860A] hover:underline bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs cursor-pointer"
                      >
                        <Icon name="ArrowTopRightOnSquareIcon" size={12} />
                        View Route
                      </a>
                    </div>
                  )}

                  {b.notes && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 text-sm text-amber-800">{b.notes}</div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, thank you for your enquiry with SriLalitha! We'd love to help with your ${b.eventType} on ${b.date}. Let me share our menu packages with you shortly.`)}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                      style={{ background: '#25D366', color: 'white' }}>
                      <Icon name="ChatBubbleLeftRightIcon" size={14} />
                      Reply on WhatsApp
                    </a>
                    <button onClick={() => { updateStatus(b.id, 'menu_sent'); setShowMenuPanel(true); setSelectedBooking(b); }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors"
                      style={{ borderColor: '#C8860A', color: '#C8860A' }}>
                      <Icon name="ClipboardDocumentListIcon" size={14} />
                      Send Menu & Advance
                    </button>
                    <button onClick={() => setSelectedBooking(b)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      <Icon name="EyeIcon" size={14} />
                      Full Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── BOOKINGS ─── */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex-wrap">
                  <Icon name="FunnelIcon" size={14} className="text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">Status:</span>
                  {['all', ...STATUS_FLOW.filter(s => s !== 'new_enquiry' && s !== 'completed')].map((s) => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${filterStatus === s ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                      style={filterStatus === s ? { background: 'linear-gradient(135deg, #C8860A, #F0A830)' } : {}}>
                      {s === 'all' ? 'All' : STATUS_LABELS[s as BookingStatus]}
                    </button>
                  ))}
                </div>
                <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 focus:outline-none">
                  <option value="all">All Event Types</option>
                  {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[750px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Discount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">WhatsApp</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.filter(b => b.status !== 'new_enquiry' && b.status !== 'completed').map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                                <span className="text-xs font-bold" style={{ color: '#C8860A' }}>{booking.name.charAt(0)}</span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{booking.name}</div>
                                <div className="text-xs text-gray-400">{booking.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-gray-700">{booking.eventType}</div>
                            <div className="text-xs text-gray-400">{booking.package}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-gray-700">{booking.date}</div>
                            <div className="text-xs text-gray-400">{booking.time}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm font-semibold text-gray-900">£{getTotalAmount(booking).toLocaleString()}</div>
                            {booking.depositPaid && <div className="text-xs text-emerald-600">Dep. paid</div>}
                          </td>
                          <td className="px-4 py-3.5">
                            {booking.discount ? (
                              <div className="text-sm font-semibold text-red-600">-£{getDiscountAmount(booking).toLocaleString()}</div>
                            ) : (
                              <div className="text-sm text-gray-400">—</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[booking.status]}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[booking.status]}`} />
                              {STATUS_LABELS[booking.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <a href={buildWhatsAppLink(booking.phone, `Hi ${booking.name.split(' ')[0]}, this is SriLalitha regarding your ${booking.eventType} booking on ${booking.date}.`)}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                              style={{ background: '#25D366', color: 'white' }}>
                              <Icon name="ChatBubbleLeftRightIcon" size={12} />
                              Chat
                            </a>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <button onClick={() => setSelectedBooking(booking)} className="text-xs font-semibold flex items-center gap-1 hover:underline whitespace-nowrap" style={{ color: '#C8860A' }}>
                                Manage <Icon name="ChevronRightIcon" size={12} />
                              </button>
                              {currentUser?.role === 'Super Admin' && (
                                <button onClick={() => handleDeleteBooking(booking.id, booking.name)} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors" title="Delete Booking">
                                  <Icon name="TrashIcon" size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.filter(b => b.status !== 'new_enquiry' && b.status !== 'completed').length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      <Icon name="CalendarDaysIcon" size={32} className="mx-auto mb-2 text-gray-300" />
                      No bookings match your filters
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── CALENDAR ─── */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalendarMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon name="ChevronLeftIcon" size={18} className="text-gray-500" />
                  </button>
                  <h2 className="font-semibold text-gray-900">{MONTHS[calendarMonth]} {calendarYear}</h2>
                  <button onClick={() => setCalendarMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Icon name="ChevronRightIcon" size={18} className="text-gray-500" />
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-20 rounded-lg" />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayBookings = getBookingsForDay(day);
                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isBlocked = blockedDates.includes(dateStr);
                    return (
                      <div key={day} className={`h-20 rounded-lg border p-1.5 transition-colors ${isBlocked ? 'bg-red-50/40 border-red-100 hover:bg-red-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-500">{day}</span>
                          {isBlocked && <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-0.5">🚫 Block</span>}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayBookings.slice(0, 2).map((b) => (
                            <button key={b.id} onClick={() => setSelectedBooking(b)}
                              className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium ${b.status === 'event_scheduled' ? 'bg-cyan-100 text-cyan-700' : b.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {b.name.split(' ')[0]}
                            </button>
                          ))}
                          {dayBookings.length > 2 && <div className="text-xs text-gray-400 px-1">+{dayBookings.length - 2}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">{MONTHS[calendarMonth]} Events ({calendarBookings.length})</h3>
                </div>
                {calendarBookings.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">No events this month</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {calendarBookings.sort((a, b) => a.date.localeCompare(b.date)).map((b) => {
                      const d = new Date(b.date);
                      return (
                        <div key={b.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                          <div className="w-10 text-center flex-shrink-0">
                            <div className="text-xs text-gray-400 uppercase">{MONTHS[d.getMonth()]}</div>
                            <div className="text-xl font-bold text-gray-900 leading-tight">{d.getDate()}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">{b.name} — {b.eventType}</div>
                            <div className="text-xs text-gray-400">{b.time} · {b.guests} guests · {b.package}</div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_COLORS[b.status]}`}>
                            {STATUS_LABELS[b.status]}
                          </span>
                          <a href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, just a reminder about your ${b.eventType} at SriLalitha on ${b.date} at ${b.time}. We look forward to seeing you!`)}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                            style={{ background: '#25D366', color: 'white' }}>
                            <Icon name="ChatBubbleLeftRightIcon" size={12} />
                            Remind
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── CUSTOMERS ─── */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white" />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bookings</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Spent</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Last Event</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customers.filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.email.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.toLowerCase().includes(customerSearch.toLowerCase())).map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                                <span className="text-sm font-bold" style={{ color: '#C8860A' }}>{customer.name.charAt(0)}</span>
                              </div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-gray-600">{customer.email}</div>
                            <div className="text-xs text-gray-400">{customer.phone}</div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-700 font-medium">{customer.totalBookings}</td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">{customer.totalSpent > 0 ? `£${customer.totalSpent.toLocaleString()}` : '—'}</td>
                          <td className="px-4 py-3.5 text-xs text-gray-500">{customer.lastEvent}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <a href={buildWhatsAppLink(customer.phone, `Hi ${customer.name.split(' ')[0]}, this is SriLalitha. How can we help you today?`)}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                                style={{ background: '#25D366', color: 'white' }}>
                                <Icon name="ChatBubbleLeftRightIcon" size={12} />
                                WhatsApp
                              </a>
                              <button onClick={() => setSelectedCustomer(customer)} className="text-xs font-semibold hover:underline" style={{ color: '#C8860A' }}>View</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── PAYMENTS ─── */}
          {activeTab === 'payments' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Deposits Collected', value: `£${stats.depositsCollected.toLocaleString()}`, icon: 'BanknotesIcon', color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Confirmed deposits' },
                  { label: 'Outstanding Balance', value: `£${stats.outstanding.toLocaleString()}`, icon: 'ClockIcon', color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Remaining to collect' },
                  { label: 'Total Revenue', value: `£${stats.revenue.toLocaleString()}`, icon: 'CurrencyDollarIcon', color: 'text-yellow-700', bg: 'bg-yellow-50', sub: 'Completed bookings' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                      <Icon name={s.icon as 'BanknotesIcon'} size={20} className={s.color} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Payment Tracker</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Event</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Discount</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deposit</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Balance</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deposit Proof</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Final Proof</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bookings.filter(b => b.status !== 'new_enquiry').map((b) => {
                        const total = getTotalAmount(b);
                        const balance = total - b.deposit;
                        return (
                          <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-medium text-gray-900 text-sm">{b.name}</div>
                              <div className="text-xs text-gray-400">{b.id}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="text-sm text-gray-700">{b.eventType}</div>
                              <div className="text-xs text-gray-400">{b.date}</div>
                            </td>
                            <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">£{total.toLocaleString()}</td>
                            <td className="px-4 py-3.5">
                              {b.discount ? (
                                <div className="text-sm font-semibold text-red-600">-£{getDiscountAmount(b).toLocaleString()}</div>
                              ) : (
                                <div className="text-sm text-gray-400">—</div>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className={`text-sm font-medium ${b.depositPaid ? 'text-emerald-700' : 'text-amber-600'}`}>£{b.deposit.toLocaleString()}</div>
                              <div className="text-xs text-gray-400">{b.depositPaid ? '✓ Paid' : 'Pending'}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              {b.finalPaymentPaid ? (
                                <span className="text-sm text-emerald-600 font-semibold">Paid in full</span>
                              ) : (
                                <span className="text-sm font-semibold text-amber-700">£{balance.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              {b.paymentProofDeposit ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                  <Icon name="CheckCircleIcon" size={12} /> Received
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Awaiting</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              {b.paymentProofFinal ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                                  <Icon name="CheckCircleIcon" size={12} /> Received
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Awaiting</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <button onClick={() => setSelectedBooking(b)} className="text-xs font-semibold hover:underline" style={{ color: '#C8860A' }}>Manage</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── MENUS ─── */}
          {activeTab === 'menus' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-gray-500">Edit menus, packages, and prices. Send directly to customers via WhatsApp.</p>
                <button onClick={saveAllMenusToDatabase} disabled={isSavingMenus} className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white shadow-md transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="CloudArrowUpIcon" size={16} />
                  {isSavingMenus ? 'Saving...' : 'Save Changes to Website'}
                </button>
              </div>

              {/* Menu Sub-tabs */}
              <div className="flex flex-wrap gap-2">
                {([
                  { id: 'categories', label: '📋 Restaurant Menus (9 Categories)' },
                  { id: 'live-dosa', label: '🎪 Live Dosa Station' },
                  { id: 'buffet', label: '🍛 South Indian Buffet' },
                  { id: 'banquet', label: '🎁 Banquet Packages' },
                ] as { id: AdminMenuTab; label: string }[]).map((tab) => (
                  <button key={tab.id} onClick={() => setAdminMenuTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${adminMenuTab === tab.id ? 'text-white shadow-md scale-[1.02]' : 'bg-white border border-gray-200 text-gray-700 hover:border-amber-400 shadow-2xs'}`}
                    style={adminMenuTab === tab.id ? { background: 'linear-gradient(135deg, #C8860A, #F0A830)' } : {}}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ─── TAB 1: RESTAURANT CATEGORIES (9 EXACT CATEGORIES) ─── */}
              {adminMenuTab === 'categories' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  {/* Category Selector Pills */}
                  <div className="flex flex-wrap gap-2 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
                    {editableMenuCategories.map((cat, idx) => {
                      const isSelected = selectedAdminCategoryIndex === idx;
                      let bg = '#C8860A';
                      if (cat.id === 'super-starters') bg = '#3D2614';
                      if (cat.id === 'chat-corners') bg = '#4CAF50';
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedAdminCategoryIndex(idx)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected ? 'text-white shadow-md ring-2 ring-amber-400 ring-offset-1' : 'opacity-85 hover:opacity-100 text-white'
                          }`}
                          style={{ background: bg }}
                        >
                          <span>{cat.icon || '🍽️'}</span>
                          <span>{cat.title}</span>
                          <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full font-mono">
                            {cat.items.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const activeCat = editableMenuCategories[selectedAdminCategoryIndex] || editableMenuCategories[0];
                    return (
                      <div className="space-y-4">
                        {/* WhatsApp Broadcast Card for this Category */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs">
                          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                              <span>📱</span>
                              <span>Send *{activeCat.title}* ({activeCat.items.length} items) to a Customer via WhatsApp:</span>
                            </p>
                            <span className="text-[11px] text-amber-700 font-semibold">{activeCat.description}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {enquiries.concat(activeBookings).slice(0, 6).map((b) => (
                              <a
                                key={b.id}
                                href={buildMenuWhatsAppText(b.name.split(' ')[0], b.phone, activeCat.title, b.guests)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white shadow-2xs hover:opacity-90"
                                style={{ background: '#25D366' }}
                              >
                                <Icon name="ChatBubbleLeftRightIcon" size={12} />
                                Send to {b.name.split(' ')[0]}
                              </a>
                            ))}
                            {enquiries.concat(activeBookings).length === 0 && (
                              <span className="text-xs text-gray-400 italic">No active customers</span>
                            )}
                          </div>
                        </div>

                        {/* Items List in Active Category */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div>
                              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <span>{activeCat.icon}</span>
                                <span>{activeCat.title} Dishes</span>
                              </h3>
                              <p className="text-xs text-gray-500">{activeCat.description}</p>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900">
                              {activeCat.items.length} Dishes
                            </span>
                          </div>

                          <div className="space-y-3">
                            {activeCat.items.map((item, itemIdx) => (
                              <div
                                key={`${item.name}-${itemIdx}`}
                                className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white hover:border-amber-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                              >
                                <div className="flex-1 space-y-1.5 w-full sm:w-auto">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                      {itemIdx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => {
                                        const updatedName = e.target.value;
                                        setEditableMenuCategories(prev => prev.map((cat, cIdx) => {
                                          if (cIdx !== selectedAdminCategoryIndex) return cat;
                                          return {
                                            ...cat,
                                            items: cat.items.map((it, itIdx) => itIdx === itemIdx ? { ...it, name: updatedName } : it),
                                          };
                                        }));
                                      }}
                                      className="font-bold text-sm text-gray-900 bg-white border border-gray-200 rounded-lg px-2.5 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      placeholder="Dish Name"
                                    />
                                  </div>

                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => {
                                      const updatedDesc = e.target.value;
                                      setEditableMenuCategories(prev => prev.map((cat, cIdx) => {
                                        if (cIdx !== selectedAdminCategoryIndex) return cat;
                                        return {
                                          ...cat,
                                          items: cat.items.map((it, itIdx) => itIdx === itemIdx ? { ...it, description: updatedDesc } : it),
                                        };
                                      }));
                                    }}
                                    className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    placeholder="Dish Description"
                                  />
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  <input
                                    type="text"
                                    value={(item.tags || []).join(', ')}
                                    onChange={(e) => {
                                      const tagsArr = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                      setEditableMenuCategories(prev => prev.map((cat, cIdx) => {
                                        if (cIdx !== selectedAdminCategoryIndex) return cat;
                                        return {
                                          ...cat,
                                          items: cat.items.map((it, itIdx) => itIdx === itemIdx ? { ...it, tags: tagsArr } : it),
                                        };
                                      }));
                                    }}
                                    className="w-24 text-[11px] font-bold text-center border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                                    placeholder="Tags (V, M, N...)"
                                    title="Dietary Tags: V, M, N, OJ, J, S"
                                  />

                                  {currentUser?.role === 'Super Admin' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditableMenuCategories(prev => prev.map((cat, cIdx) => {
                                          if (cIdx !== selectedAdminCategoryIndex) return cat;
                                          return {
                                            ...cat,
                                            items: cat.items.filter((_, itIdx) => itIdx !== itemIdx),
                                          };
                                        }));
                                      }}
                                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                      title="Delete Dish"
                                    >
                                      <Icon name="TrashIcon" size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add New Dish to this Category */}
                          <div className="pt-4 border-t border-gray-100 bg-amber-50/40 p-4 rounded-xl border border-amber-200/70 space-y-2.5">
                            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                              + Add New Dish to {activeCat.title}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <input
                                type="text"
                                placeholder="Dish name (e.g. Masala Dosa)"
                                value={newDishName}
                                onChange={(e) => setNewDishName(e.target.value)}
                                className="sm:col-span-4 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Description (e.g. Crisp & golden, the classic favourite)"
                                value={newDishDescription}
                                onChange={(e) => setNewDishDescription(e.target.value)}
                                className="sm:col-span-6 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Tags (V, M)"
                                value={newDishTags}
                                onChange={(e) => setNewDishTags(e.target.value)}
                                className="sm:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none text-center"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (newDishName.trim()) {
                                  const tagsArr = newDishTags.split(',').map(t => t.trim()).filter(Boolean);
                                  setEditableMenuCategories(prev => prev.map((cat, cIdx) => {
                                    if (cIdx !== selectedAdminCategoryIndex) return cat;
                                    return {
                                      ...cat,
                                      items: [...cat.items, { name: newDishName.trim(), description: newDishDescription.trim() || 'Freshly prepared vegetarian specialty', tags: tagsArr }],
                                    };
                                  }));
                                  setNewDishName('');
                                  setNewDishDescription('');
                                  setNewDishTags('V');
                                }
                              }}
                              className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                              style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                            >
                              <Icon name="PlusIcon" size={14} />
                              Add Dish to {activeCat.title}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ─── TAB 2: LIVE DOSA STATION EDITOR ─── */}
              {adminMenuTab === 'live-dosa' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* WhatsApp Broadcast */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-2xs">
                    <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                      <span>🎪</span>
                      <span>Send Full Live Dosa Station Menu to a Customer:</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {enquiries.concat(activeBookings).slice(0, 6).map((b) => (
                        <a
                          key={b.id}
                          href={buildMenuWhatsAppText(b.name.split(' ')[0], b.phone, 'Live Dosa Station', b.guests)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white shadow-2xs hover:opacity-90"
                          style={{ background: '#25D366' }}
                        >
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Send to {b.name.split(' ')[0]}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                    <div className="border-b border-gray-100 pb-3">
                      <h3 className="text-base font-bold text-gray-900">Live Dosa Station (12 Live Dishes)</h3>
                      <p className="text-xs text-gray-500">Each item is prepared fresh on the spot with theatrical flair</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {editableLiveDosaMenu.items.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const name = e.target.value;
                                  setEditableLiveDosaMenu(prev => ({
                                    ...prev,
                                    items: prev.items.map((it, i) => i === idx ? { ...it, name } : it),
                                  }));
                                }}
                                className="font-bold text-xs text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 w-full"
                              />
                            </div>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const description = e.target.value;
                                setEditableLiveDosaMenu(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => i === idx ? { ...it, description } : it),
                                }));
                              }}
                              className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded px-2 py-1 w-full"
                            />
                          </div>

                          {currentUser?.role === 'Super Admin' && (
                            <button
                              onClick={() => {
                                setEditableLiveDosaMenu(prev => ({
                                  ...prev,
                                  items: prev.items.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                            >
                              <Icon name="TrashIcon" size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Live Dosa Dish */}
                    <div className="pt-3 border-t border-gray-100 flex gap-2">
                      <input
                        type="text"
                        placeholder="Live dish name..."
                        value={newLiveDosaName}
                        onChange={(e) => setNewLiveDosaName(e.target.value)}
                        className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs bg-gray-50"
                      />
                      <input
                        type="text"
                        placeholder="Description..."
                        value={newLiveDosaDesc}
                        onChange={(e) => setNewLiveDosaDesc(e.target.value)}
                        className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs bg-gray-50"
                      />
                      <button
                        onClick={() => {
                          if (newLiveDosaName.trim()) {
                            setEditableLiveDosaMenu(prev => ({
                              ...prev,
                              items: [...prev.items, { name: newLiveDosaName.trim(), description: newLiveDosaDesc.trim() || 'Crisp & golden, the classic favourite', tags: ['V'] }],
                            }));
                            setNewLiveDosaName('');
                            setNewLiveDosaDesc('');
                          }
                        }}
                        className="px-3 py-2 rounded-lg text-white font-bold text-xs"
                        style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                      >
                        <Icon name="PlusIcon" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 3: SOUTH INDIAN BUFFET EDITOR ─── */}
              {adminMenuTab === 'buffet' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* WhatsApp Broadcast */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
                    <p className="text-xs font-bold text-emerald-900 mb-2 flex items-center gap-1.5">
                      <span>🍲</span>
                      <span>Send South Indian Buffet Menu to a Customer:</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {enquiries.concat(activeBookings).slice(0, 6).map((b) => (
                        <a
                          key={b.id}
                          href={buildMenuWhatsAppText(b.name.split(' ')[0], b.phone, 'South Indian Buffet', b.guests)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white shadow-2xs hover:opacity-90"
                          style={{ background: '#25D366' }}
                        >
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Send to {b.name.split(' ')[0]}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Schedule & Pricing Editor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
                      <h4 className="font-bold text-sm text-gray-900">Weekday Schedule &amp; Pricing</h4>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Days</label>
                        <input
                          type="text"
                          value={editableSouthIndianBuffet.weekday.days}
                          onChange={(e) => setEditableSouthIndianBuffet(prev => ({
                            ...prev,
                            weekday: { ...prev.weekday, days: e.target.value }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Price</label>
                        <input
                          type="text"
                          value={editableSouthIndianBuffet.weekday.price}
                          onChange={(e) => setEditableSouthIndianBuffet(prev => ({
                            ...prev,
                            weekday: { ...prev.weekday, price: e.target.value }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700"
                        />
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
                      <h4 className="font-bold text-sm text-gray-900">Weekend Schedule &amp; Pricing</h4>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Days</label>
                        <input
                          type="text"
                          value={editableSouthIndianBuffet.weekend.days}
                          onChange={(e) => setEditableSouthIndianBuffet(prev => ({
                            ...prev,
                            weekend: { ...prev.weekend, days: e.target.value }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Price</label>
                        <input
                          type="text"
                          value={editableSouthIndianBuffet.weekend.price}
                          onChange={(e) => setEditableSouthIndianBuffet(prev => ({
                            ...prev,
                            weekend: { ...prev.weekend, price: e.target.value }
                          }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 14 Buffet Spread Dishes Editor */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                    <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Buffet Spread Items</h3>
                        <p className="text-xs text-gray-500">Unlimited servings included in South Indian Buffet</p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900">
                        {editableSouthIndianBuffet.items.length} Inclusions
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {editableSouthIndianBuffet.items.map((bItem, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-gray-200 bg-gray-50/60 flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              value={bItem.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                setEditableSouthIndianBuffet(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => i === idx ? { ...it, name } : it),
                                }));
                              }}
                              className="font-bold text-xs text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 w-full"
                            />
                            <input
                              type="text"
                              value={bItem.description}
                              onChange={(e) => {
                                const description = e.target.value;
                                setEditableSouthIndianBuffet(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => i === idx ? { ...it, description } : it),
                                }));
                              }}
                              className="text-[11px] text-gray-500 bg-white border border-gray-200 rounded px-2 py-1 w-full"
                            />
                          </div>

                          {currentUser?.role === 'Super Admin' && (
                            <button
                              onClick={() => {
                                setEditableSouthIndianBuffet(prev => ({
                                  ...prev,
                                  items: prev.items.filter((_, i) => i !== idx),
                                }));
                              }}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                            >
                              <Icon name="TrashIcon" size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Buffet Item */}
                    <div className="pt-3 border-t border-gray-100 flex gap-2">
                      <input
                        type="text"
                        placeholder="Buffet dish name..."
                        value={newBuffetItemName}
                        onChange={(e) => setNewBuffetItemName(e.target.value)}
                        className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs bg-gray-50"
                      />
                      <input
                        type="text"
                        placeholder="Description..."
                        value={newBuffetItemDesc}
                        onChange={(e) => setNewBuffetItemDesc(e.target.value)}
                        className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs bg-gray-50"
                      />
                      <button
                        onClick={() => {
                          if (newBuffetItemName.trim()) {
                            setEditableSouthIndianBuffet(prev => ({
                              ...prev,
                              items: [...prev.items, { name: newBuffetItemName.trim(), description: newBuffetItemDesc.trim() || 'Unlimited buffet dish', tags: ['V'] }],
                            }));
                            setNewBuffetItemName('');
                            setNewBuffetItemDesc('');
                          }
                        }}
                        className="px-3 py-2 rounded-lg text-white font-bold text-xs"
                        style={{ background: 'linear-gradient(135deg, #2E7D32, #4CAF50)' }}
                      >
                        <Icon name="PlusIcon" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TAB 4: BANQUET PACKAGES & VENUE SERVICES ─── */}
              {adminMenuTab === 'banquet' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {editableBanquetPackages.map((pkg) => (
                    <div key={pkg.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      {editingPackageId === pkg.id && editingPackageData ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                            <div className="flex gap-2">
                              <button onClick={saveEditPackage} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>Save</button>
                              <button onClick={() => { setEditingPackageId(null); setEditingPackageData(null); }} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500">Cancel</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Price/Person (£)</label>
                              <input type="number" value={editingPackageData.pricePerPerson} onChange={(e) => setEditingPackageData({ ...editingPackageData, pricePerPerson: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Veg Starters</label>
                              <input type="number" value={editingPackageData.starters.veg} onChange={(e) => setEditingPackageData({ ...editingPackageData, starters: { ...editingPackageData.starters, veg: Number(e.target.value) } })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Non-Veg Starters</label>
                              <input type="number" value={editingPackageData.starters.nonVeg} onChange={(e) => setEditingPackageData({ ...editingPackageData, starters: { ...editingPackageData.starters, nonVeg: Number(e.target.value) } })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Veg Mains</label>
                              <input type="number" value={editingPackageData.mains.veg} onChange={(e) => setEditingPackageData({ ...editingPackageData, mains: { ...editingPackageData.mains, veg: Number(e.target.value) } })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Non-Veg Mains</label>
                              <input type="number" value={editingPackageData.mains.nonVeg} onChange={(e) => setEditingPackageData({ ...editingPackageData, mains: { ...editingPackageData.mains, nonVeg: Number(e.target.value) } })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Min Guests</label>
                              {/* @ts-ignore */}
                              <input type="number" value={editingPackageData.minGuests ?? ''} onChange={(e) => setEditingPackageData({ ...editingPackageData, minGuests: e.target.value ? Number(e.target.value) : null })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="None" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Max Guests</label>
                              {/* @ts-ignore */}
                              <input type="number" value={editingPackageData.maxGuests ?? ''} onChange={(e) => setEditingPackageData({ ...editingPackageData, maxGuests: e.target.value ? Number(e.target.value) : null })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="None" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Desserts (one per line)</label>
                            <textarea rows={3} value={editingPackageData.desserts.join('\n')} onChange={(e) => setEditingPackageData({ ...editingPackageData, desserts: e.target.value.split('\n').filter(Boolean) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Drinks (one per line)</label>
                            <textarea rows={3} value={editingPackageData.drinks.join('\n')} onChange={(e) => setEditingPackageData({ ...editingPackageData, drinks: e.target.value.split('\n').filter(Boolean) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Tag / Badge</label>
                            <input type="text" value={editingPackageData.tag} onChange={(e) => setEditingPackageData({ ...editingPackageData, tag: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="e.g. Most Popular" />
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                                {pkg.tag && <span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ background: 'rgba(200,134,10,0.08)', color: '#C8860A', borderColor: 'rgba(200,134,10,0.3)' }}>{pkg.tag}</span>}
                              </div>
                              <span className="text-lg font-bold" style={{ color: '#C8860A' }}>£{pkg.pricePerPerson}<span className="text-sm font-normal text-gray-500">/person (Excl. VAT)</span></span>
                              {pkg.guestLabel && <div className="text-xs text-gray-500 mt-0.5">{pkg.guestLabel}</div>}
                            </div>
                            <button onClick={() => startEditPackage(pkg)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-amber-50" style={{ borderColor: '#C8860A', color: '#C8860A' }}>
                              <Icon name="PencilSquareIcon" size={14} />
                              Edit
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                            {'canapes' in pkg && pkg.canapes && (
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <div className="text-xs text-gray-400 mb-0.5">Canapés</div>
                                <div className="text-xs font-medium text-gray-700">{pkg.canapes.veg}V · {pkg.canapes.nonVeg}NV</div>
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-xs text-gray-400 mb-0.5">Starters</div>
                              <div className="text-xs font-medium text-gray-700">{pkg.starters.veg}V · {pkg.starters.nonVeg}NV</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-xs text-gray-400 mb-0.5">Mains</div>
                              <div className="text-xs font-medium text-gray-700">{pkg.mains.veg}V · {pkg.mains.nonVeg}NV</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <div className="text-xs text-gray-400 mb-0.5">Desserts</div>
                              <div className="text-xs font-medium text-gray-700">{pkg.desserts.length} item{pkg.desserts.length !== 1 ? 's' : ''}</div>
                            </div>
                            {pkg.drinks.length > 0 && (
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <div className="text-xs text-gray-400 mb-0.5">Drinks</div>
                                <div className="text-xs font-medium text-gray-700">{pkg.drinks.length} item{pkg.drinks.length !== 1 ? 's' : ''}</div>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs text-gray-500 mb-2 font-medium">📱 Send this package to a customer via WhatsApp:</p>
                            <div className="flex flex-wrap gap-2">
                              {enquiries.concat(activeBookings).slice(0, 4).map((b) => (
                                <a key={b.id}
                                  href={buildWhatsAppLink(b.phone, `Hi ${b.name.split(' ')[0]}, here is our *${pkg.name}* at *£${pkg.pricePerPerson}/person* (Excl. VAT):\n\n🥗 Starters: ${pkg.starters.veg} Veg + ${pkg.starters.nonVeg} Non-Veg\n🍛 Mains: ${pkg.mains.veg} Veg + ${pkg.mains.nonVeg} Non-Veg\n🍮 Desserts: ${pkg.desserts.join(', ')}\n${pkg.drinks.length > 0 ? `🥤 Drinks: ${pkg.drinks.join(', ')}\n` : ''}${pkg.guestLabel ? `\n👥 ${pkg.guestLabel}` : ''}\n\nFor ${b.guests} guests, estimated total: *£${(pkg.pricePerPerson * b.guests).toLocaleString()}* (Excl. VAT)\n\n🧒 *Kids Pricing* (Over 50 Adults):\n${editableKidsPricing.map(kp => `${kp.ageRange}: ${kp.price}`).join('\\n')}\n\n🏢 *Venue Hire Charges:*\n${editableVenueCharges.map(vc => `• ${vc.day}: ${vc.charge}${vc.note ? ` (${vc.note})` : ''}`).join('\\n')}\n\nWould you like to go ahead with this package? Please reply to confirm! 🙏`)}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                                  style={{ background: '#25D366', color: 'white' }}>
                                  <Icon name="ChatBubbleLeftRightIcon" size={12} />
                                  Send to {b.name.split(' ')[0]}
                                </a>
                              ))}
                              {enquiries.concat(activeBookings).length === 0 && (
                                <span className="text-xs text-gray-400 italic">No active customers to send to</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Venue Hall Charges */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Icon name="BuildingOffice2Icon" size={16} style={{ color: '#C8860A' }} />
                      Venue Hall Charges
                    </h3>
                    <div className="space-y-2">
                      {editableVenueCharges.map((row, i) => (
                        <div key={i} className="flex items-center gap-3 flex-wrap">
                          <input type="text" value={row.day} onChange={(e) => setEditableVenueCharges(prev => prev.map((r, idx) => idx === i ? { ...r, day: e.target.value } : r))} className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                          <input type="text" value={row.charge} onChange={(e) => setEditableVenueCharges(prev => prev.map((r, idx) => idx === i ? { ...r, charge: e.target.value } : r))} className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold" style={{ color: '#C8860A' }} />
                          <input type="text" value={row.note} onChange={(e) => setEditableVenueCharges(prev => prev.map((r, idx) => idx === i ? { ...r, note: e.target.value } : r))} className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-gray-500" placeholder="Note" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dry Hire Prices */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Icon name="BuildingOfficeIcon" size={16} style={{ color: '#C8860A' }} />
                      Dry Hire Prices
                    </h3>
                    <div className="space-y-2">
                      {editableDryHirePrices.map((row, i) => (
                        <div key={i} className="flex items-center gap-3 flex-wrap">
                          <input type="text" value={row.day} onChange={(e) => setEditableDryHirePrices(prev => prev.map((r, idx) => idx === i ? { ...r, day: e.target.value } : r))} className="flex-1 min-w-[160px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="Day" />
                          <input type="text" value={row.session} onChange={(e) => setEditableDryHirePrices(prev => prev.map((r, idx) => idx === i ? { ...r, session: e.target.value } : r))} className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="Session" />
                          <input type="number" value={row.price} onChange={(e) => setEditableDryHirePrices(prev => prev.map((r, idx) => idx === i ? { ...r, price: Number(e.target.value) } : r))} className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold" style={{ color: '#C8860A' }} placeholder="Price (£)" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Table Service & Kids Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">Table Service Charges</h3>
                      <div className="space-y-2">
                        {editableTableService.map((ts, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="text" value={ts.service} onChange={(e) => setEditableTableService(prev => prev.map((t, idx) => idx === i ? { ...t, service: e.target.value } : t))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <input type="text" value={ts.price} onChange={(e) => setEditableTableService(prev => prev.map((t, idx) => idx === i ? { ...t, price: e.target.value } : t))} className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold" style={{ color: '#C8860A' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-3">Kids Pricing</h3>
                      <div className="space-y-2">
                        {editableKidsPricing.map((kp, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="text" value={kp.ageRange} onChange={(e) => setEditableKidsPricing(prev => prev.map((k, idx) => idx === i ? { ...k, ageRange: e.target.value } : k))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                            <input type="text" value={kp.price} onChange={(e) => setEditableKidsPricing(prev => prev.map((k, idx) => idx === i ? { ...k, price: e.target.value } : k))} className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold" style={{ color: '#C8860A' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── HISTORY ─── */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search history..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white" />
                </div>
                <span className="text-xs text-gray-400">{historyBookings.length} records</span>
              </div>
              {historyBookings.filter(b => !historySearch || b.name.toLowerCase().includes(historySearch.toLowerCase()) || b.email.toLowerCase().includes(historySearch.toLowerCase()) || b.phone.toLowerCase().includes(historySearch.toLowerCase()) || b.eventType.toLowerCase().includes(historySearch.toLowerCase())).map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,134,10,0.1)' }}>
                        <span className="text-base font-bold" style={{ color: '#C8860A' }}>{b.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{b.name}</div>
                        <div className="text-xs text-gray-400">{b.email} · {b.phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status]}`} />
                        {STATUS_LABELS[b.status]}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadInvoicePDF(b, true)}
                          className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold border border-emerald-200 shadow-sm"
                          title="Download Deposit Invoice PDF"
                        >
                          <Icon name="ArrowDownTrayIcon" size={14} />
                          Deposit Invoice
                        </button>
                        {b.status === 'completed' && (
                          <button
                            onClick={() => downloadInvoicePDF(b)}
                            className="text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold border border-amber-200 shadow-sm"
                            title="Download Final Invoice PDF"
                          >
                            <Icon name="ArrowDownTrayIcon" size={14} />
                            Final Invoice
                          </button>
                        )}
                      </div>
                      {currentUser?.role === 'Super Admin' && (
                        <button onClick={() => handleDeleteBooking(b.id, b.name)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors" title="Delete History Record">
                          <Icon name="TrashIcon" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Event Type', value: b.eventType },
                      { label: 'Event Date', value: b.date },
                      { label: 'Guests', value: `${b.guests} people` },
                      { label: 'Package', value: b.selectedMenu || b.package },
                    ].map((f) => (
                      <div key={f.label} className="bg-gray-50 rounded-lg p-2.5">
                        <div className="text-xs text-gray-400 mb-0.5">{f.label}</div>
                        <div className="text-sm font-medium text-gray-800">{f.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Financial Summary</div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div><span className="text-gray-500">Base: </span><span className="font-semibold text-gray-900">£{b.baseAmount.toLocaleString()}</span></div>
                      {b.extraCharges.length > 0 && (
                        <div><span className="text-gray-500">Extras: </span><span className="font-semibold text-amber-700">+£{b.extraCharges.reduce((s, c) => s + c.amount, 0).toLocaleString()}</span></div>
                      )}
                      {b.discount && (
                        <div><span className="text-gray-500">Discount: </span><span className="font-semibold text-red-600">-£{getDiscountAmount(b).toLocaleString()}</span></div>
                      )}
                      <div><span className="text-gray-500">Total: </span><span className="font-bold" style={{ color: '#C8860A' }}>£{getTotalAmount(b).toLocaleString()}</span></div>
                      <div className="flex items-center gap-1"><Icon name="CheckCircleIcon" size={14} className="text-emerald-500" /><span className="text-emerald-700 font-medium text-xs">Fully Paid</span></div>
                    </div>
                  </div>

                  {/* Payment proofs */}
                  {(b.paymentProofDeposit || b.paymentProofFinal || b.paymentProofExtra) && (
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment Proofs</div>
                      <div className="flex gap-3">
                        {b.paymentProofDeposit && (
                          <div
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group bg-gray-50 flex-shrink-0"
                            onClick={() => {
                              if (b.paymentProofDeposit?.startsWith('data:image')) {
                                const w = window.open('');
                                w?.document.write(`<img src="${b.paymentProofDeposit}" style="max-width: 100%; height: auto;"/>`);
                              } else {
                                window.open(b.paymentProofDeposit, '_blank');
                              }
                            }}
                            title="View Deposit Proof"
                          >
                            <img src={b.paymentProofDeposit} alt="Deposit" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Icon name="MagnifyingGlassPlusIcon" size={16} className="text-white" />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">Deposit</div>
                          </div>
                        )}
                        {b.paymentProofFinal && (
                          <div
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group bg-gray-50 flex-shrink-0"
                            onClick={() => {
                              if (b.paymentProofFinal?.startsWith('data:image')) {
                                const w = window.open('');
                                w?.document.write(`<img src="${b.paymentProofFinal}" style="max-width: 100%; height: auto;"/>`);
                              } else {
                                window.open(b.paymentProofFinal, '_blank');
                              }
                            }}
                            title="View Final Proof"
                          >
                            <img src={b.paymentProofFinal} alt="Final" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Icon name="MagnifyingGlassPlusIcon" size={16} className="text-white" />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">Final</div>
                          </div>
                        )}
                        {b.paymentProofExtra && (
                          <div
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group bg-gray-50 flex-shrink-0"
                            onClick={() => {
                              if (b.paymentProofExtra?.startsWith('data:image')) {
                                const w = window.open('');
                                w?.document.write(`<img src="${b.paymentProofExtra}" style="max-width: 100%; height: auto;"/>`);
                              } else {
                                window.open(b.paymentProofExtra, '_blank');
                              }
                            }}
                            title="View Extra Proof"
                          >
                            <img src={b.paymentProofExtra} alt="Extra" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Icon name="MagnifyingGlassPlusIcon" size={16} className="text-white" />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">Extra</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {b.notes && <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{b.notes}</div>}
                </div>
              ))}
              {historyBookings.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                  <Icon name="ArchiveBoxIcon" size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400 text-sm">No completed bookings yet</p>
                </div>
              )}
            </div>
          )}

          {/* ─── SETTINGS ─── */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-6xl">
              {/* Settings Sub navigation */}
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
                <button
                  onClick={() => setSettingsSection('form_builder')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settingsSection === 'form_builder'
                      ? 'bg-[#C8860A] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon name="ClipboardDocumentListIcon" size={16} />
                  Dynamic Form Builder
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${settingsSection === 'form_builder' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'}`}>
                    {editableFormConfig.fields.length}
                  </span>
                </button>
                <button
                  onClick={() => setSettingsSection('venue')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settingsSection === 'venue'
                      ? 'bg-[#C8860A] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon name="BuildingOfficeIcon" size={16} />
                  Venue Profile
                </button>
                <button
                  onClick={() => setSettingsSection('location_delivery')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settingsSection === 'location_delivery'
                      ? 'bg-[#C8860A] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon name="MapPinIcon" size={16} />
                  Restaurant Location &amp; Delivery Rules
                </button>
                <button
                  onClick={() => setSettingsSection('pricing')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settingsSection === 'pricing'
                      ? 'bg-[#C8860A] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon name="CalendarDaysIcon" size={16} />
                  Pricing & Deposits
                </button>
                <button
                  onClick={() => setSettingsSection('stripe_gateway')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settingsSection === 'stripe_gateway'
                      ? 'bg-[#635BFF] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon name="CreditCardIcon" size={16} />
                  💳 Stripe Gateway
                </button>
                <button
                  onClick={() => setSettingsSection('bank')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settingsSection === 'bank'
                      ? 'bg-[#C8860A] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon name="CreditCardIcon" size={16} />
                  Bank Details
                </button>
                <button
                  onClick={() => setSettingsSection('block_dates')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settingsSection === 'block_dates'
                      ? 'bg-[#C8860A] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon name="NoSymbolIcon" size={16} />
                  Block Dates
                </button>
              </div>

              {/* ── SECTION 1: DYNAMIC FORM BUILDER ── */}
              {settingsSection === 'form_builder' && (
                <div className="space-y-6">
                  {/* Top Action Bar */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                          <Icon name="AdjustmentsHorizontalIcon" size={18} />
                        </span>
                        Dynamic Website Booking Form Builder
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Add, reorder, customize fields, validation, and dropdown options. All updates sync in real-time to the website form.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0 flex-nowrap">
                      <button
                        type="button"
                        onClick={() => setShowAddFieldModal(true)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap flex-shrink-0"
                      >
                        <Icon name="PlusIcon" size={14} />
                        Add Custom Field
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Reset form fields to standard SriLalitha default configuration?')) {
                            setEditableFormConfig(DEFAULT_FORM_CONFIG);
                            setCustomAlert({ message: 'Reset to default configuration in editor. Click "Save Form Configuration" to apply.', type: 'success' });
                          }
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                        title="Restore original default 9 fields"
                      >
                        <Icon name="ArrowPathIcon" size={14} />
                        Reset Defaults
                      </button>

                      <button
                        type="button"
                        onClick={saveFormConfigToDatabase}
                        disabled={isSavingFormConfig}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                      >
                        {isSavingFormConfig ? (
                          <>
                            <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                            Saving to Live Site...
                          </>
                        ) : (
                          <>
                            <Icon name="CheckIcon" size={15} />
                            Save Form Configuration
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Form Controls & Field List (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Form Headings & Labels Card */}
                      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2.5">
                          <Icon name="DocumentTextIcon" size={16} style={{ color: '#C8860A' }} />
                          Form Headings & Call-to-Action
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Form Main Title</label>
                            <input
                              type="text"
                              value={editableFormConfig.formTitle || ''}
                              onChange={(e) => setEditableFormConfig(prev => ({ ...prev, formTitle: e.target.value }))}
                              placeholder="e.g. Request a Booking"
                              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-gray-50"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Submit Button Text</label>
                            <input
                              type="text"
                              value={editableFormConfig.submitButtonText || ''}
                              onChange={(e) => setEditableFormConfig(prev => ({ ...prev, submitButtonText: e.target.value }))}
                              placeholder="e.g. Submit Booking Request"
                              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-gray-50"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Form Subtitle</label>
                            <input
                              type="text"
                              value={editableFormConfig.formSubtitle || ''}
                              onChange={(e) => setEditableFormConfig(prev => ({ ...prev, formSubtitle: e.target.value }))}
                              placeholder="e.g. Fill in your details and we'll get back to you within 24 hours"
                              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-gray-50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Outdoor Catering & Dynamic Slot Capacity Card */}
                      <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                              <Icon name="ClockIcon" size={14} />
                            </span>
                            Outdoor Catering & Time Slot Capacity Rules
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Dynamic Limits
                          </span>
                        </div>

                        {/* Outdoor Catering Settings */}
                        <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/60 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                🍽️ Outdoor Catering Time Slots & Limits
                              </span>
                              <p className="text-[11px] text-amber-700 mt-0.5">
                                When Outdoor Catering is selected, these time slots appear with a limit of multiple bookings per slot.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <label className="text-xs font-bold text-amber-900 whitespace-nowrap">
                                Max Bookings / Slot:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={editableFormConfig.slotCapacity?.maxOutdoorCateringPerSlot ?? 4}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  setEditableFormConfig(prev => ({
                                    ...prev,
                                    slotCapacity: {
                                      ...(prev.slotCapacity || DEFAULT_SLOT_CAPACITY),
                                      maxOutdoorCateringPerSlot: val,
                                    }
                                  }));
                                }}
                                className="w-16 border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-center bg-white text-amber-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                              />
                            </div>
                          </div>

                          {/* Outdoor Time Slot Chips */}
                          <div className="space-y-2 pt-1">
                            <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                              Active Outdoor Time Slots ({(editableFormConfig.slotCapacity?.outdoorCateringTimeSlots || DEFAULT_OUTDOOR_TIME_SLOTS).length})
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {(editableFormConfig.slotCapacity?.outdoorCateringTimeSlots || DEFAULT_OUTDOOR_TIME_SLOTS).map((slot, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 shadow-2xs"
                                >
                                  <span>{slot}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = editableFormConfig.slotCapacity?.outdoorCateringTimeSlots || DEFAULT_OUTDOOR_TIME_SLOTS;
                                      const updated = current.filter((_, i) => i !== sIdx);
                                      setEditableFormConfig(prev => ({
                                        ...prev,
                                        slotCapacity: {
                                          ...(prev.slotCapacity || DEFAULT_SLOT_CAPACITY),
                                          outdoorCateringTimeSlots: updated,
                                        }
                                      }));
                                    }}
                                    className="text-gray-400 hover:text-rose-600 transition-colors"
                                    title="Remove time slot"
                                  >
                                    <Icon name="XMarkIcon" size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>

                            {/* Add Outdoor Slot Input */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                placeholder="Add time slot (e.g. Afternoon Tea (2:00pm – 5:00pm))..."
                                value={newOutdoorSlotInput}
                                onChange={(e) => setNewOutdoorSlotInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = newOutdoorSlotInput.trim();
                                    const current = editableFormConfig.slotCapacity?.outdoorCateringTimeSlots || DEFAULT_OUTDOOR_TIME_SLOTS;
                                    if (val && !current.includes(val)) {
                                      setEditableFormConfig(prev => ({
                                        ...prev,
                                        slotCapacity: {
                                          ...(prev.slotCapacity || DEFAULT_SLOT_CAPACITY),
                                          outdoorCateringTimeSlots: [...current, val],
                                        }
                                      }));
                                      setNewOutdoorSlotInput('');
                                    }
                                  }
                                }}
                                className="flex-1 border border-amber-300 bg-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8860A]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = newOutdoorSlotInput.trim();
                                  const current = editableFormConfig.slotCapacity?.outdoorCateringTimeSlots || DEFAULT_OUTDOOR_TIME_SLOTS;
                                  if (val && !current.includes(val)) {
                                    setEditableFormConfig(prev => ({
                                      ...prev,
                                      slotCapacity: {
                                        ...(prev.slotCapacity || DEFAULT_SLOT_CAPACITY),
                                        outdoorCateringTimeSlots: [...current, val],
                                      }
                                    }));
                                    setNewOutdoorSlotInput('');
                                  }
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-colors"
                                style={{ background: '#C8860A' }}
                              >
                                + Add Slot
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Venue Hall Standard Settings */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-gray-900">
                                🏛️ Venue Hall (In-House) Max Bookings / Slot
                              </span>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                For In-House hall bookings, maximum events allowed per time slot.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                                Max Bookings:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={editableFormConfig.slotCapacity?.maxHallBookingsPerSlot ?? 1}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value) || 1);
                                  setEditableFormConfig(prev => ({
                                    ...prev,
                                    slotCapacity: {
                                      ...(prev.slotCapacity || DEFAULT_SLOT_CAPACITY),
                                      maxHallBookingsPerSlot: val,
                                    }
                                  }));
                                }}
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-center bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fields Manager List */}
                      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              <Icon name="ListBulletIcon" size={16} style={{ color: '#C8860A' }} />
                              Form Fields Manager ({editableFormConfig.fields.length} Fields)
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Use arrows to reorder, toggle eye to show/hide, click edit or manage dropdown options.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddFieldModal(true)}
                            className="text-xs font-bold text-[#C8860A] hover:underline flex items-center gap-1"
                          >
                            <Icon name="PlusCircleIcon" size={15} />
                            Add Field
                          </button>
                        </div>

                        {/* List of Fields */}
                        <div className="space-y-3 pt-1">
                          {editableFormConfig.fields
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((field, idx) => (
                              <div
                                key={field.id}
                                className={`rounded-xl border transition-all p-3.5 ${
                                  field.enabled
                                    ? 'bg-white border-gray-200 hover:border-amber-300 shadow-sm'
                                    : 'bg-gray-50/80 border-gray-200/60 opacity-60'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  {/* Left: Reorder Arrows & Info */}
                                  <div className="flex items-start gap-2.5">
                                    <div className="flex flex-col items-center justify-center gap-0.5 pt-0.5">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => handleMoveField(idx, 'up')}
                                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 hover:bg-gray-100 rounded transition-colors"
                                        title="Move Up"
                                      >
                                        <Icon name="ChevronUpIcon" size={14} />
                                      </button>
                                      <span className="text-[10px] font-bold text-gray-400">{field.order}</span>
                                      <button
                                        type="button"
                                        disabled={idx === editableFormConfig.fields.length - 1}
                                        onClick={() => handleMoveField(idx, 'down')}
                                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 hover:bg-gray-100 rounded transition-colors"
                                        title="Move Down"
                                      >
                                        <Icon name="ChevronDownIcon" size={14} />
                                      </button>
                                    </div>

                                    <div>
                                      <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                        <span className="text-sm font-bold text-gray-900">{field.label}</span>
                                        {field.required && (
                                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                            Required
                                          </span>
                                        )}
                                        {field.isSystem && (
                                          <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                            Core
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center flex-wrap gap-2 text-[11px] text-gray-500">
                                        <span className="font-mono text-gray-400 text-[10px]">id: {field.id}</span>
                                        <span>•</span>
                                        <span className="capitalize font-semibold text-gray-600">Type: {field.type.replace('_', ' ')}</span>
                                        <span>•</span>
                                        <span>Width: {field.width === 'full' ? '100%' : field.width === 'third' ? '33%' : '50%'}</span>
                                      </div>

                                      {field.placeholder && (
                                        <p className="text-[11px] text-gray-400 italic mt-1 truncate max-w-sm">
                                          Placeholder: &quot;{field.placeholder}&quot;
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Actions */}
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleField(field.id)}
                                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                        field.enabled
                                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      }`}
                                      title={field.enabled ? 'Click to disable' : 'Click to enable'}
                                    >
                                      <Icon name={field.enabled ? 'EyeIcon' : 'EyeSlashIcon'} size={14} />
                                      <span className="text-[11px]">{field.enabled ? 'Active' : 'Hidden'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setEditingFieldModal(field)}
                                      className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors"
                                      title="Edit field settings"
                                    >
                                      <Icon name="PencilSquareIcon" size={16} />
                                    </button>

                                    {!field.isSystem && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (confirm(`Remove field "${field.label}"?`)) {
                                            handleDeleteField(field.id);
                                          }
                                        }}
                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                        title="Delete custom field"
                                      >
                                        <Icon name="TrashIcon" size={16} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Quick Dropdown Options Editor if field has options */}
                                {(field.type === 'select' || field.type === 'time_select') && (
                                  <div className="mt-3 pt-2.5 border-t border-gray-100 bg-amber-50/40 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1">
                                        <Icon name="TagIcon" size={12} style={{ color: '#C8860A' }} />
                                        Dropdown Options ({field.options?.length || 0})
                                      </span>
                                      <span className="text-[10px] text-gray-400">Click &apos;✕&apos; to remove or add below</span>
                                    </div>

                                    {/* Option Chips */}
                                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                                      {(field.options || []).map((opt, optIdx) => (
                                        <span
                                          key={optIdx}
                                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-gray-800 shadow-2xs"
                                        >
                                          <span>{opt}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = (field.options || []).filter((_, i) => i !== optIdx);
                                              setEditableFormConfig(prev => ({
                                                ...prev,
                                                fields: prev.fields.map(f => f.id === field.id ? { ...f, options: updated } : f)
                                              }));
                                            }}
                                            className="text-gray-400 hover:text-rose-600 transition-colors p-0.5"
                                            title={`Remove ${opt}`}
                                          >
                                            <Icon name="XMarkIcon" size={12} />
                                          </button>
                                        </span>
                                      ))}
                                      {(!field.options || field.options.length === 0) && (
                                        <span className="text-xs text-gray-400 italic">No options defined yet</span>
                                      )}
                                    </div>

                                    {/* Quick Add Option Input */}
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        placeholder={`Add new option (e.g. ${field.id === 'eventType' ? 'Outdoor Catering' : 'Custom Slot'})...`}
                                        id={`new-opt-input-${field.id}`}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const inputEl = document.getElementById(`new-opt-input-${field.id}`) as HTMLInputElement;
                                            const val = inputEl?.value?.trim();
                                            if (val && !(field.options || []).includes(val)) {
                                              const updated = [...(field.options || []), val];
                                              setEditableFormConfig(prev => ({
                                                ...prev,
                                                fields: prev.fields.map(f => f.id === field.id ? { ...f, options: updated } : f)
                                              }));
                                              inputEl.value = '';
                                            }
                                          }
                                        }}
                                        className="flex-1 border border-amber-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8860A]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const inputEl = document.getElementById(`new-opt-input-${field.id}`) as HTMLInputElement;
                                          const val = inputEl?.value?.trim();
                                          if (val && !(field.options || []).includes(val)) {
                                            const updated = [...(field.options || []), val];
                                            setEditableFormConfig(prev => ({
                                              ...prev,
                                              fields: prev.fields.map(f => f.id === field.id ? { ...f, options: updated } : f)
                                            }));
                                            inputEl.value = '';
                                          }
                                        }}
                                        className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-colors"
                                        style={{ background: '#C8860A' }}
                                      >
                                        + Add Option
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Live Interactive Form Preview (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-200 p-5 sticky top-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h4 className="text-sm font-bold text-gray-900">Live Website Form Preview</h4>
                          </div>
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded-md">
                            Realtime Sync
                          </span>
                        </div>

                        {/* Form Mockup Container */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                          <h2 className="text-base font-bold text-gray-900 text-center mb-0.5">
                            {editableFormConfig.formTitle || 'Request a Booking'}
                          </h2>
                          <p className="text-xs text-gray-400 text-center mb-4">
                            {editableFormConfig.formSubtitle || "Fill in your details and we'll get back to you within 24 hours"}
                          </p>

                          <div className="grid grid-cols-12 gap-2.5">
                            {editableFormConfig.fields
                              .filter(f => f.enabled)
                              .sort((a, b) => a.order - b.order)
                              .map(f => {
                                const colClass = f.width === 'full' ? 'col-span-12' : f.width === 'third' ? 'col-span-4' : 'col-span-6';
                                return (
                                  <div key={f.id} className={colClass}>
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-0.5 truncate">
                                      {f.label} {f.required && <span className="text-rose-500">*</span>}
                                    </label>

                                    {f.type === 'textarea' ? (
                                      <textarea
                                        disabled
                                        rows={2}
                                        placeholder={f.placeholder || 'Enter details...'}
                                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50/60 cursor-not-allowed resize-none"
                                      />
                                    ) : f.type === 'select' ? (
                                      <select
                                        disabled
                                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50/60 cursor-not-allowed text-gray-700"
                                      >
                                        <option value="">{f.placeholder || `Select ${f.label}`}</option>
                                        {(f.options || []).map((o, idx) => (
                                          <option key={idx} value={o}>{o}</option>
                                        ))}
                                      </select>
                                    ) : f.type === 'time_select' ? (
                                      <select
                                        disabled
                                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50/60 cursor-not-allowed text-gray-700"
                                      >
                                        <option value="">Select time</option>
                                        <optgroup label={`── Outdoor Catering (${editableFormConfig.slotCapacity?.maxOutdoorCateringPerSlot || 4} bookings/slot) ──`}>
                                          {(editableFormConfig.slotCapacity?.outdoorCateringTimeSlots || DEFAULT_OUTDOOR_TIME_SLOTS).map((o, idx) => (
                                            <option key={`out-${idx}`} value={o}>{o}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="── Venue Hall Standard ──">
                                          {(f.options || DEFAULT_TIME_SLOTS).map((o, idx) => (
                                            <option key={`std-${idx}`} value={o}>{o}</option>
                                          ))}
                                        </optgroup>
                                      </select>
                                    ) : f.type === 'package_select' ? (
                                      <select
                                        disabled
                                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50/60 cursor-not-allowed text-gray-700"
                                      >
                                        <option value="">Choose package</option>
                                        {editableBanquetPackages.map(p => (
                                          <option key={p.id} value={p.name}>{p.name} — £{p.pricePerPerson}/pp</option>
                                        ))}
                                      </select>
                                    ) : f.type === 'tel' ? (
                                      <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-gray-50/60">
                                        <span className="px-2 py-1.5 text-[11px] font-semibold text-gray-500 border-r border-gray-200 select-none bg-gray-100">+44</span>
                                        <input
                                          disabled
                                          type="tel"
                                          placeholder={f.placeholder || '07700 900000'}
                                          className="w-full px-2 py-1.5 text-xs bg-transparent cursor-not-allowed"
                                        />
                                      </div>
                                    ) : (
                                      <input
                                        disabled
                                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
                                        placeholder={f.placeholder || ''}
                                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-gray-50/60 cursor-not-allowed"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                          </div>

                          <div className="mt-4">
                            <button
                              disabled
                              type="button"
                              className="w-full text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm opacity-90 cursor-not-allowed"
                              style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                            >
                              <Icon name="CalendarDaysIcon" size={14} />
                              {editableFormConfig.submitButtonText || 'Submit Booking Request'}
                            </button>
                          </div>
                        </div>

                        {/* Information Tips */}
                        <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
                          <div className="font-bold flex items-center gap-1.5 text-amber-950">
                            <Icon name="InformationCircleIcon" size={16} />
                            Automatic Data Routing
                          </div>
                          <p className="text-[11px] leading-relaxed text-amber-800">
                            All standard and custom fields configured here are stored directly into customer booking records in Firestore. You can inspect all submitted answers in the <strong>Booking Details Drawer</strong> and customer timeline.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 2: VENUE DETAILS ── */}
              {settingsSection === 'venue' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                    <Icon name="BuildingOfficeIcon" size={18} style={{ color: '#C8860A' }} />
                    Venue Profile & Details
                  </h3>
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Venue Name</label>
                      <input type="text" value={venueDetails.venueName} onChange={(e) => setVenueDetails(prev => ({ ...prev, venueName: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Max Capacity</label>
                      <input type="number" value={venueDetails.maxCapacity} onChange={(e) => setVenueDetails(prev => ({ ...prev, maxCapacity: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contact Email</label>
                      <input type="email" value={venueDetails.contactEmail} onChange={(e) => setVenueDetails(prev => ({ ...prev, contactEmail: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
                      <input type="tel" value={venueDetails.phone} onChange={(e) => setVenueDetails(prev => ({ ...prev, phone: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">WhatsApp Business Number</label>
                      <input type="tel" value={venueDetails.whatsapp} onChange={(e) => setVenueDetails(prev => ({ ...prev, whatsapp: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
                      <input type="text" value={venueDetails.address} onChange={(e) => setVenueDetails(prev => ({ ...prev, address: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50" />
                    </div>
                    <button
                      onClick={saveVenueDetails}
                      disabled={isSavingVenueDetails}
                      className="text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all mt-2 shadow-md active:scale-95 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                    >
                      {isSavingVenueDetails ? 'Saving...' : 'Save Venue Details'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SECTION: VENUE LOCATION & DELIVERY RULES ── */}
              {settingsSection === 'location_delivery' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl space-y-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                          <Icon name="MapPinIcon" size={20} style={{ color: '#C8860A' }} />
                          Restaurant / Base Kitchen Location (Google Maps)
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Set the restaurant address and GPS coordinates. Customer travel distances &amp; delivery charges are dynamically computed from this restaurant location.
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Map
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                          Restaurant Base Address (Google Places Autocomplete)
                        </label>
                        <GoogleLocationInput
                          value={deliverySettings.venueAddress}
                          placeholder="Search restaurant address or UK postcode..."
                          showCoordinatesBadge={true}
                          onChange={(address, coords) => updateAndSaveRestaurantLocation(address, coords)}
                          onCoordinatesChange={(coords) => {
                            if (coords) {
                              updateAndSaveRestaurantLocation(deliverySettings.venueAddress, coords);
                            }
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Restaurant Postcode
                          </label>
                          <input
                            type="text"
                            value={deliverySettings.venuePostcode || ''}
                            onChange={(e) => setDeliverySettings(prev => ({ ...prev, venuePostcode: e.target.value }))}
                            placeholder="e.g. E1 6AN"
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none bg-gray-50 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Latitude (GPS)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={deliverySettings.venueLat}
                            onChange={(e) => setDeliverySettings(prev => ({ ...prev, venueLat: parseFloat(e.target.value) || 0 }))}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none bg-gray-50 font-mono text-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Longitude (GPS)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={deliverySettings.venueLng}
                            onChange={(e) => setDeliverySettings(prev => ({ ...prev, venueLng: parseFloat(e.target.value) || 0 }))}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none bg-gray-50 font-mono text-gray-800"
                          />
                        </div>
                      </div>

                      {/* Google Maps Interactive Iframe Preview */}
                      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-inner h-48 w-full bg-gray-100 relative">
                        <iframe
                          title="Venue Location Map"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ border: 0 }}
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(deliverySettings.venueAddress || `${deliverySettings.venueLat},${deliverySettings.venueLng}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Delivery & Distance Pricing Rules Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl space-y-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                          <Icon name="TruckIcon" size={20} style={{ color: '#C8860A' }} />
                          Dynamic Delivery &amp; Mileage Pricing Rules
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Configure dynamic distance thresholds and mileage fees applied when customer selects their event location.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={deliverySettings.enableDeliveryCalculation}
                          onChange={(e) => setDeliverySettings(prev => ({ ...prev, enableDeliveryCalculation: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C8860A]"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 space-y-2">
                        <label className="block text-xs font-bold text-amber-950 uppercase tracking-wide">
                          Free Delivery Radius
                        </label>
                        <p className="text-[11px] text-amber-800">
                          Deliveries within this radius from base venue are completely free (£0.00).
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={deliverySettings.freeDeliveryRadiusMiles}
                            onChange={(e) => setDeliverySettings(prev => ({ ...prev, freeDeliveryRadiusMiles: Number(e.target.value) || 0 }))}
                            className="w-24 border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white font-bold text-gray-900"
                          />
                          <span className="text-xs font-semibold text-amber-900">Miles</span>
                        </div>
                      </div>

                      <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 space-y-2">
                        <label className="block text-xs font-bold text-amber-950 uppercase tracking-wide">
                          Charge / Mile Beyond Free Zone
                        </label>
                        <p className="text-[11px] text-amber-800">
                          Applied per mile for distance exceeding the free radius.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-sm font-bold text-amber-900">£</span>
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            value={deliverySettings.chargePerMileAfterFree}
                            onChange={(e) => setDeliverySettings(prev => ({ ...prev, chargePerMileAfterFree: parseFloat(e.target.value) || 0 }))}
                            className="w-24 border border-amber-300 rounded-lg px-3 py-1.5 text-sm bg-white font-bold text-gray-900"
                          />
                          <span className="text-xs font-semibold text-amber-900">/ mile</span>
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                          Base Delivery Fee (Optional)
                        </label>
                        <p className="text-[11px] text-gray-500">
                          Flat minimum booking dispatch fee if outside the free zone.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-sm font-bold text-gray-600">£</span>
                          <input
                            type="number"
                            min={0}
                            value={deliverySettings.baseDeliveryFee}
                            onChange={(e) => setDeliverySettings(prev => ({ ...prev, baseDeliveryFee: Number(e.target.value) || 0 }))}
                            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white font-bold text-gray-900"
                          />
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                          Maximum Standard Radius
                        </label>
                        <p className="text-[11px] text-gray-500">
                          Events further than this will show a custom review notice.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={deliverySettings.maxDeliveryRadiusMiles}
                            onChange={(e) => setDeliverySettings(prev => ({ ...prev, maxDeliveryRadiusMiles: Number(e.target.value) || 0 }))}
                            className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white font-bold text-gray-900"
                          />
                          <span className="text-xs font-semibold text-gray-600">Miles</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Test Calculator for Admin */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-300 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Icon name="CalculatorIcon" size={15} className="text-[#C8860A]" />
                          Interactive Mileage &amp; Delivery Fee Tester
                        </span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">Test Simulator</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <GoogleLocationInput
                            value={testPostcode}
                            allowCurrentLocation={false}
                            placeholder="Enter test UK postcode (e.g. CR0 1AA, UB1 1AA)..."
                            onChange={(addr, coords) => {
                              setTestPostcode(addr);
                              if (coords) {
                                const dist = calculateDistanceMiles(
                                  deliverySettings.venueLat,
                                  deliverySettings.venueLng,
                                  coords.lat,
                                  coords.lng
                                );
                                const res = calculateDeliveryCharge(dist, deliverySettings);
                                setTestResult(res);
                              } else {
                                setTestResult(null);
                              }
                            }}
                          />
                        </div>
                      </div>
                      {testResult && (
                        <div className="bg-white rounded-lg p-3 border border-amber-200 text-xs text-amber-950 space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between font-bold">
                            <span>🚗 Distance from Restaurant: {testResult.distanceMiles} miles</span>
                            <span className="text-emerald-700 font-bold text-sm">
                              {testResult.isFree ? 'FREE Delivery (£0.00)' : `£${testResult.charge.toFixed(2)}`}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600">{testResult.breakdownText}</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={saveDeliverySettings}
                      disabled={isSavingDeliverySettings}
                      className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                    >
                      {isSavingDeliverySettings ? 'Saving Restaurant Location & Rules...' : 'Save Restaurant Location & Delivery Rules'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SECTION 3: PRICING & DEPOSITS ── */}
              {settingsSection === 'pricing' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                    <Icon name="CalendarDaysIcon" size={18} style={{ color: '#C8860A' }} />
                    Pricing & Deposits
                  </h3>
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 font-medium">Deposit Amount</label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">£</span>
                        <input type="number" value={pricingDetails.depositPercentage} onChange={e => setPricingDetails(p => ({ ...p, depositPercentage: Number(e.target.value) }))} className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none bg-gray-50 font-bold text-gray-900" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 font-medium">Minimum Booking Hours</label>
                      <input type="number" value={pricingDetails.minimumBookingHours} onChange={e => setPricingDetails(p => ({ ...p, minimumBookingHours: Number(e.target.value) }))} className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none bg-gray-50 font-bold text-gray-900" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 font-medium">Weekday Rate (per hour)</label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">£</span>
                        <input type="number" value={pricingDetails.weekdayRate} onChange={e => setPricingDetails(p => ({ ...p, weekdayRate: Number(e.target.value) }))} className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none bg-gray-50 font-bold text-gray-900" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700 font-medium">Weekend Rate (per hour)</label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">£</span>
                        <input type="number" value={pricingDetails.weekendRate} onChange={e => setPricingDetails(p => ({ ...p, weekendRate: Number(e.target.value) }))} className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none bg-gray-50 font-bold text-gray-900" />
                      </div>
                    </div>
                    <button
                      onClick={savePricingDetails}
                      disabled={isSavingPricingDetails}
                      className="text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all mt-4 shadow-md active:scale-95 disabled:opacity-50 w-full"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                    >
                      {isSavingPricingDetails ? 'Saving...' : 'Save Pricing & Deposits'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SECTION 4: BANK DETAILS ── */}
              {settingsSection === 'bank' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                    <Icon name="CreditCardIcon" size={18} style={{ color: '#C8860A' }} />
                    Bank Account Details
                  </h3>
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Name</label>
                      <input type="text" value={bankDetails.accountName} onChange={(e) => updateBankDetail('accountName', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50 font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sort Code</label>
                      <input type="text" value={bankDetails.sortCode} onChange={(e) => updateBankDetail('sortCode', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50 font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Account Number</label>
                      <input type="text" value={bankDetails.accountNumber} onChange={(e) => updateBankDetail('accountNumber', e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-gray-50 font-medium" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION: STRIPE PAYMENT GATEWAY ── */}
              {settingsSection === 'stripe_gateway' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-3xl space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                        <Icon name="CreditCardIcon" size={20} style={{ color: '#635BFF' }} />
                        Stripe Payment Gateway Configuration
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Configure dynamic Stripe API keys for real-time online menu ordering and deposit payments.
                      </p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                      paymentGatewaySettings.enabled
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : 'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${paymentGatewaySettings.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {paymentGatewaySettings.enabled ? 'Gateway Active' : 'Gateway Disabled'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Enable Switch */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <div>
                        <span className="font-bold text-gray-900 text-xs block">Enable Online Stripe Payments</span>
                        <span className="text-[11px] text-gray-500">Allow customers to choose menu and pay online via Stripe</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={paymentGatewaySettings.enabled}
                        onChange={(e) => setPaymentGatewaySettings(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-5 h-5 rounded text-[#635BFF] focus:ring-[#635BFF] cursor-pointer"
                      />
                    </div>

                    {/* Publishable Key */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                        Stripe Publishable Key (Client Key)
                      </label>
                      <input
                        type="text"
                        value={paymentGatewaySettings.publishableKey}
                        onChange={(e) => setPaymentGatewaySettings(prev => ({ ...prev, publishableKey: e.target.value }))}
                        placeholder="pk_test_... or pk_live_..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-800 focus:outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#635BFF]"
                      />
                    </div>

                    {/* Secret Key */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Stripe Secret Key (Server Key)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="text-[11px] text-gray-500 hover:text-gray-800 font-semibold"
                        >
                          {showSecretKey ? 'Hide Secret Key' : 'Show Secret Key'}
                        </button>
                      </div>
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        value={paymentGatewaySettings.secretKey}
                        onChange={(e) => setPaymentGatewaySettings(prev => ({ ...prev, secretKey: e.target.value }))}
                        placeholder="sk_test_... or sk_live_..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono text-gray-800 focus:outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#635BFF]"
                      />
                    </div>

                    {/* Payment Mode & Deposit Percentage */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                          Online Payment Options Offered to Customer
                        </label>
                        <select
                          value={paymentGatewaySettings.paymentMode}
                          onChange={(e) => setPaymentGatewaySettings(prev => ({ ...prev, paymentMode: e.target.value as any }))}
                          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold bg-gray-50 focus:bg-white focus:outline-none"
                        >
                          <option value="both">Both 30% Deposit &amp; Full Payment (Recommended)</option>
                          <option value="deposit">Deposit Only (e.g. 30%)</option>
                          <option value="full">100% Full Payment Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                          Deposit Percentage (%)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="10"
                            max="100"
                            value={paymentGatewaySettings.depositPercentage}
                            onChange={(e) => setPaymentGatewaySettings(prev => ({ ...prev, depositPercentage: parseInt(e.target.value) || 30 }))}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold bg-gray-50 focus:bg-white focus:outline-none"
                          />
                          <span className="text-xs font-bold text-gray-600">%</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={savePaymentGatewaySettings}
                      disabled={isSavingPaymentSettings}
                      className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #635BFF, #4F46E5)' }}
                    >
                      {isSavingPaymentSettings ? 'Saving Stripe Configuration...' : 'Save Stripe Gateway Settings'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── SECTION 5: BLOCK DATES ── */}
              {settingsSection === 'block_dates' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                    <Icon name="NoSymbolIcon" size={18} style={{ color: '#C8860A' }} />
                    Block Dates & Manage Venue Availability
                  </h3>
                  <div className="flex items-center gap-2">
                    <input type="date" value={blockDateInput} onChange={(e) => setBlockDateInput(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-gray-50" />
                    <button onClick={handleBlockDate} className="bg-gray-900 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">Block Date</button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {blockedDates.map((d) => (
                      <div key={d} className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg">
                        {d}
                        <button onClick={() => handleUnblockDate(d)} className="hover:text-red-800 transition-colors p-0.5"><Icon name="XMarkIcon" size={12} /></button>
                      </div>
                    ))}
                    {blockedDates.length === 0 && (
                      <span className="text-xs text-gray-400 italic">No blocked dates</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ─── DISCOUNT APPROVALS ─── */}
          {activeTab === 'discount_approvals' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Icon name="TagIcon" size={18} style={{ color: '#C8860A' }} />
                    Discount Approvals
                  </h3>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setDiscountTab('pending')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${discountTab === 'pending' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Pending Requests</button>
                    <button onClick={() => setDiscountTab('history')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${discountTab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>History</button>
                  </div>
                </div>
                
                {discountTab === 'pending' ? (
                  pendingDiscounts.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      <Icon name="CheckBadgeIcon" size={36} className="mx-auto mb-3 text-gray-300" />
                      No pending discount requests
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingDiscounts.map(b => {
                        const totalBeforeDiscount = b.baseAmount + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0);
                        const discountReqVal = b.discountRequest?.type === 'percentage' 
                          ? (totalBeforeDiscount * (b.discountRequest.value / 100))
                          : (b.discountRequest?.value || 0);

                        return (
                          <div key={b.id} className="border border-gray-200 rounded-xl p-5 bg-white flex flex-col lg:flex-row gap-6 items-start shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex-1 space-y-4 w-full">
                              {/* Customer & Event Info */}
                              <div className="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                  <h4 className="font-bold text-gray-900 text-base">{b.name}</h4>
                                  <div className="text-xs text-gray-500 mt-1">{b.email} • {b.phone}</div>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-right">
                                  <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Requested Discount</div>
                                  <div className="font-bold text-amber-900 mt-0.5">
                                    {b.discountRequest?.type === 'percentage' ? `${b.discountRequest.value}%` : `£${b.discountRequest?.value}`}
                                    <span className="text-sm font-medium ml-1">(-£{discountReqVal.toLocaleString()})</span>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1 italic">"{b.discountRequest?.reason}"</div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100 mb-2">
                                <div>
                                  <div className="text-xs text-gray-400 mb-0.5">Event Type</div>
                                  <div className="text-sm font-medium text-gray-800">{b.eventType}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400 mb-0.5">Guests</div>
                                  <div className="text-sm font-medium text-gray-800">{b.guests}</div>
                                </div>
                              </div>
                              
                              <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500 font-medium">Total (Base + Extras)</span>
                                  <span className="font-semibold text-gray-900">£{totalBeforeDiscount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-amber-600 font-medium">Requested Discount</span>
                                  <span className="font-bold text-amber-700">-£{discountReqVal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-emerald-600 font-medium">Deposit Paid</span>
                                  <span className="font-semibold text-emerald-700">-£{b.deposit.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between items-center mt-1">
                                  <span className="font-bold text-gray-900 text-xs uppercase tracking-wide">Final Pending Amount <span className="text-[10px] text-gray-400 font-normal normal-case ml-1">(If Approved)</span></span>
                                  <span className="font-bold text-lg text-indigo-700">£{(totalBeforeDiscount - discountReqVal - b.deposit).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-center gap-3 w-full lg:w-48 flex-shrink-0">
                              {/* Deposit Proof */}
                              {b.paymentProofDeposit ? (
                                <div className="w-full text-center">
                                  <div className="text-xs font-semibold text-gray-500 mb-1.5">Deposit Payment</div>
                                  <div 
                                    className="w-full h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group relative"
                                    onClick={() => {
                                      if (b.paymentProofDeposit?.startsWith('data:image')) {
                                        const w = window.open('');
                                        w?.document.write(`<img src="${b.paymentProofDeposit}" style="max-width: 100%; height: auto;"/>`);
                                      } else {
                                        window.open(b.paymentProofDeposit, '_blank');
                                      }
                                    }}
                                  >
                                    <img src={b.paymentProofDeposit} alt="Deposit Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Icon name="MagnifyingGlassPlusIcon" size={20} className="text-white" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-24 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400">
                                  <Icon name="PhotoIcon" size={20} className="mb-1" />
                                  <span className="text-[10px] font-medium">No Deposit Photo</span>
                                </div>
                              )}
                              
                              <div className="flex gap-2 w-full mt-auto">
                                <button onClick={() => handleDiscountApproval(b.id, false)} className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1">
                                  <Icon name="XMarkIcon" size={14} /> Reject
                                </button>
                                <button onClick={() => handleDiscountApproval(b.id, true)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center gap-1">
                                  <Icon name="CheckIcon" size={14} /> Approve
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  bookings.filter(b => b.discountRequest && b.discountRequest.status !== 'pending').length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      <Icon name="ClockIcon" size={36} className="mx-auto mb-3 text-gray-300" />
                      No discount history
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.filter(b => b.discountRequest && b.discountRequest.status !== 'pending').map(b => {
                        const totalBeforeDiscount = b.baseAmount + (b.extraCharges || []).reduce((s, c) => s + c.amount, 0);
                        const discountReqVal = b.discountRequest?.type === 'percentage' 
                          ? (totalBeforeDiscount * (b.discountRequest.value / 100))
                          : (b.discountRequest?.value || 0);

                        return (
                          <div key={b.id} className={`border border-gray-200 rounded-xl p-5 bg-white flex flex-col gap-4 shadow-sm opacity-90 ${b.discountRequest?.status === 'rejected' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'}`}>
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div>
                                <h4 className="font-bold text-gray-900 text-base">{b.name}</h4>
                                <div className="text-xs text-gray-500 mt-1">{b.email} • {b.phone}</div>
                              </div>
                              <div className={`border px-3 py-1.5 rounded-lg text-right ${b.discountRequest?.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <div className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 justify-end ${b.discountRequest?.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                                  <Icon name={b.discountRequest?.status === 'approved' ? 'CheckCircleIcon' : 'XCircleIcon'} size={14} />
                                  {b.discountRequest?.status === 'approved' ? 'Approved' : 'Rejected'} Discount
                                </div>
                                <div className={`font-bold mt-0.5 ${b.discountRequest?.status === 'approved' ? 'text-emerald-900' : 'text-red-900'}`}>
                                  {b.discountRequest?.type === 'percentage' ? `${b.discountRequest.value}%` : `£${b.discountRequest?.value}`}
                                  <span className="text-sm font-medium ml-1">(-£{discountReqVal.toLocaleString()})</span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1 italic">"{b.discountRequest?.reason}"</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-600 border-t border-gray-100 pt-3">
                              <div><span className="text-gray-400 mr-1">Event Type:</span> {b.eventType}</div>
                              <div><span className="text-gray-400 mr-1">Guests:</span> {b.guests}</div>
                              <div><span className="text-gray-400 mr-1">Total Amount:</span> £{totalBeforeDiscount.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          {activeTab === 'access' && (
            <AccessControl currentUserRole={currentUser?.role} />
          )}

          {/* ─── BOOKING TRACKER ─── */}
          {activeTab === 'tracker' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Icon name="MapIcon" size={24} style={{ color: '#C8860A' }} />
                    Booking Timeline Tracker
                  </h3>
                  {trackingBookingId && (
                    <button 
                      onClick={() => { setTrackingBookingId(''); setTrackerSearch(''); }}
                      className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Icon name="ArrowLeftIcon" size={16} /> Back to all orders
                    </button>
                  )}
                </div>
                
                {!trackingBookingId ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="relative">
                      <Icon name="MagnifyingGlassIcon" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text"
                        placeholder="Search orders by name, email, phone number, or event type..."
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] transition-shadow shadow-sm"
                        value={trackerSearch}
                        onChange={(e) => setTrackerSearch(e.target.value)}
                      />
                      {trackerSearch && (
                        <button 
                          onClick={() => setTrackerSearch('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                          <Icon name="XMarkIcon" size={16} />
                        </button>
                      )}
                    </div>

                    <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden max-h-[600px] overflow-y-auto">
                      {(() => {
                        const filtered = bookings.filter(b => 
                          b.name.toLowerCase().includes(trackerSearch.toLowerCase()) || 
                          b.email.toLowerCase().includes(trackerSearch.toLowerCase()) ||
                          b.phone.toLowerCase().includes(trackerSearch.toLowerCase()) ||
                          b.eventType.toLowerCase().includes(trackerSearch.toLowerCase())
                        );

                        return filtered.length > 0 ? filtered.map(b => (
                          <div 
                            key={b.id}
                            onClick={() => {
                              setTrackingBookingId(b.id);
                              setTrackerSearch('');
                            }}
                            className="px-5 py-4 hover:bg-[#C8860A]/5 cursor-pointer border-b border-gray-50 last:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors group"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-50 text-amber-700 font-bold text-lg border border-amber-100">
                                {b.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm group-hover:text-[#C8860A] transition-colors">{b.name}</div>
                                <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="flex items-center gap-1"><Icon name="EnvelopeIcon" size={12} /> {b.email}</span>
                                  <span className="hidden sm:inline text-gray-300">•</span>
                                  <span className="flex items-center gap-1"><Icon name="PhoneIcon" size={12} /> {b.phone}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-left sm:text-right flex flex-col sm:items-end ml-14 sm:ml-0">
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border mb-1.5 shadow-sm ${STATUS_COLORS[b.status]}`}>
                                {STATUS_LABELS[b.status]}
                              </span>
                              <div className="text-xs font-medium text-gray-700">{b.eventType}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{b.date}</div>
                            </div>
                          </div>
                        )) : (
                          <div className="p-12 text-center text-gray-500">
                            <Icon name="InboxIcon" size={32} className="mx-auto mb-3 text-gray-300" />
                            <div className="text-sm font-medium text-gray-900 mb-1">No orders found</div>
                            <div className="text-xs text-gray-500">Try adjusting your search terms</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (() => {
                  const tb = bookings.find(x => x.id === trackingBookingId);
                  if (!tb) return <div className="text-gray-500 italic p-4 bg-gray-50 rounded-lg text-center">Booking not found.</div>;
                  
                  const currentStepIdx = STATUS_FLOW.indexOf(tb.status);
                  
                  return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex items-center justify-between shadow-sm">
                        <div>
                          <div className="font-bold text-gray-900 text-lg">{tb.name}</div>
                          <div className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                            <Icon name="CalendarIcon" size={14} /> {tb.eventType} on {tb.date}
                          </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm ${STATUS_COLORS[tb.status]}`}>
                          {STATUS_LABELS[tb.status]}
                        </span>
                      </div>
                      
                      <div className="relative border-l-2 border-gray-200 ml-5 pl-8 space-y-8 mt-8 pb-4">
                        {STATUS_FLOW.map((step, idx) => {
                          const isCompleted = idx < currentStepIdx;
                          const isCurrent = idx === currentStepIdx;
                          const isPastOrCurrent = idx <= currentStepIdx;
                          
                          return (
                            <div key={step} className="relative">
                              {/* Timeline dot */}
                              <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-emerald-500 border-emerald-500 shadow-md scale-110' : isCurrent ? 'bg-amber-500 border-amber-500 shadow-md ring-4 ring-amber-100 scale-125' : 'bg-white border-gray-300'}`}>
                                {isCompleted && <Icon name="CheckIcon" size={12} className="text-white" />}
                                {isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                              </div>
                              
                              <div className={`font-bold text-sm ${isPastOrCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                                Step {idx + 1}: {STATUS_LABELS[step]}
                              </div>
                              
                              {/* Details if reached this step */}
                              {isPastOrCurrent && (
                                <div className="mt-2.5 text-sm text-gray-600 bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                                  {step === 'new_enquiry' && <div className="flex items-center gap-2"><Icon name="InboxIcon" size={16} className="text-gray-400" /> Enquiry received on <span className="font-semibold text-gray-800">{tb.enquiryDate || 'N/A'}</span>.</div>}
                                  
                                  {step === 'menu_sent' && <div className="flex items-center gap-2"><Icon name="DocumentTextIcon" size={16} className="text-blue-500" /> Menu options sent to customer.</div>}
                                  
                                  {step === 'menu_selected' && <div className="flex items-center gap-2"><Icon name="ListBulletIcon" size={16} className="text-amber-500" /> Selected Menu: <span className="font-semibold text-gray-800">{tb.selectedMenu || tb.package}</span></div>}
                                  
                                  {step === 'deposit_pending' && <div className="flex items-center gap-2"><Icon name="ClockIcon" size={16} className="text-amber-600" /> Deposit requested: <span className="font-semibold text-gray-800">£{tb.deposit.toLocaleString()}</span></div>}
                                  
                                  {step === 'deposit_confirmed' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 text-emerald-600 font-semibold"><Icon name="CheckCircleIcon" size={18} /> Deposit fully received.</div>
                                      {tb.paymentProofDeposit && (
                                        <div className="group relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm" onClick={() => {
                                          if (tb.paymentProofDeposit?.startsWith('data:image')) {
                                            const w = window.open('');
                                            w?.document.write(`<img src="${tb.paymentProofDeposit}" style="max-width: 100%; height: auto;"/>`);
                                          } else {
                                            window.open(tb.paymentProofDeposit, '_blank');
                                          }
                                        }}>
                                          <img src={tb.paymentProofDeposit} alt="Deposit Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Icon name="MagnifyingGlassPlusIcon" size={20} /></div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {step === 'final_invoice_sent' && <div className="flex items-center gap-2"><Icon name="DocumentArrowUpIcon" size={16} className="text-blue-500" /> Final invoice sent. Balance Due: <span className="font-bold text-gray-900">£{(getTotalAmount(tb) - tb.deposit).toLocaleString()}</span></div>}
                                  
                                  {step === 'final_payment_received' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 text-emerald-600 font-semibold"><Icon name="CheckCircleIcon" size={18} /> Final Payment fully received.</div>
                                      {tb.paymentProofFinal && (
                                        <div className="group relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm" onClick={() => {
                                          if (tb.paymentProofFinal?.startsWith('data:image')) {
                                            const w = window.open('');
                                            w?.document.write(`<img src="${tb.paymentProofFinal}" style="max-width: 100%; height: auto;"/>`);
                                          } else {
                                            window.open(tb.paymentProofFinal, '_blank');
                                          }
                                        }}>
                                          <img src={tb.paymentProofFinal} alt="Final Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Icon name="MagnifyingGlassPlusIcon" size={20} /></div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {step === 'event_scheduled' && <div className="flex items-center gap-2"><Icon name="CalendarDaysIcon" size={16} className="text-indigo-500" /> Event scheduled for <span className="font-semibold text-gray-800">{tb.date} at {tb.time}</span>.</div>}
                                  
                                  {step === 'event_completed' && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2"><Icon name="FlagIcon" size={16} className="text-amber-500" /> Event has concluded.</div>
                                      {tb.paymentProofExtra && (
                                        <div className="pt-2 mt-2 border-t border-gray-100">
                                          <div className="mb-2 text-emerald-600 font-semibold flex items-center gap-1.5"><Icon name="BanknotesIcon" size={16} /> Extra Charges Paid</div>
                                          <div className="group relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm" onClick={() => {
                                            if (tb.paymentProofExtra?.startsWith('data:image')) {
                                              const w = window.open('');
                                              w?.document.write(`<img src="${tb.paymentProofExtra}" style="max-width: 100%; height: auto;"/>`);
                                            } else {
                                              window.open(tb.paymentProofExtra, '_blank');
                                            }
                                          }}>
                                            <img src={tb.paymentProofExtra} alt="Extra Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Icon name="MagnifyingGlassPlusIcon" size={20} /></div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {step === 'completed' && (
                                    <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 px-4 py-2.5 rounded-lg border border-emerald-100">
                                      <Icon name="CheckBadgeIcon" size={20} /> Booking Successfully Closed
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── BOOKING DETAIL / WORKFLOW DRAWER ─── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedBooking(null); setShowMenuPanel(false); setIsEditingBookingDate(false); setIsEditingEventType(false); setIsEditingPackage(false); setIsEditingTime(false); setIsEditingGuests(false); }} />
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                {/* Back Arrow button to go one step back in workflow status */}
                {STATUS_FLOW.indexOf(selectedBooking.status) > 0 && STATUS_FLOW.indexOf(selectedBooking.status) <= 3 && (
                  <button onClick={() => handleGoBackStatus(selectedBooking.id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors" title="Go one step back">
                    <Icon name="ArrowLeftIcon" size={20} />
                  </button>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">Booking #{selectedBooking.id}</h2>
                  <p className="text-xs text-gray-400">{selectedBooking.eventType} · {selectedBooking.date}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedBooking(null); setShowMenuPanel(false); setIsEditingBookingDate(false); setIsEditingEventType(false); setIsEditingPackage(false); setIsEditingTime(false); setIsEditingGuests(false); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            {/* Status badge + progress */}
            <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selectedBooking.status]}`}>
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[selectedBooking.status]}`} />
                  {STATUS_LABELS[selectedBooking.status]}
                </span>
                <span className="text-xs text-gray-400">Step {STATUS_FLOW.indexOf(selectedBooking.status) + 1} of {STATUS_FLOW.length}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${((STATUS_FLOW.indexOf(selectedBooking.status) + 1) / STATUS_FLOW.length) * 100}%`, background: 'linear-gradient(90deg, #C8860A, #F0A830)' }} />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-5">
              {/* Customer info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,134,10,0.1)' }}>
                    <span className="text-base font-bold" style={{ color: '#C8860A' }}>{selectedBooking.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{selectedBooking.name}</div>
                    <div className="text-sm text-gray-500">{selectedBooking.email}</div>
                    <div className="text-sm text-gray-500">{selectedBooking.phone}</div>
                  </div>
                  <a href={buildWhatsAppLink(selectedBooking.phone, `Hi ${selectedBooking.name.split(' ')[0]}, this is SriLalitha regarding your ${selectedBooking.eventType} booking.`)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={14} />
                    WhatsApp
                  </a>
                </div>
              </div>

              {/* Special Consideration / Waitlist Alert Banner */}
              {selectedBooking.isWaitlist && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-2.5 shadow-2xs">
                  <span className="text-base flex-shrink-0">✨</span>
                  <div className="text-xs">
                    <span className="font-bold text-amber-950 block">High Demand / Capacity Exceeded Request</span>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      This customer submitted an enquiry for a time slot that had reached standard booking capacity. Please contact the client to discuss timing adjustments or custom accommodation.
                    </p>
                  </div>
                </div>
              )}

              {/* Event Location & Delivery Card */}
              {selectedBooking.location && (
                <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="MapPinIcon" size={17} className="text-[#C8860A]" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-amber-950 uppercase tracking-wide">Event Location / Venue Address</div>
                        <div className="text-sm font-semibold text-gray-900 mt-0.5">{selectedBooking.location}</div>
                        {selectedBooking.distanceMiles ? (
                          <div className="text-xs text-amber-900 mt-1.5 flex items-center gap-2 flex-wrap font-medium">
                            <span className="bg-white px-2.5 py-0.5 rounded-md border border-amber-200 font-semibold text-gray-800 shadow-2xs">
                              🚗 {selectedBooking.distanceMiles} miles from restaurant
                            </span>
                            {selectedBooking.deliveryCharge ? (
                              <span className="bg-amber-100/90 text-amber-950 px-2.5 py-0.5 rounded-md font-bold border border-amber-300 shadow-2xs">
                                🚚 +£{selectedBooking.deliveryCharge.toFixed(2)} Delivery Fee
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md font-bold">
                                Free Delivery
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${deliverySettings.venueLat},${deliverySettings.venueLng}&destination=${encodeURIComponent(selectedBooking.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-white px-3 py-2 rounded-lg transition-all shadow-sm flex-shrink-0 cursor-pointer active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                    >
                      <Icon name="MapIcon" size={14} />
                      Directions
                    </a>
                  </div>
                  {selectedBooking.deliveryBreakdown && (
                    <div className="text-[11px] text-amber-800/90 bg-white/75 p-2 rounded-lg border border-amber-100">
                      ℹ️ {selectedBooking.deliveryBreakdown}
                    </div>
                  )}
                </div>
              )}

              {/* Event details */}
              <div className="grid grid-cols-2 gap-3">
                {!isEditingEventType ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Event Type</span>
                      {!selectedBooking.depositPaid && !['event_completed', 'final_invoice_sent', 'final_payment_received', 'completed'].includes(selectedBooking.status) && (
                        <button
                          onClick={() => setIsEditingEventType(true)}
                          className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                        >
                          <Icon name="PencilIcon" size={10} />
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{selectedBooking.eventType}</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Event Type</span>
                      <button
                        onClick={() => setIsEditingEventType(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      value={selectedBooking.eventType}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        try {
                          const updated = { ...selectedBooking, eventType: val };
                          setSelectedBooking(updated);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, eventType: val } : b));
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { eventType: val }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { eventType: val }, { merge: true });
                          setIsEditingEventType(false);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    >
                      <option value="Wedding">Wedding</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Anniversary">Anniversary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {!isEditingPackage ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Package</span>
                      {!selectedBooking.depositPaid && !['event_completed', 'final_invoice_sent', 'final_payment_received', 'completed'].includes(selectedBooking.status) && (
                        <button
                          onClick={() => setIsEditingPackage(true)}
                          className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                        >
                          <Icon name="PencilIcon" size={10} />
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 truncate" title={selectedBooking.selectedMenu || selectedBooking.package}>
                      {selectedBooking.selectedMenu || selectedBooking.package}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Package</span>
                      <button
                        onClick={() => setIsEditingPackage(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      value={selectedBooking.selectedMenu || selectedBooking.package || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        try {
                          const updated = { ...selectedBooking, selectedMenu: val, package: val };
                          setSelectedBooking(updated);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, selectedMenu: val, package: val } : b));
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { selectedMenu: val, package: val }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { selectedMenu: val, package: val }, { merge: true });
                          setIsEditingPackage(false);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    >
                      <option value="Classic Buffet">Classic Buffet</option>
                      <option value="Premium Plated">Premium Plated</option>
                      <option value="Cocktail Reception">Cocktail Reception</option>
                      <option value="Continental Breakfast">Continental Breakfast</option>
                      <option value="Indian Menu">Indian Menu</option>
                      <option value="Sri Lankan Menu">Sri Lankan Menu</option>
                    </select>
                  </div>
                )}

                {!isEditingBookingDate ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Date</span>
                      {!selectedBooking.depositPaid && !['event_completed', 'final_invoice_sent', 'final_payment_received', 'completed'].includes(selectedBooking.status) && (
                        <button
                          onClick={() => setIsEditingBookingDate(true)}
                          className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                        >
                          <Icon name="PencilIcon" size={10} />
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedBooking.date ? selectedBooking.date.split('T')[0] : 'N/A'}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Date</span>
                      <button
                        onClick={() => setIsEditingBookingDate(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="date"
                      defaultValue={selectedBooking.date ? selectedBooking.date.split('T')[0] : ''}
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        if (!newDate) return;
                        try {
                          const updatedBooking = { ...selectedBooking, date: newDate };
                          setSelectedBooking(updatedBooking);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, date: newDate } : b));

                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { date: newDate }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { date: newDate }, { merge: true });
                          setIsEditingBookingDate(false);
                        } catch (error) {
                          console.error('Error updating booking date:', error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    />
                  </div>
                )}

                {!isEditingTime ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Time / Shift</span>
                      {!selectedBooking.depositPaid && !['event_completed', 'final_invoice_sent', 'final_payment_received', 'completed'].includes(selectedBooking.status) && (
                        <button
                          onClick={() => setIsEditingTime(true)}
                          className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                        >
                          <Icon name="PencilIcon" size={10} />
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{selectedBooking.time}</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Time / Shift</span>
                      <button
                        onClick={() => setIsEditingTime(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <select
                      value={selectedBooking.time}
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        try {
                          const updated = { ...selectedBooking, time: val };
                          setSelectedBooking(updated);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, time: val, timeOfDay: val } : b));
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { timeOfDay: val }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { timeOfDay: val, time: val }, { merge: true });
                          setIsEditingTime(false);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                    </select>
                  </div>
                )}

                {!isEditingGuests ? (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Guests</span>
                      {!selectedBooking.depositPaid && !(selectedBooking.selectedMenu || selectedBooking.package) && !['event_completed', 'final_invoice_sent', 'final_payment_received', 'completed'].includes(selectedBooking.status) && (
                        <button
                          onClick={() => setIsEditingGuests(true)}
                          className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                        >
                          <Icon name="PencilIcon" size={10} />
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{selectedBooking.guests} people</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-300">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center justify-between">
                      <span>Guests</span>
                      <button
                        onClick={() => setIsEditingGuests(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      defaultValue={selectedBooking.guests}
                      onChange={async (e) => {
                        const val = Number(e.target.value);
                        if (!val || val <= 0) return;
                        try {
                          let baseAmount = selectedBooking.baseAmount || 0;
                          let deposit = selectedBooking.deposit || 0;

                          const currentPkg = selectedBooking.selectedMenu || selectedBooking.package;
                          if (currentPkg && currentPkg !== 'custom') {
                            const found = editableBanquetPackages.find(p => p.name === currentPkg);
                            if (found) {
                              baseAmount = found.pricePerPerson * val;
                              deposit = pricingDetails.depositPercentage;
                            }
                          }

                          const updated = { ...selectedBooking, guests: val, baseAmount, deposit };
                          setSelectedBooking(updated);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, guests: val, baseAmount, deposit } : b));

                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { guests: val, baseAmount, deposit }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { guests: val, baseAmount, deposit }, { merge: true });
                          setIsEditingGuests(false);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 font-medium text-gray-900"
                    />
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Enquiry Date</div>
                  <div className="text-sm font-medium text-gray-900">{selectedBooking.enquiryDate}</div>
                </div>

                {['deposit_confirmed', 'event_scheduled', 'event_completed', 'final_invoice_sent', 'final_payment_received', 'completed'].includes(selectedBooking.status) && (
                  !isEditingDueDate ? (
                    <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between border border-amber-100">
                      <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center justify-between">
                        <span>Payment Due Date</span>
                        {!selectedBooking.depositPaid && !['event_completed', 'final_invoice_sent', 'final_payment_received', 'completed'].includes(selectedBooking.status) && (
                          <button
                            onClick={() => setIsEditingDueDate(true)}
                            className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                          >
                            <Icon name="PencilIcon" size={10} />
                            Edit
                          </button>
                        )}
                      </div>
                      <div className="text-sm font-bold text-amber-900">
                        {selectedBooking.dueDate ? selectedBooking.dueDate : 'Not Set'}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-xl p-3 flex flex-col justify-between border border-amber-400">
                      <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1 flex items-center justify-between">
                        <span>Payment Due Date</span>
                        <button
                          onClick={() => setIsEditingDueDate(false)}
                          className="text-[10px] text-gray-500 hover:text-gray-700 font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="date"
                        defaultValue={selectedBooking.dueDate || ''}
                        onChange={async (e) => {
                          const newDate = e.target.value;
                          if (!newDate) return;
                          try {
                            const updatedBooking = { ...selectedBooking, dueDate: newDate };
                            setSelectedBooking(updatedBooking);
                            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, dueDate: newDate } : b));

                            await setDoc(doc(db, 'booking_requests', selectedBooking.id), { dueDate: newDate }, { merge: true });
                            await setDoc(doc(db, 'bookings', selectedBooking.id), { dueDate: newDate }, { merge: true });
                            setIsEditingDueDate(false);
                          } catch (error) {
                            console.error('Error updating due date:', error);
                          }
                        }}
                        className="w-full border border-amber-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-amber-900 mt-1"
                      />
                    </div>
                  )
                )}
              </div>

              {/* ── CUSTOM DYNAMIC FORM RESPONSES ── */}
              {selectedBooking.customFields && Object.keys(selectedBooking.customFields).length > 0 && (
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-2.5">
                  <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Icon name="ClipboardDocumentListIcon" size={14} style={{ color: '#C8860A' }} />
                    Dynamic Form Submissions
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(selectedBooking.customFields).map(([key, val]) => {
                      const fieldDef = formConfig.fields.find((f) => f.id === key);
                      const label = fieldDef?.label || key.replace(/^custom_/, '').replace(/_/g, ' ');
                      return (
                        <div key={key} className="bg-white rounded-lg border border-amber-100 p-2.5 shadow-2xs">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">
                            {label}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 break-words">
                            {String(val || '—')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── STEP-SPECIFIC PANELS ── */}

              {/* Select Package Block */}
              {(selectedBooking.status === 'menu_sent' || selectedBooking.status === 'menu_selected') && (
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/50">
                  <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Icon name="ClipboardDocumentListIcon" size={14} style={{ color: '#C8860A' }} />
                    Select Package Chosen by Customer
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Select Banquet Package</label>
                      <select
                        value={selectedBooking.selectedMenu || selectedBooking.package || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          if (!val) return;

                          let pricePerPerson = 0;
                          let selectedPkgName = '';
                          let baseAmount = 0;

                          const foundExtra = editableLiveCounter.extras.find(ex => ex.name === val);

                          if (val === 'custom') {
                            selectedPkgName = 'Custom Package';
                          } else if (foundExtra) {
                            selectedPkgName = foundExtra.name;
                            baseAmount = foundExtra.price;
                          } else {
                            const found = editableBanquetPackages.find(p => p.name === val);
                            if (found) {
                              pricePerPerson = found.pricePerPerson;
                              selectedPkgName = found.name;
                            } else {
                              selectedPkgName = val;
                              pricePerPerson = 0; // Manual pricing for Venue Hire, etc.
                            }
                          }

                          const adults = selectedBooking.adults ?? selectedBooking.guests;
                          const kids4to10 = selectedBooking.kids4to10 || 0;
                          
                          const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
                          const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;

                          if (!foundExtra && val !== 'custom') {
                            baseAmount = (adults * pricePerPerson) + (kids4to10 * kidsPrice);
                          }
                          const deposit = pricingDetails.depositPercentage;

                          // Update locally
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {
                            ...b,
                            selectedMenu: selectedPkgName,
                            package: selectedPkgName,
                            baseAmount,
                            deposit
                          } : b));
                          setSelectedBooking(prev => prev?.id === selectedBooking.id ? {
                            ...prev,
                            selectedMenu: selectedPkgName,
                            package: selectedPkgName,
                            baseAmount,
                            deposit
                          } : prev);

                          // Save to Firestore
                          try {
                            const updates = {
                              selectedMenu: selectedPkgName,
                              package: selectedPkgName,
                              baseAmount,
                              deposit
                            };
                            await setDoc(doc(db, 'booking_requests', selectedBooking.id), updates, { merge: true });
                            await setDoc(doc(db, 'bookings', selectedBooking.id), {
                              ...selectedBooking,
                              ...updates,
                              updatedAt: new Date().toISOString()
                            }, { merge: true });
                          } catch (err) {
                            console.error('Error saving selected package:', err);
                          }
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                      >
                        <option value="">-- Choose Package --</option>
                        <optgroup label="Buffet Packages">
                          {editableBanquetPackages.map(pkg => (
                            <option key={pkg.id} value={pkg.name}>
                              {pkg.name} (£{pkg.pricePerPerson}/person)
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Other Enquiries">
                          <option value="Venue Hire">Venue Hire</option>
                          <option value="Dry Hire">Dry Hire</option>
                          <option value="Table Service">Table Service</option>
                          <option value="Kids Pricing">Kids Pricing</option>
                        </optgroup>
                        <optgroup label="Extras">
                          {(editableLiveCounter?.extras || []).map(extra => (
                            <option key={extra.name} value={extra.name}>
                              {extra.name} (£{extra.price})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Custom">
                          <option value="custom">Custom Price Package</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Select Extras Checkbox List */}
                    <div className="mt-3 border-t border-amber-200/50 pt-3">
                      <label className="block text-xs font-semibold text-gray-500 mb-2">Select Extras (Optional)</label>
                      <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2.5 bg-white shadow-inner">
                        {(editableLiveCounter?.extras || []).map((extra) => {
                          const isChecked = (selectedBooking.extraCharges || []).some(c => c.label === extra.name);
                          return (
                            <label key={extra.name} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none hover:bg-gray-50 p-1.5 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={async (e) => {
                                  const checked = e.target.checked;
                                  let newExtraCharges = [...(selectedBooking.extraCharges || [])];
                                  if (checked) {
                                    if (!newExtraCharges.some(c => c.label === extra.name)) {
                                      newExtraCharges.push({ label: extra.name, amount: extra.price, isPreset: true });
                                    }
                                  } else {
                                    newExtraCharges = newExtraCharges.filter(c => c.label !== extra.name);
                                  }

                                  // Update locally
                                  setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {
                                    ...b,
                                    extraCharges: newExtraCharges
                                  } : b));
                                  setSelectedBooking(prev => prev?.id === selectedBooking.id ? {
                                    ...prev,
                                    extraCharges: newExtraCharges
                                  } : prev);

                                  // Save to Firestore
                                  try {
                                    await setDoc(doc(db, 'booking_requests', selectedBooking.id), { extraCharges: newExtraCharges }, { merge: true });
                                    await setDoc(doc(db, 'bookings', selectedBooking.id), {
                                      ...selectedBooking,
                                      extraCharges: newExtraCharges,
                                      updatedAt: new Date().toISOString()
                                    }, { merge: true });
                                  } catch (err) {
                                    console.error('Error saving extra charges:', err);
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="flex-1 text-gray-800">{extra.name}</span>
                              <span className="font-semibold text-amber-700">£{extra.price}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Guest Breakdown for Pricing Calculation */}
                    {(selectedBooking.selectedMenu || selectedBooking.package) && (
                      <div className="grid grid-cols-3 gap-3 pt-2 pb-1 border-t border-amber-200/50 mt-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Adults (Full Price)</label>
                          <input
                            type="number"
                            min="0"
                            value={(selectedBooking.adults ?? selectedBooking.guests) || ''}
                            placeholder="0"
                            onChange={async (e) => {
                              const adults = Number(e.target.value) || 0;
                              const kids4to10 = selectedBooking.kids4to10 || 0;
                              const kidsUnder4 = selectedBooking.kidsUnder4 || 0;
                              const guests = adults + kids4to10 + kidsUnder4;
                              
                              let pricePerPerson = 0;
                              const found = editableBanquetPackages.find(p => p.name === (selectedBooking.selectedMenu || selectedBooking.package));
                              if (found) pricePerPerson = found.pricePerPerson;

                              const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
                              const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;

                              const baseAmount = (adults * pricePerPerson) + (kids4to10 * kidsPrice);
                              const deposit = Math.max(selectedBooking.deposit || 0, pricingDetails.depositPercentage);

                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, guests, adults, baseAmount, deposit } : b));
                              setSelectedBooking(prev => prev?.id === selectedBooking.id ? { ...prev, guests, adults, baseAmount, deposit } : prev);
                              
                              const updates = { guests, adults, baseAmount, deposit };
                              await setDoc(doc(db, 'booking_requests', selectedBooking.id), updates, { merge: true });
                              await setDoc(doc(db, 'bookings', selectedBooking.id), updates, { merge: true });
                            }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Kids (4-10 yrs)</label>
                          <input
                            type="number"
                            min="0"
                            value={selectedBooking.kids4to10 || ''}
                            placeholder="0"
                            onChange={async (e) => {
                              const kids4to10 = Number(e.target.value) || 0;
                              const adults = selectedBooking.adults ?? selectedBooking.guests;
                              const kidsUnder4 = selectedBooking.kidsUnder4 || 0;
                              const guests = adults + kids4to10 + kidsUnder4;
                              
                              let pricePerPerson = 0;
                              const found = editableBanquetPackages.find(p => p.name === (selectedBooking.selectedMenu || selectedBooking.package));
                              if (found) pricePerPerson = found.pricePerPerson;

                              const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
                              const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;

                              const baseAmount = (adults * pricePerPerson) + (kids4to10 * kidsPrice);
                              const deposit = Math.max(selectedBooking.deposit || 0, pricingDetails.depositPercentage);

                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, guests, adults, kids4to10, baseAmount, deposit } : b));
                              setSelectedBooking(prev => prev?.id === selectedBooking.id ? { ...prev, guests, adults, kids4to10, baseAmount, deposit } : prev);
                              
                              const updates = { guests, adults, kids4to10, baseAmount, deposit };
                              await setDoc(doc(db, 'booking_requests', selectedBooking.id), updates, { merge: true });
                              await setDoc(doc(db, 'bookings', selectedBooking.id), updates, { merge: true });
                            }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Kids (0-4 yrs) Free</label>
                          <input
                            type="number"
                            min="0"
                            value={selectedBooking.kidsUnder4 || ''}
                            placeholder="0"
                            onChange={async (e) => {
                              const kidsUnder4 = Number(e.target.value) || 0;
                              const adults = selectedBooking.adults ?? selectedBooking.guests;
                              const kids4to10 = selectedBooking.kids4to10 || 0;
                              const guests = adults + kids4to10 + kidsUnder4;
                              
                              let pricePerPerson = 0;
                              const found = editableBanquetPackages.find(p => p.name === (selectedBooking.selectedMenu || selectedBooking.package));
                              if (found) pricePerPerson = found.pricePerPerson;

                              const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
                              const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;

                              const baseAmount = (adults * pricePerPerson) + (kids4to10 * kidsPrice);
                              const deposit = Math.max(selectedBooking.deposit || 0, pricingDetails.depositPercentage);

                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, guests, adults, kidsUnder4, baseAmount, deposit } : b));
                              setSelectedBooking(prev => prev?.id === selectedBooking.id ? { ...prev, guests, adults, kidsUnder4, baseAmount, deposit } : prev);
                              
                              const updates = { guests, adults, kidsUnder4, baseAmount, deposit };
                              await setDoc(doc(db, 'booking_requests', selectedBooking.id), updates, { merge: true });
                              await setDoc(doc(db, 'bookings', selectedBooking.id), updates, { merge: true });
                            }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Show Custom Inputs if Custom or any package is selected */}
                    {(selectedBooking.selectedMenu || selectedBooking.package) && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Base Price (£)</label>
                          <input
                            type="number"
                            value={selectedBooking.baseAmount || ''}
                            onChange={async (e) => {
                              const baseAmount = Number(e.target.value) || 0;
                              const deposit = Math.max(selectedBooking.deposit || 0, pricingDetails.depositPercentage);

                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {
                                ...b,
                                baseAmount,
                                deposit
                              } : b));
                              setSelectedBooking(prev => prev?.id === selectedBooking.id ? {
                                ...prev,
                                baseAmount,
                                deposit
                              } : prev);

                              try {
                                await setDoc(doc(db, 'booking_requests', selectedBooking.id), { baseAmount, deposit }, { merge: true });
                                await setDoc(doc(db, 'bookings', selectedBooking.id), { baseAmount, deposit, updatedAt: new Date().toISOString() }, { merge: true });
                              } catch (err) {
                                console.error('Error saving base amount:', err);
                              }
                            }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Deposit Required (£)</label>
                          <input
                            type="number"
                            min={pricingDetails.depositPercentage}
                            value={Math.max(selectedBooking.deposit || 0, pricingDetails.depositPercentage) || ''}
                            onChange={async (e) => {
                              const deposit = Math.max(Number(e.target.value) || 0, pricingDetails.depositPercentage);

                              setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {
                                ...b,
                                deposit
                              } : b));
                              setSelectedBooking(prev => prev?.id === selectedBooking.id ? {
                                ...prev,
                                deposit
                              } : prev);

                              try {
                                await setDoc(doc(db, 'booking_requests', selectedBooking.id), { deposit }, { merge: true });
                                await setDoc(doc(db, 'bookings', selectedBooking.id), { deposit, updatedAt: new Date().toISOString() }, { merge: true });
                              } catch (err) {
                                console.error('Error saving deposit amount:', err);
                              }
                            }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Menu Sent — show real menu packages */}
              {(selectedBooking.status === 'menu_sent' || showMenuPanel) && selectedBooking.status !== 'menu_selected' && selectedBooking.status !== 'deposit_pending' && selectedBooking.status !== 'deposit_confirmed' && selectedBooking.status !== 'event_scheduled' && selectedBooking.status !== 'event_completed' && selectedBooking.status !== 'final_invoice_sent' && selectedBooking.status !== 'final_payment_received' && selectedBooking.status !== 'completed' && (
                <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
                  <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">Send Menu Packages via WhatsApp</div>
                  <div className="space-y-2">
                    {editableBanquetPackages.map((pkg) => {
                      const adults = selectedBooking.adults ?? selectedBooking.guests;
                      const kids4to10 = selectedBooking.kids4to10 || 0;
                      const kidsUnder4 = selectedBooking.kidsUnder4 || 0;
                      const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
                      const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;
                      const estTotal = (pkg.pricePerPerson * adults) + (kids4to10 * kidsPrice);
                      const totalGuests = adults + kids4to10 + kidsUnder4;
                      
                      return (
                        <div key={pkg.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-purple-100">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                            <div className="text-xs text-gray-500">£{pkg.pricePerPerson}/person · Est. £{estTotal.toLocaleString()} for {totalGuests} guests</div>
                          </div>
                          <a href={buildWhatsAppLink(selectedBooking.phone, `Hi ${selectedBooking.name.split(' ')[0]}, here is our *${pkg.name}* at *£${pkg.pricePerPerson}/person* (Excl. VAT):\n\n🥗 Starters: ${pkg.starters.veg} Veg + ${pkg.starters.nonVeg} Non-Veg\n🍛 Mains: ${pkg.mains.veg} Veg + ${pkg.mains.nonVeg} Non-Veg\n🍮 Desserts: ${pkg.desserts.join(', ')}\n${pkg.drinks.length > 0 ? `🥤 Drinks: ${pkg.drinks.join(', ')}\n` : ''}${pkg.guestLabel ? `\n👥 ${pkg.guestLabel}` : ''}\n\nFor ${adults} Adults and ${kids4to10} Kids, estimated total: *£${estTotal.toLocaleString()}* (Excl. VAT)\n\n🧒 *Kids Pricing* (Over 50 Adults):\n${editableKidsPricing.map(kp => `${kp.ageRange}: ${kp.price}`).join('\\n')}\n\n🏢 *Venue Hire Charges:*\n${editableVenueCharges.map(vc => `• ${vc.day}: ${vc.charge}${vc.note ? ` (${vc.note})` : ''}`).join('\\n')}\n\n🎪 *Extras Available:*\n${(editableLiveCounter?.extras || []).map(e => `• ${e.name}: £${e.price}`).join('\\n')}\n\nPlease reply with your selection! 🙏`)}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0 ml-2"
                            style={{ background: '#25D366', color: 'white' }}>
                            <Icon name="ChatBubbleLeftRightIcon" size={12} />
                            Send
                          </a>
                        </div>
                      );
                    })}
                    {/* Also offer Indian & Sri Lankan menus */}
                    <div className="mt-2 pt-2 border-t border-purple-100">
                      <div className="text-xs text-purple-600 font-medium mb-2">Or send full menu list:</div>
                      <div className="flex gap-2 flex-wrap">
                        <a href={buildMenuWhatsAppText(selectedBooking.name.split(' ')[0], selectedBooking.phone, 'Indian Menu', selectedBooking.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Indian Menu
                        </a>
                        <a href={buildMenuWhatsAppText(selectedBooking.name.split(' ')[0], selectedBooking.phone, 'Sri Lankan Menu', selectedBooking.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Sri Lankan Menu
                        </a>
                        <a href={buildMenuWhatsAppText(selectedBooking.name.split(' ')[0], selectedBooking.phone, 'Extras', selectedBooking.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Extras
                        </a>
                        <a href={buildMenuWhatsAppText(selectedBooking.name.split(' ')[0], selectedBooking.phone, 'Venue Hall Charges', selectedBooking.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Venue Hall Charges
                        </a>
                        <a href={buildMenuWhatsAppText(selectedBooking.name.split(' ')[0], selectedBooking.phone, 'Dry Hire', selectedBooking.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Dry Hire
                        </a>
                        <a href={buildMenuWhatsAppText(selectedBooking.name.split(' ')[0], selectedBooking.phone, 'Kids Pricing', selectedBooking.guests)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={12} />
                          Kids Pricing
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Deposit Pending — send bank details */}
              {selectedBooking.status === 'deposit_pending' && (
                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                  <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">Send Deposit Request via WhatsApp</div>
                  <div className="bg-white rounded-lg p-3 border border-amber-100 text-sm text-gray-700 mb-3 leading-relaxed">
                    <p className="font-medium text-gray-900 mb-1">Bank Transfer Details:</p>
                    <p>Account Name: {bankDetails.accountName}</p>
                    <p>Sort Code: {bankDetails.sortCode}</p>
                    <p>Account No: {bankDetails.accountNumber}</p>
                    <p className="mt-1 font-semibold text-amber-700">Deposit Amount: £{selectedBooking.deposit.toLocaleString()}</p>
                  </div>
                  <a href={buildWhatsAppLink(selectedBooking.phone, `Hi ${selectedBooking.name.split(' ')[0]}, to confirm your ${selectedBooking.eventType} booking on ${selectedBooking.date}, please transfer the deposit of *£${selectedBooking.deposit.toLocaleString()}* to:\n\n🏦 Account Name: ${bankDetails.accountName}\n📋 Sort Code: ${bankDetails.sortCode}\n🔢 Account No: ${bankDetails.accountNumber}\n📌 Reference: ${selectedBooking.id}\n\nOnce paid, please send a screenshot of the transfer confirmation. Thank you!`)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                    Send Bank Details via WhatsApp
                  </a>
                </div>
              )}

              {/* Step: Deposit Confirmation */}
              {selectedBooking.status === 'deposit_pending' && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Deposit Payment Proof</div>
                  {selectedBooking.paymentProofDeposit ? (
                    <div className="flex items-start gap-4">
                      {(selectedBooking.paymentProofDeposit.startsWith('http') || selectedBooking.paymentProofDeposit.startsWith('data:image')) && (
                        <div
                          className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group flex-shrink-0 bg-gray-50"
                          onClick={() => {
                            if (selectedBooking.paymentProofDeposit?.startsWith('data:image')) {
                              const w = window.open('');
                              w?.document.write(`<img src="${selectedBooking.paymentProofDeposit}" style="max-width: 100%; height: auto;"/>`);
                            } else {
                              window.open(selectedBooking.paymentProofDeposit, '_blank');
                            }
                          }}
                          title="Click to view full image"
                        >
                          <img
                            src={selectedBooking.paymentProofDeposit}
                            alt="Payment Proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icon name="MagnifyingGlassPlusIcon" size={20} className="text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                          <Icon name="CheckCircleIcon" size={16} />
                          Payment proof received
                        </div>

                        {/* Styled payment method selection */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-1">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Select Payment Method:</div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {[
                              { label: 'Paid by Cash', value: 'Paid by Cash' },
                              { label: 'Paid by Card', value: 'Paid by Card' },
                              { label: 'Paid by Bank Transfer', value: 'Paid by Bank Transfer' }
                            ].map((opt) => {
                              const isSelected = depositPaymentMethod === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setDepositPaymentMethod(opt.value)}
                                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs font-semibold transition-all ${
                                    isSelected
                                      ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {isSelected && (
                                    <span className="text-amber-600">
                                      <Icon name="CheckIcon" size={14} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="file"
                            accept="image/*"
                            id="proof-reupload"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadProof(selectedBooking.id, e.target.files[0]);
                              }
                            }}
                          />
                          <label
                            htmlFor="proof-reupload"
                            className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium"
                          >
                            <Icon name="ArrowPathIcon" size={14} />
                            {isUploadingProof ? 'Uploading...' : 'Upload different image'}
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">Awaiting payment screenshot from customer via WhatsApp</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id="proof-upload"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadProof(selectedBooking.id, e.target.files[0]);
                            }
                          }}
                        />
                        <label
                          htmlFor="proof-upload"
                          className="cursor-pointer bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <Icon name="ArrowUpTrayIcon" size={16} />
                          {isUploadingProof ? 'Uploading...' : 'Upload Screenshot'}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP: Set Final Payment Due Date (mandatory after calendar) ── */}
              {['deposit_confirmed', 'final_invoice_sent'].includes(selectedBooking.status) && (
                <div className={`rounded-xl p-4 border-2 ${selectedBooking.dueDate ? 'border-amber-200 bg-amber-50' : 'border-red-400 bg-red-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${selectedBooking.dueDate ? 'text-amber-700' : 'text-red-700'}`}>
                      <Icon name="CalendarDaysIcon" size={14} />
                      {selectedBooking.dueDate ? '✅ Final Payment Due Date' : '⚠️ Set Final Payment Due Date (Required)'}
                    </div>
                    {selectedBooking.dueDate && !['final_payment_received', 'event_completed', 'completed'].includes(selectedBooking.status) && (
                      <button onClick={() => setIsEditingDueDate(v => !v)} className="text-[10px] text-amber-600 hover:text-amber-900 font-semibold flex items-center gap-0.5">
                        <Icon name="PencilIcon" size={10} /> Edit
                      </button>
                    )}
                  </div>
                  {!selectedBooking.dueDate ? (
                    <div className="space-y-2">
                      <p className="text-xs text-red-700 font-medium">You must set a payment due date before sending the final invoice. Default is 14 days before the event.</p>
                      <input
                        type="date"
                        defaultValue={(() => {
                          if (selectedBooking.date && selectedBooking.date !== 'N/A') {
                            const d = new Date(selectedBooking.date);
                            d.setDate(d.getDate() - 14);
                            const today = new Date();
                            return (d < today ? today : d).toISOString().split('T')[0];
                          }
                          return '';
                        })()}
                        onChange={async (e) => {
                          const newDate = e.target.value;
                          if (!newDate) return;
                          const updatedBooking = { ...selectedBooking, dueDate: newDate };
                          setSelectedBooking(updatedBooking);
                          setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, dueDate: newDate } : b));
                          await setDoc(doc(db, 'booking_requests', selectedBooking.id), { dueDate: newDate }, { merge: true });
                          await setDoc(doc(db, 'bookings', selectedBooking.id), { dueDate: newDate }, { merge: true });
                        }}
                        className="w-full border-2 border-red-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400 font-bold text-gray-800"
                      />
                      <p className="text-[10px] text-red-500 text-center italic">⛔ Final Invoice is locked until you set this date</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xl font-bold text-amber-900 mb-1">📅 {selectedBooking.dueDate}</div>
                      <p className="text-xs text-amber-700">Full balance must be received by this date before the event.</p>
                      {(isEditingDueDate && !['final_payment_received', 'event_completed', 'completed'].includes(selectedBooking.status)) && (
                        <input
                          type="date"
                          defaultValue={selectedBooking.dueDate || ''}
                          onChange={async (e) => {
                            const newDate = e.target.value;
                            if (!newDate) return;
                            const updatedBooking = { ...selectedBooking, dueDate: newDate };
                            setSelectedBooking(updatedBooking);
                            setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, dueDate: newDate } : b));
                            await setDoc(doc(db, 'booking_requests', selectedBooking.id), { dueDate: newDate }, { merge: true });
                            await setDoc(doc(db, 'bookings', selectedBooking.id), { dueDate: newDate }, { merge: true });
                            setIsEditingDueDate(false);
                          }}
                          className="mt-2 w-full border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-amber-900"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step: Extra Charges — only show after event is scheduled */}
              {['event_scheduled', 'event_completed'].includes(selectedBooking.status) && (
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50">
                  <div className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-3">Adjustments / Extra Charges</div>
                  {selectedBooking.extraCharges.some(c => !c.isPreset && !(editableLiveCounter?.extras || []).some(preset => preset.name === c.label)) && (
                    <div className="space-y-2 mb-3">
                      {selectedBooking.extraCharges
                        .map((charge, idx) => ({ charge, idx }))
                        .filter(({ charge }) => !charge.isPreset && !(editableLiveCounter?.extras || []).some(preset => preset.name === charge.label))
                        .map(({ charge, idx }) => (
                          <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-teal-100">
                            <span className="text-sm text-gray-700">{charge.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">+£{charge.amount.toLocaleString()}</span>
                              <button onClick={() => removeExtraCharge(selectedBooking.id, idx)} className="text-red-400 hover:text-red-600">
                                <Icon name="XMarkIcon" size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g. Extra 10 guests" value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} className="flex-1 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
                    <input type="number" placeholder="£ amount" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)} className="w-24 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
                    <button onClick={() => addExtraCharge(selectedBooking.id)} className="text-white text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                      <Icon name="PlusIcon" size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Apply Discount */}
              {['final_invoice_sent'].includes(selectedBooking.status) && (
                <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50 mt-4">
                  <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">Apply Discount</div>
                  {selectedBooking.discount ? (
                    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-indigo-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-indigo-900">
                          {selectedBooking.discount.type === 'percentage' ? `${selectedBooking.discount.value}%` : `£${selectedBooking.discount.value}`} Discount
                        </span>
                        <span className="text-xs text-gray-500">{selectedBooking.discount.reason}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-red-600">-£{getDiscountAmount(selectedBooking).toLocaleString()}</span>
                        <button onClick={() => removeDiscount(selectedBooking.id)} className="text-red-400 hover:text-red-600">
                          <Icon name="XMarkIcon" size={14} />
                        </button>
                      </div>
                    </div>
                  ) : selectedBooking.discountRequest?.status === 'pending' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-amber-700">
                            {selectedBooking.discountRequest.type === 'percentage' ? `${selectedBooking.discountRequest.value}%` : `£${selectedBooking.discountRequest.value}`} Discount Requested
                          </span>
                          <span className="text-xs text-gray-500">{selectedBooking.discountRequest.reason}</span>
                        </div>
                        <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Pending Approval</span>
                      </div>
                      <p className="text-[10px] text-gray-500 text-center italic mt-1">Waiting for Management confirmation. You cannot proceed to Final Invoice until approved or rejected.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedBooking.discountRequest?.status === 'rejected' && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-2 rounded-lg mb-2">
                          Discount not approved by Management. You can submit a new request if needed.
                        </div>
                      )}
                      <div className="flex gap-2">
                        <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percentage')} className="border border-indigo-200 rounded-lg px-2 py-2 text-sm focus:outline-none bg-white flex-shrink-0">
                          <option value="fixed">£ Fixed</option>
                          <option value="percentage">% Percent</option>
                        </select>
                        <input type="number" placeholder="Value" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="flex-1 min-w-0 border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Reason (e.g. Loyalty)"
                            value={discountReason}
                            onChange={(e) => { setDiscountReason(e.target.value); if (e.target.value.trim()) setDiscountError(''); }}
                            className={`flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white ${discountError ? 'border-red-400 focus:border-red-500' : 'border-indigo-200'}`}
                          />
                          <button
                            onClick={() => {
                              if (!discountReason.trim()) {
                                setDiscountError('Please enter a reason for the discount.');
                                return;
                              }
                              if (!discountValue) {
                                setDiscountError('Please enter a discount value.');
                                return;
                              }
                              setDiscountError('');
                              requestDiscount(selectedBooking.id);
                            }}
                            className="text-white text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors flex-shrink-0 shadow-sm flex items-center gap-1"
                          >
                            <Icon name="CheckIcon" size={16} />
                            Apply
                          </button>
                        </div>
                        {discountError && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <Icon name="ExclamationCircleIcon" size={13} />
                            {discountError}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step: Final Invoice — only show after due date is set */}
              {selectedBooking.status === 'final_invoice_sent' && selectedBooking.discountRequest?.status !== 'pending' && selectedBooking.dueDate && (
                <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50">
                  <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-3">Final Invoice</div>
                  <div className="bg-white rounded-lg p-4 border border-yellow-100 space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base Amount</span>
                      <span className="font-medium text-gray-900">£{selectedBooking.baseAmount.toLocaleString()}</span>
                    </div>
                    {selectedBooking.extraCharges.map((c, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{c.label}</span>
                        <span className="font-medium text-amber-700">+£{c.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {selectedBooking.discount && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount ({selectedBooking.discount.reason})</span>
                        <span className="font-medium text-red-600">-£{getDiscountAmount(selectedBooking).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                      <span className="text-gray-600">Deposit Paid</span>
                      <span className="font-medium text-emerald-700">-£{selectedBooking.deposit.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="font-bold text-gray-900">Balance Due</span>
                      <span className="font-bold text-lg" style={{ color: '#C8860A' }}>£{(getTotalAmount(selectedBooking) - selectedBooking.deposit).toLocaleString()}</span>
                    </div>
                  </div>
                  <a href={buildWhatsAppLink(selectedBooking.phone, buildFinalInvoiceWhatsAppText(selectedBooking, bankDetails))}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                    Send Final Invoice via WhatsApp
                  </a>
                </div>
              )}

              {/* Final payment proof */}
              {selectedBooking.status === 'final_invoice_sent' && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Final Payment Proof</div>
                  {selectedBooking.paymentProofFinal ? (
                    <div className="flex items-start gap-4">
                      {(selectedBooking.paymentProofFinal.startsWith('http') || selectedBooking.paymentProofFinal.startsWith('data:image')) && (
                        <div
                          className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group flex-shrink-0 bg-gray-50"
                          onClick={() => {
                            if (selectedBooking.paymentProofFinal?.startsWith('data:image')) {
                              const w = window.open('');
                              w?.document.write(`<img src="${selectedBooking.paymentProofFinal}" style="max-width: 100%; height: auto;"/>`);
                            } else {
                              window.open(selectedBooking.paymentProofFinal, '_blank');
                            }
                          }}
                          title="Click to view full image"
                        >
                          <img
                            src={selectedBooking.paymentProofFinal}
                            alt="Final Payment Proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icon name="MagnifyingGlassPlusIcon" size={20} className="text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                          <Icon name="CheckCircleIcon" size={16} />
                          Final payment proof received — confirm below
                        </div>

                        {/* Styled payment method selection */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-1">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Select Payment Method:</div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {[
                              { label: 'Paid by Cash', value: 'Paid by Cash' },
                              { label: 'Paid by Card', value: 'Paid by Card' },
                              { label: 'Paid by Bank Transfer', value: 'Paid by Bank Transfer' }
                            ].map((opt) => {
                              const isSelected = finalPaymentMethod === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setFinalPaymentMethod(opt.value)}
                                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs font-semibold transition-all ${
                                    isSelected
                                      ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {isSelected && (
                                    <span className="text-amber-600">
                                      <Icon name="CheckIcon" size={14} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="file"
                            accept="image/*"
                            id="final-proof-reupload"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadFinalProof(selectedBooking.id, e.target.files[0]);
                              }
                            }}
                          />
                          <label
                            htmlFor="final-proof-reupload"
                            className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium"
                          >
                            <Icon name="ArrowPathIcon" size={14} />
                            {isUploadingFinalProof ? 'Uploading...' : 'Upload different image'}
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">Awaiting final payment screenshot from customer via WhatsApp</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id="final-proof-upload"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleUploadFinalProof(selectedBooking.id, e.target.files[0]);
                            }
                          }}
                        />
                        <label
                          htmlFor="final-proof-upload"
                          className="cursor-pointer bg-white border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <Icon name="ArrowUpTrayIcon" size={16} />
                          {isUploadingFinalProof ? 'Uploading...' : 'Upload Screenshot'}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payment summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Summary</div>
                <div className="space-y-2">
                  {/* Guest breakdown */}
                  {(() => {
                    const adults = selectedBooking.adults ?? selectedBooking.guests;
                    const kids4to10 = selectedBooking.kids4to10 || 0;
                    const kidsUnder4 = selectedBooking.kidsUnder4 || 0;
                    const kidsPriceStr = editableKidsPricing.find(k => k.ageRange.includes('3-10') || k.ageRange.includes('4-10') || k.ageRange.includes('4'))?.price || '20';
                    const kidsPrice = parseInt(kidsPriceStr.replace(/[^0-9]/g, '')) || 20;
                    const pricePerPerson = editableBanquetPackages.find(p => p.name === (selectedBooking.selectedMenu || selectedBooking.package))?.pricePerPerson || 0;
                    const hasKids = kids4to10 > 0 || kidsUnder4 > 0;
                    return (
                      <div className="bg-white rounded-lg p-2.5 border border-gray-100 space-y-1 mb-1">
                        <div className="text-xs font-semibold text-gray-500 mb-1.5">Guest Breakdown</div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Adults ({adults}) × £{pricePerPerson}/person</span>
                          <span className="font-medium">£{(adults * pricePerPerson).toLocaleString()}</span>
                        </div>
                        {kids4to10 > 0 && (
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Kids 4-10 yrs ({kids4to10}) × £{kidsPrice}/person</span>
                            <span className="font-medium">£{(kids4to10 * kidsPrice).toLocaleString()}</span>
                          </div>
                        )}
                        {kidsUnder4 > 0 && (
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Kids 0-4 yrs ({kidsUnder4}) × Free</span>
                            <span className="font-medium text-emerald-600">£0</span>
                          </div>
                        )}
                        <div className="border-t border-gray-100 pt-1 flex justify-between text-xs font-semibold text-gray-700">
                          <span>Total Guests</span>
                          <span>{adults + kids4to10 + kidsUnder4}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Venue Hall Charge based on date */}
                  {(() => {
                    const hallCharge = getVenueHallCharge(selectedBooking.date, selectedBooking.time);
                    if (!hallCharge) return null;
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">🏛️ {hallCharge.label}</span>
                        <span className="font-semibold text-indigo-700">£{hallCharge.amount.toLocaleString()}</span>
                      </div>
                    );
                  })()}

                  {selectedBooking.extraCharges && selectedBooking.extraCharges.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-gray-500 mt-2 mb-1">Extras</div>
                      {selectedBooking.extraCharges.map((c, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-600">
                          <span>• {c.label}</span>
                          <span className="font-medium text-amber-700">+£{c.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Food Package Total</span>
                    <span className="font-semibold text-gray-900">£{getFoodPackageTotal(selectedBooking).toLocaleString()}</span>
                  </div>

                  {(() => {
                    const grandTotal = getTotalAmount(selectedBooking);
                    const extraChargesTotal = (selectedBooking.extraCharges || []).reduce((s, c) => s + c.amount, 0);
                    const finalPaymentPaidAmt = grandTotal - selectedBooking.deposit - extraChargesTotal;
                    
                    const isDepositPaid = selectedBooking.depositPaid || !['new_enquiry', 'menu_sent', 'menu_selected', 'deposit_pending'].includes(selectedBooking.status);
                    const isFinalPaid = selectedBooking.finalPaymentPaid;
                    const isExtraPaid = selectedBooking.status === 'completed' || !!selectedBooking.paymentProofExtra || selectedBooking.finalPaymentPaid;
                    
                    const totalPaid = (isDepositPaid ? selectedBooking.deposit : 0) +
                                      (isFinalPaid ? finalPaymentPaidAmt : 0) +
                                      (isExtraPaid ? extraChargesTotal : 0);
                                      
                    const remainingBalance = grandTotal - totalPaid;

                    return (
                      <div className="space-y-2 border-t border-gray-200 pt-3">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-gray-800">Grand Total (incl. Hall)</span>
                          <span className="text-gray-900">£{grandTotal.toLocaleString()}</span>
                        </div>

                        {selectedBooking.discount && (
                          <div className="flex justify-between text-xs text-red-650">
                            <span>Discount ({selectedBooking.discount.reason})</span>
                            <span>-£{getDiscountAmount(selectedBooking).toLocaleString()}</span>
                          </div>
                        )}

                        <div className="border-t border-dashed border-gray-200 mt-2 pt-2 space-y-1">
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Breakdown</div>
                          
                          {/* Deposit */}
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Deposit</span>
                            <div className="text-right">
                              <span className={`font-semibold ${isDepositPaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                                £{selectedBooking.deposit.toLocaleString()} {isDepositPaid ? '✓ Paid' : '(pending)'}
                              </span>
                              {isDepositPaid && selectedBooking.paymentMethodDeposit && (
                                <span className="block text-[10px] text-gray-400 font-normal">
                                  via {selectedBooking.paymentMethodDeposit.replace('Paid by ', '')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Final Payment (Main Balance) */}
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Final Payment (Main Balance)</span>
                            <div className="text-right">
                              <span className={`font-semibold ${isFinalPaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                                £{finalPaymentPaidAmt.toLocaleString()} {isFinalPaid ? '✓ Paid' : '(pending)'}
                              </span>
                              {isFinalPaid && selectedBooking.paymentMethodFinal && (
                                <span className="block text-[10px] text-gray-400 font-normal">
                                  via {selectedBooking.paymentMethodFinal.replace('Paid by ', '')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Extras */}
                          {extraChargesTotal > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Extras / Adjustments</span>
                              <div className="text-right">
                                <span className={`font-semibold ${isExtraPaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                                  £{extraChargesTotal.toLocaleString()} {isExtraPaid ? '✓ Paid' : '(pending)'}
                                </span>
                                {isExtraPaid && selectedBooking.paymentMethodFinal && (
                                  <span className="block text-[10px] text-gray-400 font-normal">
                                    via {selectedBooking.paymentMethodFinal.replace('Paid by ', '')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Total Paid */}
                          <div className="flex justify-between text-xs border-t border-gray-100 pt-1.5 font-semibold text-gray-700">
                            <span>Total Paid</span>
                            <span className="text-emerald-700 font-bold">£{totalPaid.toLocaleString()}</span>
                          </div>

                          {/* Remaining Balance Due */}
                          <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5 font-bold">
                            <span className="text-gray-700">Remaining Balance Due</span>
                            <span className={remainingBalance <= 0 ? 'text-emerald-700' : 'text-amber-600'}>
                              {remainingBalance <= 0 ? 'PAID IN FULL ✓' : `£${remainingBalance.toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</div>
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">{selectedBooking.notes}</div>
                </div>
              )}
            </div>

            {/* Action footer */}
            <div className="p-5 border-t border-gray-200 flex-shrink-0 space-y-2">
              {selectedBooking.status === 'new_enquiry' && (
                <div className="flex gap-2">
                  <button onClick={() => { updateStatus(selectedBooking.id, 'menu_sent'); setShowMenuPanel(true); }}
                    className="flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                    <Icon name="ClipboardDocumentListIcon" size={16} />
                    Send Menu Options
                  </button>
                </div>
              )}
              {selectedBooking.status === 'menu_sent' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'menu_selected')}
                  className="w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="CheckIcon" size={16} />
                  Mark Menu as Selected by Customer
                </button>
              )}
              {selectedBooking.status === 'menu_selected' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'deposit_pending')}
                  className="w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="BanknotesIcon" size={16} />
                  Request Deposit Payment
                </button>
              )}
              {selectedBooking.status === 'deposit_pending' && (
                <button
                  onClick={() => {
                    if (!depositPaymentMethod) return;
                    confirmDepositPaid(selectedBooking.id, depositPaymentMethod);
                  }}
                  disabled={!selectedBooking.paymentProofDeposit || !depositPaymentMethod}
                  title={!selectedBooking.paymentProofDeposit ? "Please upload the payment screenshot first" : !depositPaymentMethod ? "Please select a payment method" : ""}
                  className={`w-full font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${(!selectedBooking.paymentProofDeposit || !depositPaymentMethod) ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'}`}
                >
                  <Icon name={(!selectedBooking.paymentProofDeposit || !depositPaymentMethod) ? "LockClosedIcon" : "CheckCircleIcon"} size={16} />
                  {!selectedBooking.paymentProofDeposit 
                    ? 'Upload Screenshot to Proceed' 
                    : !depositPaymentMethod 
                      ? 'Select Payment Method to Proceed' 
                      : 'Confirm Deposit Received'}
                </button>
              )}
              {selectedBooking.status === 'deposit_confirmed' && (
                <div className="space-y-2">
                  <button
                    onClick={() => downloadInvoicePDF(selectedBooking)}
                    className="w-full font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-sm"
                  >
                    <Icon name="ArrowDownTrayIcon" size={16} />
                    Download Deposit Invoice
                  </button>
                  {!selectedBooking.dueDate ? (
                    <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed">
                      <Icon name="LockClosedIcon" size={15} />
                      Set Payment Due Date First ↑
                    </div>
                  ) : (
                    <button onClick={() => updateStatus(selectedBooking.id, 'final_invoice_sent')}
                      disabled={selectedBooking.discountRequest?.status === 'pending'}
                      className={`w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 ${selectedBooking.discountRequest?.status === 'pending' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                      <Icon name="DocumentTextIcon" size={16} />
                      {selectedBooking.discountRequest?.status === 'pending' ? 'Awaiting Discount Approval' : 'Send Final Invoice (above)'}
                    </button>
                  )}
                </div>
              )}
              {selectedBooking.status === 'final_invoice_sent' && (
                <button
                  onClick={() => {
                    if (!finalPaymentMethod) return;
                    confirmFinalPayment(selectedBooking.id, finalPaymentMethod);
                  }}
                  disabled={!selectedBooking.paymentProofFinal || !finalPaymentMethod}
                  title={!selectedBooking.paymentProofFinal ? "Please upload the payment screenshot first" : !finalPaymentMethod ? "Please select a payment method" : ""}
                  className={`w-full font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${(!selectedBooking.paymentProofFinal || !finalPaymentMethod) ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'}`}
                >
                  <Icon name={(!selectedBooking.paymentProofFinal || !finalPaymentMethod) ? "LockClosedIcon" : "CheckCircleIcon"} size={16} />
                  {!selectedBooking.paymentProofFinal 
                    ? 'Upload Screenshot to Proceed' 
                    : !finalPaymentMethod 
                      ? 'Select Payment Method to Proceed' 
                      : 'Confirm Final Payment'}
                </button>
              )}
              {selectedBooking.status === 'final_payment_received' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'event_scheduled')}
                  className="w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}>
                  <Icon name="CalendarIcon" size={16} />
                  Schedule Event & Add to Calendar
                </button>
              )}
              {selectedBooking.status === 'event_scheduled' && (
                <div className="space-y-2">
                  <a href={buildWhatsAppLink(selectedBooking.phone, `Hi ${selectedBooking.name.split(' ')[0]}, just a reminder — your ${selectedBooking.eventType} at SriLalitha is coming up on *${selectedBooking.date}* at ${selectedBooking.time}. We look forward to seeing you! 🎉`)}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                    Send Event Reminder
                  </a>
                  <button onClick={() => updateStatus(selectedBooking.id, 'event_completed')}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                    <Icon name="CheckCircleIcon" size={16} />
                    Mark Event as Completed
                  </button>
                </div>
              )}
              {selectedBooking.status === 'event_completed' && (() => {
                const nonPreset = (selectedBooking.extraCharges || []).filter(c => !c.isPreset && !(editableLiveCounter?.extras || []).some(preset => preset.name === c.label));
                const extraChargesTotal = nonPreset.reduce((sum, c) => sum + c.amount, 0);
                const isExtraPaymentNeeded = extraChargesTotal > 0 && selectedBooking.finalPaymentPaid;
                
                return (
                  <div className="space-y-3">
                    {isExtraPaymentNeeded && (
                      <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                        <div className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                          <Icon name="ExclamationCircleIcon" size={16} />
                          Extra Payment Required (£{extraChargesTotal.toLocaleString()})
                        </div>
                        <p className="text-xs text-red-700 mb-3 leading-relaxed">
                          Extra charges were added to this event. You must upload the payment screenshot for the remaining balance before closing the event.
                        </p>
                        
                        <a href={buildWhatsAppLink(selectedBooking.phone, buildExtraInvoiceWhatsAppText(selectedBooking, bankDetails))}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl mb-3 transition-colors hover:bg-green-600"
                          style={{ background: '#25D366', color: 'white' }}>
                          <Icon name="ChatBubbleLeftRightIcon" size={16} />
                          Send Extra Invoice via WhatsApp
                        </a>

                        {selectedBooking.paymentProofExtra ? (
                          <div className="flex items-start gap-4">
                            {(selectedBooking.paymentProofExtra.startsWith('http') || selectedBooking.paymentProofExtra.startsWith('data:image')) && (
                              <div
                                className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm group flex-shrink-0 bg-gray-50"
                                onClick={() => {
                                  if (selectedBooking.paymentProofExtra?.startsWith('data:image')) {
                                    const w = window.open('');
                                    w?.document.write(`<img src="${selectedBooking.paymentProofExtra}" style="max-width: 100%; height: auto;"/>`);
                                  } else {
                                    window.open(selectedBooking.paymentProofExtra, '_blank');
                                  }
                                }}
                                title="Click to view full image"
                              >
                                <img
                                  src={selectedBooking.paymentProofExtra}
                                  alt="Extra Payment Proof"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Icon name="MagnifyingGlassPlusIcon" size={20} className="text-white" />
                                </div>
                              </div>
                            )}
                            <div className="flex flex-col gap-2 flex-1">
                              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                                <Icon name="CheckCircleIcon" size={16} />
                                Extra payment proof received — confirm below
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  id="extra-proof-reupload"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadExtraProof(selectedBooking.id, file);
                                  }}
                                />
                                <label
                                  htmlFor="extra-proof-reupload"
                                  className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium"
                                >
                                  <Icon name="ArrowPathIcon" size={14} />
                                  {isUploadingExtraProof ? 'Uploading...' : 'Re-upload screenshot'}
                                </label>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="extra-proof-upload"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadExtraProof(selectedBooking.id, file);
                              }}
                            />
                            <label htmlFor="extra-proof-upload" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer shadow-sm">
                              <Icon name="ArrowUpTrayIcon" size={16} />
                              {isUploadingExtraProof ? 'Uploading...' : 'Upload Extra Payment Screenshot'}
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    <button 
                      onClick={() => updateStatus(selectedBooking.id, 'completed')}
                      disabled={isExtraPaymentNeeded && !selectedBooking.paymentProofExtra}
                      title={isExtraPaymentNeeded && !selectedBooking.paymentProofExtra ? "Please upload the extra payment screenshot first" : ""}
                      className={`w-full text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md ${isExtraPaymentNeeded && !selectedBooking.paymentProofExtra ? 'bg-gray-400 cursor-not-allowed border-none' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                      {isExtraPaymentNeeded && !selectedBooking.paymentProofExtra ? (
                        <>
                          <Icon name="LockClosedIcon" size={16} />
                          Upload Payment to Close Event
                        </>
                      ) : (
                        <>
                          <Icon name="CheckBadgeIcon" size={16} />
                          Mark as Completed & Close Event
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}
              {selectedBooking.status === 'completed' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 py-2 text-emerald-700 font-semibold text-sm bg-emerald-50 rounded-xl">
                    <Icon name="CheckBadgeIcon" size={18} />
                    Booking Completed
                  </div>
                  <a href={buildWhatsAppLink(selectedBooking.phone, buildCompletedWhatsAppText(selectedBooking))}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center"
                    style={{ background: '#25D366', color: 'white' }}>
                    <Icon name="ChatBubbleLeftRightIcon" size={16} />
                    Send Final Summary via WhatsApp
                  </a>
                  <button
                    onClick={() => downloadInvoicePDF(selectedBooking)}
                    className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl w-full justify-center border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
                  >
                    <Icon name="ArrowDownTrayIcon" size={16} />
                    Download Invoice PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CUSTOMER DETAIL DRAWER ─── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Customer Profile</h2>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,134,10,0.1)' }}>
                  <span className="text-2xl font-bold" style={{ color: '#C8860A' }}>{selectedCustomer.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{selectedCustomer.name}</div>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{selectedCustomer.status}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Icon name="EnvelopeIcon" size={15} className="text-gray-400" />
                  {selectedCustomer.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Icon name="PhoneIcon" size={15} className="text-gray-400" />
                  {selectedCustomer.phone}
                </div>
              </div>
              <a href={buildWhatsAppLink(selectedCustomer.phone, `Hi ${selectedCustomer.name.split(' ')[0]}, this is SriLalitha. How can we help you today?`)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl w-full"
                style={{ background: '#25D366', color: 'white' }}>
                <Icon name="ChatBubbleLeftRightIcon" size={16} />
                Open WhatsApp Chat
              </a>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">{selectedCustomer.totalBookings}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total Bookings</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(200,134,10,0.08)' }}>
                  <div className="text-2xl font-bold" style={{ color: '#C8860A' }}>{selectedCustomer.totalSpent > 0 ? `£${selectedCustomer.totalSpent.toLocaleString()}` : '—'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total Spent</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Booking History</div>
                <div className="space-y-2">
                  {bookings.filter(b => {
                    const nameKey = (b.name || 'Unknown').trim().toLowerCase();
                    const contactKey = (b.email || b.phone || '').trim().toLowerCase();
                    return `${nameKey}_${contactKey}` === selectedCustomer.id;
                  }).map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{b.eventType}</div>
                        <div className="text-xs text-gray-400">{b.date}</div>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[b.status]}`}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-rose-50 text-rose-500">
              <Icon name="TrashIcon" size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete Booking</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to permanently delete the booking for <span className="font-semibold text-gray-900">{bookingToDelete.name}</span>? This action cannot be undone.</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setBookingToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBooking}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── NEW BOOKING / ENQUIRY MODAL ─── */}
      {showNewBookingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-lg border border-gray-100 my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,134,10,0.1)' }}>
                  <Icon name="CalendarDaysIcon" size={20} style={{ color: '#C8860A' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create New Booking</h3>
                  <p className="text-xs text-gray-500">Add an enquiry or confirmed booking directly into the database</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewBookingModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateManualBooking} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newBookingForm.name}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, name: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newBookingForm.email}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, email: e.target.value })}
                    placeholder="sarah@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone / WhatsApp Number</label>
                  <input
                    type="tel"
                    value={newBookingForm.phone}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, phone: e.target.value })}
                    placeholder="07700 900000"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Event Type *</label>
                  <select
                    value={newBookingForm.eventType}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, eventType: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  >
                    {(editableFormConfig.fields.find(f => f.id === 'eventType')?.options || DEFAULT_EVENT_TYPES).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={newBookingForm.date}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Time of Day</label>
                  <select
                    value={newBookingForm.time}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, time: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  >
                    {(editableFormConfig.fields.find(f => f.id === 'timeOfDay')?.options || DEFAULT_TIME_SLOTS).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guest Counts */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Adults</label>
                  <input
                    type="number"
                    min="1"
                    value={newBookingForm.adults}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, adults: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Kids (4-10)</label>
                  <input
                    type="number"
                    min="0"
                    value={newBookingForm.kids4to10}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, kids4to10: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Kids (&lt;4)</label>
                  <input
                    type="number"
                    min="0"
                    value={newBookingForm.kidsUnder4}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, kidsUnder4: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Package</label>
                  <select
                    value={newBookingForm.package}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, package: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  >
                    {editableBanquetPackages.map(p => (
                      <option key={p.id} value={p.name}>{p.name} (£{p.pricePerPerson}/pp)</option>
                    ))}
                    <option value="Venue Hall Only">Venue Hall Only</option>
                    <option value="Dry Hire">Dry Hire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Status</label>
                  <select
                    value={newBookingForm.status}
                    onChange={(e) => setNewBookingForm({ ...newBookingForm, status: e.target.value as BookingStatus })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  >
                    <option value="new_enquiry">New Enquiry</option>
                    <option value="menu_sent">Menu Sent</option>
                    <option value="deposit_pending">Deposit Pending</option>
                    <option value="deposit_confirmed">Deposit Confirmed</option>
                    <option value="event_scheduled">Event Scheduled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Special Requests</label>
                <textarea
                  rows={2}
                  value={newBookingForm.notes}
                  onChange={(e) => setNewBookingForm({ ...newBookingForm, notes: e.target.value })}
                  placeholder="e.g. Dietary preferences, stage decoration..."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBookingModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBooking}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                >
                  {isCreatingBooking ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving to Database...
                    </>
                  ) : (
                    'Save Booking'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD CUSTOM FIELD MODAL ─── */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Icon name="PlusCircleIcon" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Add New Form Field</h3>
                  <p className="text-xs text-gray-500">Create a dynamic custom field for the booking form</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddFieldModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Field Label *</label>
                <input
                  type="text"
                  required
                  value={newFieldForm.label || ''}
                  onChange={(e) => {
                    const label = e.target.value;
                    const autoId = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    setNewFieldForm(prev => ({
                      ...prev,
                      label,
                      id: prev.id && prev.id !== autoId.slice(0, -1) ? prev.id : autoId
                    }));
                  }}
                  placeholder="e.g. Dietary Preferences, Venue Postcode, Service Type"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Field Identifier (Code Key)</label>
                  <input
                    type="text"
                    value={newFieldForm.id || ''}
                    onChange={(e) => setNewFieldForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                    placeholder="e.g. dietary_pref"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] font-mono text-xs bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Field Input Type</label>
                  <select
                    value={newFieldForm.type || 'text'}
                    onChange={(e) => setNewFieldForm(prev => ({ ...prev, type: e.target.value as FormFieldType }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white font-medium"
                  >
                    <option value="text">Single Line Text</option>
                    <option value="email">Email Address</option>
                    <option value="tel">Phone / WhatsApp Number</option>
                    <option value="number">Number</option>
                    <option value="date">Date Picker</option>
                    <option value="select">Dropdown Select List</option>
                    <option value="textarea">Multi-line Text Area</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Layout Width</label>
                  <select
                    value={newFieldForm.width || 'half'}
                    onChange={(e) => setNewFieldForm(prev => ({ ...prev, width: e.target.value as FieldWidth }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  >
                    <option value="full">Full Width (100%)</option>
                    <option value="half">Half Width (50%)</option>
                    <option value="third">One Third (33%)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!newFieldForm.required}
                      onChange={(e) => setNewFieldForm(prev => ({ ...prev, required: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-[#C8860A]"
                    />
                    <span className="text-xs font-semibold text-gray-700">Mark as Required field</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Placeholder Text</label>
                <input
                  type="text"
                  value={newFieldForm.placeholder || ''}
                  onChange={(e) => setNewFieldForm(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="e.g. Enter your venue postcode or street..."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Helper Text (Optional subtitle)</label>
                <input
                  type="text"
                  value={newFieldForm.helperText || ''}
                  onChange={(e) => setNewFieldForm(prev => ({ ...prev, helperText: e.target.value }))}
                  placeholder="e.g. If you require outdoor setup, please specify"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                />
              </div>

              {/* If type is select: options editor */}
              {newFieldForm.type === 'select' && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Dropdown Options List
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {(newFieldForm.options || []).map((opt, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-gray-800">
                        {opt}
                        <button
                          type="button"
                          onClick={() => setNewFieldForm(prev => ({ ...prev, options: (prev.options || []).filter((_, idx) => idx !== i) }))}
                          className="text-gray-400 hover:text-rose-600 transition-colors"
                        >
                          <Icon name="XMarkIcon" size={12} />
                        </button>
                      </span>
                    ))}
                    {(!newFieldForm.options || newFieldForm.options.length === 0) && (
                      <span className="text-xs text-gray-400 italic">No options added yet</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Add an option (e.g. Buffet, Plated, Live Counter)..."
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = newOptionInput.trim();
                          if (trimmed && !(newFieldForm.options || []).includes(trimmed)) {
                            setNewFieldForm(prev => ({ ...prev, options: [...(prev.options || []), trimmed] }));
                            setNewOptionInput('');
                          }
                        }
                      }}
                      className="flex-1 border border-amber-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8860A]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newOptionInput.trim();
                        if (trimmed && !(newFieldForm.options || []).includes(trimmed)) {
                          setNewFieldForm(prev => ({ ...prev, options: [...(prev.options || []), trimmed] }));
                          setNewOptionInput('');
                        }
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-colors"
                      style={{ background: '#C8860A' }}
                    >
                      + Add Option
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddFieldModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewField}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                >
                  <Icon name="PlusIcon" size={16} />
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT FIELD MODAL ─── */}
      {editingFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Icon name="PencilSquareIcon" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Edit Field: {editingFieldModal.label}</h3>
                  <p className="text-xs font-mono text-gray-400">id: {editingFieldModal.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingFieldModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Field Label *</label>
                <input
                  type="text"
                  required
                  value={editingFieldModal.label}
                  onChange={(e) => setEditingFieldModal({ ...editingFieldModal, label: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Layout Width</label>
                  <select
                    value={editingFieldModal.width}
                    onChange={(e) => setEditingFieldModal({ ...editingFieldModal, width: e.target.value as FieldWidth })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A] bg-white"
                  >
                    <option value="full">Full Width (100%)</option>
                    <option value="half">Half Width (50%)</option>
                    <option value="third">One Third (33%)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingFieldModal.required}
                      onChange={(e) => setEditingFieldModal({ ...editingFieldModal, required: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-[#C8860A]"
                    />
                    <span className="text-xs font-semibold text-gray-700">Required field</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Placeholder Text</label>
                <input
                  type="text"
                  value={editingFieldModal.placeholder || ''}
                  onChange={(e) => setEditingFieldModal({ ...editingFieldModal, placeholder: e.target.value })}
                  placeholder="e.g. Enter details..."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Helper Text</label>
                <input
                  type="text"
                  value={editingFieldModal.helperText || ''}
                  onChange={(e) => setEditingFieldModal({ ...editingFieldModal, helperText: e.target.value })}
                  placeholder="Optional guidance for customer..."
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8860A]"
                />
              </div>

              {/* Options manager if field has options */}
              {(editingFieldModal.type === 'select' || editingFieldModal.type === 'time_select') && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Dropdown Options List ({editingFieldModal.options?.length || 0})
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {(editingFieldModal.options || []).map((opt, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-gray-800">
                        {opt}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingFieldModal.options || []).filter((_, idx) => idx !== i);
                            setEditingFieldModal({ ...editingFieldModal, options: updated });
                          }}
                          className="text-gray-400 hover:text-rose-600 transition-colors"
                        >
                          <Icon name="XMarkIcon" size={12} />
                        </button>
                      </span>
                    ))}
                    {(!editingFieldModal.options || editingFieldModal.options.length === 0) && (
                      <span className="text-xs text-gray-400 italic">No options defined</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Add an option..."
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = newOptionInput.trim();
                          if (trimmed && !(editingFieldModal.options || []).includes(trimmed)) {
                            setEditingFieldModal({
                              ...editingFieldModal,
                              options: [...(editingFieldModal.options || []), trimmed]
                            });
                            setNewOptionInput('');
                          }
                        }
                      }}
                      className="flex-1 border border-amber-200 bg-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8860A]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newOptionInput.trim();
                        if (trimmed && !(editingFieldModal.options || []).includes(trimmed)) {
                          setEditingFieldModal({
                            ...editingFieldModal,
                            options: [...(editingFieldModal.options || []), trimmed]
                          });
                          setNewOptionInput('');
                        }
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-colors"
                      style={{ background: '#C8860A' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingFieldModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveFieldModal(editingFieldModal)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
                >
                  <Icon name="CheckIcon" size={16} />
                  Save Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CUSTOM ALERT MODAL ─── */}
      {customAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${customAlert.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              <Icon name={customAlert.type === 'success' ? 'CheckIcon' : 'ExclamationTriangleIcon'} size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{customAlert.type === 'success' ? 'Success' : 'Error'}</h3>
            <p className="text-sm text-gray-500 mb-5">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ─── KITCHEN PREPARATION SLIP MODAL ─── */}
      {showKitchenSlipModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-gray-200 space-y-6 my-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#C8860A] flex items-center justify-center font-bold">
                  <Icon name="ClipboardDocumentCheckIcon" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Kitchen Preparation Order Slip</h3>
                  <p className="text-xs text-gray-500 font-mono">Order Ref: #{showKitchenSlipModal.id}</p>
                </div>
              </div>
              <button
                onClick={() => setShowKitchenSlipModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            {/* Print Area */}
            <div id="kitchen-slip-print" className="space-y-4 text-xs">
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Event Date</span>
                  <span className="font-extrabold text-sm text-gray-900">📅 {showKitchenSlipModal.date}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Time Slot</span>
                  <span className="font-bold text-gray-900">⏰ {showKitchenSlipModal.time || showKitchenSlipModal.timeOfDay || 'Time TBD'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Headcount</span>
                  <span className="font-extrabold text-sm text-[#C8860A]">👥 {showKitchenSlipModal.guests} Guests</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Package</span>
                  <span className="font-bold text-gray-900">{showKitchenSlipModal.package || 'Custom Menu'}</span>
                </div>
              </div>

              {/* Customer & Location */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <div className="font-bold text-gray-900">Customer: {showKitchenSlipModal.name} ({showKitchenSlipModal.phone})</div>
                <div className="text-gray-600 mt-0.5">📍 Venue: {showKitchenSlipModal.location || 'Base Venue'}</div>
                {showKitchenSlipModal.notes && (
                  <div className="mt-1.5 p-2 bg-amber-100/70 rounded-lg text-amber-950 font-semibold">
                    ⚠️ Special Chef Instructions: {showKitchenSlipModal.notes}
                  </div>
                )}
              </div>

              {/* Dishes Checklist */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 uppercase tracking-wider text-xs border-b border-gray-200 pb-1">
                  Culinary Team Dishes Checklist
                </h4>

                {showKitchenSlipModal.selectedMenuDishes && Object.keys(showKitchenSlipModal.selectedMenuDishes).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(showKitchenSlipModal.selectedMenuDishes).map(([catKey, dishList]: [string, any]) => {
                      if (!Array.isArray(dishList) || dishList.length === 0) return null;
                      const catTitle = catKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={catKey} className="p-3 bg-white border border-gray-200 rounded-xl space-y-1.5">
                          <span className="font-bold text-amber-950 block text-[11px] uppercase tracking-wide">
                            {catTitle} ({dishList.length})
                          </span>
                          <div className="space-y-1 pl-1">
                            {dishList.map((dish: any, dIdx: number) => {
                              const dishText = typeof dish === 'string'
                                ? dish
                                : dish?.name
                                  ? `${dish.name}${dish.price ? ` (+£${dish.price}${dish.perPerson ? '/person' : ''})` : ''}`
                                  : JSON.stringify(dish);
                              return (
                                <label key={dIdx} className="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
                                  <input type="checkbox" className="rounded text-[#C8860A]" />
                                  <span>{dishText}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl text-gray-500 italic text-center">
                    Standard package dishes selected: {showKitchenSlipModal.package}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowKitchenSlipModal(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs shadow-md hover:bg-gray-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="PrinterIcon" size={15} />
                Print Kitchen Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── OFFICIAL DIGITAL INVOICE MODAL ─── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-gray-200 space-y-6 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">Tax Invoice &amp; Payment Receipt</h3>
                <p className="text-xs text-gray-500 font-mono">Invoice #{showInvoiceModal.id}</p>
              </div>
              <button
                onClick={() => setShowInvoiceModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-start bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <span className="font-bold text-gray-900 block text-sm">Billed To:</span>
                  <div className="font-semibold text-gray-800 mt-0.5">{showInvoiceModal.name}</div>
                  <div className="text-gray-500">{showInvoiceModal.email}</div>
                  <div className="text-gray-500">{showInvoiceModal.phone}</div>
                  <div className="text-gray-500 mt-1">📍 {showInvoiceModal.location || 'Venue Location TBD'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-block mb-1">
                    {showInvoiceModal.depositPaid ? 'PAID VIA STRIPE ✓' : 'DEPOSIT PENDING'}
                  </span>
                  <div className="text-gray-500 text-[11px]">Event Date: {showInvoiceModal.date}</div>
                  <div className="text-gray-500 text-[11px]">Guests: {showInvoiceModal.guests}</div>
                  {showInvoiceModal.stripePaymentIntentId && (
                    <div className="font-mono text-[9px] text-gray-400 mt-1 truncate max-w-[180px]">
                      Stripe: {showInvoiceModal.stripePaymentIntentId}
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Table */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100/70 font-bold text-gray-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-3 text-center">Qty / Guests</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{showInvoiceModal.package || 'Catering Package'}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{showInvoiceModal.guests}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        £{((showInvoiceModal.totalEstimatedAmount || showInvoiceModal.baseAmount || 0) - (showInvoiceModal.deliveryCharge || 0)).toFixed(2)}
                      </td>
                    </tr>
                    {showInvoiceModal.deliveryCharge && showInvoiceModal.deliveryCharge > 0 ? (
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-gray-900">Long-Distance Delivery Fee ({showInvoiceModal.distanceMiles}m)</td>
                        <td className="py-2.5 px-3 text-center text-gray-600">1</td>
                        <td className="py-2.5 px-3 text-right font-semibold">+£{showInvoiceModal.deliveryCharge.toFixed(2)}</td>
                      </tr>
                    ) : null}
                    <tr className="bg-amber-50/70 font-bold">
                      <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px]">Grand Total:</td>
                      <td className="py-2.5 px-3 text-right text-sm text-[#C8860A]">
                        £{(showInvoiceModal.totalEstimatedAmount || showInvoiceModal.baseAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 text-emerald-950 font-bold">
                      <td colSpan={2} className="py-2.5 px-3 text-right">Amount Paid via Stripe:</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">
                        -£{(showInvoiceModal.deposit || showInvoiceModal.amountPaidSoFar || 0).toFixed(2)} (PAID)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-[#C8860A] text-white font-bold text-xs shadow-md hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="PrinterIcon" size={15} />
                Print / Download Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SIGN OUT CONFIRMATION MODAL ─── */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-amber-50 text-amber-600 shadow-inner">
              <Icon name="ArrowRightOnRectangleIcon" size={26} />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Sign Out Confirmation</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to sign out of your Admin session?</p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSignOutModal(false);
                  try {
                    await signOut(auth);
                    setActiveTab('overview');
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('adminActiveTab');
                    }
                    setLoggedIn(false);
                  } catch (error) {
                    console.error("Error signing out:", error);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md active:scale-95 hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #C8860A, #F0A830)' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
