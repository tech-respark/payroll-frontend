import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';

const StaffDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal'); 
  
  const emptyJoiningDetailsObj = { personnelCode: "", employeeCode: "", reportingTo: "", uanNumber: "", workingHours: 0 };
  const emptyBankAccountDetailsObj = { bankName: '', bankBranch: '', ifscCode: '', accountNumber: '' };
  
  const emptyStaff = {
    firstName: '',
    lastName: '',
    username: '',
    pwd: '',
    email: '',
    mobile: '',
    gender: 'Male',
    active: 1,
    tenantId: tenantId,
    experience: 0,
    displayRank: 0,
    roleId: '',
    birthDate: '',
    enableAppointments: 1,
    allStaffAppointmentDashboard: 1,
    isBiometricIntegration: 1,
    isSyncedWithBiometricDevice: 0,
    weeklyOff: [],
    personnelJoiningDetails: { ...emptyJoiningDetailsObj },
    personnelBankAccountDetails: { ...emptyBankAccountDetailsObj },
    personnelWorkExperienceDetailsList: [],
    personnelDocumentDetailsList: []
  };

  const [formData, setFormData] = useState({ ...emptyStaff });

  useEffect(() => {
    fetchStaff();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, storeId]);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.get(`/personnel/all?tenantId=${tenantId}&storeId=${storeId}`);
      let list = data.data || data || [];
      if (!hasAccess(['VIEW_OTHER_STAFF'])) {
        list = list.filter(s => s.id === user.personnelCode);
      }
      setStaffList(list);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiService.get(`/roles?tenantId=${tenantId}`);
      if (res && res.data) {
        setRolesList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const fetchStaffRole = async (staffId) => {
    try {
      const res = await apiService.get(`/roles/staff/${staffId}`);
      if (res && res.success && res.data) {
        return res.data.id;
      }
    } catch (err) {
      console.error('Failed to fetch staff role', err);
    }
    return '';
  };

  const handleSelectStaff = async (staff) => {
    setIsLoading(true);
    setSelectedStaff(staff);
    const assignedRoleId = await fetchStaffRole(staff.id);
    setFormData({ 
      ...emptyStaff, 
      ...staff, 
      roleId: assignedRoleId || '',
      personnelJoiningDetails: staff.personnelJoiningDetails || { ...emptyJoiningDetailsObj },
      personnelBankAccountDetails: staff.personnelBankAccountDetails || { ...emptyBankAccountDetailsObj },
      personnelWorkExperienceDetailsList: staff.personnelWorkExperienceDetailsList || [],
      personnelDocumentDetailsList: staff.personnelDocumentDetailsList || [],
      weeklyOff: staff.weeklyOff || []
    });
    setIsNew(false);
    setActiveTab('personal');
    setIsLoading(false);
  };

  const handleCreateNew = () => {
    setSelectedStaff(null);
    setFormData({ ...emptyStaff });
    setIsNew(true);
    setActiveTab('personal');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const parsedValue = type === 'checkbox' ? (checked ? 1 : 0) : value;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: parsedValue
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: parsedValue }));
    }
  };

  const handleArrayChange = (arrayName, index, field, value) => {
    setFormData(prev => {
      const newArray = [...prev[arrayName]];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleAddArrayItem = (arrayName, emptyObj) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], emptyObj]
    }));
  };

  const handleRemoveArrayItem = (arrayName, index) => {
    setFormData(prev => {
      const newArray = [...prev[arrayName]];
      newArray.splice(index, 1);
      return { ...prev, [arrayName]: newArray };
    });
  };

  const handleWeeklyOffToggle = (day) => {
    setFormData(prev => {
      const updatedOffs = prev.weeklyOff.includes(day)
        ? prev.weeklyOff.filter(d => d !== day)
        : [...prev.weeklyOff, day];
      return { ...prev, weeklyOff: updatedOffs };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (!formData.roleId) {
        alert("Please select a Role for the staff member.");
        return;
      }
      setIsLoading(true);
      const payload = { ...formData, applicationName: 'RESPARK' };
      if (!payload.id && !payload.pwd) {
         alert("Password is required for new staff");
         setIsLoading(false);
         return;
      }
      if (payload.id) delete payload.pwd;
      
      const savedStaffRes = await apiService.post('/personnelForAttendanceManagement', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      
      const staffId = savedStaffRes.data?.id || formData.id;
      
      if (staffId) {
        await apiService.post('/roles/assign', {
          staffId: parseInt(staffId),
          roleId: parseInt(formData.roleId),
          storeId: storeId,
          tenantId: tenantId
        });
        alert('Staff and Role saved successfully!');
        fetchStaff();
        setIsNew(false);
        if(savedStaffRes.data) {
           setSelectedStaff(savedStaffRes.data);
        }
      } else {
        alert('Staff saved, but could not verify ID to assign role.');
      }
    } catch (err) {
      console.error('Failed to save staff', err);
      alert('Error saving staff');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (first, last) => {
    return `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase() || 'NA';
  };

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto', paddingBottom: '2px' }}>
      {[
        { id: 'personal', label: 'Personal & Access' },
        { id: 'employment', label: 'Joining & Employment' },
        { id: 'banking', label: 'Banking & Documents' },
        { id: 'experience', label: 'Work Experience' }
      ].map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #3f97ef' : '2px solid transparent',
            color: activeTab === tab.id ? '#3f97ef' : '#64748b',
            fontWeight: activeTab === tab.id ? '600' : '500',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="dashboard">
      <h2>Employee Directory</h2>
      <div className="staff-container" style={{ backgroundColor: '#f1f5f9' }}>
        
        {/* Left Sidebar: Staff List */}
        <div className="staff-sidebar" style={{ backgroundColor: '#ffffff', boxShadow: '2px 0 5px rgba(0,0,0,0.02)', zIndex: 1 }}>
          <button onClick={handleCreateNew} className="btn btn-primary" style={{ marginBottom: '10px' }}>+ New Employee</button>
          {isLoading && staffList.length === 0 ? <p style={{ color: '#94a3b8', marginTop: '20px' }}>Loading directory...</p> : (
            <ul className="staff-list">
              {staffList.map((staff) => (
                <li 
                  key={staff.id} 
                  className={selectedStaff?.id === staff.id ? 'active' : ''}
                  onClick={() => handleSelectStaff(staff)}
                >
                  <div className="staff-list-item-content">
                    <div className="sidebar-avatar">
                      {getInitials(staff.firstName, staff.lastName)}
                    </div>
                    <span>{staff.firstName} {staff.lastName}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right Content: 360-Degree Employee Card */}
        <div className="staff-content">
          {(selectedStaff || isNew) ? (
            <form onSubmit={handleSave} className="staff-form payroll-card" style={{ padding: '30px', margin: 0 }}>
              
              {/* Profile Header Card */}
              <div className="profile-header" style={{ marginBottom: '20px' }}>
                <div className="profile-info-group">
                  <div className="profile-avatar">
                    {isNew ? 'NEW' : getInitials(formData.firstName, formData.lastName)}
                  </div>
                  <div className="profile-title-container">
                    <h2 className="profile-name">
                      {isNew ? 'New Employee Profile' : `${formData.firstName} ${formData.lastName}`}
                    </h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                      <span className={`status-pill ${formData.active === 1 ? 'active' : 'inactive'}`}>
                        {formData.active === 1 ? 'Active Employee' : 'Inactive'}
                      </span>
                      {!isNew && <span style={{ color: '#64748b', fontSize: '14px' }}>ID: {formData.id}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {renderTabs()}

              {/* Tab 1: Personal & Access */}
              {activeTab === 'personal' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>Personal Details</h3>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
                    <div className="form-group"><label>Mobile Number *</label><input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Date of Birth</label><input type="date" name="birthDate" value={formData.birthDate ? formData.birthDate.substring(0, 10) : ''} onChange={handleChange} /></div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <h3 style={{ margin: 0, color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>System Access</h3>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group">
                      <label>Assigned Role *</label>
                      <select name="roleId" value={formData.roleId} onChange={handleChange} required style={{ backgroundColor: '#f8fafc', fontWeight: '500' }}>
                        <option value="" disabled>Select a Role</option>
                        {rolesList.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group"><label>Username *</label><input type="text" name="username" value={formData.username} onChange={handleChange} required /></div>
                    <div className="form-group">
                      <label>{isNew ? 'Initial Password *' : 'Update Password (Leave blank to keep current)'}</label>
                      <input type="password" name="pwd" value={formData.pwd} onChange={handleChange} required={isNew} placeholder={isNew ? '' : '••••••••'} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="active" checked={formData.active === 1} onChange={handleChange} />
                      Account Active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="isBiometricIntegration" checked={formData.isBiometricIntegration === 1} onChange={handleChange} />
                      Biometric Integration
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 2: Joining & Employment */}
              {activeTab === 'employment' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>Employment Details</h3>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group"><label>Employee Code</label><input type="text" name="personnelJoiningDetails.employeeCode" value={formData.personnelJoiningDetails.employeeCode} onChange={handleChange} /></div>
                    <div className="form-group"><label>Personnel Code</label><input type="text" name="personnelJoiningDetails.personnelCode" value={formData.personnelJoiningDetails.personnelCode} onChange={handleChange} /></div>
                    <div className="form-group"><label>Reporting Manager ID</label><input type="text" name="personnelJoiningDetails.reportingTo" value={formData.personnelJoiningDetails.reportingTo} onChange={handleChange} /></div>
                    <div className="form-group"><label>UAN Number</label><input type="text" name="personnelJoiningDetails.uanNumber" value={formData.personnelJoiningDetails.uanNumber} onChange={handleChange} /></div>
                    <div className="form-group"><label>Standard Working Hours</label><input type="number" name="personnelJoiningDetails.workingHours" value={formData.personnelJoiningDetails.workingHours} onChange={handleChange} /></div>
                  </div>

                  <h3 style={{ margin: 0, color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>Roster Settings</h3>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="enableAppointments" checked={formData.enableAppointments === 1} onChange={handleChange} />
                      Enable Appointments
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="allStaffAppointmentDashboard" checked={formData.allStaffAppointmentDashboard === 1} onChange={handleChange} />
                      Show in All-Staff Dashboard
                    </label>
                  </div>

                  <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '-8px' }}>Weekly Off Days</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                      <button 
                        key={day} type="button" 
                        onClick={() => handleWeeklyOffToggle(day)}
                        style={{ padding: '8px 16px', borderRadius: '20px', border: formData.weeklyOff.includes(day) ? '1px solid #3f97ef' : '1px solid #cbd5e1', backgroundColor: formData.weeklyOff.includes(day) ? '#eff6ff' : 'white', color: formData.weeklyOff.includes(day) ? '#3f97ef' : '#64748b', cursor: 'pointer', textTransform: 'capitalize', fontWeight: '500', fontSize: '13px' }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Banking & Documents */}
              {activeTab === 'banking' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>Bank Account Details</h3>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group"><label>Bank Name</label><input type="text" name="personnelBankAccountDetails.bankName" value={formData.personnelBankAccountDetails.bankName} onChange={handleChange} /></div>
                    <div className="form-group"><label>Bank Branch</label><input type="text" name="personnelBankAccountDetails.bankBranch" value={formData.personnelBankAccountDetails.bankBranch} onChange={handleChange} /></div>
                    <div className="form-group"><label>Account Number</label><input type="text" name="personnelBankAccountDetails.accountNumber" value={formData.personnelBankAccountDetails.accountNumber} onChange={handleChange} /></div>
                    <div className="form-group"><label>IFSC Code</label><input type="text" name="personnelBankAccountDetails.ifscCode" value={formData.personnelBankAccountDetails.ifscCode} onChange={handleChange} /></div>
                  </div>

                  <h3 style={{ margin: 0, color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Documents
                    <button type="button" onClick={() => handleAddArrayItem('personnelDocumentDetailsList', { documentName: '', documentNumber: '' })} style={{ background: 'none', border: 'none', color: '#3f97ef', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>+ Add Document</button>
                  </h3>
                  
                  {formData.personnelDocumentDetailsList.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No documents added.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {formData.personnelDocumentDetailsList.map((doc, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div className="form-group" style={{ flex: 1, margin: 0 }}><label>Document Name</label><input type="text" value={doc.documentName} onChange={e => handleArrayChange('personnelDocumentDetailsList', idx, 'documentName', e.target.value)} placeholder="e.g. Aadhar Card" /></div>
                          <div className="form-group" style={{ flex: 1, margin: 0 }}><label>Document Number</label><input type="text" value={doc.documentNumber} onChange={e => handleArrayChange('personnelDocumentDetailsList', idx, 'documentNumber', e.target.value)} /></div>
                          <button type="button" onClick={() => handleRemoveArrayItem('personnelDocumentDetailsList', idx)} style={{ marginTop: '26px', background: 'white', border: '1px solid #fecaca', color: '#ef4444', width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Work Experience */}
              {activeTab === 'experience' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Previous Experience
                    <button type="button" onClick={() => handleAddArrayItem('personnelWorkExperienceDetailsList', { companyName: '', designation: '', fromDate: '', toDate: '' })} style={{ background: 'none', border: 'none', color: '#3f97ef', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>+ Add Experience</button>
                  </h3>
                  
                  {formData.personnelWorkExperienceDetailsList.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No past experience added.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {formData.personnelWorkExperienceDetailsList.map((exp, idx) => (
                        <div key={idx} style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0, color: '#334155' }}>Experience #{idx + 1}</h4>
                            <button type="button" onClick={() => handleRemoveArrayItem('personnelWorkExperienceDetailsList', idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '500', fontSize: '13px' }}>Remove</button>
                          </div>
                          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-group" style={{ margin: 0 }}><label>Company Name</label><input type="text" value={exp.companyName} onChange={e => handleArrayChange('personnelWorkExperienceDetailsList', idx, 'companyName', e.target.value)} /></div>
                            <div className="form-group" style={{ margin: 0 }}><label>Designation</label><input type="text" value={exp.designation} onChange={e => handleArrayChange('personnelWorkExperienceDetailsList', idx, 'designation', e.target.value)} /></div>
                            <div className="form-group" style={{ margin: 0 }}><label>From Date</label><input type="date" value={exp.fromDate ? exp.fromDate.substring(0, 10) : ''} onChange={e => handleArrayChange('personnelWorkExperienceDetailsList', idx, 'fromDate', e.target.value)} /></div>
                            <div className="form-group" style={{ margin: 0 }}><label>To Date</label><input type="date" value={exp.toDate ? exp.toDate.substring(0, 10) : ''} onChange={e => handleArrayChange('personnelWorkExperienceDetailsList', idx, 'toDate', e.target.value)} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px', padding: '20px 0 0 0', borderTop: '1px solid #e2e8f0' }}>
                <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: 'auto', padding: '12px 30px' }}>
                  {isLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="placeholder" style={{ flexDirection: 'column', gap: '15px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <p>Select a staff member from the directory to view their profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
