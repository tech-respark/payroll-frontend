import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

/**
 * Fetches store operating settings (open time, close time, etc.)
 * Used in ShiftsDashboard to display and edit store timings.
 *
 * @returns {{ storeSettings, isLoading, error }}
 */
export const useStoreSettings = () => {
  const { tenantId, storeId } = useAuth();

  const { data: storeSettings = null, isLoading, error } = useQuery({
    queryKey: ['storeSettings', tenantId, storeId],
    queryFn: async () => {
      const res = await apiService.get(`/storeSettings?tenantId=${tenantId}&storeId=${storeId}`);
      return res.data || null;
    },
    enabled: !!tenantId && !!storeId,
  });

  return { storeSettings, isLoading, error };
};
