import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../api/apiService';

/**
 * Fetches the saved salary components (earnings + deductions) for a specific personnel.
 * Used in SalaryDashboard (both Fixed and Variable tabs).
 *
 * @param {string|number} staffId - The ID of the personnel
 * @returns {{ personnelSalaryComponents, isLoading, error }}
 */
export const usePersonnelSalaryComponents = (staffId) => {
  const { data: personnelSalaryComponents = { earningsList: [], deductionsList: [] }, isLoading, error } = useQuery({
    queryKey: ['personnelSalaryComponents', staffId],
    queryFn: async () => {
      const res = await apiService.get(`/personnelSalaryComponents?staffId=${staffId}`);
      return res.data || { earningsList: [], deductionsList: [] };
    },
    enabled: !!staffId,
  });

  return { personnelSalaryComponents, isLoading, error };
};
