import React, { useState } from 'react';
import { ToWords } from 'to-words';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BASE_URL } from '../api/apiService';

const PayslipBill = ({ payslipData, payslipMonth }) => {
  if (!payslipData) return null;
  const data = payslipData.data || payslipData;

  const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
    }
  });

  const { tenantId, storeId, user } = useAuth();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const companyName = "RESPARK SOLUTIONS";
  const address = "123 Business Park, Tech City, India";
  
  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('jwtToken');
      // Constructing URL using the payroll service API
      const url = `${BASE_URL}/downloadBillPdf?personnelId=${data.personnelId || data.employeeCode}&month=${payslipMonth}&year=${data.salaryYear}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Tenantid': String(tenantId),
          'Storeid': String(storeId),
          'Userid': String(user?.id || ''),
          'Username': String(user?.username || ''),
          'RoleId': String(user?.roles?.[0]?.id || '2'),
          'x-allowed-store-ids': `[${storeId}]`,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error('Failed to download PDF');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Payslip_${data.personnelName || 'Employee'}_${payslipMonth}_${data.salaryYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error downloading PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const styles = {
    wrapper: {
      maxWidth: '750px',
      margin: '0 auto',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      fontFamily: '"Inter", sans-serif',
      color: '#334155',
    },
    headerGradient: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      padding: '24px 32px',
      color: '#fff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    brandBox: {
      display: 'flex',
      flexDirection: 'column',
    },
    brandName: {
      margin: 0,
      fontSize: '22px',
      fontWeight: '700',
      letterSpacing: '1px',
      color: '#f8fafc',
    },
    brandAddress: {
      margin: '4px 0 0 0',
      fontSize: '12px',
      color: '#94a3b8',
    },
    payslipMeta: {
      textAlign: 'right',
    },
    metaTitle: {
      fontSize: '16px',
      fontWeight: '600',
      textTransform: 'uppercase',
      color: '#e2e8f0',
      margin: 0,
      letterSpacing: '1px',
    },
    metaSubtitle: {
      fontSize: '12px',
      color: '#94a3b8',
      margin: '4px 0 0 0',
    },
    contentBox: {
      padding: '32px',
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      marginBottom: '32px',
    },
    detailBlock: {
      background: '#f8fafc',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #f1f5f9',
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      paddingBottom: '8px',
      marginBottom: '8px',
      borderBottom: '1px dashed #e2e8f0',
      fontSize: '13px',
    },
    detailLabel: {
      color: '#64748b',
      fontWeight: '500',
    },
    detailValue: {
      fontWeight: '600',
      color: '#1e293b',
      textAlign: 'right',
    },
    salaryGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '24px',
      marginBottom: '32px',
    },
    tableContainer: {
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    tableHeader: {
      background: '#f1f5f9',
      padding: '12px 16px',
      fontSize: '13px',
      fontWeight: '600',
      textTransform: 'uppercase',
      color: '#475569',
      borderBottom: '1px solid #e2e8f0',
    },
    tableRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 16px',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '13px',
    },
    tableLabel: {
      color: '#334155',
    },
    tableValue: {
      fontWeight: '500',
    },
    tableFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#f8fafc',
      fontWeight: '700',
      fontSize: '14px',
      borderTop: '1px solid #e2e8f0',
      color: '#0f172a',
    },
    netBox: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      borderRadius: '8px',
      padding: '20px 24px',
      color: '#fff',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    netTitle: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#d1fae5',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    netAmount: {
      fontSize: '28px',
      fontWeight: '700',
      margin: 0,
    },
    wordsText: {
      fontSize: '13px',
      fontWeight: '500',
      maxWidth: '60%',
      textAlign: 'right',
      lineHeight: '1.4',
    },
    footerNote: {
      textAlign: 'center',
      fontSize: '12px',
      color: '#94a3b8',
      borderTop: '1px dashed #e2e8f0',
      paddingTop: '16px',
    }
  };

  return (
    <div className="payslip-container no-print" style={{ background: 'transparent', boxShadow: 'none', padding: '0 0 40px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '12px' }}>
        <button 
          onClick={handleDownloadPdf}
          disabled={downloading}
          style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '500', cursor: downloading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', opacity: downloading ? 0.7 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

      <div style={styles.wrapper} id="print-area">
        {/* Header */}
        <div style={styles.headerGradient}>
          <div style={styles.brandBox}>
            <h2 style={styles.brandName}>{companyName}</h2>
            <p style={styles.brandAddress}>{address}</p>
          </div>
          <div style={styles.payslipMeta}>
            <h3 style={styles.metaTitle}>Payslip</h3>
            <p style={styles.metaSubtitle}>{payslipMonth} {data.salaryYear}</p>
          </div>
        </div>

        <div style={styles.contentBox}>
          {/* Employee & Attendance Details */}
          <div style={styles.detailsGrid}>
            <div style={styles.detailBlock}>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Employee Name</span> <span style={styles.detailValue}>{data.personnelName || '-'}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Employee ID</span> <span style={styles.detailValue}>{data.employeeCode || data.personnelId || '-'}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Designation</span> <span style={styles.detailValue}>{data.designation || '-'}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Department</span> <span style={styles.detailValue}>{data.storeName || '-'}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Bank Name</span> <span style={styles.detailValue}>{data.bankName || '-'}</span></div>
              <div style={{ ...styles.detailRow, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}><span style={styles.detailLabel}>Account Number</span> <span style={styles.detailValue}>{data.accountNumber || '-'}</span></div>
            </div>

            <div style={styles.detailBlock}>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Total Days</span> <span style={styles.detailValue}>{data.totalDays || 0}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Working Days</span> <span style={styles.detailValue}>{data.totalWorkingDays || 0}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Paid Leaves</span> <span style={styles.detailValue}>{data.totalHolidays || 0}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Absent Days</span> <span style={styles.detailValue}>{data.absentDays || 0}</span></div>
              <div style={styles.detailRow}><span style={styles.detailLabel}>Penalty Days</span> <span style={styles.detailValue}>{data.penaltyAbsentDays || 0}</span></div>
              <div style={{ ...styles.detailRow, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}><span style={styles.detailLabel}>Total Paid Days</span> <span style={{ ...styles.detailValue, color: '#059669' }}>{data.totalPaidDays || 0}</span></div>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div style={styles.salaryGrid}>
            <div style={styles.tableContainer}>
              <div style={styles.tableHeader}>Earnings</div>
              <div>
                {data.earnings && Object.entries(data.earnings).map(([key, value], idx) => (
                  <div style={styles.tableRow} key={idx}>
                    <span style={styles.tableLabel}>{key}</span>
                    <span style={styles.tableValue}>₹{Number(value).toLocaleString()}</span>
                  </div>
                ))}
                {(!data.earnings || Object.keys(data.earnings).length === 0) && (
                  <div style={styles.tableRow}><span style={{ color: '#94a3b8' }}>No Earnings</span><span /></div>
                )}
              </div>
              <div style={styles.tableFooter}>
                <span>Gross Earnings</span>
                <span>₹{Number(data.totalEarning || 0).toLocaleString()}</span>
              </div>
            </div>

            <div style={styles.tableContainer}>
              <div style={styles.tableHeader}>Deductions</div>
              <div>
                {data.deductions && Object.entries(data.deductions).map(([key, value], idx) => (
                  <div style={styles.tableRow} key={idx}>
                    <span style={styles.tableLabel}>{key}</span>
                    <span style={styles.tableValue}>₹{Number(value).toLocaleString()}</span>
                  </div>
                ))}
                {(!data.deductions || Object.keys(data.deductions).length === 0) && (
                  <div style={styles.tableRow}><span style={{ color: '#94a3b8' }}>No Deductions</span><span /></div>
                )}
              </div>
              <div style={styles.tableFooter}>
                <span>Total Deductions</span>
                <span>₹{Number(data.totalDeduction || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight */}
          <div style={styles.netBox}>
            <div>
              <div style={styles.netTitle}>Net Salary Payable</div>
              <div style={styles.netAmount}>₹{Number(data.salaryAmount || 0).toLocaleString()}</div>
            </div>
            <div style={styles.wordsText}>
              {toWords.convert(data.salaryAmount || 0)} Only
            </div>
          </div>

          <div style={styles.footerNote}>
            This is a computer-generated payslip and does not require a signature.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipBill;
