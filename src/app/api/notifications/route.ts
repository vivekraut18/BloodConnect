import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createNotificationSchema } from '@/lib/validations';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const supabase = await createServerSupabase();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', authUser.userId);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Fetch notifications error:', error);
      return errorResponse('Failed to fetch notifications', 500);
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.userId)
      .eq('is_read', false);

    const formatted = (notifications || []).map((n) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link || '/donor-dashboard',
      isRead: n.is_read,
      createdAt: n.created_at,
    }));

    return successResponse(
      {
        notifications: formatted,
        unreadCount: unreadCount || 0,
      },
      'Notifications fetched successfully',
      200
    );
  } catch (error: any) {
    console.error('Notifications route error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const body = await req.json().catch(() => ({}));
    const supabase = await createServerSupabase();

    // Mark all as read
    if (body.action === 'mark_all_read') {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', authUser.userId)
        .eq('is_read', false);

      if (error) {
        console.error('Mark all notifications read error:', error);
        return errorResponse('Failed to mark notifications as read', 500);
      }

      return successResponse({ markedAllRead: true }, 'All notifications marked as read', 200);
    }

    // Mark single notification as read / unread
    if (body.id) {
      const isRead = typeof body.isRead === 'boolean' ? body.isRead : true;
      const { data: updated, error } = await supabase
        .from('notifications')
        .update({ is_read: isRead, updated_at: new Date().toISOString() })
        .eq('id', body.id)
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
        'Notification updated',
        200
      );
    }

    return errorResponse('Invalid action or missing notification id', 400);
  } catch (error: any) {
    console.error('Update notification error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return errorResponse('Unauthorized: Please log in', 401);
    }

    const body = await req.json().catch(() => ({}));
    const validation = createNotificationSchema.safeParse(body);

    if (!validation.success) {
      const issue = validation.error.issues[0];
      return errorResponse(issue?.message || 'Invalid notification data', 400);
    }

    const { title, message, type, link, userId } = validation.data;
    const targetUserId = userId || authUser.userId;

    // Only admins can create notifications for other users
    if (targetUserId !== authUser.userId && authUser.role !== 'admin' && authUser.role !== 'hospital') {
      return errorResponse('Forbidden: Cannot create notifications for other users', 403);
    }

    const supabase = await createServerSupabase();
    const { data: newNotif, error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        title,
        message,
        type: type || 'info',
        link: link || '/donor-dashboard',
        is_read: false,
      })
      .select()
      .single();

    if (error || !newNotif) {
      console.error('Create notification error:', error);
      return errorResponse('Failed to create notification', 500);
    }

    return successResponse(
      {
        notification: {
          id: newNotif.id,
          userId: newNotif.user_id,
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          link: newNotif.link,
          isRead: newNotif.is_read,
          createdAt: newNotif.created_at,
        },
      },
      'Notification created successfully',
      201
    );
  } catch (error: any) {
    console.error('Create notification route error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
