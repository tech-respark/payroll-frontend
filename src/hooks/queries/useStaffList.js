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
    : rawStaffList.filter(s => {
        if (user?.personnelCode && String(s.id) === String(user.personnelCode)) return true;
        if (user?.personnelId && String(s.id) === String(user.personnelId)) return true;
        if (user?.id && String(s.id) === String(user.id)) return true;
        if (user?.username && s.username && String(s.username).toLowerCase() === String(user.username).toLowerCase()) return true;
        if (user?.email && s.email && String(s.email).toLowerCase() === String(user.email).toLowerCase()) return true;
        return false;
      });

  return { staffList, rawStaffList, isLoading, error };
};
