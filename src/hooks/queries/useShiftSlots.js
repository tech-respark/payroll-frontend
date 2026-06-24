import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

/**
 * Fetches shift slot templates (e.g. Morning Shift, Evening Shift) for the store.
 * Used in ShiftsDashboard to build the shifts roster.
 *
 * @returns {{ shiftSlots, isLoading, error }}
 */
export const useShiftSlots = () => {
  const { tenantId, storeId } = useAuth();

  const { data: shiftSlots = [], isLoading, error } = useQuery({
    queryKey: ['shiftSlots', tenantId, storeId],
    queryFn: async () => {
      const data = await apiService.get(`/shiftslots?tenantId=${tenantId}&storeId=${storeId}`);
      return data || [];
    },
    enabled: !!tenantId && !!storeId,
  });

  return { shiftSlots, isLoading, error };
};
