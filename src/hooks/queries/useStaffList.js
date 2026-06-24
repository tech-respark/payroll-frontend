import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

/**
 * Fetches the full staff list for the current tenant + store.
 * Automatically filters to the current user only if they lack VIEW_OTHER_STAFF permission.
 *
 * @returns {{ staffList, isLoading, error, rawStaffList }}
 */
export const useStaffList = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();

  const { data: rawStaffList = [], isLoading, error } = useQuery({
    queryKey: ['staffList', tenantId, storeId],
    queryFn: async () => {
      const res = await apiService.get(`/personnel/all?tenantId=${tenantId}&storeId=${storeId}`);
      return res.data || res || [];
    },
    enabled: !!tenantId && !!storeId,
  });

  const staffList = hasAccess(['VIEW_OTHER_STAFF'])
    ? rawStaffList
    : rawStaffList.filter(s => s.id === user?.personnelCode);

  return { staffList, rawStaffList, isLoading, error };
};
