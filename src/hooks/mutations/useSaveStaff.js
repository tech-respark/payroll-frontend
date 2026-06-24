import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../api/apiService';
import { useToast } from '../../context/ToastContext';

/**
 * Mutation hook for creating or updating a staff member and assigning a role.
 * Automatically invalidates the staffList cache on success.
 *
 * Usage:
 *   const { saveStaff, isSaving } = useSaveStaff();
 *   saveStaff(payload);
 *
 * @param {{ onSuccess?: (data) => void }} options
 */
export const useSaveStaff = ({ onSuccess } = {}) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: saveStaff, isPending: isSaving } = useMutation({
    mutationFn: async (payload) => {
      const savedStaffRes = await apiService.post('/personnelForAttendanceManagement', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId),
      });

      const staffId = savedStaffRes.data?.id || payload.id;
      if (staffId && payload.roleId) {
        await apiService.post('/roles/assign', {
          staffId: parseInt(staffId),
          roleId: parseInt(payload.roleId),
          storeId,
          tenantId,
        });
      }
      return savedStaffRes;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staffList'] });
      showToast('Staff and Role saved successfully!', 'success');
      onSuccess?.(res.data);
    },
    onError: (err) => {
      showToast(err.message || 'Error saving staff', 'error');
    },
  });

  return { saveStaff, isSaving };
};
