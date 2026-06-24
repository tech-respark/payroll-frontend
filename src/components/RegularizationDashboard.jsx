import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button,
  TablePagination,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ButtonGroup,
  Chip
} from '@mui/material';
import styles from './RegularizationDashboard.module.scss';

const statusColor = {
  PENDING_BORDER: 'rgb(239, 197, 111)',
  APPROVED_BORDER: 'rgb(134, 234, 172)',
  REJECTED_BORDER: 'rgb(246, 130, 137)',
  APPROVED: 'rgba(161, 237, 190, 0.18)',
  PENDING: 'rgba(239, 197, 111, 0.18)',
  REJECTED: 'rgba(246, 130, 137, 0.18)',
  TERMINAL_BORDER: '#9CC7F4',
  TERMINAL: '#f1f5f9'
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  return timeStr.substring(0, 5);
};

const RegularizationDashboard = ({ staffList }) => {
  const { tenantId, storeId, user } = useAuth();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffId, setSelectedStaffId] = useState('All');
  
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [isMutating, setIsMutating] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const queryClient = useQueryClient();

  const { data: requestData, isLoading: loading } = useQuery({
    queryKey: ['regularizationRequests', tenantId, storeId, activeTab, fromDate, toDate, selectedStaffId, page, rowsPerPage],
    queryFn: async () => {
      const payload = {
        tenantId,
        storeId,
        applicationName: 'RESPARK',
        fromDate,
        toDate,
        currentStatus: activeTab,
        personnelCode: selectedStaffId === 'All' ? null : Number(selectedStaffId),
        pageModel: {
          recordsPerPage: rowsPerPage,
          pageNumber: page + 1
        }
      };

      const res = await apiService.post('/regularizationRequests', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      return res.data || { regularizationRequests: [], pageModel: { totalNumberOfRecords: 0 } };
    }
  });

  const requests = requestData?.regularizationRequests || [];
  const totalCount = requestData?.pageModel?.totalNumberOfRecords || 0;

  const handleAction = async (action, reqIds) => {
    if (!reqIds || reqIds.length === 0) return;
    setIsMutating(true);
    try {
      const payload = reqIds.map(id => ({
        personnelAttendanceId: id,
        modifiedBy: user?.id || 1,
        currentStatus: action,
        remark: ""
      }));

      await apiService.post('/flagRegularizationRequests', payload, {
        'Tenantid': String(tenantId),
        'Storeid': String(storeId),
        'x-allowed-store-ids': String(storeId)
      });
      
      setSelectedRequests([]);
      queryClient.invalidateQueries({ queryKey: ['regularizationRequests'] });
    } catch (err) {
      console.error(`Failed to ${action} requests`, err);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRequests(requests.map(r => r.personnelAttendanceId));
    } else {
      setSelectedRequests([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter(reqId => reqId !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  const renderPunches = (punches) => {
    if (!punches || punches.length === 0) return null;
    return (
      <Box className={styles.punchesContainer}>
        {punches.map((punch, index) => {
          const borderCol = punch.uploadSource === 'TERMINAL' ? statusColor.TERMINAL_BORDER : statusColor[`${punch.currentStatus}_BORDER`] || statusColor.APPROVED_BORDER;
          const bgCol = punch.uploadSource === 'TERMINAL' ? statusColor.TERMINAL : statusColor[punch.currentStatus] || statusColor.APPROVED;
          
          return (
            <Chip
              key={index}
              label={`${formatTime(punch.punchTime)} (${index % 2 === 0 ? 'IN' : 'OUT'})`}
              size="small"
              sx={{
                borderLeft: `4px solid ${borderCol}`,
                backgroundColor: bgCol,
                fontWeight: 600,
                borderRadius: '4px'
              }}
            />
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <Box className={styles.headerControls}>
        
        <Box className={styles.filterGroup}>
          <TextField
            label="From Date"
            type="date"
            size="small"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To Date"
            type="date"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Staff Member</InputLabel>
            <Select
              value={selectedStaffId}
              label="Staff Member"
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <MenuItem value="All">All Staff</MenuItem>
              {staffList.map(staff => (
                <MenuItem key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <ButtonGroup variant="outlined" size="small">
          <Button 
            variant={activeTab === 'PENDING' ? 'contained' : 'outlined'} 
            onClick={() => { setActiveTab('PENDING'); setPage(0); }}
            disableElevation
          >
            Pending
          </Button>
          <Button 
            variant={activeTab === 'APPROVED' ? 'contained' : 'outlined'} 
            onClick={() => { setActiveTab('APPROVED'); setPage(0); }}
            disableElevation
          >
            Approved
          </Button>
          <Button 
            variant={activeTab === 'REJECTED' ? 'contained' : 'outlined'} 
            onClick={() => { setActiveTab('REJECTED'); setPage(0); }}
            disableElevation
          >
            Rejected
          </Button>
        </ButtonGroup>
      </Box>

      {activeTab === 'PENDING' && selectedRequests.length > 0 && (
        <Box className={styles.actionButtons}>
          <Button variant="contained" color="success" size="small" onClick={() => handleAction('APPROVED', selectedRequests)}>
            Approve Selected ({selectedRequests.length})
          </Button>
          <Button variant="contained" color="error" size="small" onClick={() => handleAction('REJECTED', selectedRequests)}>
            Reject Selected ({selectedRequests.length})
          </Button>
        </Box>
      )}

      <TableContainer component={Paper} elevation={0} className={styles.tableContainer}>
        <Table size="small">
          <TableHead className={styles.tableHead}>
            <TableRow>
              {activeTab === 'PENDING' && (
                <TableCell padding="checkbox">
                  <Checkbox 
                    checked={requests.length > 0 && selectedRequests.length === requests.length}
                    indeterminate={selectedRequests.length > 0 && selectedRequests.length < requests.length}
                    onChange={handleSelectAll} 
                  />
                </TableCell>
              )}
              <TableCell className={styles.tableHeadCell}>Staff Name</TableCell>
              <TableCell className={styles.tableHeadCell}>Attendance Date</TableCell>
              <TableCell className={styles.tableHeadCell}>Punch Time</TableCell>
              <TableCell className={styles.tableHeadCell}>Status</TableCell>
              <TableCell className={styles.tableHeadCell}>Attendance Data</TableCell>
              {activeTab === 'PENDING' && <TableCell align="right" className={styles.tableHeadCell}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'PENDING' ? 7 : 6} align="center" className={styles.emptyStateCell}>
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'PENDING' ? 7 : 6} align="center" className={styles.emptyStateCell}>
                  No {activeTab.toLowerCase()} requests available.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((row) => (
                <TableRow key={row.personnelAttendanceId} hover>
                  {activeTab === 'PENDING' && (
                    <TableCell padding="checkbox">
                      <Checkbox 
                        checked={selectedRequests.includes(row.personnelAttendanceId)}
                        onChange={() => handleSelectOne(row.personnelAttendanceId)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{row.personnelName}</TableCell>
                  <TableCell>{row.attendanceDate}</TableCell>
                  <TableCell>{formatTime(row.punchTime)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={row.currentStatus} 
                      size="small" 
                      color={row.currentStatus === 'APPROVED' ? 'success' : row.currentStatus === 'REJECTED' ? 'error' : 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{renderPunches(row.individualPunchesList)}</TableCell>
                  {activeTab === 'PENDING' && (
                    <TableCell align="right">
                      <Button size="small" color="success" onClick={() => handleAction('APPROVED', [row.personnelAttendanceId])}>Approve</Button>
                      <Button size="small" color="error" onClick={() => handleAction('REJECTED', [row.personnelAttendanceId])}>Reject</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>
    </Box>
  );
};

export default RegularizationDashboard;
