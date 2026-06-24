import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

/**
 * Fetches salary component definitions (earnings/deductions) defined for the store.
 * Used in SalaryDashboard (FixedComponentsTab and VariableComponentsTab).
 *
 * @returns {{ salaryComponents, fixedComponents, variableComponents, isLoading, error }}
 */
export const useSalaryComponentDefinitions = () => {
  const { tenantId, storeId } = useAuth();

  const { data: salaryComponents = [], isLoading, error } = useQuery({
    queryKey: ['salaryComponentDefinitions', tenantId, storeId],
    queryFn: async () => {
      const res = await apiService.get(`/salaryComponentDefinitions?tenantId=${tenantId}&storeId=${storeId}`);
      return res.data || [];
    },
    enabled: !!tenantId && !!storeId,
    // Component definitions rarely change — cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  });

  const fixedComponents = salaryComponents.filter(c => !c.isCalculatedMonthly);
  const variableComponents = salaryComponents.filter(c => c.isCalculatedMonthly);

  return { salaryComponents, fixedComponents, variableComponents, isLoading, error };
};
