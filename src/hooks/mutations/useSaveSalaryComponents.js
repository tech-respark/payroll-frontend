import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';
import { useToast } from '../../context/ToastContext';

/**
 * Mutation hook for saving personnel salary components (fixed or variable).
 * Automatically invalidates the personnelSalaryComponents cache on success.
 *
 * Usage:
 *   const { saveSalaryComponents, isSaving } = useSaveSalaryComponents();
 *   saveSalaryComponents({ tenantId, storeId, personnelId, earningsList, deductionsList });
 *
 * @param {{ onSuccess?: () => void }} options
 */
export const useSaveSalaryComponents = ({ onSuccess } = {}) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: saveSalaryComponents, isPending: isSaving } = useMutation({
    mutationFn: async (payload) => {
      return apiService.post('/personnelSalaryComponentsCalculation', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personnelSalaryComponents', variables.personnelId] });
      showToast('Salary components saved successfully!', 'success');
      onSuccess?.();
    },
    onError: () => {
      showToast('Failed to save salary components.', 'error');
    },
  });

  return { saveSalaryComponents, isSaving };
};
