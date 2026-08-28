export type NotificationRoute = '/calendar' | `/projects/${string}` | `/quote/${string}`;

function segment(id:string){
  return encodeURIComponent(id);
}

export const notificationRoutes={
  calendar:'/calendar' as const,
  project:(projectId:string):NotificationRoute=>`/projects/${segment(projectId)}`,
  quote:(quoteId:string):NotificationRoute=>`/quote/${segment(quoteId)}`,
};
