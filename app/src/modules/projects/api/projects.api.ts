import {api} from '../../../api';
import type {ProjectRecord,ProjectStatus} from '../types/project.types';

export const projectsApi={
  list:()=>api<ProjectRecord[]>('/projects'),
  listStatuses:()=>api<ProjectStatus[]>('/project-statuses'),
};
