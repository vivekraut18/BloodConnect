/**
 * Isolated Seed Script for Development / Sandbox Environments Only
 *
 * This script will NEVER execute unless ALLOW_DEMO_SEED=true is explicitly set
 * in the environment. It is never triggered from normal app runtime or login requests.
 *
 * Usage:
 *   ALLOW_DEMO_SEED=true npx tsx scripts/seed-demo-data.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Guard against accidental execution in production
if (process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error(
    '\x1b[31m%s\x1b[0m',
    'CRITICAL SECURITY GUARD: Refusing to seed demo accounts.\n' +
      'To seed accounts for local sandbox development, set the environment variable:\n' +
      '  ALLOW_DEMO_SEED=true'
  );
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodconnect';

const SEED_ACCOUNTS = [
  {
    role: 'donor' as const,
    name: 'Arjun Mehta',
    email: 'arjun.mehta@bloodconnect.in',
    password: process.env.DEMO_DONOR_PASSWORD || 'Donor@Demo2026!',
    city: 'Mumbai',
    phone: '+91 98765 43210',
    bloodGroup: 'B+',
  },
  {
    role: 'requester' as const,
    name: 'Priya Sharma',
    email: 'priya.sharma@bloodconnect.in',
    password: process.env.DEMO_REQUESTER_PASSWORD || 'Request@Demo2026!',
    city: 'Mumbai',
    phone: '+91 98765 43211',
  },
  {
    role: 'hospital' as const,
    name: 'AIIMS Delhi',
    email: 'aiims.delhi@bloodconnect.in',
    password: process.env.DEMO_HOSPITAL_PASSWORD || 'Hospital@Demo2026!',
    city: 'Delhi',
    phone: '+91 98765 43212',
  },
  {
    role: 'admin' as const,
    name: 'BloodConnect Admin',
    email: 'admin@bloodconnect.in',
    password: process.env.DEMO_ADMIN_PASSWORD || 'Admin@Demo2026!',
    city: 'Mumbai',
    phone: '+91 98765 43213',
  },
];

async function seed() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const usersCollection = db.collection('users');
  const donorsCollection = db.collection('donors');

  for (const account of SEED_ACCOUNTS) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(account.password, salt);

    const userDoc = {
      name: account.name,
      email: account.email.toLowerCase(),
      passwordHash,
      role: account.role,
      phone: account.phone,
      city: account.city,
      verificationStatus: 'verified',
      updatedAt: new Date(),
    };

    const res = await usersCollection.findOneAndUpdate(
      { email: account.email.toLowerCase() },
      { $set: userDoc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );

    const userId = res?._id || (await usersCollection.findOne({ email: account.email.toLowerCase() }))?._id;

    if (account.role === 'donor' && userId) {
      await donorsCollection.findOneAndUpdate(
        { userId },
        {
          $set: {
            bloodGroup: account.bloodGroup,
            availabilityStatus: 'available',
            lastDonationDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            donationsCompleted: 14,
            reliabilityScore: 96,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }

    console.log(`Seeded ${account.role} account: ${account.email}`);
  }

  console.log('\nDemo seed completed successfully.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
