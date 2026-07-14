'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { useRateStore } from '@/store/rate-store';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Sparkles, Eye, Search, Trash2, Database, Hotel, MapPin, Car, Edit2, X } from 'lucide-react';

export default function RatesPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <RatesContent />
      </MainLayout>
    </ProtectedRoute>
  );
}

function RatesContent() {
  const { rates, addRates, deleteRate, deleteRates, updateRate, clearAllRates, searchRates } = useRateStore();
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRate, setEditingRate] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRates, setSelectedRates] = useState<Set<string>>(new Set());
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
    rates?: any[];
    warnings?: string[];
    metadata?: any;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setShowPreview(false);

    try {
      console.log('🚀 [Upload] Starting GPT processing for:', file.name);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Call GPT processing API
      const response = await fetch('/api/rates/gpt-process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : (data.error || 'Upload failed');
        throw new Error(errorMsg);
      }

      console.log('✅ [Upload] GPT processing complete:', data);

      // Store result for preview
      setUploadResult({
        success: true,
        message: `GPT extracted ${data.rates.length} rates with ${data.metadata.confidence} confidence`,
        count: data.rates.length,
        rates: data.rates,
        warnings: data.metadata.warnings,
        metadata: data.metadata,
      });

      setShowPreview(true);
    } catch (error: any) {
      console.error('❌ [Upload] Failed:', error);
      setUploadResult({
        success: false,
        message: error.message || 'Upload failed. Please check file format.',
      });
    } finally {
      setUploading(false);
    }
  };

  const confirmAndSaveRates = () => {
    if (!uploadResult?.rates) return;

    // Save all rates to store
    const ids = addRates(uploadResult.rates);

    console.log('💾 [Upload] Saved rates:', ids.length);

    // Update result message
    setUploadResult({
      ...uploadResult,
      message: `Successfully saved ${ids.length} rates to the system`,
    });

    setShowPreview(false);
  };

  const downloadTemplate = () => {
    // Create CSV template
    const csvContent = `Supplier,Property Name,Property Code,Room Type,Check-in Date,Check-out Date,Rate,Currency,Commission %,Source
Hilton Hotels,Hilton Garden Inn Miami,HILGMI001,Standard King,2025-01-15,2025-01-18,150.00,USD,10,offline_platform
Marriott,Marriott Marquis NYC,MARNYC002,Deluxe Queen,2025-02-01,2025-02-05,220.00,USD,12,offline_platform
Local Supplier,Beach Resort Cancun,BRCMX003,Ocean View Suite,2025-03-10,2025-03-14,180.00,USD,8,offline_agent`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rates_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEditRate = (rate: any) => {
    setEditingRate({ ...rate });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingRate) return;

    updateRate(editingRate.id, editingRate);
    setShowEditModal(false);
    setEditingRate(null);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingRate(null);
  };

  const displayedRates = searchQuery ? searchRates(searchQuery) : rates;

  const toggleSelectRate = (rateId: string) => {
    const newSelected = new Set(selectedRates);
    if (newSelected.has(rateId)) {
      newSelected.delete(rateId);
    } else {
      newSelected.add(rateId);
    }
    setSelectedRates(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRates.size === displayedRates.length) {
      // Deselect all
      setSelectedRates(new Set());
    } else {
      // Select all displayed rates
      setSelectedRates(new Set(displayedRates.map(r => r.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedRates.size === 0) return;

    const confirmMsg = `Are you sure you want to delete ${selectedRates.size} rate${selectedRates.size > 1 ? 's' : ''}?`;
    if (confirm(confirmMsg)) {
      deleteRates(Array.from(selectedRates));
      setSelectedRates(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedRates(new Set());
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rate Management</h1>
          <p className="text-gray-600 mt-2">
            Upload and manage offline negotiated rates for hotels, flights, and activities
          </p>
        </div>

        {/* GPT Info Banner */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800">
            <p className="font-semibold mb-1">✨ AI-Powered Rate Extraction</p>
            <ul className="list-disc list-inside space-y-1 text-purple-700">
              <li>Upload CSV, Excel, PDF, or even screenshots</li>
              <li>GPT-4 automatically extracts and structures your rates</li>
              <li>Preview extracted rates before saving</li>
              <li>Handles unstructured data - paste emails, supplier quotes, anything!</li>
            </ul>
          </div>
        </div>

        {/* Download Template */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Download CSV Template
              </h2>
              <p className="text-sm text-gray-600">
                Use this template to format your rates correctly before uploading
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Rates</h2>

          {uploading ? (
            // Full-screen loading overlay
            <div className="border-2 border-purple-300 rounded-lg p-12 text-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
              <div className="max-w-md mx-auto">
                {/* Animated icon */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse opacity-20"></div>
                  <div className="absolute inset-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-spin opacity-30" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-purple-600 animate-pulse" />
                  </div>
                </div>

                {/* Status text */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Processing with AI
                </h3>

                <div className="space-y-2 mb-6">
                  <p className="text-purple-700 font-medium flex items-center justify-center gap-2">
                    <span className="inline-block w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
                    Analyzing your file...
                  </p>
                  <p className="text-sm text-gray-600">
                    GPT-4 is extracting and structuring rate information
                  </p>
                </div>

                {/* Progress steps */}
                <div className="bg-white/50 rounded-lg p-4 text-left space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-green-700">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                    <span>File uploaded</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-700 font-medium">
                    <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                    </div>
                    <span>Extracting data with AI...</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    </div>
                    <span>Preview results</span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  This usually takes 5-15 seconds
                </p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Rate File
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                Upload CSV or Excel file with negotiated rates
              </p>

              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <span className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Sparkles className="w-4 h-4" />
                  Upload & Process with AI
                </span>
              </label>

              <p className="text-xs text-gray-500 mt-3">
                Supported: CSV, Excel, PDF, Text, Images (Max 10MB)
              </p>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                uploadResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {uploadResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-semibold ${
                      uploadResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {uploadResult.message}
                  </p>

                  {uploadResult.metadata && (
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <p>⚡ Tokens used: {uploadResult.metadata.tokensUsed}</p>
                      <p>⏱️ Processing time: {uploadResult.metadata.processingTime}ms</p>
                      <p>💰 Estimated cost: {uploadResult.metadata.estimatedCost}</p>
                    </div>
                  )}

                  {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                    <div className="mt-2 text-sm text-yellow-700">
                      <p className="font-semibold">Warnings:</p>
                      <ul className="list-disc list-inside">
                        {uploadResult.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {showPreview && uploadResult.rates && (
                <div className="mt-4 pt-4 border-t border-green-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-green-900 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview Extracted Rates ({uploadResult.rates.length})
                    </h3>
                    <button
                      onClick={confirmAndSaveRates}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                    >
                      ✓ Confirm & Save All
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {uploadResult.rates.slice(0, 10).map((rate, index) => (
                      <div
                        key={index}
                        className="bg-white p-3 rounded border border-gray-200 text-sm"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-semibold">{rate.supplier}</span> -{' '}
                            {rate.propertyName}
                          </div>
                          <div className="text-right text-gray-600">
                            {rate.roomType}
                          </div>
                          <div className="text-gray-600">
                            {rate.checkIn} → {rate.checkOut}
                          </div>
                          <div className="text-right font-semibold">
                            {rate.currency} {rate.rate} ({rate.commissionPercent}% comm)
                          </div>
                        </div>
                      </div>
                    ))}
                    {uploadResult.rates.length > 10 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        ... and {uploadResult.rates.length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rate Format Guide */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            CSV Format Guide
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold text-gray-900">Supplier:</span>
              <span className="text-gray-600 ml-2">
                Name of the supplier (e.g., "Hilton Hotels")
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Property Name:</span>
              <span className="text-gray-600 ml-2">
                Full name of hotel/property
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Property Code:</span>
              <span className="text-gray-600 ml-2">
                Unique code for the property
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Source:</span>
              <span className="text-gray-600 ml-2">
                Must be either{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded">offline_platform</code> or{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded">offline_agent</code>
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-900">Commission %:</span>
              <span className="text-gray-600 ml-2">
                Your commission percentage (e.g., 10 for 10%)
              </span>
            </div>
          </div>
        </div>

        {/* Saved Rates Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Saved Rates ({rates.length})
                </h2>
                <p className="text-sm text-gray-600">
                  All uploaded negotiated rates
                </p>
              </div>
            </div>
            {rates.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete all rates?')) {
                    clearAllRates();
                  }
                }}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedRates.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-blue-900">
                  {selectedRates.size} item{selectedRates.size > 1 ? 's' : ''} selected
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          {rates.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by supplier, property, room type, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Rates Table */}
          {rates.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No rates uploaded yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload a file above to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedRates.size === displayedRates.length && displayedRates.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Supplier</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Details</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Dates</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Rate</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Commission</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Source</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedRates.map((rate) => (
                    <tr key={rate.id} className={`hover:bg-gray-50 ${selectedRates.has(rate.id) ? 'bg-blue-50' : ''}`}>
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRates.has(rate.id)}
                          onChange={() => toggleSelectRate(rate.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>

                      {/* Type Icon */}
                      <td className="px-4 py-3 text-center">
                        {rate.type === 'hotel' && <Hotel className="w-5 h-5 text-blue-600 mx-auto" />}
                        {rate.type === 'activity' && <MapPin className="w-5 h-5 text-orange-600 mx-auto" />}
                        {rate.type === 'transfer' && <Car className="w-5 h-5 text-purple-600 mx-auto" />}
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3 text-gray-900">{rate.supplier}</td>

                      {/* Type-specific Details */}
                      <td className="px-4 py-3">
                        {rate.type === 'hotel' && (
                          <>
                            <div className="text-gray-900">{rate.propertyName}</div>
                            <div className="text-xs text-gray-600">{rate.roomType}</div>
                            {rate.propertyCode && (
                              <div className="text-xs text-gray-500">{rate.propertyCode}</div>
                            )}
                          </>
                        )}
                        {rate.type === 'activity' && (
                          <>
                            <div className="text-gray-900">{rate.activityName}</div>
                            <div className="text-xs text-gray-600">{rate.location}</div>
                            {rate.category && (
                              <div className="text-xs text-gray-500">{rate.category}</div>
                            )}
                          </>
                        )}
                        {rate.type === 'transfer' && (
                          <>
                            <div className="text-gray-900">{rate.vehicleType}</div>
                            <div className="text-xs text-gray-600">
                              {rate.from} → {rate.to}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">{rate.transferType}</div>
                          </>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3 text-gray-600">
                        <div className="text-xs">
                          {rate.type === 'hotel' ? rate.checkIn : rate.startDate}
                        </div>
                        <div className="text-xs">
                          {rate.type === 'hotel' ? rate.checkOut : rate.endDate}
                        </div>
                      </td>

                      {/* Rate */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {rate.currency} {rate.rate.toFixed(2)}
                      </td>

                      {/* Commission */}
                      <td className="px-4 py-3 text-right text-green-700 font-medium">
                        {rate.commissionPercent}%
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">
                          {rate.source.replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditRate(rate)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit rate"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this rate?')) {
                                deleteRate(rate.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete rate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Rate Modal */}
        {showEditModal && editingRate && (
          <EditRateModal
            rate={editingRate}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            onChange={setEditingRate}
          />
        )}
      </div>
    </div>
  );
}

// Edit Rate Modal Component
interface EditRateModalProps {
  rate: any;
  onSave: () => void;
  onCancel: () => void;
  onChange: (rate: any) => void;
}

function EditRateModal({ rate, onSave, onCancel, onChange }: EditRateModalProps) {
  const updateField = (field: string, value: any) => {
    onChange({ ...rate, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {rate.type === 'hotel' && <Hotel className="w-6 h-6 text-blue-600" />}
            {rate.type === 'activity' && <MapPin className="w-6 h-6 text-orange-600" />}
            {rate.type === 'transfer' && <Car className="w-6 h-6 text-purple-600" />}
            <h3 className="text-xl font-semibold text-gray-900">
              Edit {rate.type.charAt(0).toUpperCase() + rate.type.slice(1)} Rate
            </h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <input
                type="text"
                value={rate.supplier}
                onChange={(e) => updateField('supplier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={rate.source}
                onChange={(e) => updateField('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="offline_platform">Offline Platform</option>
                <option value="offline_agent">Offline Agent</option>
              </select>
            </div>
          </div>

          {/* Hotel-specific Fields */}
          {rate.type === 'hotel' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={rate.propertyName}
                    onChange={(e) => updateField('propertyName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Code
                  </label>
                  <input
                    type="text"
                    value={rate.propertyCode || ''}
                    onChange={(e) => updateField('propertyCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Type
                  </label>
                  <input
                    type="text"
                    value={rate.roomType}
                    onChange={(e) => updateField('roomType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Plan
                  </label>
                  <input
                    type="text"
                    value={rate.mealPlan || ''}
                    onChange={(e) => updateField('mealPlan', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Activity-specific Fields */}
          {rate.type === 'activity' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activity Name
                  </label>
                  <input
                    type="text"
                    value={rate.activityName}
                    onChange={(e) => updateField('activityName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={rate.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={rate.category || ''}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={rate.duration || ''}
                    onChange={(e) => updateField('duration', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Transfer-specific Fields */}
          {rate.type === 'transfer' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From
                  </label>
                  <input
                    type="text"
                    value={rate.from}
                    onChange={(e) => updateField('from', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To
                  </label>
                  <input
                    type="text"
                    value={rate.to}
                    onChange={(e) => updateField('to', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    value={rate.vehicleType}
                    onChange={(e) => updateField('vehicleType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer Type
                  </label>
                  <select
                    value={rate.transferType}
                    onChange={(e) => updateField('transferType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="airport">Airport</option>
                    <option value="hotel">Hotel</option>
                    <option value="point-to-point">Point to Point</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {rate.type === 'hotel' ? 'Check-in' : 'Start Date'}
              </label>
              <input
                type="date"
                value={rate.type === 'hotel' ? rate.checkIn : rate.startDate}
                onChange={(e) => {
                  if (rate.type === 'hotel') {
                    updateField('checkIn', e.target.value);
                    updateField('startDate', e.target.value);
                  } else {
                    updateField('startDate', e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {rate.type === 'hotel' ? 'Check-out' : 'End Date'}
              </label>
              <input
                type="date"
                value={rate.type === 'hotel' ? rate.checkOut : rate.endDate}
                onChange={(e) => {
                  if (rate.type === 'hotel') {
                    updateField('checkOut', e.target.value);
                    updateField('endDate', e.target.value);
                  } else {
                    updateField('endDate', e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate
              </label>
              <input
                type="number"
                step="0.01"
                value={rate.rate}
                onChange={(e) => updateField('rate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <input
                type="text"
                value={rate.currency}
                onChange={(e) => updateField('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commission %
              </label>
              <input
                type="number"
                step="0.1"
                value={rate.commissionPercent}
                onChange={(e) => updateField('commissionPercent', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={rate.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes or comments..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
