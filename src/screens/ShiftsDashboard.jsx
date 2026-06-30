import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStaffList, useShiftSlots, useStoreSettings } from '../hooks/queries';
import styles from './ShiftsDashboard.module.scss';
import '../styles/main.scss';

const ShiftsDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const canManage = hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'MANAGE_SHIFTS']);
  
  // Tabs: 'settings', 'templates', 'roster'
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);

  // Store Settings Data
  const [storeOpenTime, setStoreOpenTime] = useState('08:00');
  const [storeCloseTime, setStoreCloseTime] = useState('22:00');

  // Templates Data
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [slotName, setSlotName] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('18:00');
  const [slotColor, setSlotColor] = useState('#3f97ef');

  // Roster Data
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignNoOfDays, setAssignNoOfDays] = useState('1');
  const [globalShiftId, setGlobalShiftId] = useState('');
  const [bulkAssignments, setBulkAssignments] = useState({});

  // Break Modal State
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [activeBreakStaffId, setActiveBreakStaffId] = useState(null);
  const [breakStartTime, setBreakStartTime] = useState('13:00');
  const [breakEndTime, setBreakEndTime] = useState('14:00');
  const [breakType, setBreakType] = useState('Lunch');

  const { staffList } = useStaffList();
  const { storeSettings: storeSettingsData } = useStoreSettings();
  const { shiftSlots } = useShiftSlots();

  useEffect(() => {
    if (storeSettingsData && storeSettingsData.length > 0) {
      const s = storeSettingsData[0];
      setStoreOpenTime(s.storeOpenTime || '08:00');
      setStoreCloseTime(s.storeCloseTime || '22:00');
    }
  }, [storeSettingsData]);

  useEffect(() => {
    if (staffList.length > 0) {
      const initialAssignments = {};
      staffList.forEach(staff => {
        initialAssignments[staff.id] = {
          selected: false,
          startTime: '09:00',
          endTime: '18:00',
          isWorking: true,
          breaks: []
        };
      });
      setBulkAssignments(initialAssignments);
    }
  }, [staffList]);

  const generateTimeOptions = () => {
    const times = [];
    let [openH, openM] = storeOpenTime.split(':').map(Number);
    let [closeH, closeM] = storeCloseTime.split(':').map(Number);
    
    let current = new Date(2000, 0, 1, openH, openM);
    let end = new Date(2000, 0, 1, closeH, closeM);

    if (end < current) end.setDate(end.getDate() + 1); 

    while (current <= end) {
      const hh = String(current.getHours()).padStart(2, '0');
      const mm = String(current.getMinutes()).padStart(2, '0');
      times.push(`${hh}:${mm}`);
      current.setMinutes(current.getMinutes() + 30);
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiService.post('/storeSettings', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
      showToast('Store timings saved successfully!', 'success');
    },
    onError: () => {
      showToast('Failed to save store settings.', 'error');
    }
  });

  const handleSaveStoreSettings = (e) => {
    e.preventDefault();
    if (!canManage) return;
    saveSettingsMutation.mutate({ storeOpenTime, storeCloseTime });
  };

  const handleSelectSlot = (slot) => {
    if (slot) {
      setSelectedSlotId(slot.id);
      setSlotName(slot.shiftName);
      setSlotStartTime(slot.startTime);
      setSlotEndTime(slot.endTime);
      setSlotColor(slot.color || '#3f97ef');
    } else {
      setSelectedSlotId(null);
      setSlotName('');
      setSlotStartTime('09:00');
      setSlotEndTime('18:00');
      setSlotColor('#3f97ef');
    }
    
  };

  const saveSlotMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiService.post('/shiftslots', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftSlots'] });
      showToast(selectedSlotId ? 'Shift updated successfully!' : 'Shift created successfully!', 'success');
      if (!selectedSlotId) {
        setSlotName('');
      }
    },
    onError: () => {
      showToast('Failed to create shift slot.', 'error');
    }
  });

  const handleAddShiftSlot = (e) => {
    e.preventDefault();
    if (!canManage) return;
    
    const payload = {
      shiftName: slotName,
      startTime: slotStartTime,
      endTime: slotEndTime,
      color: slotColor,
      tenantId,
      storeId,
      active: true
    };
    if (selectedSlotId) {
      payload.id = selectedSlotId;
    }
    saveSlotMutation.mutate(payload);
  };

  const handleGlobalShiftChange = (e) => {
    const sId = e.target.value;
    setGlobalShiftId(sId);
    
    if (sId) {
      const selectedSlot = shiftSlots.find(s => String(s.id) === String(sId));
      if (selectedSlot) {
        // Apply this shift's times to all currently selected staff
        setBulkAssignments(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(staffId => {
            if (updated[staffId].selected) {
              updated[staffId].startTime = selectedSlot.startTime;
              updated[staffId].endTime = selectedSlot.endTime;
            }
          });
          return updated;
        });
      }
    }
  };

  const handleBulkAssignmentChange = (staffId, field, value) => {
    setBulkAssignments(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: value
      }
    }));
  };

  const handleSelectAllStaff = (e) => {
    const isChecked = e.target.checked;
    setBulkAssignments(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id].selected = isChecked;
      });
      return updated;
    });
  };

  const handleDateShift = (direction) => {
    const current = new Date(assignStartDate);
    current.setDate(current.getDate() + direction);
    setAssignStartDate(current.toISOString().split('T')[0]);
  };

  const generateRosterMutation = useMutation({
    mutationFn: async (payload) => {
      return await apiService.post('/staffshifts', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
    },
    onSuccess: () => {
      showToast('Successfully assigned bulk shifts!', 'success');
      setBulkAssignments(prev => {
        const reset = { ...prev };
        Object.keys(reset).forEach(id => {
          reset[id].selected = false;
        });
        return reset;
      });
      setGlobalShiftId('');
    },
    onError: () => {
      showToast('Failed to assign bulk shifts.', 'error');
    }
  });

  const handleBulkAssignShift = () => {
    if (!assignStartDate) {
      showToast('Please provide a Start Date.', 'error');
      return;
    }

    const selectedStaffIds = Object.keys(bulkAssignments).filter(id => bulkAssignments[id].selected);
    
    if (selectedStaffIds.length === 0) {
      showToast('Please select at least one staff member to assign a shift.', 'error');
      return;
    }

    const currentIsoTime = new Date().toISOString();
    const staffShiftsList = selectedStaffIds.map(staffId => {
      const assignment = bulkAssignments[staffId];
      return {
        createdBy: user.userId || user.staffId || user.id || 1,
        createdOn: currentIsoTime,
        day: new Date(assignStartDate).toLocaleDateString('en-US', { weekday: 'long' }),
        earlyOutTime: '',
        modifiedBy: user.userId || user.staffId || user.id || 1,
        modifiedOn: currentIsoTime,
        onLeave: assignment.isWorking ? 0 : 1,
        shiftDate: new Date(assignStartDate).toISOString(),
        slot: `${assignment.startTime}-${assignment.endTime}`,
        staffBreakTime: assignment.breaks && assignment.breaks.length > 0 ? assignment.breaks.map(b => ({
          slot: `${b.startTime}-${b.endTime}`,
          type: b.type,
          remark: '',
          staffId: parseInt(staffId)
        })) : [],
        staffId: parseInt(staffId),
        storeId: storeId,
        tenantId: tenantId,
        weeklyOff: 0
      };
    });

    generateRosterMutation.mutate({
      createdBy: user.userId || user.staffId || user.id || 1,
      modifiedBy: user.userId || user.staffId || user.id || 1,
      noOfDays: parseInt(assignNoOfDays),
      staffShiftsList: staffShiftsList,
      tenantId: tenantId,
      storeId: storeId,
      startDate: assignStartDate,
      shiftSlotId: ""
    });
  };

  const allSelected = staffList.length > 0 && staffList.every(s => bulkAssignments[s.id]?.selected);

  const openBreakModal = (staffId) => {
    setActiveBreakStaffId(staffId);
    
    // Pre-fill if break exists
    const existingBreaks = bulkAssignments[staffId]?.breaks;
    if (existingBreaks && existingBreaks.length > 0) {
      setBreakStartTime(existingBreaks[0].startTime);
      setBreakEndTime(existingBreaks[0].endTime);
      setBreakType(existingBreaks[0].type);
    } else {
      setBreakStartTime('13:00');
      setBreakEndTime('14:00');
      setBreakType('Lunch');
    }
    
    setBreakModalOpen(true);
  };

  const handleSaveBreak = () => {
    if (activeBreakStaffId) {
      setBulkAssignments(prev => ({
        ...prev,
        [activeBreakStaffId]: {
          ...prev[activeBreakStaffId],
          breaks: [{
            startTime: breakStartTime,
            endTime: breakEndTime,
            type: breakType
          }]
        }
      }));
    }
    setBreakModalOpen(false);
    setActiveBreakStaffId(null);
  };

  const handleClearBreak = () => {
    if (activeBreakStaffId) {
      setBulkAssignments(prev => ({
        ...prev,
        [activeBreakStaffId]: {
          ...prev[activeBreakStaffId],
          breaks: []
        }
      }));
    }
    setBreakModalOpen(false);
    setActiveBreakStaffId(null);
  };

  return (
    <div className={styles.dashboardLayout}>
      <h2 className={styles.title}>Shift and Roster Management</h2>
      
      {/* Internal Tabs */}
      <div className={styles.tabContainer}>
        <button 
          className={activeTab === 'templates' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('templates')}
        >
          Shift Management
        </button>
        <button 
          className={activeTab === 'roster' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('roster')}
        >
          Roster Management
        </button>
        <button 
          className={activeTab === 'settings' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('settings')}
        >
          Store Settings
        </button>
      </div>

      {/* STORE SETTINGS */}
      {activeTab === 'settings' && (
        <div className={styles.settingsLayout}>
          <div className={styles.settingsPanel}>
            <div className={styles.settingsHeader}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <h3>Store Operating Hours</h3>
            </div>
            
            <form onSubmit={handleSaveStoreSettings} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className={styles.settingsBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Opening Time</label>
                    <div className={styles.selectWrapper}>
                      <input 
                        type="time" 
                        value={storeOpenTime} 
                        onChange={(e) => setStoreOpenTime(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Closing Time</label>
                    <div className={styles.selectWrapper}>
                      <input 
                        type="time" 
                        value={storeCloseTime} 
                        onChange={(e) => setStoreCloseTime(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.settingsFooter}>
                {canManage && (
                  <button type="submit" className={styles.saveBtn} disabled={saveSettingsMutation.isPending}>
                    {saveSettingsMutation.isPending ? 'Saving...' : 'SAVE SETTINGS'}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className={styles.infoPanel}>
            <div className={styles.infoHeader}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <h4>About Store Hours</h4>
            </div>
            <p className={styles.infoText}>
              Store operating hours define the boundaries for generating shift times.
            </p>
            <div className={styles.infoBox}>
              <p>
                When assigning shifts, the dropdown times will be restricted to intervals between your configured Opening and Closing times. Ensure these hours encompass your earliest and latest possible shifts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT MANAGEMENT */}
      {activeTab === 'templates' && (
        <div className={styles.shiftLayout}>
          <div className={styles.shiftSidebar}>
            {canManage && (
              <button className={styles.createShiftBtn} onClick={() => handleSelectSlot(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                CREATE NEW SHIFT
              </button>
            )}
            <h3 className={styles.sidebarHeader}>Shift Templates</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {shiftSlots.length === 0 ? <p style={{color: 'var(--text-muted)'}}>No shifts configured yet.</p> : null}
              {shiftSlots.map(slot => (
                <div 
                  key={slot.id} 
                  className={`${styles.shiftCard} ${selectedSlotId === slot.id ? styles.active : ''}`}
                  onClick={() => handleSelectSlot(slot)}
                >
                  <div className={styles.cardHeader}>
                    <h4>{slot.shiftName}</h4>
                  </div>
                  <div className={styles.cardTime}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {slot.startTime} - {slot.endTime}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3>{selectedSlotId ? 'Update Shift' : 'Create New Shift'}</h3>
              <p>Configure the timings and details for a new shift template.</p>
            </div>
            
            <form onSubmit={handleAddShiftSlot} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className={styles.panelBody}>
                <div className={styles.formGroup} style={{ maxWidth: '100%' }}>
                  <label>Shift Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Morning Shift"
                    value={slotName} 
                    onChange={(e) => setSlotName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Start Time</label>
                    <div className={styles.selectWrapper}>
                      <select value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} required>
                        {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                      </select>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.selectIcon}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>End Time</label>
                    <div className={styles.selectWrapper}>
                      <select value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} required>
                        {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                      </select>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.selectIcon}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.panelFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => handleSelectSlot(null)}>
                  CANCEL
                </button>
                {canManage && (
                  <button type="submit" className={styles.saveBtn} disabled={saveSlotMutation.isPending}>
                    {saveSlotMutation.isPending ? 'SAVING...' : 'SAVE SHIFT'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

        {/* TAB 3: ROSTER MANAGEMENT */}
      {activeTab === 'roster' && (
        <div className={styles.rosterContainer}>
          
          <div className={styles.rosterTopBar}>
            <div className={styles.filterGroup}>
              <label>Apply For (Days)</label>
              <input 
                type="number" 
                min="1"
                value={assignNoOfDays} 
                onChange={(e) => setAssignNoOfDays(e.target.value)} 
                className={styles.filterInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label>Use Shift</label>
              <div className={styles.selectWrapper}>
                <select 
                  value={globalShiftId} 
                  onChange={handleGlobalShiftChange}
                >
                  <option value="">Select shift template</option>
                  {shiftSlots.map(s => (
                    <option key={s.id} value={s.id}>{s.shiftName} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.selectIcon}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>

            <div className={styles.dateSelectorGroup} style={{marginLeft: 'auto'}}>
              <label>Select Date</label>
              <div className={styles.dateBox}>
                <button type="button" onClick={() => handleDateShift(-1)} className={styles.arrowBtn}>&lt;</button>
                <button type="button" onClick={() => handleDateShift(0)} className={styles.todayBtn}>TODAY</button>
                <div className={styles.dateText}>
                  {new Date(assignStartDate).toLocaleDateString('en-GB').replace(/\//g, '-')}
                </div>
                <button type="button" onClick={() => handleDateShift(1)} className={styles.tomorrowBtn}>TOMORROW</button>
                <button type="button" onClick={() => handleDateShift(1)} className={styles.arrowBtn}>&gt;</button>
              </div>
            </div>
          </div>

          <div className={styles.rosterTable}>
            <div className={styles.tableHeader}>
              <div className={styles.checkboxHeader} onClick={() => handleSelectAllStaff({ target: { checked: !allSelected } })}>
                <div className={`${styles.checkbox} ${allSelected ? styles.checked : ''}`}>
                  {allSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                </div>
                <span>APPLY TO ALL</span>
              </div>
              <div>Staff Name</div>
              <div>From Time</div>
              <div>To Time</div>
              <div className={styles.center}>Working</div>
              <div className={styles.center}>Action</div>
            </div>

            <div className={styles.tableBody}>
              {staffList.map(staff => {
                const assignData = bulkAssignments[staff.id] || {};
                const isSelected = assignData.selected || false;
                const isWorking = assignData.isWorking ?? true;
                
                return (
                  <div key={staff.id} className={styles.tableRow} style={{ borderColor: isSelected ? 'var(--primary-color)' : 'var(--border-color)' }}>
                    <div className={styles.center}>
                      <div 
                        className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}
                        onClick={() => handleBulkAssignmentChange(staff.id, 'selected', !isSelected)}
                      >
                        {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </div>
                    </div>
                    
                    <div className={styles.staffInfo}>
                      <span className={styles.name}>{staff.firstName} {staff.lastName}</span>
                      <span className={styles.role}>Role Name (TBD)</span>
                    </div>

                    <div className={styles.selectWrapper}>
                      <select 
                        value={assignData.startTime || '09:00'} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'startTime', e.target.value)}
                        className={styles.timeSelect}
                      >
                        {timeOptions.map(t => <option key={`from-${t}`} value={t}>{t}</option>)}
                      </select>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.selectIcon}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    <div className={styles.selectWrapper}>
                      <select 
                        value={assignData.endTime || '18:00'} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'endTime', e.target.value)}
                        className={styles.timeSelect}
                      >
                        {timeOptions.map(t => <option key={`to-${t}`} value={t}>{t}</option>)}
                      </select>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.selectIcon}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    <div className={styles.center} style={{ cursor: 'pointer' }} onClick={() => handleBulkAssignmentChange(staff.id, 'isWorking', !isWorking)}>
                      <div className={isWorking ? styles.statusCircle : styles.statusCircleOff}>
                        {isWorking ? 
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> : 
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        }
                      </div>
                    </div>

                    <div className={styles.center}>
                      <button 
                        type="button" 
                        onClick={() => openBreakModal(staff.id)}
                        className={styles.actionBtn}
                        title={(assignData.breaks && assignData.breaks.length > 0) ? 'Edit Break' : 'Add Break'}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.rosterFooter}>
            <button 
              type="button" 
              className={styles.cancelBtn}
              onClick={() => setActiveTab('templates')}
            >
              CANCEL
            </button>
            <button 
              type="button" 
              className={styles.saveBtn}
              disabled={generateRosterMutation.isPending}
              onClick={handleBulkAssignShift}
            >
              {generateRosterMutation.isPending ? 'SAVING...' : 'SAVE ROSTER'}
            </button>
          </div>
        </div>
      )}

      {/* Break Time Modal */}
      {breakModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.payrollCard} ${styles.modalCard}`}>
            <h3 className={styles.modalTitle}>Configure Break Time</h3>
            
            <div className={styles.modalFormGroup}>
              <label className={styles.rosterLabel}>Break Type</label>
              <select 
                value={breakType} 
                onChange={(e) => setBreakType(e.target.value)}
                className={styles.modalSelect}
              >
                <option value="Lunch">Lunch</option>
                <option value="Tea Break">Tea Break</option>
                <option value="Dinner">Dinner</option>
                <option value="Custom">Custom Break</option>
              </select>
            </div>

            <div className={styles.modalTimeGrid}>
              <div className={styles.modalTimeCol}>
                <label className={styles.rosterLabel}>From Time</label>
                <select 
                  value={breakStartTime} 
                  onChange={(e) => setBreakStartTime(e.target.value)}
                  className={styles.modalSelect}
                >
                  {timeOptions.map(t => <option key={`b-start-${t}`} value={t}>{t}</option>)}
                </select>
              </div>

              <div className={styles.modalTimeCol}>
                <label className={styles.rosterLabel}>To Time</label>
                <select 
                  value={breakEndTime} 
                  onChange={(e) => setBreakEndTime(e.target.value)}
                  className={styles.modalSelect}
                >
                  {timeOptions.map(t => <option key={`b-end-${t}`} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                type="button" 
                className={styles.removeBreakBtn}
                onClick={handleClearBreak}
              >
                Remove Break
              </button>
              
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.modalCancelBtn}
                  onClick={() => { setBreakModalOpen(false); setActiveBreakStaffId(null); }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={styles.modalSaveBtn}
                  onClick={handleSaveBreak}
                >
                  Save Break
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftsDashboard;
