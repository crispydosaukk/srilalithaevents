export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'select'
  | 'textarea'
  | 'package_select'
  | 'time_select'
  | 'location';

export type FieldWidth = 'full' | 'half' | 'third';

export interface SlotCapacityConfig {
  maxOutdoorCateringPerSlot: number; // e.g. 4 bookings per slot
  maxHallBookingsPerSlot: number;     // e.g. 1 booking per slot
  outdoorCateringTimeSlots: string[]; // e.g. ['Lunch (12:00pm – 4:00pm)', 'Dinner (6:00pm – 11:30pm)']
  standardTimeSlots: string[];        // e.g. ['Lunch (12:00pm – 4:00pm)', 'Dinner (6:00pm – 11:30pm)', 'Full Day Hire']
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  isSystem?: boolean;
  width: FieldWidth;
  options?: string[]; // Used for 'select' and 'time_select'
  helperText?: string;
  min?: number;
  max?: number;
  order: number;
}

export interface BookingFormConfig {
  formTitle: string;
  formSubtitle: string;
  submitButtonText: string;
  fields: FormField[];
  slotCapacity?: SlotCapacityConfig;
  updatedAt?: string;
}

export const DEFAULT_EVENT_TYPES = [
  'Wedding',
  'Birthday',
  'Corporate',
  'Anniversary',
  'Graduation',
  'Outdoor Catering',
  'Other',
];

export const DEFAULT_OUTDOOR_TIME_SLOTS = [
  'Lunch (12:00pm – 4:00pm)',
  'Dinner (6:00pm – 11:30pm)',
];

export const DEFAULT_TIME_SLOTS = [
  'Lunch (12:00pm – 4:00pm)',
  'Dinner (6:00pm – 11:30pm)',
  'Full Day Hire',
];

export const DEFAULT_SLOT_CAPACITY: SlotCapacityConfig = {
  maxOutdoorCateringPerSlot: 4,
  maxHallBookingsPerSlot: 1,
  outdoorCateringTimeSlots: DEFAULT_OUTDOOR_TIME_SLOTS,
  standardTimeSlots: DEFAULT_TIME_SLOTS,
};

export const DEFAULT_FORM_FIELDS: FormField[] = [
  {
    id: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Your name',
    required: true,
    enabled: true,
    isSystem: true,
    width: 'half',
    order: 1,
  },
  {
    id: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'your@email.com',
    required: true,
    enabled: true,
    isSystem: true,
    width: 'half',
    order: 2,
  },
  {
    id: 'phone',
    label: 'WhatsApp Number',
    type: 'tel',
    placeholder: '07700 900000',
    required: true,
    enabled: true,
    isSystem: true,
    width: 'half',
    order: 3,
  },
  {
    id: 'eventType',
    label: 'Event Type',
    type: 'select',
    placeholder: 'Select type',
    required: true,
    enabled: true,
    isSystem: true,
    width: 'half',
    options: [...DEFAULT_EVENT_TYPES],
    order: 4,
  },
  {
    id: 'location',
    label: 'Event Location / Postcode',
    type: 'location',
    placeholder: 'Enter venue address or UK postcode (e.g. EC1A 1BB)',
    required: false,
    enabled: true,
    isSystem: true,
    width: 'full',
    helperText: 'Enter postcode for dynamic distance & travel delivery estimate',
    order: 5,
  },
  {
    id: 'selectedPackage',
    label: 'Preferred Package',
    type: 'package_select',
    placeholder: 'No specific package – help me choose',
    required: false,
    enabled: true,
    isSystem: true,
    width: 'full',
    order: 6,
  },
  {
    id: 'date',
    label: 'Event Date',
    type: 'date',
    required: true,
    enabled: true,
    isSystem: true,
    width: 'third',
    order: 7,
  },
  {
    id: 'timeOfDay',
    label: 'Time of Day',
    type: 'time_select',
    placeholder: 'Select time',
    required: true,
    enabled: true,
    isSystem: true,
    width: 'third',
    options: [...DEFAULT_TIME_SLOTS],
    order: 8,
  },
  {
    id: 'guests',
    label: 'Number of Guests',
    type: 'number',
    placeholder: 'e.g. 100',
    required: true,
    enabled: true,
    isSystem: true,
    width: 'third',
    min: 1,
    max: 500,
    order: 9,
  },
  {
    id: 'message',
    label: 'Additional Notes',
    type: 'textarea',
    placeholder: 'Special requests, preferred menu, décor ideas, dietary needs...',
    required: false,
    enabled: true,
    isSystem: true,
    width: 'full',
    order: 10,
  },
];

export const DEFAULT_FORM_CONFIG: BookingFormConfig = {
  formTitle: 'Request a Booking',
  formSubtitle: "Fill in your details and we'll get back to you within 24 hours",
  submitButtonText: 'Submit Booking Request',
  fields: DEFAULT_FORM_FIELDS,
  slotCapacity: DEFAULT_SLOT_CAPACITY,
};
