'use client';

import { useState, useRef, useEffect } from 'react';
import { ModernButton } from '@/components/ui/modern-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Edit3,
  Check,
  X,
  Clock,
  Calendar,
  DollarSign,
  Type
} from 'lucide-react';
import { TravelItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

interface QuickEditPopoverProps {
  item: TravelItem;
  onSave: (updates: Partial<TravelItem>) => void;
  onCancel: () => void;
  onFullEdit: () => void;
  position: { x: number; y: number };
}

export function QuickEditPopover({ 
  item, 
  onSave, 
  onCancel, 
  onFullEdit, 
  position 
}: QuickEditPopoverProps) {
  const [editField, setEditField] = useState<'name' | 'time' | 'date' | 'price' | null>(null);
  const [tempValues, setTempValues] = useState({
    name: item.name,
    startTime: moment(item.startDate).format('HH:mm'),
    endTime: item.endDate ? moment(item.endDate).format('HH:mm') : '',
    startDate: moment(item.startDate).format('YYYY-MM-DD'),
    endDate: item.endDate ? moment(item.endDate).format('YYYY-MM-DD') : moment(item.startDate).format('YYYY-MM-DD'),
    price: item.price.toString(),
  });

  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editField]);

  // Handle clicks outside popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  const handleSaveField = () => {
    if (!editField) return;

    const updates: Partial<TravelItem> = {};

    switch (editField) {
      case 'name':
        updates.name = tempValues.name;
        break;
      case 'time':
        // Update time while keeping the same date
        const startDate = moment(item.startDate).format('YYYY-MM-DD');
        const endDate = item.endDate ? moment(item.endDate).format('YYYY-MM-DD') : startDate;
        
        updates.startDate = moment(`${startDate} ${tempValues.startTime}`).toISOString();
        if (tempValues.endTime) {
          updates.endDate = moment(`${endDate} ${tempValues.endTime}`).toISOString();
        }
        break;
      case 'date':
        // Update date while keeping the same time
        const startTime = moment(item.startDate).format('HH:mm');
        const endTime = item.endDate ? moment(item.endDate).format('HH:mm') : startTime;
        
        updates.startDate = moment(`${tempValues.startDate} ${startTime}`).toISOString();
        if (item.endDate) {
          updates.endDate = moment(`${tempValues.endDate} ${endTime}`).toISOString();
        }
        break;
      case 'price':
        updates.price = parseFloat(tempValues.price);
        break;
    }

    onSave(updates);
    setEditField(null);
  };

  const handleCancelEdit = () => {
    setTempValues({
      name: item.name,
      startTime: moment(item.startDate).format('HH:mm'),
      endTime: item.endDate ? moment(item.endDate).format('HH:mm') : '',
      startDate: moment(item.startDate).format('YYYY-MM-DD'),
      endDate: item.endDate ? moment(item.endDate).format('YYYY-MM-DD') : moment(item.startDate).format('YYYY-MM-DD'),
      price: item.price.toString(),
    });
    setEditField(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveField();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Check if this is an API item (read-only)
  const isApiItem = item.source === 'api';
  const apiProvider = item.apiProvider;

  // Calculate safe position within viewport
  const safePosition = {
    left: Math.max(10, Math.min(position.x - 140, window.innerWidth - 290)), // Center horizontally, keep in bounds
    top: Math.max(10, position.y - 200), // Position above the clicked element
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onCancel}
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 min-w-[320px] z-50"
        style={{
          left: safePosition.left,
          top: safePosition.top,
        }}
      >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h4 className="font-semibold text-gray-900">
            {isApiItem ? 'Hotel Details' : 'Quick Edit'}
          </h4>
          {isApiItem && (
            <Badge variant="secondary" className="uppercase">
              {apiProvider || 'API'}
            </Badge>
          )}
        </div>
        <ModernButton variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </ModernButton>
      </div>

      {isApiItem && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            🔒 This hotel was booked through {apiProvider === 'hotelbeds' ? 'HotelBeds' : 'API'}.
            Core details cannot be modified here. Contact support for changes.
          </p>
        </div>
      )}

      {/* Quick Edit Fields */}
      <div className="space-y-3">
        {/* Name */}
        <div className="flex items-center space-x-2">
          <Type className="w-4 h-4 text-gray-400" />
          {editField === 'name' ? (
            <div className="flex-1 flex items-center space-x-2">
              <Input
                ref={inputRef}
                value={tempValues.name}
                onChange={(e) => setTempValues(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={handleKeyPress}
                className="text-sm"
                placeholder="Item name"
              />
              <ModernButton size="sm" onClick={handleSaveField}>
                <Check className="w-3 h-3" />
              </ModernButton>
              <ModernButton size="sm" variant="outline" onClick={handleCancelEdit}>
                <X className="w-3 h-3" />
              </ModernButton>
            </div>
          ) : (
            <div
              className={`flex-1 p-3 rounded-lg flex items-center justify-between transition-smooth border border-transparent ${
                isApiItem
                  ? 'bg-gray-50 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-white/30 hover:border-glass'
              }`}
              onClick={isApiItem ? undefined : () => setEditField('name')}
            >
              <span className="text-sm truncate font-medium">{item.name}</span>
              {!isApiItem && <Edit3 className="w-4 h-4 text-gray-400" />}
            </div>
          )}
        </div>

        {/* Date for Flights/Hotels or Time for Activities */}
        {(item.type === 'flight' || item.type === 'hotel') ? (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            {editField === 'date' ? (
              <div className="flex-1 flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Input
                    ref={inputRef}
                    type="date"
                    value={tempValues.startDate}
                    onChange={(e) => setTempValues(prev => ({ ...prev, startDate: e.target.value }))}
                    onKeyDown={handleKeyPress}
                    className="text-sm"
                  />
                  {item.endDate && (
                    <>
                      <span className="text-xs text-gray-400">to</span>
                      <Input
                        type="date"
                        value={tempValues.endDate}
                        onChange={(e) => setTempValues(prev => ({ ...prev, endDate: e.target.value }))}
                        onKeyDown={handleKeyPress}
                        className="text-sm"
                      />
                    </>
                  )}
                </div>
                <ModernButton size="sm" onClick={handleSaveField}>
                  <Check className="w-3 h-3" />
                </ModernButton>
                <ModernButton size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="w-3 h-3" />
                </ModernButton>
              </div>
            ) : (
              <div
                className={`flex-1 p-3 rounded-lg flex items-center justify-between transition-smooth border border-transparent ${
                  isApiItem
                    ? 'bg-gray-50 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-white/30 hover:border-glass'
                }`}
                onClick={isApiItem ? undefined : () => setEditField('date')}
              >
                <span className="text-sm font-medium">
                  {moment(item.startDate).format('MMM DD')}
                  {item.endDate && moment(item.endDate).format('YYYY-MM-DD') !== moment(item.startDate).format('YYYY-MM-DD') &&
                    ` - ${moment(item.endDate).format('MMM DD')}`
                  }
                </span>
                {!isApiItem && <Edit3 className="w-4 h-4 text-gray-400" />}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            {editField === 'time' ? (
              <div className="flex-1 flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Input
                    ref={inputRef}
                    type="time"
                    value={tempValues.startTime}
                    onChange={(e) => setTempValues(prev => ({ ...prev, startTime: e.target.value }))}
                    onKeyDown={handleKeyPress}
                    className="text-sm w-24"
                  />
                  {item.endDate && (
                    <>
                      <span className="text-xs text-gray-400">to</span>
                      <Input
                        type="time"
                        value={tempValues.endTime}
                        onChange={(e) => setTempValues(prev => ({ ...prev, endTime: e.target.value }))}
                        onKeyDown={handleKeyPress}
                        className="text-sm w-24"
                      />
                    </>
                  )}
                </div>
                <ModernButton size="sm" onClick={handleSaveField}>
                  <Check className="w-3 h-3" />
                </ModernButton>
                <ModernButton size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="w-3 h-3" />
                </ModernButton>
              </div>
            ) : (
              <div
                className={`flex-1 p-3 rounded-lg flex items-center justify-between transition-smooth border border-transparent ${
                  isApiItem
                    ? 'bg-gray-50 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-white/30 hover:border-glass'
                }`}
                onClick={isApiItem ? undefined : () => setEditField('time')}
              >
                <span className="text-sm font-medium">
                  {moment(item.startDate).format('HH:mm')}
                  {item.endDate && ` - ${moment(item.endDate).format('HH:mm')}`}
                </span>
                {!isApiItem && <Edit3 className="w-4 h-4 text-gray-400" />}
              </div>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          {editField === 'price' ? (
            <div className="flex-1 flex items-center space-x-2">
              <Input
                ref={inputRef}
                type="number"
                step="0.01"
                value={tempValues.price}
                onChange={(e) => setTempValues(prev => ({ ...prev, price: e.target.value }))}
                onKeyDown={handleKeyPress}
                className="text-sm"
                placeholder="0.00"
              />
              <ModernButton size="sm" onClick={handleSaveField}>
                <Check className="w-3 h-3" />
              </ModernButton>
              <ModernButton size="sm" variant="outline" onClick={handleCancelEdit}>
                <X className="w-3 h-3" />
              </ModernButton>
            </div>
          ) : (
            <div
              className={`flex-1 p-3 rounded-lg flex items-center justify-between transition-smooth border border-transparent ${
                isApiItem
                  ? 'bg-gray-50 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-white/30 hover:border-glass'
              }`}
              onClick={isApiItem ? undefined : () => setEditField('price')}
            >
              <span className="text-sm font-semibold text-blue-700">
                {formatCurrency(item.price * item.quantity)}
              </span>
              {!isApiItem && <Edit3 className="w-4 h-4 text-gray-400" />}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200">
        {!isApiItem && (
          <ModernButton size="sm" variant="outline" onClick={onFullEdit} className="flex-1 hover-lift transition-smooth">
            <Edit3 className="w-4 h-4 mr-2" />
            Full Edit
          </ModernButton>
        )}
        <ModernButton
          size="sm"
          onClick={onCancel}
          className={`${isApiItem ? 'w-full' : 'flex-1'} bg-blue-600 hover:bg-blue-700 hover-lift transition-smooth`}
        >
          {isApiItem ? 'Close' : 'Done'}
        </ModernButton>
      </div>
      </div>
    </>
  );
}