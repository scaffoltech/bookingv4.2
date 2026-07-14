import { TaskSummary, TaskStatus } from '@/types/task';
import { useTasksQuery } from '@/hooks/queries/useTasksQuery';
import { useTaskMutations } from '@/hooks/mutations/useTaskMutations';
import { useAttachmentStore } from '@/store/attachment-store';

// ponytail: drop-in replacement for the old localStorage task-store,
// scoped to the methods consumers actually call.
export function useTaskCompat() {
  const { data: tasks = [] } = useTasksQuery();
  const mutations = useTaskMutations();
  const { addAttachment, getAttachmentsByTask } = useAttachmentStore();

  const assignTask = async (id: string, agentId: string, agentName: string) => {
    await mutations.assignTask.mutateAsync({ id, agentId, agentName });
  };

  const completeTask = async (id: string, completionNotes?: string) => {
    await mutations.completeTask.mutateAsync({ id, completionNotes });
  };

  const updateTaskStatus = async (id: string, status: TaskStatus, notes?: string) => {
    await mutations.updateTaskStatus.mutateAsync({ id, status, notes });
  };

  const getDueToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow);
  };

  const getDueSoon = (days = 3) => {
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + days);
    return tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= soon;
    });
  };

  const getTaskSummary = (agentId?: string): TaskSummary => {
    const list = agentId ? tasks.filter((t) => t.assignedTo === agentId) : tasks;
    const now = new Date();
    const overdue = list.filter((t) => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
      return new Date(t.dueDate) < now;
    });
    const dueToday = getDueToday().filter((t) => (agentId ? t.assignedTo === agentId : true));
    const dueSoon = getDueSoon(3).filter((t) => (agentId ? t.assignedTo === agentId : true));

    return {
      total: list.length,
      pending: list.filter((t) => t.status === 'pending').length,
      inProgress: list.filter((t) => t.status === 'in_progress').length,
      completed: list.filter((t) => t.status === 'completed').length,
      cancelled: list.filter((t) => t.status === 'cancelled').length,
      blocked: list.filter((t) => t.status === 'blocked').length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueSoon: dueSoon.length,
    };
  };

  return {
    tasks,
    assignTask,
    completeTask,
    updateTaskStatus,
    getTaskSummary,
    addAttachment,
    getAttachmentsByTask,
  };
}
