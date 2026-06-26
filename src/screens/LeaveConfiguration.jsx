import React, { useState, useEffect } from 'react';
import styles from './LeaveConfiguration.module.scss';
import { apiService } from '../api/apiService';
import { useStaffList } from '../hooks/queries';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const LeaveConfiguration = () => {
  const [activeTab, setActiveTab] = useState('types');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leavePlans, setLeavePlans] = useState([]);
  
  const { tenantId, storeId } = useAuth();

  // Data Fetching
  const fetchTypes = async () => {
    try {
      const data = await apiService.get(`/admin/leave-plans/leave-types?tenantId=${tenantId}&storeId=${storeId}`);
      setLeaveTypes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await apiService.get(`/admin/leave-plans/plans?tenantId=${tenantId}&storeId=${storeId}`);
      setLeavePlans(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTypes();
    fetchPlans();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Leave Configuration</h1>
        <p>Manage leave categories, policy plans, and staff enrollment.</p>
      </div>

      <div className={styles.tabs}>
        <button 
          className={activeTab === 'types' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('types')}
        >
          Leave Types
        </button>
        <button 
          className={activeTab === 'plans' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('plans')}
        >
          Leave Plans & Rules
        </button>
        <button 
          className={activeTab === 'enrollment' ? styles.activeTab : ''} 
          onClick={() => setActiveTab('enrollment')}
        >
          Staff Enrollment
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'types' && <LeaveTypesTab types={leaveTypes} refresh={fetchTypes} />}
        {activeTab === 'plans' && <LeavePlansTab plans={leavePlans} types={leaveTypes} refresh={fetchPlans} />}
        {activeTab === 'enrollment' && <EnrollmentTab plans={leavePlans} />}
      </div>
    </div>
  );
};

