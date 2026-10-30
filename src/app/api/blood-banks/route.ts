import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { BLOOD_GROUPS, BloodGroup } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const bloodGroup = searchParams.get('bloodGroup');

    // Default bank data is installed by the Supabase data migration.
    let query = supabase.from('blood_banks').select('*, blood_inventory(*)');
    if (city) {
      query = query.ilike('city', `%${city.trim()}%`);
    }

    const { data: banks, error } = await query;
    if (error) {
      console.error('Fetch blood banks db error:', error);
      return errorResponse('Failed to fetch blood banks', 500);
    }

    // Format banks and inventory
    const formattedBanks = (banks || []).map((bb: any) => {
      const inventoryList = bb.blood_inventory || [];
      const stockObj: Record<string, { units: number; status: string }> = {};

      BLOOD_GROUPS.forEach((bg) => {
        const found = inventoryList.find((inv: any) => inv.blood_group === bg);
        const units = found ? found.units : 0;
        const status = found
          ? found.status
          : units > 5
            ? 'available'
            : units > 0
              ? 'low'
              : 'out_of_stock';
        stockObj[bg] = { units, status };
      });

      const inventory = BLOOD_GROUPS.map((bg) => {
        const item = stockObj[bg];
        return {
          bloodGroup: bg,
          units: item.units,
          status: item.status,
          lastUpdated: bb.updated_at || new Date().toISOString(),
        };
      });

      return {
        id: bb.id,
        name: bb.name,
        type: 'Blood Bank',
        address: bb.address,
        city: bb.city,
        contact: bb.contact,
        phone: bb.phone || bb.contact,
        operatingHours: bb.operating_hours || '24/7 Service',
        isVerified: bb.is_verified ?? true,
        isOpen: true,
        stock: stockObj,
        inventory,
        distanceKm: 2.5,
        avgResponseTime: '15-30 mins',
        updatedAt: bb.updated_at,
      };
    });

    // If bloodGroup specified, sort descending by stock units for that group
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
