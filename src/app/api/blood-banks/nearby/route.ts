import { NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { BLOOD_GROUPS, BloodGroup } from '@/lib/validations';

/**
 * Haversine distance in kilometers between two lat/lng points.
 */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GET /api/blood-banks/nearby
 *
 * Query params:
 *   lat       — User's latitude (required)
 *   lng       — User's longitude (required)
 *   radiusKm  — Search radius in km (default 10, max 100)
 *   bloodGroup — Filter by blood group availability (optional)
 *   type      — Filter: "hospital" | "blood_bank" | "all" (default "all")
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');

    if (!latStr || !lngStr) {
      return errorResponse('lat and lng query parameters are required', 400);
    }

    const userLat = parseFloat(latStr);
    const userLng = parseFloat(lngStr);

    if (isNaN(userLat) || isNaN(userLng) || Math.abs(userLat) > 90 || Math.abs(userLng) > 180) {
      return errorResponse('Invalid lat/lng values', 400);
    }

    const radiusKm = Math.min(
      Math.max(parseFloat(searchParams.get('radiusKm') || '10'), 1),
      100
    );
    const bloodGroup = searchParams.get('bloodGroup') || '';
    const facilityType = searchParams.get('type') || 'all';

    const supabase = await createServerSupabase();

    // Fetch all blood banks with coordinates and their inventory
    const { data: banks, error } = await supabase
      .from('blood_banks')
      .select('*, blood_inventory(*)')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      console.error('Fetch nearby facilities db error:', error);
      return errorResponse('Failed to fetch facilities', 500);
    }

    // Calculate distances and filter by radius
    const facilitiesWithDistance = (banks || [])
      .map((bb: any) => {
        const distanceKm = haversineKm(userLat, userLng, bb.latitude, bb.longitude);
        return { ...bb, distanceKm: Math.round(distanceKm * 10) / 10 };
      })
      .filter((bb: any) => bb.distanceKm <= radiusKm);

    // Format results (reuse same format as /api/blood-banks for consistency)
    const formatted = facilitiesWithDistance.map((bb: any) => {
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
        const invRecord = inventoryList.find((inv: any) => inv.blood_group === bg);
        return {
          bloodGroup: bg,
          units: item.units,
          status: item.status,
          lastUpdated: invRecord?.updated_at || bb.updated_at || null,
        };
      });

      // Determine facility type from name heuristics
      const nameLower = (bb.name || '').toLowerCase();
      let type = 'Blood Bank';
      if (nameLower.includes('hospital')) type = 'Hospital';
      else if (nameLower.includes('red cross') || nameLower.includes('centre')) type = 'Blood Centre';

      return {
        id: bb.id,
        name: bb.name,
        type,
        address: bb.address,
        city: bb.city,
        contact: bb.contact,
        phone: bb.phone || bb.contact,
        operatingHours: bb.operating_hours || '24/7 Service',
        isVerified: bb.is_verified ?? true,
        isOpen: true,
        latitude: bb.latitude,
        longitude: bb.longitude,
        distanceKm: bb.distanceKm,
        stock: stockObj,
        inventory,
        hasInventoryData: inventoryList.length > 0,
        inventoryLastUpdated: inventoryList.length > 0
          ? inventoryList.reduce(
              (latest: string, inv: any) =>
                inv.updated_at > latest ? inv.updated_at : latest,
              inventoryList[0].updated_at
            )
          : null,
        updatedAt: bb.updated_at,
      };
    });

    // Filter by facility type
    let results = formatted;
    if (facilityType === 'hospital') {
      results = results.filter((f: any) => f.type === 'Hospital');
    } else if (facilityType === 'blood_bank') {
      results = results.filter((f: any) => f.type !== 'Hospital');
    }

    // Filter by blood group availability if specified
    if (bloodGroup && BLOOD_GROUPS.includes(bloodGroup as BloodGroup)) {
      results.sort((a: any, b: any) => {
        const aUnits = a.stock[bloodGroup]?.units || 0;
        const bUnits = b.stock[bloodGroup]?.units || 0;
        return bUnits - aUnits;
      });
    } else {
      // Sort by distance
      results.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
    }

    return successResponse(
      {
        facilities: results,
        meta: {
          total: results.length,
          searchCenter: { lat: userLat, lng: userLng },
          radiusKm,
          bloodGroup: bloodGroup || null,
          facilityType,
        },
      },
      'Nearby facilities fetched successfully',
      200
    );
  } catch (error: any) {
    console.error('Fetch nearby facilities error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