const LeaveTypesTab = ({ types, refresh }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ leaveCode: '', leaveName: '', paid: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, tenantId, storeId };
      await apiService.post('/admin/leave-plans/leave-types', payload);
      showToast("Leave Type created!", 'success');
      setFormData({ leaveCode: '', leaveName: '', paid: true });
      refresh();
    } catch (err) {
      showToast(err.message || "Failed to create Leave Type", 'error');
    }
  };

  return (
    <div className={styles.card}>
      <h2>Create New Leave Type</h2>
      <form onSubmit={handleSubmit} className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>Code (e.g. SL)</label>
          <input required value={formData.leaveCode} onChange={e => setFormData({...formData, leaveCode: e.target.value})} />
        </div>
        <div className={styles.formGroup}>
          <label>Name (e.g. Sick Leave)</label>
          <input required value={formData.leaveName} onChange={e => setFormData({...formData, leaveName: e.target.value})} />
        </div>
        <div className={styles.formGroup}>
          <label>Type</label>
          <select value={formData.paid} onChange={e => setFormData({...formData, paid: e.target.value === 'true'})}>
            <option value="true">Paid Leave</option>
            <option value="false">Unpaid Leave</option>
          </select>
        </div>
        <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className={styles.btnPrimary}>Save Type</button>
        </div>
      </form>

      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {types.map(t => (
            <tr key={t.id}>
              <td><strong>{t.leaveCode}</strong></td>
              <td>{t.leaveName}</td>
              <td>
                <span className={`${styles.badge} ${t.paid ? styles.paid : styles.unpaid}`}>
                  {t.paid ? 'Paid' : 'Unpaid'}
                </span>
              </td>
            </tr>
          ))}
          {types.length === 0 && <tr><td colSpan="3">No Leave Types Found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

const LeavePlansTab = ({ plans, types, refresh }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const [planForm, setPlanForm] = useState({ planName: '', effectiveYear: 2026 });
  const [ruleForm, setRuleForm] = useState({ planId: '', leaveTypeId: '', annualAllotment: 0, maxConsecutiveDays: '', proofRequiredAfterDays: '', allowNegativeBalance: false });

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...planForm, tenantId, storeId };
      await apiService.post('/admin/leave-plans/plans', payload);
      showToast("Plan created!", 'success');
      setPlanForm({ planName: '', effectiveYear: 2026 });
      refresh();
    } catch (err) {
      showToast(err.message || "Failed to create Plan", 'error');
    }
  };

  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/admin/leave-plans/map-rules', ruleForm);
      showToast("Rule mapped successfully!", 'success');
      setRuleForm({ planId: '', leaveTypeId: '', annualAllotment: 0, maxConsecutiveDays: '', proofRequiredAfterDays: '', allowNegativeBalance: false });
    } catch (err) {
      showToast(err.message || "Failed to map rule", 'error');
    }
  };

  return (
    <>
      <div className={styles.card} style={{ marginBottom: '2rem' }}>
        <h2>Create Leave Plan</h2>
        <form onSubmit={handlePlanSubmit} className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Plan Name</label>
            <input required value={planForm.planName} onChange={e => setPlanForm({...planForm, planName: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Effective Year</label>
            <input type="number" required value={planForm.effectiveYear} onChange={e => setPlanForm({...planForm, effectiveYear: parseInt(e.target.value)})} />
          </div>
          <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className={styles.btnPrimary}>Create Plan</button>
          </div>
        </form>

        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Plan Name</th>
              <th>Year</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.planName}</td>
                <td>{p.effectiveYear}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.card}>
        <h2>Map Rules to Plan (e.g. Sandwich Rule)</h2>
        <form onSubmit={handleRuleSubmit} className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Select Plan</label>
            <select required value={ruleForm.planId} onChange={e => setRuleForm({...ruleForm, planId: e.target.value})}>
              <option value="">-- Choose Plan --</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.planName} ({p.effectiveYear})</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Select Leave Type</label>
            <select required value={ruleForm.leaveTypeId} onChange={e => setRuleForm({...ruleForm, leaveTypeId: e.target.value})}>
              <option value="">-- Choose Type --</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.leaveName}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Annual Allotment</label>
            <input type="number" step="0.5" required value={ruleForm.annualAllotment} onChange={e => setRuleForm({...ruleForm, annualAllotment: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Max Consecutive Days (Optional)</label>
            <input type="number" value={ruleForm.maxConsecutiveDays} onChange={e => setRuleForm({...ruleForm, maxConsecutiveDays: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Proof Required After (Days)</label>
            <input type="number" value={ruleForm.proofRequiredAfterDays} onChange={e => setRuleForm({...ruleForm, proofRequiredAfterDays: e.target.value})} />
          </div>
          <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={ruleForm.allowNegativeBalance} onChange={e => setRuleForm({...ruleForm, allowNegativeBalance: e.target.checked})} />
              Allow Negative Balance
            </label>
            <button type="submit" className={styles.btnPrimary} style={{ marginTop: '0.5rem' }}>Map Rule</button>
          </div>
        </form>
      </div>
    </>
  );
};

const EnrollmentTab = ({ plans }) => {
  const { tenantId, storeId } = useAuth();
  const { showToast } = useToast();
  const { staffList = [], isLoading } = useStaffList();
  const [enrollForm, setEnrollForm] = useState({ planId: '', staffId: '' });

  const handleEnroll = async (e) => {
    e.preventDefault();
    try {
      await apiService.post(`/admin/leave-plans/plans/${enrollForm.planId}/assign/${enrollForm.staffId}?tenantId=${tenantId}&storeId=${storeId}`);
      showToast("Staff successfully enrolled in plan!", 'success');
      setEnrollForm({ planId: '', staffId: '' });
    } catch (err) {
      showToast(err.message || "Failed to enroll staff", 'error');
    }
  };

  return (
    <div className={styles.card}>
      <h2>Assign Leave Plan to Staff</h2>
      <form onSubmit={handleEnroll} className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>Select Plan</label>
          <select required value={enrollForm.planId} onChange={e => setEnrollForm({...enrollForm, planId: e.target.value})}>
            <option value="">-- Choose Plan --</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.planName} ({p.effectiveYear})</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Select Staff Member</label>
          <select required value={enrollForm.staffId} onChange={e => setEnrollForm({...enrollForm, staffId: e.target.value})}>
            <option value="">-- Choose Staff --</option>
            {!isLoading && staffList.map(s => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup} style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className={styles.btnPrimary}>Enroll Staff</button>
        </div>
      </form>
    </div>
  );
};

export default LeaveConfiguration;
