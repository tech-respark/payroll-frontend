import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import '../styles/main.scss';

const SalaryDashboard = () => {
  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  const canManage = hasAccess(['ROLE_MANAGER', 'ROLE_ADMIN', 'MANAGE_SALARY']);
  const [activeTab, setActiveTab] = useState('fixed');
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchStaffList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, storeId]);

  const fetchStaffList = async () => {
    try {
      const res = await apiService.get(`/personnel/all?tenantId=${tenantId}&storeId=${storeId}`);
      let list = res.data || res || [];
      if (!hasAccess(['VIEW_OTHER_STAFF'])) {
        list = list.filter(s => s.id === user.personnelCode);
      }
      setStaffList(list);
    } catch (err) {
      console.error('Failed to fetch staff', err);
    }
  };

  return (
    <div className="dashboard">
      <h2>Salary Management</h2>
      
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { id: 'fixed', label: 'Configure Fixed Salary' },
          { id: 'variable', label: 'Monthly Variables' }
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

      <div className="tab-content" style={{ padding: 0 }}>
          {activeTab === 'fixed' ? (
            <FixedComponentsTab staffList={staffList} tenantId={tenantId} storeId={storeId} canManage={canManage} user={user} />
          ) : (
            <VariableComponentsTab staffList={staffList} tenantId={tenantId} storeId={storeId} canManage={canManage} user={user} />
          )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// FIXED COMPONENTS TAB
// ---------------------------------------------------------------------------------------------------------------------
const FixedComponentsTab = ({ staffList, tenantId, storeId, canManage, user }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);


  
  const [components, setComponents] = useState([]);

  useEffect(() => {
    if (selectedStaffId) {
      fetchFixedComponents(selectedStaffId);
    } else {
      setComponents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId]);

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaffId) {
      const me = staffList.find(s => s.id === user.personnelCode);
      setSelectedStaffId(me ? me.id : staffList[0].id);
    }
  }, [staffList, selectedStaffId, user.personnelCode]);

  const fetchFixedComponents = async (personnelId) => {
    setLoading(true);
    try {
      const compRes = await apiService.get(`/salaryComponentDefinitions?tenantId=${tenantId}&storeId=${storeId}`);
      const availableComponents = compRes.data || [];
      
      const savedRes = await apiService.get(`/personnelSalaryComponents?personnelCode=${personnelId}`);
      const savedStructure = savedRes.data || { earningsList: [], deductionsList: [] };

      // We need FIXED and FORMULA that are not calculated monthly
      const fixedDefs = availableComponents.filter(c => !c.isCalculatedMonthly);

      const merged = fixedDefs.map(comp => {
        let savedAnnualValue = 0;
        if (comp.componentCategory === 'EARNING' && savedStructure.earningsList) {
          const found = savedStructure.earningsList.find(e => e.componentName === comp.componentName);
          if (found) savedAnnualValue = found.annualValue;
        } else if (comp.componentCategory === 'DEDUCTION' && savedStructure.deductionsList) {
          const found = savedStructure.deductionsList.find(e => e.componentName === comp.componentName);
          if (found) savedAnnualValue = found.annualValue;
        }
        
        let displayMonthly = savedAnnualValue > 0 ? (savedAnnualValue / 12).toFixed(2) : '';
        if (displayMonthly.endsWith('.00')) displayMonthly = Math.round(savedAnnualValue / 12).toString();

        return { ...comp, monthlyValue: displayMonthly };
      });

      setComponents(merged);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch salary data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (index, val) => {
    const newComponents = [...components];
    newComponents[index].monthlyValue = val;
    setComponents(newComponents);
  };

  const handleSave = async () => {
    if (!selectedStaffId) return;
    setSaving(true);

    const earningsList = [];
    const deductionsList = [];

    components.forEach(sc => {
      if (sc.monthlyValue !== '' && sc.monthlyValue !== null) {
        const annualEquivalent = Number(sc.monthlyValue) * 12;
        const item = {
          salaryComponentDefinitionsId: sc.id,
          componentName: sc.componentName,
          componentType: sc.componentType,
          annualValue: annualEquivalent
        };
        if (sc.componentCategory === 'EARNING') earningsList.push(item);
        if (sc.componentCategory === 'DEDUCTION') deductionsList.push(item);
      }
    });

    const payload = {
      tenantId,
      storeId,
      personnelCode: selectedStaffId,
      earningsList,
      deductionsList
    };

    try {
      await apiService.post('/personnelSalaryComponentsCalculation', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      showToast('Fixed components saved successfully!', 'success');
      fetchFixedComponents(selectedStaffId);
    } catch (err) {
      console.error(err);
      showToast('Failed to save fixed components.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="payroll-card">
      <h3 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Configure Employee Fixed Salary</h3>
      



      <div className="filter-bar" style={{ marginBottom: '30px' }}>
        <div className="form-group" style={{ flex: 1, maxWidth: '400px', margin: 0 }}>
          <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Select Staff Member</label>
          {staffList.length === 1 ? (
            <div style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: '500' }}>
              {staffList[0].firstName} {staffList[0].lastName}
            </div>
          ) : (
            <select 
              value={selectedStaffId} 
              onChange={(e) => setSelectedStaffId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
            >
              <option value="">-- Select Staff member --</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedStaffId && (
        <>
          <div className="form-grid">
            {loading ? (
              <div style={{ padding: '20px', color: '#94a3b8' }}>Loading structure...</div>
            ) : components.length === 0 ? (
              <div style={{ padding: '20px', color: '#94a3b8' }}>No fixed components found for this store.</div>
            ) : (
              components.map((comp, idx) => (
                <div key={comp.id} className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{comp.componentName}</span>
                    <span style={{ color: comp.componentCategory === 'EARNING' ? '#10b981' : '#ef4444' }}>
                      {comp.componentCategory}
                    </span>
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    value={comp.monthlyValue || ''}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                    placeholder="Monthly amount"
                    readOnly={!canManage}
                    disabled={!canManage}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      border: '1px solid #e2e8f0', 
                      backgroundColor: !canManage ? '#f1f5f9' : '#ffffff',
                      color: !canManage ? '#94a3b8' : '#334155'
                    }}
                  />
                </div>
              ))
            )}
          </div>
          
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            {canManage && (
              <button 
                className="btn btn-primary" 
                onClick={handleSave} 
                disabled={loading || saving}
                style={{ width: 'auto', padding: '10px 24px', backgroundColor: 'var(--primary-color)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '500', cursor: (loading || saving) ? 'not-allowed' : 'pointer', opacity: (loading || saving) ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Structure'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// VARIABLE COMPONENTS TAB
// ---------------------------------------------------------------------------------------------------------------------
const VariableComponentsTab = ({ staffList, tenantId, storeId, canManage, user }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);


  
  const [components, setComponents] = useState([]);
  const [totals, setTotals] = useState({ earning: 0, deduction: 0, net: 0 });
  const [storeConfig, setStoreConfig] = useState(null);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    fetchStoreConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, storeId]);

  const fetchStoreConfig = async () => {
    try {
      const res = await apiService.get(`/tenantStoreConfig?tenantId=${tenantId}&storeId=${storeId}`);
      if (res.data) {
        setStoreConfig(res.data);
        const recentMonth = res.data.recentSummaryCalculatedMonth || 0;
        
        // In Variables, recentMonth is locked. We should default to recentMonth + 1.
        let defaultMonthIdx = recentMonth; // index is 0-based, so recentMonth (which is 1-12) corresponds to recentMonth index (recentMonth)
        let defaultYr = currentYear;
        
        if (defaultMonthIdx >= 12) {
          defaultMonthIdx = 0;
          defaultYr += 1;
        }
        
        setSelectedMonth(MONTHS[defaultMonthIdx]);
        setSelectedYear(defaultYr);
      }
    } catch (err) {
      console.error('Failed to fetch store config', err);
    }
  };

  useEffect(() => {
    if (selectedStaffId) {
      fetchVariableComponents(selectedStaffId);
    } else {
      setComponents([]);
      setTotals({ earning: 0, deduction: 0, net: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId]);

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaffId) {
      const me = staffList.find(s => s.id === user.personnelCode);
      setSelectedStaffId(me ? me.id : staffList[0].id);
    }
  }, [staffList, selectedStaffId, user.personnelCode]);

  const fetchVariableComponents = async (personnelId) => {
    setLoading(true);
    try {
      const compRes = await apiService.get(`/salaryComponentDefinitions?tenantId=${tenantId}&storeId=${storeId}`);
      const availableComponents = compRes.data || [];
      
      const savedRes = await apiService.get(`/personnelSalaryComponents?personnelCode=${personnelId}`);
      const savedStructure = savedRes.data || { earningsList: [], deductionsList: [] };

      // Filter to only variables (isCalculatedMonthly = true)
      const varDefs = availableComponents.filter(c => c.isCalculatedMonthly);

      const merged = varDefs.map(comp => {
        let savedAnnualValue = 0;
        if (comp.componentCategory === 'EARNING' && savedStructure.earningsList) {
          const found = savedStructure.earningsList.find(e => e.componentName === comp.componentName);
          if (found) savedAnnualValue = found.annualValue;
        } else if (comp.componentCategory === 'DEDUCTION' && savedStructure.deductionsList) {
          const found = savedStructure.deductionsList.find(e => e.componentName === comp.componentName);
          if (found) savedAnnualValue = found.annualValue;
        }
        
        let displayMonthly = savedAnnualValue > 0 ? (savedAnnualValue / 12).toFixed(2) : '';
        if (displayMonthly.endsWith('.00')) displayMonthly = Math.round(savedAnnualValue / 12).toString();

        return { ...comp, monthlyValue: displayMonthly };
      });

      setComponents(merged);
      calculateTotals(savedStructure.earningsList || [], savedStructure.deductionsList || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch variables data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (earnings, deductions) => {
    const totE = earnings.reduce((sum, item) => sum + (item.annualValue / 12), 0);
    const totD = deductions.reduce((sum, item) => sum + (item.annualValue / 12), 0);
    setTotals({ earning: Math.round(totE), deduction: Math.round(totD), net: Math.round(totE - totD) });
  };

  const handleValueChange = (index, val) => {
    const newComponents = [...components];
    newComponents[index].monthlyValue = val;
    setComponents(newComponents);
  };

  const handleSave = async () => {
    if (!selectedStaffId) return;
    setSaving(true);

    // Fetch existing fixed components first so we don't overwrite them
    let fixedEarnings = [];
    let fixedDeductions = [];
    try {
      const savedRes = await apiService.get(`/personnelSalaryComponents?personnelCode=${selectedStaffId}`);
      if (savedRes.data) {
        const compRes = await apiService.get(`/salaryComponentDefinitions?tenantId=${tenantId}&storeId=${storeId}`);
        const availableComponents = compRes.data || [];
        
        const isVar = (name) => {
          const def = availableComponents.find(c => c.componentName === name);
          return def ? def.isCalculatedMonthly : false;
        };

        fixedEarnings = (savedRes.data.earningsList || []).filter(e => !isVar(e.componentName));
        fixedDeductions = (savedRes.data.deductionsList || []).filter(e => !isVar(e.componentName));
      }
    } catch (err) {
      console.error("Failed to fetch existing components", err);
    }

    const newEarningsList = [...fixedEarnings];
    const newDeductionsList = [...fixedDeductions];

    components.forEach(sc => {
      if (sc.monthlyValue !== '' && sc.monthlyValue !== null) {
        const annualEquivalent = Number(sc.monthlyValue) * 12;
        const item = {
          salaryComponentDefinitionsId: sc.id,
          componentName: sc.componentName,
          componentType: sc.componentType,
          annualValue: annualEquivalent
        };
        if (sc.componentCategory === 'EARNING') newEarningsList.push(item);
        if (sc.componentCategory === 'DEDUCTION') newDeductionsList.push(item);
      }
    });

    const payload = {
      tenantId,
      storeId,
      personnelCode: selectedStaffId,
      earningsList: newEarningsList,
      deductionsList: newDeductionsList
    };

    try {
      await apiService.post('/personnelSalaryComponentsCalculation', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      showToast('Monthly variables saved successfully!', 'success');
      fetchVariableComponents(selectedStaffId);
    } catch (err) {
      console.error(err);
      showToast('Failed to save variables.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="payroll-card">
      <div className="filter-bar" style={{ marginBottom: '30px' }}>
        <div className="form-group" style={{ flex: 1, maxWidth: '400px', margin: 0 }}>
          <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Select Staff Member</label>
          {staffList.length === 1 ? (
            <div style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: '500' }}>
              {staffList[0].firstName} {staffList[0].lastName}
            </div>
          ) : (
            <select 
              value={selectedStaffId} 
              onChange={(e) => setSelectedStaffId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
            >
              <option value="">-- Select Staff member --</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>
              ))}
            </select>
          )}
        </div>
        <div className="form-group" style={{ flex: 1, maxWidth: '200px', margin: 0 }}>
          <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Payroll Month</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            {MONTHS.map((m, idx) => {
              const mIndex = idx + 1;
              const recentMonth = storeConfig?.recentSummaryCalculatedMonth || 0;
              let isDisabled = false;
              if (selectedYear < currentYear) isDisabled = true;
              else if (selectedYear === currentYear && mIndex <= recentMonth) isDisabled = true;
              return <option key={m} value={m} disabled={isDisabled}>{m}</option>;
            })}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, maxWidth: '150px', margin: 0 }}>
          <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'block' }}>Payroll Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y} disabled={y < currentYear}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedStaffId && (
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#1e293b' }}>Assign Monthly Variables</h3>
            <div style={{ display: 'flex', gap: '15px', fontSize: '14px', backgroundColor: 'white', padding: '10px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div><span style={{ color: '#64748b' }}>Total Earning: </span><span style={{ fontWeight: '600', color: '#10b981' }}>₹{totals.earning.toLocaleString()}</span></div>
              <div><span style={{ color: '#64748b' }}>Total Deduction: </span><span style={{ fontWeight: '600', color: '#ef4444' }}>₹{totals.deduction.toLocaleString()}</span></div>
              <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '15px' }}><span style={{ color: '#64748b' }}>Net Salary: </span><span style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '16px' }}>₹{totals.net.toLocaleString()}</span></div>
            </div>
          </div>




          <div className="form-grid">
            {loading ? (
              <div style={{ padding: '20px', color: '#94a3b8' }}>Loading variables...</div>
            ) : components.length === 0 ? (
              <div style={{ padding: '20px', color: '#94a3b8' }}>No variable monthly components found for this store.</div>
            ) : (
              components.map((comp, idx) => (
                <div key={comp.id} className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{comp.componentName}</span>
                    <span style={{ color: comp.componentCategory === 'EARNING' ? '#10b981' : '#ef4444' }}>
                      {comp.componentCategory}
                    </span>
                  </label>
                  <input 
                    type="number" 
                    value={comp.monthlyValue || ''}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                    readOnly={!canManage}
                    disabled={!canManage}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '6px', 
                      border: '1px solid #e2e8f0', 
                      backgroundColor: !canManage ? '#f1f5f9' : '#ffffff',
                      color: !canManage ? '#94a3b8' : '#334155'
                    }}
                  />
                </div>
              ))
            )}
          </div>
          
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            {(() => {
              const selMonthIndex = MONTHS.indexOf(selectedMonth) + 1;
              const recentMonth = storeConfig?.recentSummaryCalculatedMonth || 0;
              let isLocked = false;
              if (selectedYear < currentYear) isLocked = true;
              else if (selectedYear === currentYear && selMonthIndex <= recentMonth) isLocked = true;

              return canManage && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSave} 
                    disabled={loading || saving || isLocked}
                    style={{ width: 'auto', padding: '10px 24px', backgroundColor: 'var(--primary-color)', border: 'none', borderRadius: '6px', color: 'white', fontWeight: '500', cursor: (loading || saving || isLocked) ? 'not-allowed' : 'pointer', opacity: (loading || saving || isLocked) ? 0.7 : 1 }}
                  >
                    {saving ? 'Saving...' : 'Save Variables'}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryDashboard;
