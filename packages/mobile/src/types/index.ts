export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status?: string;
  calendar_event_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  source?: string;
}

export type RootStackParamList = {
  Home: undefined;
  TodoList: { refresh?: boolean } | undefined;
  AddTask: { task?: Task } | undefined;
  TaskDetail: { task: Task };
  EditTask: { task: Task };
  Login: undefined;
  Register: undefined;
};

export type NavigationProps = {
  navigation: any;
  route?: any;
};
