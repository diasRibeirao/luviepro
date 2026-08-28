export type ProjectTask={
  status:string;
  priority?:string|null;
  dueDate?:string|null;
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
  client?:{name?:string|null}|null;
  quote?:{number:string;finalTotalCents?:number|null;totalCents:number}|null;
  tasks?:ProjectTask[];
};
