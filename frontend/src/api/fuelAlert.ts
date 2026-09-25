import { request } from '../utils/request';
import { apiPaths } from '../constants/apiPaths';
import type { FuelAlert } from '../types';

export const fuelAlertApi = {
  list: (status?: string) =>
    request<FuelAlert[]>(apiPaths.fuelAlerts + (status ? `?status=${status}` : '')),
  scan: () =>
    request<FuelAlert[]>(apiPaths.fuelAlerts, { method: 'POST', body: JSON.stringify({}) }),
  close: (id: number, reason: string, inspector?: string) =>
    request<FuelAlert>(apiPaths.fuelAlertClose(id), {
      method: 'POST',
      body: JSON.stringify({ reason, inspector }),
    }),
};
