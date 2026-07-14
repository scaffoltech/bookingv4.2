'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContactStore } from '@/store/contact-store';
import { useQuoteStore } from '@/store/quote-store';
import { useInvoiceStore } from '@/store/invoice-store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Contact } from '@/types';
import {
  Users,
  Search,
  Plus,
  Filter,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Receipt,
  Star,
  MessageSquare,
  Eye,
  Edit,
  MoreHorizontal,
  Heart,
  Award
} from 'lucide-react';

export default function ContactsPage() {
  const { contacts, addContact, updateContact, deleteContact, searchContacts } = useContactStore();
  const { getQuotesByContact, quotes } = useQuoteStore();
  const { getInvoicesByCustomer, invoices } = useInvoiceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredContacts(searchContacts(searchQuery.trim()));
    } else {
      setFilteredContacts(contacts);
    }
  }, [contacts, searchQuery, searchContacts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCustomerValue = (contactId: string) => {
    const customerInvoices = getInvoicesByCustomer(contactId);
    // Only count paid invoices as actual customer value
    return customerInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((total, invoice) => total + invoice.total, 0);
  };

  const getCustomerOutstanding = (contactId: string) => {
    const customerInvoices = getInvoicesByCustomer(contactId);
    // Calculate outstanding amount from unpaid invoices
    return customerInvoices
      .filter(invoice => invoice.status !== 'paid' && invoice.status !== 'cancelled')
      .reduce((total, invoice) => total + invoice.remainingAmount, 0);
  };

  const getCustomerBookings = (contactId: string) => {
    return getQuotesByContact(contactId).filter(quote => quote.status === 'accepted').length;
  };

  const getLastBookingDate = (contactId: string) => {
    const customerQuotes = getQuotesByContact(contactId);
    const acceptedQuotes = customerQuotes.filter(quote => quote.status === 'accepted');
    if (acceptedQuotes.length === 0) return null;

    const latest = acceptedQuotes.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return latest.createdAt;
  };

  const getCustomerTier = (value: number) => {
    if (value >= 10000) return { tier: 'Platinum', color: 'text-purple-600', icon: Award };
    if (value >= 5000) return { tier: 'Gold', color: 'text-yellow-600', icon: Star };
    if (value >= 2000) return { tier: 'Silver', color: 'text-gray-600', icon: Heart };
    return { tier: 'Bronze', color: 'text-orange-600', icon: Users };
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedContact(null);
    setViewMode('list');
  };

  // Customer 360 view component
  const Customer360View = ({ contact }: { contact: Contact }) => {
    const customerQuotes = getQuotesByContact(contact.id);
    const customerInvoices = getInvoicesByCustomer(contact.id);
    const totalValue = getCustomerValue(contact.id);
    const outstandingAmount = getCustomerOutstanding(contact.id);
    const totalBookings = getCustomerBookings(contact.id);
    const lastBooking = getLastBookingDate(contact.id);
    const tierInfo = getCustomerTier(totalValue);

    const acceptedQuotes = customerQuotes.filter(q => q.status === 'accepted');
    const pendingQuotes = customerQuotes.filter(q => q.status === 'sent');
    const paidInvoices = customerInvoices.filter(i => i.status === 'paid');
    const outstandingInvoices = customerInvoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');

    return (
      <div className="space-y-6">
        {/* Customer Header */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {contact.firstName[0]}{contact.lastName[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {contact.firstName} {contact.lastName}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-1" />
                    {contact.email}
                  </div>
                  {contact.phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-1" />
                      {contact.phone}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className={`${tierInfo.color} bg-white border flex items-center gap-1`}>
                    <tierInfo.icon className="w-3 h-3" />
                    {tierInfo.tier} Customer
                  </Badge>
                  <Badge variant="secondary">
                    {totalBookings} Bookings
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Quote
              </Button>
            </div>
          </div>
        </div>

        {/* Customer Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalValue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                From paid invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Receipt className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${outstandingAmount > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                {formatCurrency(outstandingAmount)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Unpaid invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalBookings}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Receipt className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${outstandingAmount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                {formatCurrency(outstandingAmount)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Booking</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {lastBooking ? new Date(lastBooking).toLocaleDateString() : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking History and Communications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {acceptedQuotes.slice(0, 5).map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{quote.title}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(quote.totalCost)}</div>
                      <Badge variant="outline" className="text-xs">
                        {quote.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {acceptedQuotes.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No bookings yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paidInvoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">#{invoice.invoiceNumber}</div>
                      <div className="text-sm text-gray-600">
                        Paid: {new Date(invoice.payments[0]?.processedDate || invoice.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{formatCurrency(invoice.total)}</div>
                      <Badge variant="success" className="text-xs">
                        Paid
                      </Badge>
                    </div>
                  </div>
                ))}
                {paidInvoices.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No payments yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Items */}
        {(pendingQuotes.length > 0 || outstandingInvoices.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingQuotes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">Pending Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingQuotes.map((quote) => (
                      <div key={quote.id} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                        <div>
                          <div className="font-medium">{quote.title}</div>
                          <div className="text-sm text-gray-600">
                            Sent: {new Date(quote.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(quote.totalCost)}</div>
                          <Button size="sm" variant="outline" className="mt-1">
                            Follow Up
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {outstandingInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Outstanding Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {outstandingInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                        <div>
                          <div className="font-medium">#{invoice.invoiceNumber}</div>
                          <div className="text-sm text-gray-600">
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-600">{formatCurrency(invoice.remainingAmount)}</div>
                          <Button size="sm" variant="outline" className="mt-1">
                            Send Reminder
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {viewMode === 'detail' && selectedContact ? (
            <>
              <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={handleBackToList} className="mr-4">
                  ← Back to Contacts
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">Customer Profile</h1>
              </div>
              <Customer360View contact={selectedContact} />
            </>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Customer Relationship Management</h1>
                  <p className="text-gray-600 mt-2">
                    Manage your travel clients and build lasting relationships
                  </p>
                </div>

                <Button className="mt-4 md:mt-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                    <Users className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{contacts.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {contacts.filter(c => getCustomerBookings(c.id) > 0).length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(contacts.reduce((sum, c) => sum + getCustomerValue(c.id), 0))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
                    <Award className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        contacts.length > 0
                          ? contacts.reduce((sum, c) => sum + getCustomerValue(c.id), 0) / contacts.length
                          : 0
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search contacts by name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Contacts List */}
              <Card>
                <CardHeader>
                  <CardTitle>Contacts ({filteredContacts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
                      <p className="text-gray-600">
                        {searchQuery ? 'Try adjusting your search criteria.' : 'Add your first contact to get started.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredContacts.map((contact) => {
                        const totalValue = getCustomerValue(contact.id);
                        const totalBookings = getCustomerBookings(contact.id);
                        const tierInfo = getCustomerTier(totalValue);
                        const lastBooking = getLastBookingDate(contact.id);

                        return (
                          <Card key={contact.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-6" onClick={() => handleContactSelect(contact)}>
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {contact.firstName[0]}{contact.lastName[0]}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {contact.firstName} {contact.lastName}
                                    </div>
                                    <div className="text-sm text-gray-600">{contact.email}</div>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={(e) => {
                                  e.stopPropagation();
                                  handleContactSelect(contact);
                                }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Customer Value</span>
                                  <span className="font-semibold text-green-600">{formatCurrency(totalValue)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Bookings</span>
                                  <span className="font-semibold">{totalBookings}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Last Booking</span>
                                  <span className="text-sm">{lastBooking ? new Date(lastBooking).toLocaleDateString() : 'Never'}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-4">
                                <Badge className={`${tierInfo.color} bg-white border flex items-center gap-1`}>
                                  <tierInfo.icon className="w-3 h-3" />
                                  {tierInfo.tier}
                                </Badge>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost">
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost">
                                    <Phone className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
    </MainLayout>
  );
}