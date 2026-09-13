import { z } from 'zod';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const DONOR_AVAILABILITY_STATUS = [
  'available',
  'temporarily_unavailable',
  'do_not_disturb',
] as const;
export type DonorAvailabilityStatus = (typeof DONOR_AVAILABILITY_STATUS)[number];

export const REQUEST_STATUS = [
  'OPEN',
  'MATCHING',
  'DONOR_RESPONDED',
  'HOSPITAL_CONFIRMED',
  'FULFILLED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type RequestStatus = (typeof REQUEST_STATUS)[number];

export const REQUEST_PRIORITY = ['EMERGENCY', 'URGENT', 'STANDARD'] as const;
export type RequestPriority = (typeof REQUEST_PRIORITY)[number];

export const INVENTORY_STATUS = ['available', 'low', 'critical', 'out_of_stock'] as const;
export type InventoryStatus = (typeof INVENTORY_STATUS)[number];

export const USER_ROLES = ['donor', 'requester', 'hospital', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const VERIFICATION_STATUS = ['pending', 'verified', 'suspended', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[number];

export const DONATION_STATUS = [
  'scheduled',
  'arrived',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type DonationStatus = (typeof DONATION_STATUS)[number];

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

/**
 * Returns an array of blood groups that can donate to the recipient with `targetGroup`
 */
export function getCompatibleDonorGroups(targetGroup: BloodGroup): BloodGroup[] {
  return (Object.keys(BLOOD_COMPATIBILITY) as BloodGroup[]).filter((donorGroup) =>
    BLOOD_COMPATIBILITY[donorGroup].includes(targetGroup)
  );
}

// Allowed state transitions for blood requests
export const VALID_REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  OPEN: ['MATCHING', 'DONOR_RESPONDED', 'HOSPITAL_CONFIRMED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
  MATCHING: ['DONOR_RESPONDED', 'HOSPITAL_CONFIRMED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
  DONOR_RESPONDED: ['HOSPITAL_CONFIRMED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
  HOSPITAL_CONFIRMED: ['FULFILLED', 'CANCELLED', 'EXPIRED'],
  FULFILLED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function isValidStatusTransition(
  currentStatus: RequestStatus,
  nextStatus: RequestStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = VALID_REQUEST_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}

// ZOD SCHEMAS

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(USER_ROLES).default('donor'),
  city: z.string().min(2, 'City is required'),
  phone: z.string().min(8, 'Phone number is required'),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateAvailabilitySchema = z.object({
  availabilityStatus: z.enum(DONOR_AVAILABILITY_STATUS, {
    message:
      'availabilityStatus must be one of: available, temporarily_unavailable, do_not_disturb',
  }),
});

export const createBloodRequestSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS, {
    message: 'Valid bloodGroup is required',
  }),
  priority: z
    .enum(REQUEST_PRIORITY, {
      message: 'Valid priority (EMERGENCY, URGENT, STANDARD) is required',
    })
    .default('STANDARD'),
  hospital: z.string().min(2, 'Hospital name is required'),
  unitsNeeded: z.coerce.number().int().positive('Units needed must be at least 1'),
  contactNumber: z.string().min(6, 'Contact number is required'),
  city: z.string().optional(),
  patientName: z.string().optional(),
  notes: z.string().optional(),
});

export const updateRequestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUS, {
    message: 'Valid REQUEST_STATUS is required',
  }),
});

export const createDonationSchema = z.object({
  donorId: z.string().optional(),
  bloodBankId: z.string().optional(),
  date: z.coerce.date().default(() => new Date()),
  status: z.enum(DONATION_STATUS).default('scheduled'),
  units: z.coerce.number().positive().default(1),
  hospital: z.string().optional(),
  notes: z.string().optional(),
});
