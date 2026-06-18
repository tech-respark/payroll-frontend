import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import '../styles/main.scss';

const RoleManagement = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Categorized Permissions
  const [PERMISSION_GROUPS, setPermissionGroups] = useState([]);

  useEffect(() => {
    fetchRoles();
    fetchPermissionModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, storeId]);

  const fetchPermissionModules = async () => {
    try {
      // tenantId/storeId passed to fetch tenant-specific modules, falls back to 0,0 in backend
      const res = await apiService.get(`/roles/permissions/modules?tenantId=${tenantId}&storeId=${storeId}`);
      if (res.data) {
        // map backend response to frontend expected structure
        const mapped = res.data.map(m => ({
          id: m.id,
          category: m.category,
          icon: <div dangerouslySetInnerHTML={{ __html: m.icon }} />,
          permissions: m.permissions.map(p => ({
            id: p.permissionId,
            label: p.label
          }))
        }));
        setPermissionGroups(mapped);
      }
    } catch (err) {
      console.error('Failed to load permission modules', err);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await apiService.get(`/roles?tenantId=${tenantId}`);
      if (res && res.success) {
        setRoles(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      showToast('Failed to fetch roles', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        fetchRoles();
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
    <div className="dashboard">
      <style>{`
        .role-row:hover { background-color: #f1f5f9; }
        .role-row.active { background-color: #eff6ff; border-left: 3px solid #3f97ef; }
      `}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>Role Management</h2>
        <button 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'max-content', padding: '10px 24px', flexShrink: 0 }}
          onClick={() => {
            setEditingRoleId(null);
            setNewRoleName('');
            setNewRoleDesc('');
            setSelectedPermissions([]);
            setIsModalOpen(true);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Create New Role
        </button>
      </div>

      {/* SPLIT PANEL LAYOUT */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* LEFT: ROLES LIST */}
        <div style={{ flex: '0 0 350px', minWidth: 0 }}>
          <div className="payroll-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '15px' }}>Active Security Roles</h3>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
            ) : roles.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No roles configured.</div>
            ) : (
              <div>
                {roles.map(role => {
                  const perms = role.permissions ? role.permissions.split(',') : [];
                  const isActive = editingRoleId === role.id && isModalOpen;
                  return (
                    <div
                      key={role.id}
                      className={`role-row ${isActive ? 'active' : ''}`}
                      style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        borderLeft: isActive ? '3px solid #3f97ef' : '3px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setNewRoleName(role.name || '');
                        setNewRoleDesc(role.description || '');
                        setSelectedPermissions(perms);
                        setIsModalOpen(true);
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{role.name}</div>
                        {role.description && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{role.description}</div>}
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{perms.length} permission{perms.length !== 1 ? 's' : ''}</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#3f97ef' : '#94a3b8'} strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CREATE / EDIT FORM */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isModalOpen ? (
            <div className="payroll-card" style={{ padding: 0, overflow: 'hidden' }}>
              
              {/* Form Header */}
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' 
              }}>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', color: '#1e293b', fontSize: '16px' }}>
                    {editingRoleId ? `Edit: ${newRoleName}` : 'Create New Role'}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Configure permissions below.</p>
                </div>
                <button 
                  onClick={closeModal}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <form onSubmit={handleCreateRole} style={{ padding: '24px' }}>
                {/* Name & Description row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>Role Name <span style={{color: '#ef4444'}}>*</span></label>
                    <input 
                      type="text" 
                      value={newRoleName} 
                      onChange={e => setNewRoleName(e.target.value)} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                      placeholder="e.g. Store Manager" 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px', display: 'block' }}>Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                    <input 
                      type="text" 
                      value={newRoleDesc} 
                      onChange={e => setNewRoleDesc(e.target.value)} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }} 
                      placeholder="What is this role for?"
                    />
                  </div>
                </div>

                <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>Access Modules</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  {PERMISSION_GROUPS.map((group, idx) => (
                    <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#3f97ef', display: 'flex' }}>{group.icon}</div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{group.category}</div>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {group.permissions.map(perm => {
                          const isSelected = selectedPermissions.includes(perm.id);
                          return (
                            <div key={perm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13px', color: '#475569' }}>{perm.label}</span>
                              <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '21px', flexShrink: 0 }}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                  backgroundColor: isSelected ? '#10b981' : '#e2e8f0',
                                  transition: '.3s', borderRadius: '34px'
                                }}>
                                  <span style={{
                                    position: 'absolute', height: '15px', width: '15px',
                                    left: isSelected ? '20px' : '3px', bottom: '3px',
                                    backgroundColor: 'white', transition: '.3s', borderRadius: '50%',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                  }}></span>
                                </span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                  <button 
                    type="button" 
                    onClick={closeModal}
                    style={{ background: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '9px 20px', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    style={{ background: '#3f97ef', color: 'white', border: 'none', padding: '9px 28px', borderRadius: '6px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: '14px' }}
                  >
                    {loading ? 'Saving...' : (editingRoleId ? 'Save Changes' : 'Create Role')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="payroll-card" style={{ padding: '80px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: '16px' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
              <h3 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '18px' }}>Select a Role to Manage</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', maxWidth: '300px' }}>Choose a role from the left list to view and edit permissions, or create a brand new role.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
