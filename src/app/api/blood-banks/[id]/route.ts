import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { BloodBank } from '@/models';
import { successResponse, errorResponse } from '@/lib/api-response';
import { BLOOD_GROUPS } from '@/lib/validations';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return errorResponse('Invalid blood bank ID', 400);
    }

    const bb = await BloodBank.findById(id).lean();
    if (!bb) {
      return errorResponse('Blood bank not found', 404);
    }

    const stockObj = bb.stock instanceof Map ? Object.fromEntries(bb.stock) : bb.stock || {};
    const inventory = BLOOD_GROUPS.map((bg) => {
      const item = stockObj[bg] || { units: 0, status: 'out_of_stock' };
      return {
        bloodGroup: bg,
        units: item.units || 0,
        status: item.status || (item.units > 5 ? 'available' : item.units > 0 ? 'low' : 'out_of_stock'),
        lastUpdated: item.lastUpdated || (bb as any).updatedAt,
      };
    });

    return successResponse(
      {
        id: (bb as any)._id.toString(),
        name: (bb as any).name,
        address: (bb as any).address,
        city: (bb as any).city,
        contact: (bb as any).contact,
        phone: (bb as any).phone || (bb as any).contact,
        operatingHours: (bb as any).operatingHours || '24/7 Service',
        isVerified: (bb as any).isVerified ?? true,
        stock: stockObj,
        inventory,
        updatedAt: (bb as any).updatedAt,
      },
      'Blood bank fetched successfully',
      200
    );
  } catch (error: any) {
    console.error('Fetch blood bank by id error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
