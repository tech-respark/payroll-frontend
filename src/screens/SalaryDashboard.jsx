import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import { useToast } from '../context/ToastContext';
import styles from './SalaryDashboard.module.scss';
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
      
      <div className={styles.tabList}>
        {[
          { id: 'fixed', label: 'Configure Fixed Salary' },
          { id: 'variable', label: 'Monthly Variables' }
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

      <div className={styles.tabContent}>
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
  const { showToast } = useToast();

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
    <div className={styles.payrollCard}>
      <h3 className={styles.cardTitle}>Configure Employee Fixed Salary</h3>
      
      <div className={styles.filterBar}>
        <div className={styles.formGroupMax400}>
          <label className={styles.formLabel}>Select Staff Member</label>
          {staffList.length === 1 ? (
            <div className={styles.staffReadOnly}>
              {staffList[0].firstName} {staffList[0].lastName}
            </div>
          ) : (
            <select 
              value={selectedStaffId} 
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className={styles.formSelect}
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
          <div className={styles.formGrid}>
            {loading ? (
              <div className={styles.loadingText}>Loading structure...</div>
            ) : components.length === 0 ? (
              <div className={styles.emptyText}>No fixed components found for this store.</div>
            ) : (
              components.map((comp, idx) => (
                <div key={comp.id} className={styles.formGroup}>
                  <label className={styles.formLabelSpaced}>
                    <span>{comp.componentName}</span>
                    <span className={comp.componentCategory === 'EARNING' ? styles.earningLabel : styles.deductionLabel}>
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
                    className={!canManage ? styles.inputReadonly : styles.inputEditable}
                  />
                </div>
              ))
            )}
          </div>
          
          <div className={styles.saveContainer}>
            {canManage && (
              <button 
                className={`${styles.saveBtn} ${loading || saving ? styles.saveBtnDisabled : ''}`} 
                onClick={handleSave} 
                disabled={loading || saving}
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
  const { showToast } = useToast();

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
    <div className={styles.payrollCard}>
      <div className={styles.filterBar}>
        <div className={styles.formGroupMax400}>
          <label className={styles.formLabel}>Select Staff Member</label>
          {staffList.length === 1 ? (
            <div className={styles.staffReadOnly}>
              {staffList[0].firstName} {staffList[0].lastName}
            </div>
          ) : (
            <select 
              value={selectedStaffId} 
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className={styles.formSelect}
            >
              <option value="">-- Select Staff member --</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>
              ))}
            </select>
          )}
        </div>
        <div className={styles.formGroupMax200}>
          <label className={styles.formLabel}>Payroll Month</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={styles.formSelect}>
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
        <div className={styles.formGroupMax150}>
          <label className={styles.formLabel}>Payroll Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={styles.formSelect}>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y} disabled={y < currentYear}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedStaffId && (
        <div className={styles.variableContainer}>
          <div className={styles.variableHeader}>
            <h3 className={styles.variableTitle}>Assign Monthly Variables</h3>
            <div className={styles.totalsBox}>
              <div><span className={styles.totalLabel}>Total Earning: </span><span className={styles.earningValue}>₹{totals.earning.toLocaleString()}</span></div>
              <div><span className={styles.totalLabel}>Total Deduction: </span><span className={styles.deductionValue}>₹{totals.deduction.toLocaleString()}</span></div>
              <div className={styles.netLabel}><span className={styles.totalLabel}>Net Salary: </span><span className={styles.netValue}>₹{totals.net.toLocaleString()}</span></div>
            </div>
          </div>

          <div className={styles.formGrid}>
            {loading ? (
              <div className={styles.loadingText}>Loading variables...</div>
            ) : components.length === 0 ? (
              <div className={styles.emptyText}>No variable monthly components found for this store.</div>
            ) : (
              components.map((comp, idx) => (
                <div key={comp.id} className={styles.formGroup}>
                  <label className={styles.formLabelSpaced}>
                    <span>{comp.componentName}</span>
                    <span className={comp.componentCategory === 'EARNING' ? styles.earningLabel : styles.deductionLabel}>
                      {comp.componentCategory}
                    </span>
                  </label>
                  <input 
                    type="number" 
                    value={comp.monthlyValue || ''}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                    readOnly={!canManage}
                    disabled={!canManage}
                    className={!canManage ? styles.inputReadonly : styles.inputEditable}
                  />
                </div>
              ))
            )}
          </div>
          
          <div className={styles.saveContainer}>
            {(() => {
              const selMonthIndex = MONTHS.indexOf(selectedMonth) + 1;
              const recentMonth = storeConfig?.recentSummaryCalculatedMonth || 0;
              let isLocked = false;
              if (selectedYear < currentYear) isLocked = true;
              else if (selectedYear === currentYear && selMonthIndex <= recentMonth) isLocked = true;

              return canManage && (
                <div className={styles.saveContainerEnd}>
                  <button 
                    className={`${styles.saveBtn} ${loading || saving || isLocked ? styles.saveBtnDisabled : ''}`} 
                    onClick={handleSave} 
                    disabled={loading || saving || isLocked}
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
