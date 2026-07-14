'use client';

import { useState } from 'react';
import { useCommissionStore } from '@/store/commission-store';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CommissionStatus } from '@/types/financial';
import { CheckCircle, Clock, DollarSign, TrendingUp } from 'lucide-react';

export function CommissionDashboard() {
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');

  const allCommissions = useCommissionStore((state) => state.commissions);
  const totalEarned = useCommissionStore((state) => state.getTotalCommissionsEarned());
  const totalPaid = useCommissionStore((state) => state.getTotalCommissionsPaid());
  const totalPending = useCommissionStore((state) => state.getTotalCommissionsPending());

  // Filter commissions
  let filteredCommissions = statusFilter === 'all'
    ? allCommissions
    : allCommissions.filter((com) => com.status === statusFilter);

  // Sort by date (newest first)
  filteredCommissions = [...filteredCommissions].sort(
    (a, b) => new Date(b.earnedDate).getTime() - new Date(a.earnedDate).getTime()
  );

  const getStatusBadge = (status: CommissionStatus) => {
    const variants: Record<CommissionStatus, BadgeProps['variant']> = {
      pending: 'warning',
      approved: 'default',
      paid: 'success',
      disputed: 'destructive',
    };

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleApprove = (commissionId: string) => {
    useCommissionStore.getState().approveCommission(commissionId);
  };

  const handleMarkAsPaid = (commissionId: string) => {
    useCommissionStore.getState().markCommissionAsPaid(commissionId, 'bank_transfer');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarned.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time commissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Paid to agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Commission List */}
      {filteredCommissions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No commissions found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Booking Amount</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Earned Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell className="font-medium">{commission.agentName}</TableCell>
                  <TableCell>{commission.customerName}</TableCell>
                  <TableCell>${commission.bookingAmount.toFixed(2)}</TableCell>
                  <TableCell>{commission.commissionRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-bold">
                    ${commission.commissionAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>{new Date(commission.earnedDate).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(commission.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {commission.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(commission.id)}
                        >
                          Approve
                        </Button>
                      )}
                      {commission.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsPaid(commission.id)}
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
