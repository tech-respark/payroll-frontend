import React, { useState, useEffect } from 'react';
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
  
  const [requests, setRequests] = useState([]);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, [activeTab, fromDate, toDate, selectedStaffId, page, rowsPerPage]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
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

      if (res.data) {
        setRequests(res.data.regularizationRequests || []);
        if (res.data.pageModel) {
          setTotalCount(res.data.pageModel.totalNumberOfRecords || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, reqIds) => {
    if (!reqIds || reqIds.length === 0) return;
    try {
      setLoading(true);
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
      fetchRequests();
    } catch (err) {
      console.error(`Failed to ${action} requests`, err);
      setLoading(false);
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
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button variant="contained" color="success" size="small" onClick={() => handleAction('APPROVED', selectedRequests)}>
            Approve Selected ({selectedRequests.length})
          </Button>
          <Button variant="contained" color="error" size="small" onClick={() => handleAction('REJECTED', selectedRequests)}>
            Reject Selected ({selectedRequests.length})
          </Button>
        </Box>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: '#f8fafc' }}>
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
              <TableCell sx={{ fontWeight: 'bold' }}>Staff Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Attendance Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Punch Time</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Attendance Data</TableCell>
              {activeTab === 'PENDING' && <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'PENDING' ? 7 : 6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'PENDING' ? 7 : 6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
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
