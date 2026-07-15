import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

/**
 * Fetches store shifts for a week starting from a specific date.
 * Used in ShiftsDashboard to build the weekly schedule view.
 *
 * @param {string} startDate - The start date in YYYY-MM-DD format.
 * @returns {{ weeklyShifts, isLoading, error }}
 */
export const useWeeklyShifts = (startDate) => {
  const { tenantId, storeId } = useAuth();

  const { data: weeklyShifts = [], isLoading, error } = useQuery({
    queryKey: ['weeklyShifts', tenantId, storeId, startDate],
    queryFn: async () => {
      const data = await apiService.get(`/staffshifts/store/weekly?tenantId=${tenantId}&storeId=${storeId}&startDate=${startDate}`);
      return data || [];
    },
    enabled: !!tenantId && !!storeId && !!startDate,
  });

  return { weeklyShifts, isLoading, error };
};
