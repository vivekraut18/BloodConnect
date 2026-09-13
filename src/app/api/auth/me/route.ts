import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models';
import { getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    await connectDB();

    const user = await User.findById(authUser.userId).select('name email role city phone verificationStatus');
    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(
      {
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
      },
      'User fetched successfully',
      200
    );
  } catch (error: any) {
    console.error('Me route error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
