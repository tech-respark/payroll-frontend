import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  flexRender 
} from '@tanstack/react-table';
import { CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useStoreConfig } from '../hooks/queries';
import styles from './StaffDetailedReport.module.scss';

const EMPTY_ARRAY = [];

export default function StaffDetailedReport() {
  const { tenantId, user } = useAuth();
  const { storeConfig } = useStoreConfig();

  // Default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // State for date range
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(lastDay);
  
  // State for selected staff, default to logged in user
  const [selectedStaffId, setSelectedStaffId] = useState(user?.id?.toString() || user?.staffId?.toString() || '');
  
  // Search query state for the table
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch lightweight summary just for the dropdown
  const { data: staffSummary = EMPTY_ARRAY } = useQuery({
    queryKey: ['staffSummaryForDropdown', tenantId, storeConfig?.storeId, fromDate, toDate],
    queryFn: async () => {
      if (!tenantId || !storeConfig?.storeId) return [];
      const response = await apiService.post('/staff/report/summary', {
        tenantId,
        storeId: storeConfig.storeId,
        fromDateStr: fromDate,
        toDateStr: toDate
      });
      return response.data.data || response.data || [];
    },
    enabled: !!tenantId && !!storeConfig?.storeId
  });

  // Extract staff list for the dropdown
  const staffOptions = useMemo(() => {
    if (!Array.isArray(staffSummary)) return [];
    return staffSummary.map(staff => ({
      id: staff.staff_id || staff.personnel_code || staff.number, 
      name: staff.name
    })).filter(s => s.id && s.name);
  }, [staffSummary]);

  // Set default selected staff if none is selected (and user object didn't have ID)
  React.useEffect(() => {
    if (staffOptions.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staffOptions[0].id.toString());
    }
  }, [staffOptions, selectedStaffId]);

  // Fetch the detailed report data for the selected staff member only
  const { data: staffShifts = EMPTY_ARRAY, isLoading, isError } = useQuery({
    queryKey: ['staffDetailedReport', tenantId, storeConfig?.storeId, selectedStaffId, fromDate, toDate],
    queryFn: async () => {
      if (!tenantId || !storeConfig?.storeId || !selectedStaffId) return [];
      const response = await apiService.post('/staff/report/detailed', {
        tenantId,
        storeId: storeConfig.storeId,
        staffId: selectedStaffId,
        fromDateStr: fromDate,
        toDateStr: toDate
      });
      return response.data.data || response.data || [];
    },
    enabled: !!tenantId && !!storeConfig?.storeId && !!selectedStaffId
  });

  // Filter shifts based on search query (e.g. search by date)
  const filteredShifts = useMemo(() => {
    if (!searchQuery) return staffShifts;
    const lowerQuery = searchQuery.toLowerCase();
    return staffShifts.filter(shift => 
      shift.date?.toLowerCase().includes(lowerQuery) || 
      shift.slot?.toLowerCase().includes(lowerQuery)
    );
  }, [staffShifts, searchQuery]);

  const columns = useMemo(() => [
    {
      header: 'Sr. No.',
      id: 'srNo',
      cell: info => info.row.index + 1
    },
    {
      header: 'Date',
      accessorKey: 'date',
      cell: info => <span style={{ fontWeight: 500 }}>{info.getValue() || '-'}</span>
    },
    {
      header: 'Shift Time',
      accessorKey: 'slot',
      cell: info => info.getValue() || '-'
    },
    {
      header: 'Check In',
      accessorKey: 'checkIn',
      cell: info => info.getValue() || '-'
    },
    {
      header: 'Check Out',
      accessorKey: 'checkOut',
      cell: info => info.getValue() || '-'
    },
    {
      header: 'Total Worked (Hrs)',
      accessorKey: 'hoursWorkedForADayAsPerBiometric',
      cell: info => {
        const val = info.getValue();
        return val != null ? parseFloat(val).toFixed(2) : '0.00';
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: info => {
        const status = info.getValue();
        if (!status) return '-';
        if (status === 'Leave') return 'On Leave';
        return status;
      }
    }
  ], []);

  const table = useReactTable({
    data: filteredShifts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className={styles.dashboardContainer}>
    
      <div className={styles.filterCard}>
        <div className={styles.filterGroup}>
          <label>From Date</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            max={toDate}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>To Date</label>
          <input 
            type="date" 
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            min={fromDate}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Select Staff Member</label>
          <select 
            value={selectedStaffId}
            onChange={e => setSelectedStaffId(e.target.value)}
            disabled={staffOptions.length === 0}
          >
            <option value="" disabled>Select Staff...</option>
            {staffOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name} ({opt.id})</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Filter Date</label>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <SearchIcon style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} fontSize="small" />
            <input 
              type="text" 
              placeholder="Search by date..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '35px', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {isError && <div style={{ color: 'red', marginBottom: '1rem', fontWeight: 'bold' }}>Failed to load detailed report. Please try again.</div>}

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      <div className={styles.thContent}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className={styles.emptyCell}>
                    <CircularProgress />
                    <p>Loading detailed report...</p>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className={cell.column.id === 'date' ? styles.nameCol : ''}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className={styles.emptyCell}>
                    <AssessmentIcon />
                    <h3>No Data Found</h3>
                    <p>No shift data found for the selected date range and staff.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {table.getRowModel().rows.length > 0 && (
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
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredShifts.length)} of {filteredShifts.length} entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
