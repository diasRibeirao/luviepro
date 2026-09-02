export type ProjectAssignee={id:string;name:string;email?:string|null};

export type ProjectTask={
  status:string;
  priority?:string|null;
  dueDate?:string|null;
  assigneeUserId?:string|null;
  assignee?:ProjectAssignee|null;
};

export type ProjectStatus={
  key:string;
  name:string;
  color:string;
  active:boolean;
};

export type ProjectRecord={
  id:string;
  name:string;
  status:string;
  progress:number;
  startDate?:string|null;
  endDate?:string|null;
  assigneeUserId?:string|null;
  assignee?:ProjectAssignee|null;
  clientId?:string;
  client?:{id?:string;name?:string|null}|null;
  quote?:{number:string;finalTotalCents?:number|null;totalCents:number}|null;
  tasks?:ProjectTask[];
};
