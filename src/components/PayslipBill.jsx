import React, { useState } from 'react';
import { LuDownload } from 'react-icons/lu';
import { ToWords } from 'to-words';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BASE_URL } from '../api/apiService';
import { Button } from './ui';
import {
  formatCount,
  formatMoney,
  formatPayPeriod,
  maskAccountNumber,
  titleCase,
} from '../helpers/displayUtils';
import styles from './PayslipBill.module.scss';

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
  },
});

const detail = (label, value) => (
  <div className={styles.detailRow} key={label}>
    <span className={styles.detailLabel}>{label}</span>
    <span className={styles.detailValue}>{value}</span>
  </div>
);

const PayslipBill = ({ payslipData, payslipMonth, storeConfig }) => {
  if (!payslipData) return null;
  const data = payslipData.data || payslipData;

  const { tenantId, storeId, user, hasAccess } = useAuth();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const canExcel = hasAccess(['MANAGE_SALARY']);

  const companyName = storeConfig?.companyName || data.storeName || '';
  const address = storeConfig?.address || '';
  const logoPath = storeConfig?.logoPath || '';
  const monthTitle = `${titleCase(payslipMonth || data.salaryMonth)} ${data.salaryYear || ''}`.trim();
  const period = formatPayPeriod(data.salaryPeriod);
  const earnings = Object.entries(data.earnings || {});
  const deductions = Object.entries(data.deductions || {});
  const account = maskAccountNumber(data.accountNumber);
  const hasBank = Boolean(data.bankName || account);
  const hasIfsc = Boolean(data.ifscCode);
  const hasPan = Boolean(data.panNo);
  const hasUan = Boolean(data.uanNumber);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('jwtToken');
      const url = `${BASE_URL}/downloadBillPdf?staffId=${data.staffId || data.employeeCode}&month=${payslipMonth}&year=${data.salaryYear}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/pdf',
          Tenantid: String(tenantId),
          Storeid: String(storeId),
          Userid: String(user?.staffId || ''),
          Username: String(user?.username || ''),
          RoleId: '2',
          'x-allowed-store-ids': `[${storeId}]`,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('jwtToken');
      const response = await fetch(`${BASE_URL}/excelOfPayslip?tenantId=${tenantId}&storeId=${storeId}&month=${payslipMonth}&year=${data.salaryYear}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!response.ok) throw new Error('Failed to download Excel');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `payslip-data-${payslipMonth}-${data.salaryYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showToast('Excel downloaded.', 'success');
    } catch (err) {
      showToast('Error downloading Excel', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.payslipContainer}>
      <div className={`no-print ${styles.downloadButtonContainer}`}>
        <Button onClick={handleDownloadPdf} disabled={downloading}>
          <LuDownload size={16} aria-hidden="true" />
          {downloading ? 'Downloading…' : 'Download PDF'}
        </Button>
        {canExcel && (
          <Button variant="outline" onClick={handleDownloadExcel} disabled={downloading}>
            Download Excel
          </Button>
        )}
      </div>

      <article className={styles.paper} id="print-area">
        <header className={styles.letterhead}>
          <div className={styles.brand}>
            {logoPath ? (
              <img className={styles.logo} src={logoPath} alt="" />
            ) : null}
            <div>
              <h2 className={styles.company}>{companyName || 'Payslip'}</h2>
              {address ? <p className={styles.address}>{address}</p> : null}
            </div>
          </div>
        </header>

        <div className={styles.titleBlock}>
          <h3 className={styles.title}>Payslip for {monthTitle}</h3>
          <p className={styles.period}>{period}</p>
        </div>

        <div className={styles.detailsGrid}>
          <section>
            <h4 className={styles.sectionLabel}>Employee</h4>
            {detail('Name', data.personnelName || '—')}
            {detail('Employee code', data.employeeCode || data.staffId || '—')}
            {detail('Designation', data.designation || '—')}
            {detail('Location', data.storeName || '—')}
            {hasBank ? detail('Bank', data.bankName || '—') : null}
            {account ? detail('Account', account) : null}
            {hasIfsc ? detail('IFSC', data.ifscCode) : null}
            {hasPan ? detail('PAN', data.panNo) : null}
            {hasUan ? detail('UAN', data.uanNumber) : null}
          </section>
          <section>
            <h4 className={styles.sectionLabel}>Attendance</h4>
            {detail('Calendar days', formatCount(data.totalDays))}
            {detail('Working days', formatCount(data.totalWorkingDays))}
            {detail('Weekly offs', formatCount(data.totalweeklyOff))}
            {detail('Holidays', formatCount(data.totalHolidays))}
            {detail('Paid leave', formatCount(data.totalPaidLeaves))}
            {detail('Absent', formatCount(data.absentDays))}
            {detail('Penalty days', formatCount(data.penaltyAbsentDays))}
            {detail('Paid days', formatCount(data.totalPaidDays))}
          </section>
        </div>

        <table className={styles.lines}>
          <thead>
            <tr>
              <th>Earnings</th>
              <th className={styles.amount}>Amount</th>
              <th>Deductions</th>
              <th className={styles.amount}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(earnings.length, deductions.length, 1) }).map((_, index) => {
              const earning = earnings[index];
              const deduction = deductions[index];
              return (
                <tr key={index}>
                  <td>{earning ? earning[0] : ''}</td>
                  <td className={styles.amount}>{earning ? `₹${formatMoney(earning[1])}` : ''}</td>
                  <td>{deduction ? deduction[0] : ''}</td>
                  <td className={styles.amount}>{deduction ? `₹${formatMoney(deduction[1])}` : ''}</td>
                </tr>
              );
            })}
            <tr className={styles.totals}>
              <td>Gross earnings</td>
              <td className={styles.amount}>₹{formatMoney(data.totalEarning)}</td>
              <td>Total deductions</td>
              <td className={styles.amount}>₹{formatMoney(data.totalDeduction)}</td>
            </tr>
          </tbody>
        </table>

        <div className={styles.net}>
          <div className={styles.netText}>
            <p className={styles.netLabel}>Net payable</p>
            <p className={styles.words}>{toWords.convert(Number(data.salaryAmount || 0))}</p>
          </div>
          <p className={styles.netAmount}>₹{formatMoney(data.salaryAmount)}</p>
        </div>

        <p className={styles.footerNote}>This is a computer-generated payslip and does not require a signature.</p>
      </article>
    </div>
  );
};

export default PayslipBill;
