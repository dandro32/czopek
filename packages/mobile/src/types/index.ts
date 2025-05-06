export interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status?: string;
  calendar_event_id?: string;
}

export type RootStackParamList = {
  Home: undefined;
  TodoList: undefined;
  AddTask: undefined;
  TaskDetail: { task: Task };
  Login: undefined;
  Register: undefined;
};

export type NavigationProps = {
  navigation: any;
  route?: any;
};
