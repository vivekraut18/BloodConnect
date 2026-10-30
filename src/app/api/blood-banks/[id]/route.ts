import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { BLOOD_GROUPS } from '@/lib/validations';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: bb, error } = await supabase
      .from('blood_banks')
      .select('*, blood_inventory(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !bb) {
      return errorResponse('Blood bank not found', 404);
    }

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
        lastUpdated: bb.updated_at,
      };
    });

    return successResponse(
      {
        id: bb.id,
        name: bb.name,
        address: bb.address,
        city: bb.city,
        contact: bb.contact,
        phone: bb.phone || bb.contact,
        operatingHours: bb.operating_hours || '24/7 Service',
        isVerified: bb.is_verified ?? true,
        stock: stockObj,
        inventory,
        updatedAt: bb.updated_at,
      },
      'Blood bank fetched successfully',
      200
    );
  } catch (error: any) {
    console.error('Fetch blood bank by id error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
