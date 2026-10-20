import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

/**
 * Fetches the list of all roles for a tenant.
 * Shared across StaffDashboard (role assignment) and RoleManagement screen.
 *
 * @returns {{ roles, isLoading, error }}
 */
export const useRoles = () => {
  const { tenantId, hasAccess } = useAuth();
  const canFetchRoles = hasAccess(['MANAGE_ROLES', 'MANAGE_STAFF']);

  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['roles', tenantId],
    queryFn: async () => {
      const res = await apiService.get(`/roles?tenantId=${tenantId}`);
      return (res && res.success) ? (res.data || []) : [];
    },
    enabled: !!tenantId && canFetchRoles,
  });

  return { roles, isLoading, error };
};
