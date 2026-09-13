import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { BloodBank } from '@/models';
import { successResponse, errorResponse } from '@/lib/api-response';
import { BLOOD_GROUPS, BloodGroup } from '@/lib/validations';

const DEFAULT_BLOOD_BANKS = [
  {
    name: 'Apollo Hospital Blood Bank',
    address: 'Andheri East, Off Western Express Highway',
    city: 'Mumbai',
    contact: '+91 22 2826 3000',
    phone: '+91 22 2826 3000',
    operatingHours: '24/7 Service',
    isVerified: true,
    stock: {
      'A+': { units: 14, status: 'available' },
      'A-': { units: 3, status: 'critical' },
      'B+': { units: 22, status: 'available' },
      'B-': { units: 5, status: 'low' },
      'AB+': { units: 8, status: 'available' },
      'AB-': { units: 1, status: 'critical' },
      'O+': { units: 18, status: 'available' },
      'O-': { units: 2, status: 'critical' },
    },
  },
  {
    name: 'Lilavati Hospital & Research Centre',
    address: 'A-791, Bandra Reclamation, Bandra West',
    city: 'Mumbai',
    contact: '+91 22 2675 1000',
    phone: '+91 22 2675 1000',
    operatingHours: '24/7 Service',
    isVerified: true,
    stock: {
      'A+': { units: 9, status: 'available' },
      'A-': { units: 2, status: 'critical' },
      'B+': { units: 16, status: 'available' },
      'B-': { units: 4, status: 'low' },
      'AB+': { units: 6, status: 'available' },
      'AB-': { units: 0, status: 'out_of_stock' },
      'O+': { units: 12, status: 'available' },
      'O-': { units: 1, status: 'critical' },
    },
  },
  {
    name: 'AIIMS Main Blood Bank',
    address: 'Ansari Nagar, Ring Road',
    city: 'Delhi',
    contact: '+91 11 2658 8500',
    phone: '+91 11 2658 8500',
    operatingHours: '24/7 Service',
    isVerified: true,
    stock: {
      'A+': { units: 28, status: 'available' },
      'A-': { units: 7, status: 'low' },
      'B+': { units: 35, status: 'available' },
      'B-': { units: 8, status: 'available' },
      'AB+': { units: 15, status: 'available' },
      'AB-': { units: 3, status: 'critical' },
      'O+': { units: 42, status: 'available' },
      'O-': { units: 6, status: 'low' },
    },
  },
  {
    name: 'Indian Red Cross Society Blood Centre',
    address: '1 Red Cross Road',
    city: 'Delhi',
    contact: '+91 11 2371 6441',
    phone: '+91 11 2371 6441',
    operatingHours: '8:00 AM - 8:00 PM',
    isVerified: true,
    stock: {
      'A+': { units: 19, status: 'available' },
      'A-': { units: 4, status: 'low' },
      'B+': { units: 24, status: 'available' },
      'B-': { units: 6, status: 'low' },
      'AB+': { units: 10, status: 'available' },
      'AB-': { units: 2, status: 'critical' },
      'O+': { units: 30, status: 'available' },
      'O-': { units: 4, status: 'low' },
    },
  },
];

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const bloodGroup = searchParams.get('bloodGroup');

    // Check count and seed default banks if empty
    const count = await BloodBank.countDocuments();
    if (count === 0) {
      await BloodBank.insertMany(DEFAULT_BLOOD_BANKS);
    }

    const query: Record<string, any> = {};
    if (city) {
      query.city = { $regex: new RegExp(city.trim(), 'i') };
    }

    const banks = await BloodBank.find(query).lean();

    // Map each bank with standard stock and inventory list
    let formattedBanks = banks.map((bb: any) => {
      const stockObj = bb.stock instanceof Map ? Object.fromEntries(bb.stock) : bb.stock || {};
      
      const inventory = BLOOD_GROUPS.map((bg) => {
        const item = stockObj[bg] || { units: 0, status: 'out_of_stock' };
        return {
          bloodGroup: bg,
          units: item.units || 0,
          status: item.status || (item.units > 5 ? 'available' : item.units > 0 ? 'low' : 'out_of_stock'),
          lastUpdated: item.lastUpdated || bb.updatedAt || new Date().toISOString(),
        };
      });

      return {
        id: bb._id.toString(),
        name: bb.name,
        type: 'Blood Bank',
        address: bb.address,
        city: bb.city,
        contact: bb.contact,
        phone: bb.phone || bb.contact,
        operatingHours: bb.operatingHours || '24/7 Service',
        isVerified: bb.isVerified ?? true,
        isOpen: true,
        stock: stockObj,
        inventory,
        distanceKm: 2.5,
        avgResponseTime: '15-30 mins',
        updatedAt: bb.updatedAt,
      };
    });

    // If bloodGroup specified, sort descending by matching bloodGroup stock units
    if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup as BloodGroup)) {
      formattedBanks.sort((a, b) => {
        const aUnits = a.stock[bloodGroup]?.units || 0;
        const bUnits = b.stock[bloodGroup]?.units || 0;
        return bUnits - aUnits;
      });
    }

    return successResponse(formattedBanks, 'Blood banks fetched successfully', 200);
  } catch (error: any) {
    console.error('Fetch blood banks error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
