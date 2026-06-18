import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import '../styles/main.scss';

const ShiftsDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  
  const canManage = hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'MANAGE_SHIFTS']);
  
  // Tabs: 'settings', 'templates', 'roster'
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);



  // Store Settings Data
  const [storeOpenTime, setStoreOpenTime] = useState('08:00');
  const [storeCloseTime, setStoreCloseTime] = useState('22:00');

  // Templates Data
  const [shiftSlots, setShiftSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [slotName, setSlotName] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('09:00');
  const [slotEndTime, setSlotEndTime] = useState('18:00');

  // Roster Data
  const [staffList, setStaffList] = useState([]);
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

  useEffect(() => {
    fetchStoreSettings();
    fetchShiftSlots();
    fetchStaffList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, storeId]);

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


  const fetchStoreSettings = async () => {
    try {
      const data = await apiService.get(`/storeSettings?tenantId=${tenantId}&storeId=${storeId}`);
      if (data.data) {
        setStoreOpenTime(data.data.storeOpenTime || '08:00');
        setStoreCloseTime(data.data.storeCloseTime || '22:00');
      }
    } catch (err) {
      console.warn('Could not fetch store settings, using defaults.', err);
    }
  };

  const fetchShiftSlots = async () => {
    try {
      const data = await apiService.get(`/shiftslots?tenantId=${tenantId}&storeId=${storeId}`);
      setShiftSlots(data || []);
    } catch (err) {
      console.error('Failed to fetch shift slots', err);
    }
  };

  const fetchStaffList = async () => {
    try {
      const data = await apiService.get(`/personnel/all?tenantId=${tenantId}&storeId=${storeId}`);
      let list = data.data || data || [];
      if (!hasAccess(['VIEW_OTHER_STAFF'])) {
        list = list.filter(s => s.id === user.personnelCode);
      }
      setStaffList(list);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    }
  };

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

  const handleSaveStoreSettings = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await apiService.post('/storeSettings', {
        storeOpenTime,
        storeCloseTime
      }, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId)
      });
      showToast('Store timings saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save store settings.', 'error');
    } finally {
      setLoading(false);
    }
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

  const handleAddShiftSlot = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
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
      await apiService.post('/shiftslots', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      showToast(selectedSlotId ? 'Shift updated successfully!' : 'Shift created successfully!', 'success');
      if (!selectedSlotId) {
        setSlotName('');
      }
      fetchShiftSlots();
    } catch (err) {
      showToast('Failed to create shift slot.', 'error');
    } finally {
      setLoading(false);
    }
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

  const handleBulkAssignShift = async () => {
    
    
    if (!assignStartDate) {
      showToast('Please provide a Start Date.', 'error');
      return;
    }

    const selectedStaffIds = Object.keys(bulkAssignments).filter(id => bulkAssignments[id].selected);
    
    if (selectedStaffIds.length === 0) {
      showToast('Please select at least one staff member to assign a shift.', 'error');
      return;
    }

    setLoading(true);
    try {
      const currentIsoTime = new Date().toISOString();
      const staffShiftsList = selectedStaffIds.map(staffId => {
        const assignment = bulkAssignments[staffId];
        return {
          createdBy: user.userId || user.personnelCode || 1,
          createdOn: currentIsoTime,
          day: new Date(assignStartDate).toLocaleDateString('en-US', { weekday: 'long' }),
          earlyOutTime: '',
          modifiedBy: user.userId || user.personnelCode || 1,
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

      await apiService.post('/staffshifts', {
        createdBy: user.userId || user.personnelCode || 1,
        modifiedBy: user.userId || user.personnelCode || 1,
        noOfDays: parseInt(assignNoOfDays),
        staffShiftsList: staffShiftsList,
        tenantId: tenantId,
        storeId: storeId,
        startDate: assignStartDate,
        shiftSlotId: ""
      }, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      
      showToast(`Successfully assigned shifts to ${selectedStaffIds.length} staff member(s, 'success')!`);
      
      setBulkAssignments(prev => {
        const reset = { ...prev };
        Object.keys(reset).forEach(id => {
          reset[id].selected = false;
        });
        return reset;
      });
      setGlobalShiftId('');
      
    } catch (err) {
      console.error(err);
      showToast('Failed to assign bulk shifts.', 'error');
    } finally {
      setLoading(false);
    }
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

  // Helper styles for the custom table list rows
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '80px 2fr 1.5fr 1.5fr 1fr 1fr',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '10px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  };

  const headerStyle = {
    display: 'grid',
    gridTemplateColumns: '80px 2fr 1.5fr 1.5fr 1fr 1fr',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px 8px 0 0',
    color: '#475569',
    fontWeight: '600',
    fontSize: '14px',
    marginBottom: '10px'
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
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div className="payroll-card" style={{ flex: 1, maxWidth: '800px' }}>
              <h3 style={{ margin: '0 0 24px 0', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>Store Operating Hours</h3>
              <form onSubmit={handleSaveStoreSettings}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label>Opening Time</label>
                    <input 
                      type="time" 
                      value={storeOpenTime} 
                      onChange={(e) => setStoreOpenTime(e.target.value)} 
                      required 
                      style={{ backgroundColor: '#f8fafc' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Closing Time</label>
                    <input 
                      type="time" 
                      value={storeCloseTime} 
                      onChange={(e) => setStoreCloseTime(e.target.value)} 
                      required 
                      style={{ backgroundColor: '#f8fafc' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  {canManage && (
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', padding: '12px 30px' }}>
                      {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="payroll-card" style={{ width: '350px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <h3 style={{ fontSize: '15px', color: '#334155', marginBottom: '12px' }}>About Store Hours</h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                Store operating hours define the boundaries for generating shift times. 
                <br/><br/>
                When assigning shifts, the dropdown times will be restricted to intervals between your configured Opening and Closing times. Ensure these hours encompass your earliest and latest possible shifts.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: SHIFT MANAGEMENT */}
        {activeTab === 'templates' && (
          <div style={{ display: 'flex', gap: '24px', width: '100%', alignItems: 'flex-start' }}>
            <div className="shift-list-sidebar" style={{ borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexShrink: 0 }}>
              {canManage && (
                <button className="btn btn-primary" onClick={() => handleSelectSlot(null)} style={{ width: '100%', marginBottom: '24px' }}>
                  + CREATE NEW SHIFT
                </button>
              )}
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '16px' }}>Shift Templates</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {shiftSlots.length === 0 ? <p style={{color: '#94a3b8', fontSize: '14px'}}>No shifts configured yet.</p> : null}
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
            
            <div className="payroll-card" style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 24px 0', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                {selectedSlotId ? 'Update Shift Template' : 'Create New Shift'}
              </h3>
              <form onSubmit={handleAddShiftSlot}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Shift Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Morning Shift"
                      value={slotName} 
                      onChange={(e) => setSlotName(e.target.value)} 
                      required 
                      style={{ backgroundColor: '#f8fafc', maxWidth: '400px' }}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Start Time</label>
                    <select value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} required style={{ backgroundColor: '#f8fafc' }}>
                      {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <select value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} required style={{ backgroundColor: '#f8fafc' }}>
                      {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  {canManage && (
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', padding: '12px 30px' }}>
                      {loading ? 'Saving...' : 'Save Shift'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: ROSTER MANAGEMENT (IDEAL FULL WIDTH VIEW) */}
        {activeTab === 'roster' && (
          <div style={{ width: '100%', paddingBottom: '40px' }}>
            
            {/* Global Options Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '20px', marginBottom: '24px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Apply For (Days) :</label>
                <input 
                  type="number" 
                  min="1"
                  value={assignNoOfDays} 
                  onChange={(e) => setAssignNoOfDays(e.target.value)} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Use Shift :</label>
                <select 
                  value={globalShiftId} 
                  onChange={handleGlobalShiftChange}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}
                >
                  <option value="">Select shift template</option>
                  {shiftSlots.map(s => (
                    <option key={s.id} value={s.id}>{s.shiftName} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Select Date :</label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                  <button type="button" onClick={() => handleDateShift(-1)} style={{ padding: '10px 16px', background: 'white', border: 'none', borderRight: '1px solid #cbd5e1', color: '#3f97ef', fontWeight: 'bold', cursor: 'pointer' }}>&lt;</button>
                  <button type="button" onClick={() => handleDateShift(0)} style={{ padding: '10px 16px', background: 'white', border: 'none', borderRight: '1px solid #cbd5e1', color: '#3f97ef', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>TODAY</button>
                  <div style={{ padding: '10px 16px', flex: 1, textAlign: 'center', fontWeight: '600', borderRight: '1px solid #cbd5e1', fontSize: '14px' }}>
                    {new Date(assignStartDate).toLocaleDateString('en-GB').replace(/\//g, '-')}
                  </div>
                  <button type="button" onClick={() => handleDateShift(1)} style={{ padding: '10px 16px', background: 'white', border: 'none', borderRight: '1px solid #cbd5e1', color: '#3f97ef', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>TOMORROW</button>
                  <button type="button" onClick={() => handleDateShift(1)} style={{ padding: '10px 16px', background: 'white', border: 'none', color: '#3f97ef', fontWeight: 'bold', cursor: 'pointer' }}>&gt;</button>
                </div>
              </div>
            </div>

            {/* List Header */}
            <div style={headerStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: 'column' }}>
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={handleSelectAllStaff} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '11px', textAlign: 'center', lineHeight: '1.2' }}>Apply<br/>to All</span>
              </div>
              <div>Staff Name</div>
              <div>From Time</div>
              <div>To Time</div>
              <div style={{ textAlign: 'center' }}>Is Working</div>
              <div style={{ textAlign: 'center' }}>Add Break</div>
            </div>

            {/* Staff Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {staffList.map(staff => {
                const assignData = bulkAssignments[staff.id] || {};
                return (
                  <div key={staff.id} style={{ ...rowStyle, border: assignData.selected ? '1px solid #3f97ef' : '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={assignData.selected || false} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'selected', e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3f97ef' }}
                      />
                    </div>
                    
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>
                      {staff.firstName} {staff.lastName}
                    </div>

                    <div>
                      <select 
                        value={assignData.startTime || '09:00'} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'startTime', e.target.value)}
                        style={{ width: '80%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155' }}
                      >
                        {timeOptions.map(t => <option key={`from-${t}`} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <select 
                        value={assignData.endTime || '18:00'} 
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'endTime', e.target.value)}
                        style={{ width: '80%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155' }}
                      >
                        {timeOptions.map(t => <option key={`to-${t}`} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={assignData.isWorking ?? true}
                        onChange={(e) => handleBulkAssignmentChange(staff.id, 'isWorking', e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3f97ef' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button 
                        type="button" 
                        onClick={() => openBreakModal(staff.id)}
                        style={{ 
                          background: (assignData.breaks && assignData.breaks.length > 0) ? '#eff6ff' : 'white', 
                          border: (assignData.breaks && assignData.breaks.length > 0) ? '1px solid #3f97ef' : '1px solid #cbd5e1', 
                          padding: '8px 16px', 
                          borderRadius: '6px', 
                          fontSize: '13px', 
                          fontWeight: '600', 
                          color: (assignData.breaks && assignData.breaks.length > 0) ? '#3f97ef' : '#475569', 
                          cursor: 'pointer' 
                        }}
                      >
                        {(assignData.breaks && assignData.breaks.length > 0) ? 'Edit Break' : 'Add Break'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
              <button 
                type="button" 
                className="btn btn-outline"
                style={{ padding: '10px 24px', width: 'auto' }}
                onClick={() => setActiveTab('templates')}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                disabled={loading}
                onClick={handleBulkAssignShift}
                style={{ padding: '10px 32px', width: 'auto' }}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
            
          </div>
        )}

      </div>

      {/* Break Time Modal */}
      {breakModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="payroll-card" style={{ width: '400px', padding: '30px', animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Configure Break Time</h3>
            
            <div className="form-group">
              <label>Break Type</label>
              <select 
                value={breakType} 
                onChange={(e) => setBreakType(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="Lunch">Lunch</option>
                <option value="Tea Break">Tea Break</option>
                <option value="Dinner">Dinner</option>
                <option value="Custom">Custom Break</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>From Time</label>
                <select 
                  value={breakStartTime} 
                  onChange={(e) => setBreakStartTime(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {timeOptions.map(t => <option key={`b-start-${t}`} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>To Time</label>
                <select 
                  value={breakEndTime} 
                  onChange={(e) => setBreakEndTime(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  {timeOptions.map(t => <option key={`b-end-${t}`} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '16px' }}>
              <button 
                type="button" 
                style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', width: 'auto', height: 'fit-content' }}
                onClick={handleClearBreak}
              >
                Remove Break
              </button>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  style={{ backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', width: 'auto', height: 'fit-content' }}
                  onClick={() => { setBreakModalOpen(false); setActiveBreakStaffId(null); }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  style={{ backgroundColor: '#3f97ef', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', width: 'auto', height: 'fit-content', boxShadow: '0 2px 4px rgba(63, 151, 239, 0.2)' }}
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
