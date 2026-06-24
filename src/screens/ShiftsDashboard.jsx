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
    } else {
      setSelectedSlotId(null);
      setSlotName('');
      setSlotStartTime('09:00');
      setSlotEndTime('18:00');
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
    <div className="dashboard">
      <h2 style={{ marginBottom: '10px' }}>Shift and Roster Management</h2>
      
      {/* Internal Tabs */}
      <div className="tab-switcher" style={{ marginBottom: '40px' }}>
        <button 
          className={`btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => { setActiveTab('templates');  }}
        >
          Shift Management
        </button>
        <button 
          className={`btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => { setActiveTab('roster');  }}
        >
          Roster Management
        </button>
        <button 
          className={`btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings');  }}
        >
          Store Settings
        </button>
      </div>

      <div className="staff-container" style={{ backgroundColor: 'transparent', boxShadow: 'none', height: 'auto', overflow: 'visible', padding: 0 }}>
        
        {/* TAB 1: STORE SETTINGS */}
        {activeTab === 'settings' && (
          <div className={styles.layoutContainer}>
            <div className={`${styles.payrollCard} ${styles.settingsCard}`}>
              <h3 className={styles.settingsTitle}>Store Operating Hours</h3>
              <form onSubmit={handleSaveStoreSettings}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.rosterLabel}>Opening Time</label>
                    <input 
                      type="time" 
                      value={storeOpenTime} 
                      onChange={(e) => setStoreOpenTime(e.target.value)} 
                      required 
                      className={styles.timeInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.rosterLabel}>Closing Time</label>
                    <input 
                      type="time" 
                      value={storeCloseTime} 
                      onChange={(e) => setStoreCloseTime(e.target.value)} 
                      required 
                      className={styles.timeInput}
                    />
                  </div>
                </div>
                <div className={styles.saveContainer}>
                  {canManage && (
                    <button type="submit" className={`btn btn-primary ${styles.saveBtn}`} disabled={saveSettingsMutation.isPending}>
                      {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className={styles.infoCard}>
              <h3 className={styles.infoCardTitle}>About Store Hours</h3>
              <p className={styles.infoCardText}>
                Store operating hours define the boundaries for generating shift times. 
                <br/><br/>
                When assigning shifts, the dropdown times will be restricted to intervals between your configured Opening and Closing times. Ensure these hours encompass your earliest and latest possible shifts.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: SHIFT MANAGEMENT */}
        {activeTab === 'templates' && (
          <div className={styles.layoutContainer}>
            <div className={styles.shiftSidebar}>
              {canManage && (
                <button className={`btn btn-primary ${styles.sidebarBtn}`} onClick={() => handleSelectSlot(null)}>
                  + CREATE NEW SHIFT
                </button>
              )}
              <h3 className={styles.sidebarTitle}>Shift Templates</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {shiftSlots.length === 0 ? <p className={styles.emptySidebarText}>No shifts configured yet.</p> : null}
                {shiftSlots.map(slot => (
                  <div 
                    key={slot.id} 
                    className={`shift-card ${selectedSlotId === slot.id ? 'active' : ''}`}
                    onClick={() => handleSelectSlot(slot)}
                  >
                    <div className="shift-card-title">{slot.shiftName}</div>
                    <div className="shift-card-time">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`${styles.payrollCard} ${styles.formCard}`}>
              <h3 className={styles.settingsTitle}>
                {selectedSlotId ? 'Update Shift Template' : 'Create New Shift'}
              </h3>
              <form onSubmit={handleAddShiftSlot}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroupFull}>
                    <label className={styles.rosterLabel}>Shift Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Morning Shift"
                      value={slotName} 
                      onChange={(e) => setSlotName(e.target.value)} 
                      required 
                      className={styles.formInput}
                      style={{ maxWidth: '400px' }}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.rosterLabel}>Start Time</label>
                    <select value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} required className={styles.formSelect}>
                      {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.rosterLabel}>End Time</label>
                    <select value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} required className={styles.formSelect}>
                      {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className={styles.saveContainer}>
                  {canManage && (
                    <button type="submit" className={`btn btn-primary ${styles.saveBtn}`} disabled={saveSlotMutation.isPending}>
                      {saveSlotMutation.isPending ? 'Saving...' : 'Save Shift'}
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
            
            {/* Global Options Bar */}
            <div className={styles.globalOptionsBar}>
              <div className={styles.rosterFormGroup}>
                <label className={styles.rosterLabel}>Apply For (Days) :</label>
                <input 
                  type="number" 
                  min="1"
                  value={assignNoOfDays} 
                  onChange={(e) => setAssignNoOfDays(e.target.value)} 
                  className={styles.rosterInput}
                />
              </div>

              <div className={styles.rosterFormGroup}>
                <label className={styles.rosterLabel}>Use Shift :</label>
                <select 
                  value={globalShiftId} 
                  onChange={handleGlobalShiftChange}
                  className={styles.rosterSelect}
                >
                  <option value="">Select shift template</option>
                  {shiftSlots.map(s => (
                    <option key={s.id} value={s.id}>{s.shiftName} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>

              <div className={styles.rosterFormGroup}>
                <label className={styles.rosterLabel}>Select Date :</label>
                <div className={styles.dateSelector}>
                  <button type="button" onClick={() => handleDateShift(-1)} className={styles.dateBtn}>&lt;</button>
                  <button type="button" onClick={() => handleDateShift(0)} className={styles.dateBtnToday}>TODAY</button>
                  <div className={styles.dateDisplay}>
                    {new Date(assignStartDate).toLocaleDateString('en-GB').replace(/\//g, '-')}
                  </div>
                  <button type="button" onClick={() => handleDateShift(1)} className={styles.dateBtnNext}>TOMORROW</button>
                  <button type="button" onClick={() => handleDateShift(1)} className={styles.dateBtnNext} style={{ borderLeft: '1px solid #cbd5e1' }}>&gt;</button>
                </div>
              </div>
            </div>

            {/* List Header */}
            <div className={styles.listHeader}>
              <div className={styles.headerCheckbox}>
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={handleSelectAllStaff} 
                  className={styles.headerCheckboxInput}
                />
                <span className={styles.headerCheckboxLabel}>Apply<br/>to All</span>
              </div>
              <div>Staff Name</div>
              <div>From Time</div>
              <div>To Time</div>
              <div className={styles.centerCell}>Is Working</div>
              <div className={styles.centerCell}>Add Break</div>
            </div>

            {/* Staff Rows */}
            <div className={styles.staffRowsContainer}>
              {staffList.map(staff => {
                const assignData = bulkAssignments[staff.id] || {};
                return (
                  <div key={staff.id} className={`${styles.staffRow} ${assignData.selected ? styles.staffRowSelected : ''}`}>
                    <div className={styles.centerCell}>
                      <input 
                        type="checkbox" 
                        checked={assignData.selected || false} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'selected', e.target.checked)}
                        className={styles.staffRowCheckbox}
                      />
                    </div>
                    
                    <div className={styles.staffNameCell}>
                      {staff.firstName} {staff.lastName}
                    </div>

                    <div>
                      <select 
                        value={assignData.startTime || '09:00'} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'startTime', e.target.value)}
                        className={styles.rosterTimeSelect}
                      >
                        {timeOptions.map(t => <option key={`from-${t}`} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <select 
                        value={assignData.endTime || '18:00'} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'endTime', e.target.value)}
                        className={styles.rosterTimeSelect}
                      >
                        {timeOptions.map(t => <option key={`to-${t}`} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className={styles.centerCell}>
                      <input 
                        type="checkbox" 
                        checked={assignData.isWorking ?? true}
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'isWorking', e.target.checked)}
                        className={styles.staffRowCheckbox}
                      />
                    </div>

                    <div className={styles.centerCell}>
                      <button 
                        type="button" 
                        onClick={() => openBreakModal(staff.id)}
                        className={(assignData.breaks && assignData.breaks.length > 0) ? styles.editBreakBtn : styles.addBreakBtn}
                      >
                        {(assignData.breaks && assignData.breaks.length > 0) ? 'Edit Break' : 'Add Break'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className={styles.rosterFooter}>
              <button 
                type="button" 
                className={`btn btn-outline ${styles.rosterCancelBtn}`}
                onClick={() => setActiveTab('templates')}
              >
                Cancel
              </button>
                <button 
                type="button" 
                className={`btn btn-primary ${styles.rosterSaveBtn}`}
                disabled={generateRosterMutation.isPending}
                onClick={handleBulkAssignShift}
              >
                {generateRosterMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
            
          </div>
        )}

      </div>

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
