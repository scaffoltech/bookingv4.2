export type TaskType =
  | 'book_hotel'
  | 'book_flight'
  | 'book_activity'
  | 'book_transfer'
  | 'upload_confirmation'
  | 'verify_booking'
  | 'contact_supplier'
  | 'send_documents'
  | 'manual_booking'
  | 'follow_up'
  | 'document_collection'
  | 'api_booking'
  | 'price_review'
  | 'awaiting_supplier'
  | 'booking_failed'
  | 'passenger_details'
  | 'booking_ready'
  | 'awaiting_payment';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

/**
 * Booking Task - Manual tasks for agents to complete bookings
 */
export interface BookingTask {
  id: string;

  // Task details
  type: TaskType;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;

  // Assignment
  assignedTo?: string; // Agent ID
  assignedToName?: string; // Agent name

  // Related entities
  quoteId: string;
  quoteItemId?: string; // Specific item if task is item-specific
  bookingId?: string; // Linked booking record
  bookingItemId?: string; // Linked booking item
  customerId: string;
  customerName: string;

  // Item details (for context)
  itemType?: 'flight' | 'hotel' | 'activity' | 'transfer';
  itemName?: string;
  itemDetails?: Record<string, any>;

  // Deadlines
  dueDate?: string;
  completedAt?: string;

  // Documents
  attachments?: TaskAttachment[];

  // Notes
  notes?: string;
  blockedReason?: string; // If status is 'blocked'

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Task Attachment - Documents uploaded for tasks
 */
export interface TaskAttachment {
  id: string;
  taskId: string;

  // File details
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // Bytes
  fileUrl?: string; // If stored externally
  fileData?: string; // Base64 if stored inline

  // Metadata
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;

  // Classification
  documentType?: 'booking_confirmation' | 'invoice' | 'voucher' | 'receipt' | 'correspondence' | 'other';
  notes?: string;
}

/**
 * Task Filter Options
 */
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  type?: TaskType[];
  assignedTo?: string;
  customerId?: string;
  quoteId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

/**
 * Task Summary Statistics
 */
export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  blocked: number;
  overdue: number;
  dueToday: number;
  dueSoon: number; // Due within 3 days
}
