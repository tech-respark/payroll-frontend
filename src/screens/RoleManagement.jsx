import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useRoles, usePermissionModules } from '../hooks/queries';
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
            <h3 className={styles.rolesCardTitle} style={{ marginBottom: 0 }}>Active Security Roles</h3>
            <button 
              className={styles.createBtn}
              onClick={() => {
                setEditingRoleId(null);
                setNewRoleName('');
                setNewRoleDesc('');
                setSelectedPermissions([]);
                setIsModalOpen(true);
              }}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#2563eb" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.roleIconActive}><circle cx="12" cy="12" r="10" fill="#2563eb" stroke="none"></circle><polyline points="8 12 11 15 16 9"></polyline></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.roleIcon}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
                              <label className={styles.toggleSwitch}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  className={styles.toggleInput}
                                />
                                <span className={isSelected ? styles.toggleSliderSelected : styles.toggleSlider}>
                                  <span className={isSelected ? styles.toggleThumbSelected : styles.toggleThumb}></span>
                                </span>
                              </label>
                              <span className={styles.permissionLabel}>{perm.label}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
              <h3 style={{ marginTop: '16px', color: 'var(--text-dark)' }}>Select a Role to Manage</h3>
              <p>Choose a role from the left list to view and edit permissions, or create a brand new role.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
