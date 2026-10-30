/**
 * Demo Seed Script — Supabase
 *
 * Development / sandbox use only.
 *
 * This script will NOT run unless:
 *   ALLOW_DEMO_SEED=true
 *
 * It uses the Supabase service-role client, so it must only be
 * executed from a trusted local/server environment.
 *
 * Usage:
 *   ALLOW_DEMO_SEED=true npx tsx scripts/seed-demo-data.ts
 */

import { createAdminClient } from '../src/lib/supabase/admin';

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

if (process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error(
    '\x1b[31m%s\x1b[0m',
    'CRITICAL SECURITY GUARD: Refusing to seed demo accounts.\n' +
      'To seed accounts for local sandbox development, set:\n' +
      '  ALLOW_DEMO_SEED=true'
  );
  process.exit(1);
}

const supabase = createAdminClient();

const SEED_ACCOUNTS = [
  {
    role: 'donor' as const,
    name: 'Arjun Mehta',
    email: 'arjun.mehta@bloodconnect.in',
    password: requiredEnvironmentVariable('DEMO_DONOR_PASSWORD'),
    city: 'Mumbai',
    phone: '+91 98765 43210',
    bloodGroup: 'B+',
  },
  {
    role: 'requester' as const,
    name: 'Priya Sharma',
    email: 'priya.sharma@bloodconnect.in',
    password: requiredEnvironmentVariable('DEMO_REQUESTER_PASSWORD'),
    city: 'Mumbai',
    phone: '+91 98765 43211',
  },
  {
    role: 'hospital' as const,
    name: 'AIIMS Delhi',
    email: 'aiims.delhi@bloodconnect.in',
    password: requiredEnvironmentVariable('DEMO_HOSPITAL_PASSWORD'),
    city: 'Delhi',
    phone: '+91 98765 43212',
  },
  {
    role: 'admin' as const,
    name: 'BloodConnect Admin',
    email: 'admin@bloodconnect.in',
    password: requiredEnvironmentVariable('DEMO_ADMIN_PASSWORD'),
    city: 'Mumbai',
    phone: '+91 98765 43213',
  },
];

async function seed() {
  console.log('Starting Supabase demo seed...\n');

  for (const account of SEED_ACCOUNTS) {
    console.log(`Processing ${account.role}: ${account.email}`);

    /*
     * 1. Check whether the Auth user already exists.
     *
     * Supabase Admin API does not provide a direct "get user by email"
     * method, so we page through users and look for the email.
     */
    let authUser = null;
    let page = 1;

    while (!authUser) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (error) {
        throw new Error(`Failed to list Supabase users: ${error.message}`);
      }

      authUser = data.users.find(
        (user) => user.email?.toLowerCase() === account.email.toLowerCase()
      );

      if (authUser || data.users.length < 100) {
        break;
      }

      page++;
    }

    /*
     * 2. Create the Auth user if it does not exist.
     *
     * The database trigger automatically creates the matching
     * public.profiles row using user metadata.
     */
    if (!authUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email.toLowerCase(),
        password: account.password,
        email_confirm: true,
        user_metadata: {
          name: account.name,
          role: account.role,
          phone: account.phone,
          city: account.city,
        },
      });

      if (error) {
        throw new Error(`Failed to create ${account.email}: ${error.message}`);
      }

      authUser = data.user;

      if (!authUser) {
        throw new Error(`Supabase did not return a user for ${account.email}`);
      }

      console.log(`  ✓ Auth user created`);
    } else {
      console.log(`  ✓ Auth user already exists`);
    }

    /*
     * 3. Make sure the profile contains the expected demo data.
     *
     * The Auth trigger normally creates this automatically, but the
     * upsert keeps the seed script safe to re-run.
     */
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        name: account.name,
        email: account.email.toLowerCase(),
        role: account.role,
        phone: account.phone,
        city: account.city,
        verification_status: 'verified',
      },
      {
        onConflict: 'id',
      }
    );

    if (profileError) {
      throw new Error(`Failed to seed profile for ${account.email}: ${profileError.message}`);
    }

    console.log(`  ✓ Profile ready`);

    /*
     * 4. Donor-specific data.
     */
    if (account.role === 'donor') {
      const lastDonationDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();

      const { error: donorError } = await supabase.from('donor_profiles').upsert(
        {
          user_id: authUser.id,
          blood_group: account.bloodGroup,
          availability_status: 'available',
          last_donation_date: lastDonationDate,
          donations_completed: 14,
          reliability_score: 96,
        },
        {
          onConflict: 'user_id',
        }
      );

      if (donorError) {
        throw new Error(`Failed to seed donor profile for ${account.email}: ${donorError.message}`);
      }

      console.log(`  ✓ Donor profile ready`);
    }

    console.log(`  ✓ ${account.role} account ready\n`);
  }

  console.log('Demo seed completed successfully.');
}

seed().catch((error) => {
  console.error('\nSeed error:', error);
  process.exit(1);
});
