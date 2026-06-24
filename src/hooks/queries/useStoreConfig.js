import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';

/**
 * Fetches the store/tenant configuration (financial year, payroll lock date, etc.)
 * Shared across PayslipsDashboard and SalaryDashboard (VariableComponentsTab).
 *
 * @returns {{ storeConfig, isLoading, error }}
 */
export const useStoreConfig = () => {
  const { tenantId, storeId } = useAuth();

  const { data: storeConfig = null, isLoading, error } = useQuery({
    queryKey: ['storeConfig', tenantId, storeId],
    queryFn: async () => {
      const res = await apiService.get(`/tenantStoreConfig?tenantId=${tenantId}&storeId=${storeId}`);
      return res.data || null;
    },
    enabled: !!tenantId && !!storeId,
  });

  return { storeConfig, isLoading, error };
};
