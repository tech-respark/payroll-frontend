import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

/**
 * Fetches the permission module definitions for role management.
 * Returns icon as a raw HTML string — components render it with dangerouslySetInnerHTML.
 *
 * @returns {{ permissionGroups, isLoading, error }}
 */
export const usePermissionModules = () => {
  const { tenantId, storeId } = useAuth();

  const { data: permissionGroups = [], isLoading, error } = useQuery({
    queryKey: ['permissionModules', tenantId, storeId],
    queryFn: async () => {
      const res = await apiService.get(`/roles/permissions/modules?tenantId=${tenantId}&storeId=${storeId}`);
      if (!res.data) return [];
      return res.data.map(m => ({
        id: m.id,
        category: m.category,
        iconHtml: m.icon,  // raw HTML string — render with dangerouslySetInnerHTML in component
        permissions: m.permissions.map(p => ({
          id: p.permissionId,
          label: p.label,
        })),
      }));
    },
    enabled: !!tenantId && !!storeId,
    // Permission modules rarely change — cache for 10 minutes
    staleTime: 10 * 60 * 1000,
  });

  return { permissionGroups, isLoading, error };
};
