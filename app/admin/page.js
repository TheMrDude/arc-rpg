import AdminMonitoring from '@/app/components/admin/AdminMonitoring';

/**
 * ADMIN PAGE
 *
 * Access: /admin
 * Auth: Admin users only (via ADMIN_EMAILS env var)
 *
 * Features:
 * - API cost monitoring and projections
 * - Rate limit tracking and management
 * - Founder spot inventory
 * - User support tools
 */
export default function AdminPage() {
  return <AdminMonitoring />;
}
