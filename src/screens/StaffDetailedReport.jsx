import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  flexRender 
} from '@tanstack/react-table';
import { LuSearch, LuChartColumn } from 'react-icons/lu';
import { apiService } from '../api/apiService';
import { toLocalDateKey } from '../helpers/dateUtils';
import { formatDisplayDate, formatClock, formatSlot, prettyStatus } from '../helpers/displayUtils';
import { useAuth } from '../context/AuthContext';
import { useStaffList, useStoreConfig } from '../hooks/queries';
import { Badge, StaffPicker } from '../components/ui';
import styles from './StaffDetailedReport.module.scss';

const EMPTY_ARRAY = [];

const statusVariant = (status) => {
  const key = String(status || '').toLowerCase();
  if (key.includes('present') || key === 'p') return 'success';
  if (key.includes('leave') || key === 'l') return 'info';
  if (key.includes('holiday') || key.includes('off') || key === 'wo' || key === 'ph') return 'warning';
  if (key.includes('absent') || key === 'a') return 'danger';
  return 'default';
};

export default function StaffDetailedReport() {
  const { tenantId, user } = useAuth();
  const { storeConfig } = useStoreConfig();
  const { staffList, isLoading: staffLoading } = useStaffList();

  const today = new Date();
  const firstDay = toLocalDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay = toLocalDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const searchParams = new URLSearchParams(window.location.search);
  const queryStaffId = searchParams.get('staffId');
  const [fromDate, setFromDate] = useState(searchParams.get('from') || firstDay);
  const [toDate, setToDate] = useState(searchParams.get('to') || lastDay);
  const [selectedStaffId, setSelectedStaffId] = useState(queryStaffId || user?.staffId?.toString() || '');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaffId) {
      setSelectedStaffId(String(staffList[0].id));
    }
  }, [staffList, selectedStaffId]);

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
      const rows = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      return rows;
    },
    enabled: !!tenantId && !!storeConfig?.storeId && !!selectedStaffId
  });

  // Filter shifts based on search query (e.g. search by date)
  const filteredShifts = useMemo(() => {
    if (!searchQuery) return staffShifts;
    const lowerQuery = searchQuery.toLowerCase();
    return staffShifts.filter(shift => 
      shift.date?.toLowerCase().includes(lowerQuery) ||
      formatDisplayDate(shift.date).toLowerCase().includes(lowerQuery) ||
      shift.slot?.toLowerCase().includes(lowerQuery)
    );
  }, [staffShifts, searchQuery]);

  const columns = useMemo(() => [
    {
      header: 'Date',
      accessorKey: 'date',
      cell: info => <span className={styles.dateCell}>{formatDisplayDate(info.getValue())}</span>
    },
    {
      header: 'Shift time',
      accessorKey: 'slot',
      cell: info => formatSlot(info.getValue()) || '—'
    },
    {
      header: 'Check in',
      accessorKey: 'checkIn',
      cell: info => formatClock(info.getValue())
    },
    {
      header: 'Check out',
      accessorKey: 'checkOut',
      cell: info => formatClock(info.getValue())
    },
    {
      header: 'Hours punched',
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
        if (!status) return '—';
        const label = status === 'Leave' ? 'On leave' : prettyStatus(status);
        return <Badge variant={statusVariant(status)}>{label}</Badge>;
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
          <StaffPicker
            label="Staff"
            staffList={staffList}
            value={selectedStaffId}
            onChange={setSelectedStaffId}
            placeholder="Search staff"
            loading={staffLoading}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>From</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            max={toDate}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>To</label>
          <input 
            type="date" 
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            min={fromDate}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Search</label>
          <div className={styles.searchField}>
            <LuSearch size={18} className={styles.searchIcon} aria-hidden="true" />
            <input 
              type="search" 
              placeholder="Search by date or shift" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isError && (
        <div className={styles.errorBanner} role="alert">
          Failed to load detailed report. Please try again.
        </div>
      )}

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
                    <span className={styles.inlineSpinner} aria-hidden="true" />
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
                    <LuChartColumn />
                    <h3>No rostered shifts in this range</h3>
                    <p>No rostered shifts for this person in the selected dates. Punches without a roster day are not listed here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {table.getRowModel().rows.length > 0 && table.getPageCount() > 1 && (
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
