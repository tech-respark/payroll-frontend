import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useRoles, usePermissionModules } from '../hooks/queries';
import { Switch } from '../components/ui';
import { LuPlus, LuCircleCheck, LuChevronRight, LuX, LuUserCheck } from 'react-icons/lu';
import styles from './RoleManagement.module.scss';
import '../styles/main.scss';

const RoleManagement = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(false);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  
  const queryClient = useQueryClient();

  const { permissionGroups: PERMISSION_GROUPS } = usePermissionModules();
  const { roles, isLoading: loadingRoles } = useRoles();

  const handleCreateRole = async (e) => {
    e.preventDefault();
    
    if (!newRoleName) {
      showToast('Role name is required', 'error');
      return;
    }

    if (selectedPermissions.length === 0) {
      showToast('Please assign at least one permission to this role.', 'error');
      return;
    }

    try {
      setLoading(true);
      
      let res;
      if (editingRoleId) {
        res = await apiService.post(`/roles/update?roleId=${editingRoleId}`, {
          name: newRoleName,
          description: newRoleDesc,
          tenantId: tenantId,
          permissions: selectedPermissions
        });
      } else {
        res = await apiService.post('/roles/create', {
          name: newRoleName,
          description: newRoleDesc,
          tenantId: tenantId,
          permissions: selectedPermissions
        });
      }
      
      if (res && res.success) {
        showToast(`Role ${editingRoleId ? 'updated' : 'created'} successfully!`, 'success');
        closeModal();
        queryClient.invalidateQueries({ queryKey: ['roles'] });
      } else {
        showToast(res?.message || `Failed to ${editingRoleId ? 'update' : 'create'} role`, 'error');
      }
    } catch (err) {
      showToast('An error occurred while saving the role', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (permId) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const getGrantedCategories = (permsArray) => {
    const grantedCats = [];
    PERMISSION_GROUPS.forEach(group => {
      const hasPerm = group.permissions.some(p => permsArray.includes(p.id));
      if (hasPerm) grantedCats.push(group.category);
    });
    return grantedCats;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoleId(null);
    setNewRoleName('');
    setNewRoleDesc('');
    setSelectedPermissions([]);
  };

  return (
    <div className={styles.dashboardLayout}>
      {/* SPLIT PANEL LAYOUT */}
      <div className={styles.mainContainer}>

        {/* LEFT: ROLES LIST */}
        <div className={styles.rolesListContainer}>
          <div className={styles.rolesListHeader}>
            <h3 className={styles.rolesCardTitle}>Active Security Roles</h3>
            <button 
              className={styles.createBtn}
              onClick={() => {
                setEditingRoleId(null);
                setNewRoleName('');
                setNewRoleDesc('');
                setSelectedPermissions([]);
                setIsModalOpen(true);
              }}
            >
              <LuPlus size={14} />
              NEW ROLE
            </button>
          </div>
          <div className={styles.rolesList}>

            {loadingRoles ? (
              <div className={styles.rolesListLoading}>Loading...</div>
            ) : roles.length === 0 ? (
              <div className={styles.rolesListEmpty}>No roles configured.</div>
            ) : (
              <div>
                {roles.map(role => {
                  const perms = role.permissions ? role.permissions.split(',') : [];
                  const isActive = editingRoleId === role.id && isModalOpen;
                  return (
                    <div
                      key={role.id}
                      className={isActive ? styles.roleRowActive : styles.roleRow}
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setNewRoleName(role.name || '');
                        setNewRoleDesc(role.description || '');
                        setSelectedPermissions(perms);
                        setIsModalOpen(true);
                      }}
                    >
                      {isActive ? (
                        <LuCircleCheck size={20} className={styles.roleIconActive} />
                      ) : (
                        <LuChevronRight size={20} className={styles.roleIcon} />
                      )}
                      <div>
                        <div className={styles.roleName}>{role.name}</div>
                        {role.description && <div className={styles.roleDesc}>{role.description}</div>}
                        <div className={styles.rolePermsCount}>{perms.length} permission{perms.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CREATE / EDIT FORM */}
        <div className={styles.formContainer}>
          {isModalOpen ? (
            <>
              
              {/* Form Header */}
              <div className={styles.formHeader}>
                <div>
                  <h3 className={styles.formTitle}>
                    {editingRoleId ? `Edit: ${newRoleName}` : 'Create New Role'}
                  </h3>
                  <p className={styles.formSubtitle}>Configure permissions below.</p>
                </div>
                <button 
                  onClick={closeModal}
                  className={styles.closeBtn}
                >
                  <LuX size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateRole} className={styles.formContent}>
                {/* Name & Description row */}
                <div className={styles.formRow}>
                  <div>
                    <label className={styles.formLabel}>Role Name <span className={styles.requiredAsterisk}>*</span></label>
                    <input 
                      type="text" 
                      value={newRoleName} 
                      onChange={e => setNewRoleName(e.target.value)} 
                      className={styles.formInput} 
                      placeholder="e.g. Store Manager" 
                    />
                  </div>
                  <div>
                    <label className={styles.formLabel}>Description <span className={styles.optionalText}>(optional)</span></label>
                    <input 
                      type="text" 
                      value={newRoleDesc} 
                      onChange={e => setNewRoleDesc(e.target.value)} 
                      className={styles.formInput} 
                      placeholder="What is this role for?"
                    />
                  </div>
                </div>

                <h4 className={styles.modulesTitle}>Access Modules</h4>
                
                <div className={styles.modulesGrid}>
                  {PERMISSION_GROUPS.map((group, idx) => (
                    <div key={idx} className={styles.moduleCard}>
                      <div className={styles.moduleHeader}>
                        <div className={styles.moduleTitle}>{group.category}</div>
                      </div>
                      <div className={styles.moduleBody}>
                        {group.permissions.map(perm => {
                          const isSelected = selectedPermissions.includes(perm.id);
                          return (
                            <div key={perm.id} className={styles.permissionRow}>
                              <Switch
                                id={`perm-${perm.id}`}
                                checked={isSelected}
                                onChange={() => handleTogglePermission(perm.id)}
                                label={perm.label}
                                className={styles.permissionSwitch}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.formFooter}>
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className={styles.saveBtn}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <LuUserCheck size={40} strokeWidth={1.5} />
              </div>
              <h3 className={styles.emptyTitle}>Select a Role to Manage</h3>
              <p className={styles.emptyText}>Choose a role from the left list to view and edit permissions, or create a brand new role.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
