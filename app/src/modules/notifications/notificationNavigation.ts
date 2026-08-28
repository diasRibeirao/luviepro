import type { Href } from 'expo-router';

export type NotificationRoute='/calendar'|`/projects/${string}`|`/quote/${string}`;

const dynamicRoutePatterns=[
  /^\/projects\/[^/?#]+$/,
  /^\/quote\/[^/?#]+$/,
];

export function isNotificationRoute(value:string):value is NotificationRoute{
  return value==='/calendar'||dynamicRoutePatterns.some(pattern=>pattern.test(value));
}

export function notificationHref(value:string|null|undefined):Href|null{
  if(!value||!isNotificationRoute(value))return null;
  return value as Href;
}
