'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommissionCompat } from '@/hooks/compat/useCommissionCompat';
import { useAuth } from '@/components/auth/AuthProvider';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  User,
  Calendar,
  Award,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { Commission, CommissionStatus } from '@/types/financial';

export default function CommissionsPage() {
  const { profile: user } = useAuth();
  const {
    commissions,
    getCommissionsByStatus,
    getCommissionsByAgent,
    searchCommissions,
    getTotalCommissionsEarned,
    getTotalCommissionsPaid,
    getTotalCommissionsPending,
    getCommissionAnalytics,
    approveCommission,
    markCommissionAsPaid,
    bulkApproveCommissions,
    bulkMarkAsPaid
  } = useCommissionCompat();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [filteredCommissions, setFilteredCommissions] = useState<Commission[]>([]);
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);

  useEffect(() => {
    let filtered = commissions;

    if (searchQuery.trim()) {
      filtered = searchCommissions(searchQuery.trim());
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(commission => commission.status === statusFilter);
    }

    if (agentFilter !== 'all') {
      filtered = filtered.filter(commission => commission.agentId === agentFilter);
    }

    setFilteredCommissions(filtered);
  }, [commissions, searchQuery, statusFilter, agentFilter, searchCommissions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusIcon = (status: CommissionStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'paid':
        return <DollarSign className="w-4 h-4" />;
      case 'disputed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusVariant = (status: CommissionStatus): BadgeProps['variant'] => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'default';
      case 'paid':
        return 'success';
      case 'disputed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleCommissionSelect = (commissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedCommissions([...selectedCommissions, commissionId]);
    } else {
      setSelectedCommissions(selectedCommissions.filter(id => id !== commissionId));
    }
  };

  const handleBulkApprove = () => {
    bulkApproveCommissions(selectedCommissions);
    setSelectedCommissions([]);
  };

  const handleBulkPay = () => {
    bulkMarkAsPaid(selectedCommissions, 'bank_transfer');
    setSelectedCommissions([]);
  };

  // Get unique agents for filter
  const agents = Array.from(new Set(commissions.map(c => c.agentId)))
    .map(agentId => {
      const commission = commissions.find(c => c.agentId === agentId);
      return { id: agentId, name: commission?.agentName || 'Unknown' };
    });

  // Summary statistics
  const totalEarned = getTotalCommissionsEarned();
  const totalPaid = getTotalCommissionsPaid();
  const totalPending = getTotalCommissionsPending();
  const pendingCommissions = getCommissionsByStatus('pending').length;
  const approvedCommissions = getCommissionsByStatus('approved').length;

  // Commission analytics
  const commissionAnalytics = getCommissionAnalytics();

  if (!user) {
    return <div>Please log in to view commissions.</div>;
  }

  return (
    <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Commissions</h1>
              <p className="text-gray-600 mt-2">
                Track and manage agent commissions
              </p>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0">
              {selectedCommissions.length > 0 && (
                <>
                  <Button variant="outline" onClick={handleBulkApprove}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve ({selectedCommissions.length})
                  </Button>
                  <Button onClick={handleBulkPay}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay ({selectedCommissions.length})
                  </Button>
                </>
              )}
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalEarned)}
                </div>
                <p className="text-xs text-gray-500">
                  All time commissions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalPaid)}
                </div>
                <p className="text-xs text-gray-500">
                  Paid to agents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
                <Clock className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalPending)}
                </div>
                <p className="text-xs text-gray-500">
                  {pendingCommissions + approvedCommissions} commissions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                <User className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {agents.length}
                </div>
                <p className="text-xs text-gray-500">
                  Earning commissions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Agent Performance Cards */}
          {commissionAnalytics.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Agent Performance</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {commissionAnalytics.slice(0, 6).map((analytics) => (
                  <Card key={analytics.agentId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        {analytics.agentName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Total Earned</span>
                          <span className="font-semibold">{formatCurrency(analytics.totalCommissions)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Bookings</span>
                          <span className="font-semibold">{analytics.totalBookings}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Avg Commission</span>
                          <span className="font-semibold">{formatCurrency(analytics.averageCommission)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Rate</span>
                          <Badge variant="secondary">
                            {analytics.commissionRate.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by agent, customer, or booking ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CommissionStatus | 'all')}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
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

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[180px]">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Commissions ({filteredCommissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCommissions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No commissions found</h3>
                  <p className="text-gray-600">
                    {searchQuery ? 'Try adjusting your search criteria.' : 'Commissions will appear here as bookings are made.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCommissions(filteredCommissions.map(c => c.id));
                              } else {
                                setSelectedCommissions([]);
                              }
                            }}
                            checked={selectedCommissions.length === filteredCommissions.length && filteredCommissions.length > 0}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium">Agent</th>
                        <th className="text-left py-3 px-4 font-medium">Customer</th>
                        <th className="text-left py-3 px-4 font-medium">Booking Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Commission</th>
                        <th className="text-left py-3 px-4 font-medium">Rate</th>
                        <th className="text-left py-3 px-4 font-medium">Earned Date</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCommissions.map((commission) => (
                        <tr key={commission.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedCommissions.includes(commission.id)}
                              onChange={(e) => handleCommissionSelect(commission.id, e.target.checked)}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{commission.agentName}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{commission.customerName}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{formatCurrency(commission.bookingAmount)}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-green-600">
                              {formatCurrency(commission.commissionAmount)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">
                              {commission.commissionRate.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(commission.earnedDate)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={getStatusVariant(commission.status)} className="flex items-center gap-1 w-fit">
                              {getStatusIcon(commission.status)}
                              {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {commission.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveCommission(commission.id)}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              {commission.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => markCommissionAsPaid(commission.id, 'bank_transfer')}
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </MainLayout>
  );
}