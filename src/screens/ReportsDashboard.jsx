import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../hooks/queries';
import { Link } from 'react-router-dom';
import styles from './ReportsDashboard.module.scss';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CircularProgress from '@mui/material/CircularProgress';
import { apiService } from '../api/apiService';
import { useQuery } from '@tanstack/react-query';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getPaginationRowModel,
  flexRender 
} from '@tanstack/react-table';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const ReportsDashboard = () => {
  const { tenantId, token, hasAccess } = useAuth();
  const { storeConfig } = useStoreConfig();
  
  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  const [staffFilter, setStaffFilter] = useState('');
  
  const { 
    data: queryData, 
    isLoading: loading, 
    error: queryError, 
    refetch: fetchReport 
  } = useQuery({
    queryKey: ['staffReports', tenantId, storeConfig?.storeId, fromDate, toDate],
    queryFn: async () => {
      const responseData = await apiService.post('/staff/report/summary', {
        tenantId,
        storeId: storeConfig.storeId,
        fromDateStr: fromDate,
        toDateStr: toDate
      });
      return responseData?.data || [];
    },
    enabled: !!tenantId && !!storeConfig?.storeId
  });

  const reportData = queryData || [];
  const error = queryError ? queryError.message || 'Failed to generate report. Please try again.' : '';

  const [sorting, setSorting] = React.useState([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const filteredData = React.useMemo(() => {
    return reportData.filter(item => {
      if (!staffFilter) return true;
      const searchLower = staffFilter.toLowerCase();
      const nameMatch = item.name?.toLowerCase().includes(searchLower);
      const idMatch = String(item.staff_id || '').includes(searchLower);
      return nameMatch || idMatch;
    });
  }, [reportData, staffFilter]);

  const columns = React.useMemo(() => [
    {
      header: 'Sr. No',
      accessorFn: (row, index) => index + 1,
      id: 'srNo',
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: 'Staff Name',
      cell: info => info.getValue() || '-',
    },
    {
      accessorKey: 'totalHours',
      header: 'Roster Working Hours',
      cell: info => info.getValue() || '0.00',
    },
    {
      accessorKey: 'totalHoursWorkedAsPerBiometric',
      header: 'Biometric Working Hours',
      cell: info => info.getValue() || '0.00',
    },
    {
      accessorKey: 'leaves',
      header: 'Leaves',
      cell: info => {
        const val = info.getValue() || 0;
        return (
          <span className={`${styles.badge} ${val > 0 ? styles.blueBadge : styles.greyBadge}`}>
            {val}
          </span>
        );
      }
    }
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    const headers = [
      'Sr. No', 
      'Staff Name', 
      'Roster Working Hours', 
      'Biometric Working Hours', 
      'Leaves'
    ];

    const rows = filteredData.map((item, index) => [
      index + 1,
      item.name || '-',
      item.totalHours || 0,
      item.totalHoursWorkedAsPerBiometric || 0,
      item.leaves || 0
    ]);

    const csvContent = [
      headers.join(','), 
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Report_${fromDate}_to_${toDate}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.filterCard}>
        
        <div className={styles.filterGroup}>
          <label>From Date</label>
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)} 
            max={toDate}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>To Date</label>
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)} 
            min={fromDate}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Filter Staff</label>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <SearchIcon style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} fontSize="small" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              style={{ paddingLeft: '35px', width: '100%' }}
            />
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.primaryBtn} onClick={fetchReport} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon fontSize="small" />}
            Generate Report
          </button>
          
          <button 
            className={styles.exportBtn} 
            onClick={handleExportCSV} 
            disabled={loading || filteredData.length === 0}
          >
            <FileDownloadIcon fontSize="small" />
            Export to CSV
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                    >
                      <div className={styles.thContent}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ArrowUpwardIcon fontSize="inherit" />,
                          desc: <ArrowDownwardIcon fontSize="inherit" />
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className={styles.emptyCell}>
                    <CircularProgress />
                    <p>Generating report...</p>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className={cell.column.id === 'name' ? styles.nameCol : ''}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className={styles.emptyCell}>
                    <AssessmentIcon />
                    <h3>No Data Found</h3>
                    <p>No attendance records found for the selected date range and filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {filteredData.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.pageLeft}>
              <button 
                onClick={() => table.previousPage()} 
                disabled={!table.getCanPreviousPage()}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <button 
                onClick={() => table.nextPage()} 
                disabled={!table.getCanNextPage()}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
            <div className={styles.pageRight}>
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredData.length)} of {filteredData.length} entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;
