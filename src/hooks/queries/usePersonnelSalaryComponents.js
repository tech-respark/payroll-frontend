import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../api/apiService';

/**
 * Fetches the saved salary components (earnings + deductions) for a specific personnel.
 * Used in SalaryDashboard (both Fixed and Variable tabs).
 *
 * @param {string|number} personnelId - The ID of the personnel
 * @returns {{ personnelSalaryComponents, isLoading, error }}
 */
export const usePersonnelSalaryComponents = (personnelId) => {
  const { data: personnelSalaryComponents = { earningsList: [], deductionsList: [] }, isLoading, error } = useQuery({
    queryKey: ['personnelSalaryComponents', personnelId],
    queryFn: async () => {
      const res = await apiService.get(`/personnelSalaryComponents?personnelId=${personnelId}`);
      return res.data || { earningsList: [], deductionsList: [] };
    },
    enabled: !!personnelId,
  });

  return { personnelSalaryComponents, isLoading, error };
};
