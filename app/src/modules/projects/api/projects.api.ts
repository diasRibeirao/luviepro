import {api} from '../../../api';
import type {ProjectAssignee,ProjectRecord,ProjectStatus} from '../types/project.types';

export const projectsApi={
  list:()=>api<ProjectRecord[]>('/projects'),
  listStatuses:()=>api<ProjectStatus[]>('/project-statuses'),
  listAssignees:()=>api<ProjectAssignee[]>('/projects-assignees'),
  update:(id:string,data:{status?:string;progress?:number;assigneeUserId?:string})=>api<ProjectRecord>(`/projects/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
};
