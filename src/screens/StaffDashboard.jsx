import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import styles from './StaffDashboard.module.scss';
import '../styles/main.scss';

const StaffDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
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
        showToast("Please select a Role for the staff member.", "error");
        return;
      }
      setIsLoading(true);
      const payload = { ...formData, applicationName: 'RESPARK' };
      if (!payload.id && !payload.pwd) {
         showToast("Password is required for new staff", "error");
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
        showToast('Staff and Role saved successfully!', 'success');
        fetchStaff();
        setIsNew(false);
        if(savedStaffRes.data) {
           setSelectedStaff(savedStaffRes.data);
        }
      } else {
        showToast('Staff saved, but could not verify ID to assign role.', 'warning');
      }
    } catch (err) {
      console.error('Failed to save staff', err);
      showToast('Error saving staff', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (first, last) => {
    return `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase() || 'NA';
  };

  const renderTabs = () => (
    <div className={styles.tabList}>
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
          className={activeTab === tab.id ? styles.tabItemActive : styles.tabItem}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="dashboard">
      <h2>Employee Directory</h2>
      <div className={`staff-container ${styles.staffContainer}`}>
        
        {/* Left Sidebar: Staff List */}
        <div className={`staff-sidebar ${styles.staffSidebar}`}>
          <button onClick={handleCreateNew} className={`btn btn-primary ${styles.createBtn}`}>+ New Employee</button>
          {isLoading && staffList.length === 0 ? <p className={styles.loadingText}>Loading directory...</p> : (
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
            <form onSubmit={handleSave} className={`staff-form payroll-card ${styles.staffForm}`}>
              
              {/* Profile Header Card */}
              <div className={`profile-header ${styles.profileHeader}`}>
                <div className="profile-info-group">
                  <div className="profile-avatar">
                    {isNew ? 'NEW' : getInitials(formData.firstName, formData.lastName)}
                  </div>
                  <div className="profile-title-container">
                    <h2 className="profile-name">
                      {isNew ? 'New Employee Profile' : `${formData.firstName} ${formData.lastName}`}
                    </h2>
                    <div className={styles.statusGroup}>
                      <span className={`status-pill ${formData.active === 1 ? 'active' : 'inactive'}`}>
                        {formData.active === 1 ? 'Active Employee' : 'Inactive'}
                      </span>
                      {!isNew && <span className={styles.staffId}>ID: {formData.id}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {renderTabs()}

              {/* Tab 1: Personal & Access */}
              {activeTab === 'personal' && (
                <div className={styles.tabPanel}>
                  <h3 className={styles.sectionTitle}>Personal Details</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}><label className={styles.formLabel}>First Name *</label><input type="text" className={styles.formInput} name="firstName" value={formData.firstName} onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Last Name *</label><input type="text" className={styles.formInput} name="lastName" value={formData.lastName} onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Email Address</label><input type="email" className={styles.formInput} name="email" value={formData.email} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Mobile Number *</label><input type="tel" className={styles.formInput} name="mobile" value={formData.mobile} onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Date of Birth</label><input type="date" className={styles.formInput} name="birthDate" value={formData.birthDate ? formData.birthDate.substring(0, 10) : ''} onChange={handleChange} /></div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Gender</label>
                      <select className={styles.formSelect} name="gender" value={formData.gender} onChange={handleChange}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <h3 className={styles.sectionTitleBorder}>System Access</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Assigned Role *</label>
                      <select name="roleId" value={formData.roleId} onChange={handleChange} required className={styles.formSelect}>
                        <option value="" disabled>Select a Role</option>
                        {rolesList.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Username *</label><input type="text" className={styles.formInput} name="username" value={formData.username} onChange={handleChange} required /></div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{isNew ? 'Initial Password *' : 'Update Password (Leave blank to keep current)'}</label>
                      <input type="password" className={styles.formInput} name="pwd" value={formData.pwd} onChange={handleChange} required={isNew} placeholder={isNew ? '' : '••••••••'} />
                    </div>
                  </div>
                  
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" name="active" checked={formData.active === 1} onChange={handleChange} />
                      Account Active
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" name="isBiometricIntegration" checked={formData.isBiometricIntegration === 1} onChange={handleChange} />
                      Biometric Integration
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 2: Joining & Employment */}
              {activeTab === 'employment' && (
                <div className={styles.tabPanel}>
                  <h3 className={styles.sectionTitle}>Employment Details</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Employee Code</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.employeeCode" value={formData.personnelJoiningDetails.employeeCode} onChange={handleChange} /></div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Reporting Manager</label>
                      <select 
                        className={styles.formSelect} 
                        name="personnelJoiningDetails.reportingTo" 
                        value={formData.personnelJoiningDetails.reportingTo || ''} 
                        onChange={handleChange}
                      >
                        <option value="">-- Select Manager --</option>
                        {staffList.filter(s => s.id !== formData.id).map(staff => (
                          <option key={staff.id} value={staff.id}>
                            {staff.firstName} {staff.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>UAN Number</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.uanNumber" value={formData.personnelJoiningDetails.uanNumber} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Standard Working Hours</label><input type="number" className={styles.formInput} name="personnelJoiningDetails.workingHours" value={formData.personnelJoiningDetails.workingHours} onChange={handleChange} /></div>
                  </div>

                  <h3 className={styles.sectionTitleBorder}>Roster Settings</h3>
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" name="enableAppointments" checked={formData.enableAppointments === 1} onChange={handleChange} />
                      Enable Appointments
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" name="allStaffAppointmentDashboard" checked={formData.allStaffAppointmentDashboard === 1} onChange={handleChange} />
                      Show in All-Staff Dashboard
                    </label>
                  </div>

                  <label className={styles.weeklyOffLabel}>Weekly Off Days</label>
                  <div className={styles.weeklyOffGroup}>
                    {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                      <button 
                        key={day} type="button" 
                        onClick={() => handleWeeklyOffToggle(day)}
                        className={formData.weeklyOff.includes(day) ? styles.weeklyOffBtnActive : styles.weeklyOffBtn}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Banking & Documents */}
              {activeTab === 'banking' && (
                <div className={styles.tabPanel}>
                  <h3 className={styles.sectionTitle}>Bank Account Details</h3>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Bank Name</label><input type="text" className={styles.formInput} name="personnelBankAccountDetails.bankName" value={formData.personnelBankAccountDetails.bankName} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Bank Branch</label><input type="text" className={styles.formInput} name="personnelBankAccountDetails.bankBranch" value={formData.personnelBankAccountDetails.bankBranch} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Account Number</label><input type="text" className={styles.formInput} name="personnelBankAccountDetails.accountNumber" value={formData.personnelBankAccountDetails.accountNumber} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>IFSC Code</label><input type="text" className={styles.formInput} name="personnelBankAccountDetails.ifscCode" value={formData.personnelBankAccountDetails.ifscCode} onChange={handleChange} /></div>
                  </div>

                  <h3 className={styles.sectionTitleBorderFlex}>
                    Documents
                    <button type="button" onClick={() => handleAddArrayItem('personnelDocumentDetailsList', { documentName: '', documentNumber: '' })} className={styles.addBtn}>+ Add Document</button>
                  </h3>
                  
                  {formData.personnelDocumentDetailsList.length === 0 ? (
                    <p className={styles.emptyStateText}>No documents added.</p>
                  ) : (
                    <div className={styles.docsContainer}>
                      {formData.personnelDocumentDetailsList.map((doc, idx) => (
                        <div key={idx} className={styles.docRow}>
                          <div className={styles.docFormGroup}><label className={styles.formLabel}>Document Name</label><input type="text" className={styles.formInput} value={doc.documentName} onChange={e => handleArrayChange('personnelDocumentDetailsList', idx, 'documentName', e.target.value)} placeholder="e.g. Aadhar Card" /></div>
                          <div className={styles.docFormGroup}><label className={styles.formLabel}>Document Number</label><input type="text" className={styles.formInput} value={doc.documentNumber} onChange={e => handleArrayChange('personnelDocumentDetailsList', idx, 'documentNumber', e.target.value)} /></div>
                          <button type="button" onClick={() => handleRemoveArrayItem('personnelDocumentDetailsList', idx)} className={styles.removeBtn}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Work Experience */}
              {activeTab === 'experience' && (
                <div className={styles.tabPanel}>
                  <h3 className={styles.sectionTitleBorderFlex} style={{ borderTop: 'none', paddingTop: 0 }}>
                    Previous Experience
                    <button type="button" onClick={() => handleAddArrayItem('personnelWorkExperienceDetailsList', { companyName: '', designation: '', fromDate: '', toDate: '' })} className={styles.addBtn}>+ Add Experience</button>
                  </h3>
                  
                  {formData.personnelWorkExperienceDetailsList.length === 0 ? (
                    <p className={styles.emptyStateText}>No past experience added.</p>
                  ) : (
                    <div className={styles.expContainer}>
                      {formData.personnelWorkExperienceDetailsList.map((exp, idx) => (
                        <div key={idx} className={styles.expRow}>
                          <div className={styles.expHeader}>
                            <h4 className={styles.expTitle}>Experience #{idx + 1}</h4>
                            <button type="button" onClick={() => handleRemoveArrayItem('personnelWorkExperienceDetailsList', idx)} className={styles.removeTextBtn}>Remove</button>
                          </div>
                          <div className={styles.formGrid}>
                            <div className={styles.formGroup}><label className={styles.formLabel}>Company Name</label><input type="text" className={styles.formInput} value={exp.companyName} onChange={e => handleArrayChange('personnelWorkExperienceDetailsList', idx, 'companyName', e.target.value)} /></div>
                            <div className={styles.formGroup}><label className={styles.formLabel}>Designation</label><input type="text" className={styles.formInput} value={exp.designation} onChange={e => handleArrayChange('personnelWorkExperienceDetailsList', idx, 'designation', e.target.value)} /></div>
                            <div className={styles.formGroup}><label className={styles.formLabel}>From Date</label><input type="date" className={styles.formInput} value={exp.fromDate ? exp.fromDate.substring(0, 10) : ''} onChange={e => handleArrayChange('personnelWorkExperienceDetailsList', idx, 'fromDate', e.target.value)} /></div>
                            <div className={styles.formGroup}><label className={styles.formLabel}>To Date</label><input type="date" className={styles.formInput} value={exp.toDate ? exp.toDate.substring(0, 10) : ''} onChange={e => handleArrayChange('personnelWorkExperienceDetailsList', idx, 'toDate', e.target.value)} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions Footer */}
              <div className={styles.footerActions}>
                <button type="submit" className={`btn btn-primary ${styles.saveBtn}`} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className={`placeholder ${styles.placeholderContainer}`}>
              <div className={styles.placeholderIconBox}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <p className={styles.placeholderText}>Select a staff member from the directory to view their profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;

