// ============================================
// Lumina Partner Portal - Shared Type Definitions
// ============================================

// --------------------------------------------
// Authentication & Session
// --------------------------------------------

export type PartnerSession = {
  promoterId: string;
  email: string;
  name: string;
  venues: Venue[];
};

export type ClaimProgress = {
  claimStep: number;
  selectedVenue: Venue | null;
  email: string;
  name: string;
  phone: string;
};

// --------------------------------------------
// Venue
// --------------------------------------------

export type Venue = {
  id: string;
  name: string;
  type: VenueType;
  address?: string;
  claimed?: boolean;
  capabilities?: VenueCapabilities;
};

export type VenueType = 'Nightclub' | 'Lounge' | 'Restaurant' | 'Bar';

export type VenueCapabilities = {
  bottleService: boolean;
  guestList: boolean;
  diningReservations: boolean;
};

// --------------------------------------------
// Layout & Tables
// --------------------------------------------

export type Zone = {
  id: string;
  name: string;
  type: ZoneType;
  tables: Table[];
  minimumSpend: number;
  color: string;
};

export type ZoneType = 'vip' | 'standard' | 'mainfloor' | 'patio' | 'private';

export type ZoneTypeConfig = {
  id: ZoneType;
  name: string;
  icon: string;
  color: string;
};

export type Table = {
  id: string;
  name: string;
  capacity: number;
  minimumSpend: number;
  isLocked?: boolean;
  isBooked?: boolean;
  lockedBy?: string;
  lockedUntil?: string;
  x?: number; // 0-100 percentage position for map
  y?: number; // 0-100 percentage position for map
};

// --------------------------------------------
// Bookings
// --------------------------------------------

export type Booking = {
  id: string;
  guestName: string;
  phone: string;
  email?: string;
  partySize: number;
  tableType: string;
  tableId?: string;
  zoneId?: string;
  time: string;
  date?: string;
  minimumSpend?: number;
  status: BookingStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

// --------------------------------------------
// Guest List
// --------------------------------------------

export type Guest = {
  id: string;
  name: string;
  partySize: number;
  addedBy: string;
  checkedIn: boolean;
  checkedInAt?: string;
  phone?: string;
  email?: string;
  notes?: string;
  eventId?: string;
};

// --------------------------------------------
// Events
// --------------------------------------------

export type Event = {
  id: string;
  name: string;
  date: string;
  time: string;
  description?: string;
  flyerUrl?: string;
  ticketPrice?: number;
  ticketUrl?: string;
  guestListEnabled: boolean;
  tableServiceEnabled: boolean;
  status: EventStatus;
  rsvpCount?: number;
  capacity?: number;
  venueId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EventStatus = 'draft' | 'published' | 'cancelled';

export type EventTemplate = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

// --------------------------------------------
// Dashboard & Stats
// --------------------------------------------

export type DashboardStats = {
  todayRevenue: number;
  tablesBooked: number;
  guestsCheckedIn: number;
  pendingRequests: number;
  capacity: number;
  currentOccupancy: number;
};

// --------------------------------------------
// Analytics
// --------------------------------------------

export type TimeRange = '7d' | '30d' | '90d' | 'ytd';

export type DailyData = {
  date: string;
  revenue: number;
  bookings: number;
  guests: number;
};

export type Analytics = {
  totalRevenue: number;
  totalBookings: number;
  totalGuests: number;
  avgTableSpend: number;
  avgPartySize: number;
  conversionRate: number;
  repeatCustomers: number;
  topZone: string;
  topZonePercent: number;
  peakHour: string;
  dailyData: DailyData[];
  revenueChange: number;
  bookingsChange: number;
  guestsChange: number;
};

// --------------------------------------------
// API Responses
// --------------------------------------------

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type LoginResponse = {
  promoter: {
    id: string;
    email: string;
    name: string;
    venues: Venue[];
  };
  token?: string;
};

export type ClaimResponse = {
  promoter: {
    id: string;
    email: string;
    name: string;
  };
  venue: Venue;
};

// --------------------------------------------
// AsyncStorage Keys
// --------------------------------------------

export const STORAGE_KEYS = {
  PARTNER_SESSION: 'lumina_partner_session',
  CLAIM_PROGRESS: 'lumina_claim_progress',
  LAYOUT_DRAFT: 'lumina_layout_draft',
  EVENT_DRAFT: 'lumina_event_draft',
} as const;

// --------------------------------------------
// Constants
// --------------------------------------------

export const VENUE_TYPES: VenueType[] = ['Nightclub', 'Lounge', 'Restaurant', 'Bar'];

export const ZONE_TYPES: ZoneTypeConfig[] = [
  { id: 'vip', name: 'VIP Section', icon: 'star', color: '#eab308' },
  { id: 'standard', name: 'Standard', icon: 'grid', color: '#8b5cf6' },
  { id: 'mainfloor', name: 'Main Floor', icon: 'people', color: '#3b82f6' },
  { id: 'patio', name: 'Patio / Outdoor', icon: 'sunny', color: '#22c55e' },
  { id: 'private', name: 'Private Room', icon: 'lock-closed', color: '#f43f5e' },
];

export const EVENT_TEMPLATES: EventTemplate[] = [
  { id: 'standard', name: 'Standard Night', icon: 'musical-notes', color: '#8b5cf6' },
  { id: 'ladies', name: 'Ladies Night', icon: 'woman', color: '#f43f5e' },
  { id: 'hiphop', name: 'Hip Hop Night', icon: 'disc', color: '#f97316' },
  { id: 'latin', name: 'Latin Night', icon: 'flame', color: '#eab308' },
  { id: 'dj', name: 'DJ / Artist', icon: 'headset', color: '#3b82f6' },
  { id: 'holiday', name: 'Holiday / Special', icon: 'sparkles', color: '#22c55e' },
];

export const TIME_OPTIONS = [
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
  '10:30 PM', '11:00 PM', '11:30 PM', '12:00 AM', '12:30 AM', '1:00 AM',
];

export const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
];

// --------------------------------------------
// Theme Colors
// --------------------------------------------

export const colors = {
  violet: { 500: '#8b5cf6', 600: '#7c3aed' },
  green: { 400: '#4ade80', 500: '#22c55e' },
  rose: { 400: '#fb7185', 500: '#f43f5e' },
  orange: { 500: '#f97316' },
  yellow: { 500: '#eab308' },
  blue: { 500: '#3b82f6' },
  zinc: {
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
} as const;

// --------------------------------------------
// Utility Types
// --------------------------------------------

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type AsyncStorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
