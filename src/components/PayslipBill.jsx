import React, { useState } from 'react';
import { ToWords } from 'to-words';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BASE_URL } from '../api/apiService';
import styles from './PayslipBill.module.scss';

const PayslipBill = ({ payslipData, payslipMonth, storeConfig }) => {
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

  // Fallbacks if storeConfig isn't fully set up on the backend yet
  const companyName = storeConfig?.companyName || "RESPARK SOLUTIONS";
  const address = storeConfig?.address || "123 Business Park, Tech City, India";
  
  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('jwtToken');
      // Constructing URL using the payroll service API
      const url = `${BASE_URL}/downloadBillPdf?staffId=${data.staffId || data.employeeCode}&month=${payslipMonth}&year=${data.salaryYear}`;
      
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

  return (
    <div className={`payslip-container no-print ${styles.payslipContainer}`}>
      <div className={styles.downloadButtonContainer}>
        <button 
          onClick={handleDownloadPdf}
          disabled={downloading}
          className={`${styles.downloadBtn} ${downloading ? styles.downloadBtnDisabled : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          {downloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

      <div className={styles.wrapper} id="print-area">
        {/* Header */}
        <div className={styles.headerGradient}>
          <div className={styles.brandBox}>
            <h2 className={styles.brandName}>{companyName}</h2>
            <p className={styles.brandAddress}>{address}</p>
          </div>
          <div className={styles.payslipMeta}>
            <h3 className={styles.metaTitle}>Payslip</h3>
            <p className={styles.metaSubtitle}>{payslipMonth} {data.salaryYear}</p>
          </div>
        </div>

        <div className={styles.contentBox}>
          {/* Employee & Attendance Details */}
          <div className={styles.detailsGrid}>
            <div className={styles.detailBlock}>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Employee Name</span> <span className={styles.detailValue}>{data.personnelName || '-'}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Employee ID</span> <span className={styles.detailValue}>{data.employeeCode || data.staffId || '-'}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Designation</span> <span className={styles.detailValue}>{data.designation || '-'}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Department</span> <span className={styles.detailValue}>{data.storeName || '-'}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Bank Name</span> <span className={styles.detailValue}>{data.bankName || '-'}</span></div>
              <div className={styles.detailRowNoBorder}><span className={styles.detailLabel}>Account Number</span> <span className={styles.detailValue}>{data.accountNumber || '-'}</span></div>
            </div>

            <div className={styles.detailBlock}>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Total Days</span> <span className={styles.detailValue}>{data.totalDays || 0}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Working Days</span> <span className={styles.detailValue}>{data.totalWorkingDays || 0}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Paid Leaves</span> <span className={styles.detailValue}>{data.totalHolidays || 0}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Absent Days</span> <span className={styles.detailValue}>{data.absentDays || 0}</span></div>
              <div className={styles.detailRow}><span className={styles.detailLabel}>Penalty Days</span> <span className={styles.detailValue}>{data.penaltyAbsentDays || 0}</span></div>
              <div className={styles.detailRowNoBorder}><span className={styles.detailLabel}>Total Paid Days</span> <span className={styles.detailValueSuccess}>{data.totalPaidDays || 0}</span></div>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className={styles.salaryGrid}>
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>Earnings</div>
              <div>
                {data.earnings && Object.entries(data.earnings).map(([key, value], idx) => (
                  <div className={styles.tableRow} key={idx}>
                    <span className={styles.tableLabel}>{key}</span>
                    <span className={styles.tableValue}>₹{Number(value).toLocaleString()}</span>
                  </div>
                ))}
                {(!data.earnings || Object.keys(data.earnings).length === 0) && (
                  <div className={styles.tableRow}><span className={styles.emptyStateText}>No Earnings</span><span /></div>
                )}
              </div>
              <div className={styles.tableFooter}>
                <span>Gross Earnings</span>
                <span>₹{Number(data.totalEarning || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>Deductions</div>
              <div>
                {data.deductions && Object.entries(data.deductions).map(([key, value], idx) => (
                  <div className={styles.tableRow} key={idx}>
                    <span className={styles.tableLabel}>{key}</span>
                    <span className={styles.tableValue}>₹{Number(value).toLocaleString()}</span>
                  </div>
                ))}
                {(!data.deductions || Object.keys(data.deductions).length === 0) && (
                  <div className={styles.tableRow}><span className={styles.emptyStateText}>No Deductions</span><span /></div>
                )}
              </div>
              <div className={styles.tableFooter}>
                <span>Total Deductions</span>
                <span>₹{Number(data.totalDeduction || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight */}
          <div className={styles.netBox}>
            <div>
              <div className={styles.netTitle}>Net Salary Payable</div>
              <div className={styles.netAmount}>₹{Number(data.salaryAmount || 0).toLocaleString()}</div>
            </div>
            <div className={styles.wordsText}>
              {toWords.convert(data.salaryAmount || 0)}
            </div>
          </div>

          <div className={styles.footerNote}>
            This is a computer-generated payslip and does not require a signature.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipBill;
