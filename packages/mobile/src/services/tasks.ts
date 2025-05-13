import { get, post, put, del } from './apiClient';

// Interfejsy
export interface Task {
  id: string; // MongoDB używa string jako ID
  title: string;
  description?: string;
  due_date?: string;
  priority: string;
  status: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  source?: string;
  calendar_event_id?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status?: string;
}

export interface TaskList {
  tasks: Task[];
  calendar_imported: boolean;
  total_count: number;
  pending_count: number;
  completed_count: number;
}

// Funkcje do zarządzania zadaniami
export const fetchTasks = async (): Promise<TaskList> => {
  try {
    return await get<TaskList>('/tasks');
  } catch (error) {
    console.error('Błąd podczas pobierania listy zadań:', error);
    // Zwracamy pustą listę w przypadku błędu
    return {
      tasks: [],
      calendar_imported: false,
      total_count: 0,
      pending_count: 0,
      completed_count: 0,
    };
  }
};

export const fetchTask = async (taskId: string): Promise<Task> => {
  return await get<Task>(`/tasks/${taskId}`);
};

export const createTask = async (taskData: TaskCreate): Promise<Task> => {
  return await post<Task>('/tasks', taskData);
};

export const updateTask = async (
  taskId: string,
  taskData: Partial<TaskCreate>
): Promise<Task> => {
  return await put<Task>(`/tasks/${taskId}`, taskData);
};

export const deleteTask = async (
  taskId: string
): Promise<{ message: string }> => {
  return await del<{ message: string }>(`/tasks/${taskId}`);
};

export const toggleTaskStatus = async (
  taskId: string,
  currentStatus: string
): Promise<Task> => {
  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  return await updateTask(taskId, { status: newStatus });
};
