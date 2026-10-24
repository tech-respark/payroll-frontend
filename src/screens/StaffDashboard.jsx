import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useStaffList, useRoles } from '../hooks/queries';
import { useSaveStaff } from '../hooks/mutations';
import styles from './StaffDashboard.module.scss';
import { Button, Switch, StaffPicker, ConfirmDialog } from '../components/ui';
import { LuUser } from 'react-icons/lu';
import '../styles/main.scss';

const StaffDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null); 
  


  const emptyJoiningDetailsObj = {
    staffId: "",
    employeeCode: "",
    reportingTo: "",
    uanNumber: "",
    workingHours: 0,
    storeId: storeId,
    payCycle: "MONTHLY",
    employmentType: "SALARIED",
    jobCode: "",
    secondaryJobCode: "",
    secondaryHourlyRate: "",
    overtimeMultiplier: 2,
    esiNumber: "",
    panNumber: "",
    pfNumber: "",
    pfApplicable: true,
    esiApplicable: true,
    ptApplicable: true,
    lwfApplicable: true,
    tdsApplicable: true,
    skipPayroll: false,
  };
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
    assignedRoleName: '',
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

  const { staffList, isLoading: isStaffLoading } = useStaffList();
  const { roles: rolesList } = useRoles();

  const canViewOtherStaff = hasAccess(['VIEW_OTHER_STAFF', 'MANAGE_STAFF']);
  const canManageStaff = hasAccess(['MANAGE_STAFF']);

  useEffect(() => {
    if (!canViewOtherStaff && staffList.length > 0 && !selectedStaff) {
      const me = staffList.find(s => String(s.id) === String(user?.staffId || user?.id));
      if (me) {
        handleSelectStaff(me);
      }
    }
  }, [canViewOtherStaff, staffList, user, selectedStaff]);



  const fetchStaffRole = async (staffId) => {
    try {
      const res = await apiService.get(`/roles/staff/${staffId}`);
      if (res && res.success && res.data) {
        return { id: res.data.id, name: res.data.name || res.data.roleName || '' };
      }
    } catch (err) {
      console.error('Failed to fetch staff role', err);
    }
    return { id: '', name: '' };
  };

  const handleSelectStaff = async (staff) => {
    setSelectedStaff(staff);
    const assignedRole = await fetchStaffRole(staff.id);
    setFormData({ 
      ...emptyStaff, 
      ...staff, 
      roleId: assignedRole.id || '',
      assignedRoleName: assignedRole.name || '',
      personnelJoiningDetails: { ...emptyJoiningDetailsObj, ...(staff.personnelJoiningDetails || {}) },
      personnelBankAccountDetails: staff.personnelBankAccountDetails || { ...emptyBankAccountDetailsObj },
      personnelWorkExperienceDetailsList: staff.personnelWorkExperienceDetailsList || [],
      personnelDocumentDetailsList: staff.personnelDocumentDetailsList || [],
      weeklyOff: staff.weeklyOff || []
    });
    setIsNew(false);
    setActiveTab('personal');
    
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

  const { saveStaff, isSaving } = useSaveStaff({
    onSuccess: (savedData) => {
      const savedStaffId = savedData?.id || formData.id;
      setIsNew(false);
      if (savedData) setSelectedStaff(savedData);
    }
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.roleId) {
      showToast("Please select a Role for the staff member.", "error");
      return;
    }
    const payload = { ...formData, applicationName: 'RESPARK' };
    if (!payload.id && !payload.pwd) {
        showToast("Password is required for new staff", "error");
        return;
    }
    if (payload.id && !payload.pwd) delete payload.pwd;
    
    saveStaff(payload);
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

  const visibleStaff = staffList.filter((staff) => {
    const needle = directoryQuery.trim().toLowerCase();
    if (!needle) return true;
    return `${staff.firstName || ''} ${staff.lastName || ''}`.toLowerCase().includes(needle);
  });

  return (
    <div className={canViewOtherStaff ? styles.page : `${styles.page} ${styles.pageSelf}`}>
    <div className={styles.dashboardLayout}>
      
      {/* Left Sidebar: Staff List - ONLY FOR MANAGERS/ADMINS */}
      {canViewOtherStaff && (
      <div className={styles.directoryPanel}>
        {canManageStaff && (
          <button onClick={handleCreateNew} className={styles.newEmployeeBtn}>
            + New employee
          </button>
        )}
        <input
          type="search"
          className={styles.directorySearch}
          placeholder="Search staff"
          value={directoryQuery}
          onChange={(e) => setDirectoryQuery(e.target.value)}
          aria-label="Search staff directory"
        />
        {isStaffLoading ? <p className={styles.loadingText}>Loading directory…</p> : (
          <ul className={styles.employeeList}>
            {visibleStaff.length === 0 && (
              <li className={styles.emptyDirectory}>
                {staffList.length === 0 ? 'No staff in this store yet.' : 'No staff match that name.'}
              </li>
            )}
            {visibleStaff.map((staff) => (
              <li 
                key={staff.id} 
                className={`${styles.employeeItem} ${selectedStaff?.id === staff.id ? styles.activeItem : ''}`}
                onClick={() => handleSelectStaff(staff)}
              >
                <div className={styles.avatar}>
                  {getInitials(staff.firstName, staff.lastName)}
                </div>
                <div className={styles.employeeInfo}>
                  <span className={styles.employeeName}>{staff.firstName} {staff.lastName}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {/* Right Content: Profile Panel */}
      <div className={`${styles.profilePanel} ${!canViewOtherStaff ? styles.fullWidthProfile : ''}`}>
        {(!selectedStaff && !isNew) ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <LuUser size={40} strokeWidth={1.5} />
            </div>
            <p>Select a staff member from the directory to view their profile.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className={styles.profileContent}>
            {canViewOtherStaff && !canManageStaff && (
              <div className={styles.readOnlyBanner}>You are viewing this profile in read-only mode. Contact HR to request changes.</div>
            )}

            {canViewOtherStaff && (
            <div className={styles.profileHeader}>
              <div className={styles.largeAvatar}>
                {isNew ? 'New' : getInitials(formData.firstName, formData.lastName)}
              </div>
              <div className={styles.headerDetails}>
                <h2 className={styles.profileName}>
                  {isNew ? 'New Employee Profile' : `${formData.firstName} ${formData.lastName}`}
                </h2>
                <div className={styles.statusRow}>
                  <span className={styles.statusBadge}>
                    {formData.active === 1 ? 'Active Employee' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            )}

              {renderTabs()}

              {/* Tab 1: Personal & Access */}
              {activeTab === 'personal' && (
                <fieldset disabled={!canManageStaff} className={styles.tabPanel} style={{ border: 'none' }}>
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
                        {formData.roleId && formData.assignedRoleName
                          && !rolesList.some(role => String(role.id) === String(formData.roleId)) && (
                          <option value={formData.roleId}>{formData.assignedRoleName}</option>
                        )}
                      </select>
                    </div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Username *</label><input type="text" className={styles.formInput} name="username" value={formData.username} onChange={handleChange} required /></div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>{isNew ? 'Initial Password *' : 'Update Password (Leave blank to keep current)'}</label>
                      <input type="password" className={styles.formInput} name="pwd" value={formData.pwd} onChange={handleChange} required={isNew} placeholder={isNew ? '' : '••••••••'} />
                    </div>
                  </div>
                  
                  <Switch
                    row
                    id="staff-active"
                    name="active"
                    label="Active employee"
                    hint="Inactive staff cannot sign in."
                    checked={formData.active === 1}
                    onChange={handleChange}
                  />
                </fieldset>
              )}

              {/* Tab 2: Joining & Employment */}
              {activeTab === 'employment' && (
                <fieldset disabled={!canManageStaff} className={styles.tabPanel} style={{ border: 'none' }}>
                  <h3 className={styles.sectionTitle}>Employment Details</h3>
                  <p className={styles.sectionHint}>These fields decide how often the person is paid, overtime, and statutory deductions on the payslip.</p>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Employee Code</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.employeeCode" value={formData.personnelJoiningDetails.employeeCode} onChange={handleChange} /></div>
                    <StaffPicker
                      label="Reporting manager"
                      staffList={staffList}
                      excludeIds={[formData.id]}
                      value={formData.personnelJoiningDetails.reportingTo || ''}
                      onChange={(id) => setFormData((prev) => ({
                        ...prev,
                        personnelJoiningDetails: { ...prev.personnelJoiningDetails, reportingTo: id },
                      }))}
                      placeholder="Search manager"
                    />
                    <div className={styles.formGroup}><label className={styles.formLabel}>UAN Number</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.uanNumber" value={formData.personnelJoiningDetails.uanNumber} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Standard working hours / day</label><input type="number" min="0" max="24" step="0.5" className={styles.formInput} name="personnelJoiningDetails.workingHours" value={formData.personnelJoiningDetails.workingHours} onChange={handleChange} aria-describedby="working-hours-hint" /><p id="working-hours-hint" className={styles.sectionHint}>Hours in a standard working day. Used for overtime and daily-rate pay, not a weekly total.</p></div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Pay cycle</label>
                      <select className={styles.formSelect} name="personnelJoiningDetails.payCycle" value={formData.personnelJoiningDetails.payCycle || 'MONTHLY'} onChange={handleChange}>
                        <option value="MONTHLY">Monthly</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="DAILY">Daily</option>
                        <option value="HOURLY">Hourly</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Employment type</label>
                      <select className={styles.formSelect} name="personnelJoiningDetails.employmentType" value={formData.personnelJoiningDetails.employmentType || 'SALARIED'} onChange={handleChange}>
                        <option value="SALARIED">Salaried</option>
                        <option value="HOURLY">Hourly</option>
                        <option value="COMMISSION">Commission</option>
                        <option value="DAILY_WAGE">Daily wage</option>
                        <option value="CONSULTANT">Consultant</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Primary job code</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.jobCode" value={formData.personnelJoiningDetails.jobCode || ''} onChange={handleChange} placeholder="Server / Stylist" /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Secondary job code</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.secondaryJobCode" value={formData.personnelJoiningDetails.secondaryJobCode || ''} onChange={handleChange} placeholder="Bartender / Assistant" /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Secondary hourly rate</label><input type="number" className={styles.formInput} name="personnelJoiningDetails.secondaryHourlyRate" value={formData.personnelJoiningDetails.secondaryHourlyRate || ''} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Overtime multiplier</label><input type="number" step="0.1" className={styles.formInput} name="personnelJoiningDetails.overtimeMultiplier" value={formData.personnelJoiningDetails.overtimeMultiplier || 2} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>ESI number</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.esiNumber" value={formData.personnelJoiningDetails.esiNumber || ''} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>PAN</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.panNumber" value={formData.personnelJoiningDetails.panNumber || ''} onChange={handleChange} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>PF number</label><input type="text" className={styles.formInput} name="personnelJoiningDetails.pfNumber" value={formData.personnelJoiningDetails.pfNumber || ''} onChange={handleChange} /></div>
                  </div>
                  <Switch row id="staff-pf" label="PF applicable" hint="Writes PF when store statutory PF is on." checked={formData.personnelJoiningDetails.pfApplicable !== false} onChange={(e) => setFormData((prev) => ({ ...prev, personnelJoiningDetails: { ...prev.personnelJoiningDetails, pfApplicable: e.target.checked } }))} />
                  <Switch row id="staff-esi" label="ESI applicable" hint="Writes ESI when store statutory ESI is on and wages are under the ceiling." checked={formData.personnelJoiningDetails.esiApplicable !== false} onChange={(e) => setFormData((prev) => ({ ...prev, personnelJoiningDetails: { ...prev.personnelJoiningDetails, esiApplicable: e.target.checked } }))} />
                  <Switch row id="staff-pt" label="Professional tax applicable" checked={formData.personnelJoiningDetails.ptApplicable !== false} onChange={(e) => setFormData((prev) => ({ ...prev, personnelJoiningDetails: { ...prev.personnelJoiningDetails, ptApplicable: e.target.checked } }))} />
                  <Switch row id="staff-lwf" label="LWF applicable" checked={formData.personnelJoiningDetails.lwfApplicable !== false} onChange={(e) => setFormData((prev) => ({ ...prev, personnelJoiningDetails: { ...prev.personnelJoiningDetails, lwfApplicable: e.target.checked } }))} />
                  <Switch row id="staff-tds" label="TDS applicable" checked={formData.personnelJoiningDetails.tdsApplicable !== false} onChange={(e) => setFormData((prev) => ({ ...prev, personnelJoiningDetails: { ...prev.personnelJoiningDetails, tdsApplicable: e.target.checked } }))} />
                  <Switch row id="staff-skip" label="Skip payroll" hint="This person is left out of the next pay run until you turn this off." checked={Boolean(formData.personnelJoiningDetails.skipPayroll)} onChange={(e) => setFormData((prev) => ({ ...prev, personnelJoiningDetails: { ...prev.personnelJoiningDetails, skipPayroll: e.target.checked } }))} />

                  <label className={styles.weeklyOffLabel}>Weekly Off Days</label>
                  <div className={styles.weeklyOffGroup}>
                    {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                      <button 
                        key={day} type="button" 
                        onClick={() => handleWeeklyOffToggle(day)}
                        className={formData.weeklyOff.includes(day) ? styles.weeklyOffBtnActive : styles.weeklyOffBtn}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {/* Tab 3: Banking & Documents */}
              {activeTab === 'banking' && (
                <fieldset disabled={!canManageStaff} className={styles.tabPanel} style={{ border: 'none' }}>
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
                          <button type="button" onClick={() => setRemoveTarget({ list: 'personnelDocumentDetailsList', index: idx, label: 'document' })} className={styles.removeBtn}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </fieldset>
              )}

              {/* Tab 4: Work Experience */}
              {activeTab === 'experience' && (
                <fieldset disabled={!canManageStaff} className={styles.tabPanel} style={{ border: 'none' }}>
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
                            <Button type="button" variant="danger" onClick={() => setRemoveTarget({ list: 'personnelWorkExperienceDetailsList', index: idx, label: 'experience' })}>Remove</Button>
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
                </fieldset>
              )}
              


              {canViewOtherStaff && (
              <div className={styles.actionsRow}>
                <Button type="button" variant="outline" onClick={() => {
                  setSelectedStaff(null);
                  setIsNew(false);
                }}>Cancel</Button>
                {canManageStaff && <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Profile'}</Button>}
              </div>
              )}
            </form>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={removeTarget != null}
        title={removeTarget?.label === 'experience' ? 'Remove this experience?' : 'Remove this document?'}
        body="This only removes it from the form until you save the profile."
        confirmLabel="Remove"
        danger
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          handleRemoveArrayItem(removeTarget.list, removeTarget.index);
          setRemoveTarget(null);
        }}
      />
    </div>
  );
};



export default StaffDashboard;
