import { api } from '../../../api';
import type { SaveServicePayload, ServiceRecord } from '../types/service.types';

export const servicesApi = {
  list: () => api<ServiceRecord[]>('/services'),

  create: (payload: SaveServicePayload) =>
    api<ServiceRecord>('/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: SaveServicePayload) =>
    api<ServiceRecord>(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  reorder: (id: string, direction: 'up'|'down') =>
    api<ServiceRecord[]>(`/services/${id}/order`, {
      method: 'PATCH',
      body: JSON.stringify({direction}),
    }),
};
