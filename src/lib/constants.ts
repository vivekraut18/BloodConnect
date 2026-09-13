// Centralized constants — no hardcoded strings in components

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];

export const DONOR_AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  TEMPORARILY_UNAVAILABLE: 'temporarily_unavailable',
  DO_NOT_DISTURB: 'do_not_disturb',
} as const;
export type DonorAvailabilityStatus = typeof DONOR_AVAILABILITY_STATUS[keyof typeof DONOR_AVAILABILITY_STATUS];

export const REQUEST_STATUS = {
  OPEN: 'OPEN',
  MATCHING: 'MATCHING',
  DONOR_RESPONDED: 'DONOR_RESPONDED',
  HOSPITAL_CONFIRMED: 'HOSPITAL_CONFIRMED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export const REQUEST_PRIORITY = {
  EMERGENCY: 'EMERGENCY',
  URGENT: 'URGENT',
  STANDARD: 'STANDARD',
} as const;
export type RequestPriority = typeof REQUEST_PRIORITY[keyof typeof REQUEST_PRIORITY];

export const INVENTORY_STATUS = {
  AVAILABLE: 'available',
  LOW: 'low',
  CRITICAL: 'critical',
  OUT_OF_STOCK: 'out_of_stock',
} as const;
export type InventoryStatus = typeof INVENTORY_STATUS[keyof typeof INVENTORY_STATUS];

export const USER_ROLES = {
  DONOR: 'donor',
  REQUESTER: 'requester',
  HOSPITAL: 'hospital',
  ADMIN: 'admin',
} as const;
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
} as const;
export type VerificationStatus = typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];

export const DONATION_STATUS = {
  SCHEDULED: 'scheduled',
  ARRIVED: 'arrived',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const BLOOD_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export const SEARCH_RADIUS_OPTIONS = [5, 10, 20, 50] as const;

export const HOSPITAL_TYPES = [
  'Government Hospital',
  'Private Hospital',
  'Blood Bank',
  'Nursing Home',
  'Medical College',
  'Charitable Trust',
] as const;

export const DISCLAIMER_TEXT =
  'BloodConnect facilitates coordination between blood seekers and donors. It does not replace medical advice. All blood compatibility and donor eligibility decisions must be confirmed by qualified hospital or blood bank staff. In a medical emergency, contact emergency services immediately.';