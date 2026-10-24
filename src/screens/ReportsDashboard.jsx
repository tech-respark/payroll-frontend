import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../hooks/queries';
import { Link } from 'react-router-dom';
import styles from './ReportsDashboard.module.scss';
import {
  LuChartColumn,
  LuDownload,
  LuSearch,
  LuRefreshCw,
  LuArrowUp,
  LuArrowDown,
} from 'react-icons/lu';
import { apiService } from '../api/apiService';
import { toLocalDateKey } from '../helpers/dateUtils';
import { useQuery } from '@tanstack/react-query';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getPaginationRowModel,
  flexRender 
} from '@tanstack/react-table';
const ReportsDashboard = () => {
  const { tenantId, token, hasAccess } = useAuth();
  const { storeConfig } = useStoreConfig();
  
  // Default to current month
  const today = new Date();
  const firstDay = toLocalDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay = toLocalDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));

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
      const rows = Array.isArray(responseData?.data) ? responseData.data : (Array.isArray(responseData) ? responseData : []);
      return rows;
    },
    enabled: !!tenantId && !!storeConfig?.storeId
  });

  const reportData = queryData || [];
  const error = queryError ? queryError.message || 'Failed to generate report. Please try again.' : '';

  const [sorting, setSorting] = React.useState([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const filteredData = React.useMemo(() => {
    return (Array.isArray(reportData) ? reportData : []).filter(item => {
      if (!staffFilter) return true;
      const searchLower = staffFilter.toLowerCase();
      const nameMatch = item.name?.toLowerCase().includes(searchLower);
      const idMatch = String(item.staff_id || '').includes(searchLower);
      return nameMatch || idMatch;
    });
  }, [reportData, staffFilter]);

  const columns = React.useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Staff',
      cell: info => {
        const row = info.row.original;
        const name = info.getValue() || '—';
        const staffId = row.staff_id ?? row.staffId;
        if (!staffId) return name;
        return <Link to={`/reports/detailed?staffId=${staffId}&from=${fromDate}&to=${toDate}`}>{name}</Link>;
      },
    },
    {
      accessorKey: 'totalHours',
      header: 'Hours planned',
      cell: info => info.getValue() || '0.00',
    },
    {
      accessorKey: 'totalHoursWorkedAsPerBiometric',
      header: 'Hours punched',
      cell: info => info.getValue() || '0.00',
    },
    {
      accessorKey: 'leaves',
      header: 'Leave days',
      cell: info => {
        const val = info.getValue() || 0;
        return (
          <span className={`${styles.badge} ${val > 0 ? styles.blueBadge : styles.greyBadge}`}>
            {val}
          </span>
        );
      }
    }
  ], [fromDate, toDate]);

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
      'Staff',
      'Hours planned',
      'Hours punched',
      'Leave days'
    ];

    const rows = filteredData.map((item) => [
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
          <label>From</label>
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)} 
            max={toDate}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>To</label>
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)} 
            min={fromDate}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Staff</label>
          <div className={styles.searchField}>
            <LuSearch size={18} className={styles.searchIcon} aria-hidden="true" />
            <input 
              type="search" 
              placeholder="Search by name" 
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.actionButtons}>
          <button className={styles.primaryBtn} onClick={fetchReport} disabled={loading}>
            {loading ? <span className={styles.inlineSpinner} aria-hidden="true" /> : <LuRefreshCw size={18} />}
            Refresh
          </button>
          
          <button 
            className={styles.exportBtn} 
            onClick={handleExportCSV} 
            disabled={loading || filteredData.length === 0}
          >
            <LuDownload size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner} role="alert">{error}</div>}

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
                          asc: <LuArrowUp size={16} />,
                          desc: <LuArrowDown size={16} />
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
                  <td colSpan="4" className={styles.emptyCell}>
                    <span className={styles.inlineSpinner} aria-hidden="true" />
                    <p>Refreshing…</p>
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
                  <td colSpan="4" className={styles.emptyCell}>
                    <LuChartColumn />
                    <h3>No hours in this range</h3>
                    <p>No planned or punched hours for the selected dates.</p>
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
