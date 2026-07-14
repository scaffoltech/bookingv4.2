import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TaskAttachment } from '@/types/task';

// ponytail: no `task_attachments` table exists in the live schema — kept as
// a local UI store like rate/settings/sidebar. Add a real table + hooks if
// attachments need to survive across devices/agents.
interface AttachmentStore {
  attachments: TaskAttachment[];
  addAttachment: (attachmentData: Omit<TaskAttachment, 'id' | 'uploadedAt'>) => string;
  deleteAttachment: (id: string) => void;
  getAttachmentsByTask: (taskId: string) => TaskAttachment[];
}

export const useAttachmentStore = create<AttachmentStore>()(
  persist(
    (set, get) => ({
      attachments: [],

      addAttachment: (attachmentData) => {
        const id = crypto.randomUUID();
        const attachment: TaskAttachment = {
          ...attachmentData,
          id,
          uploadedAt: new Date().toISOString(),
        };
        set((state) => ({ attachments: [...state.attachments, attachment] }));
        return id;
      },

      deleteAttachment: (id) => {
        set((state) => ({ attachments: state.attachments.filter((a) => a.id !== id) }));
      },

      getAttachmentsByTask: (taskId) => {
        return get().attachments.filter((a) => a.taskId === taskId);
      },
    }),
    { name: 'attachment-store' }
  )
);
