import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const isRead = typeof body.isRead === 'boolean' ? body.isRead : true;

    const supabase = await createServerSupabase();
    const { data: updated, error } = await supabase
      .from('notifications')
      .update({ is_read: isRead, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', authUser.userId)
      .select()
      .single();

    if (error || !updated) {
      return errorResponse('Failed to update notification', 500);
    }

    return successResponse(
      {
        notification: {
          id: updated.id,
          userId: updated.user_id,
          title: updated.title,
          message: updated.message,
          type: updated.type,
          link: updated.link,
          isRead: updated.is_read,
          createdAt: updated.created_at,
        },
      },
      'Notification updated successfully',
      200
    );
  } catch (error: any) {
    console.error('Update notification error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const { id } = await params;
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', authUser.userId);

    if (error) {
      return errorResponse('Failed to delete notification', 500);
    }

    return successResponse(null, 'Notification deleted successfully', 200);
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
