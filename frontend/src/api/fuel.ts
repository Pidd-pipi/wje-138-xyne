import { request } from '../utils/request';
import { apiPaths } from '../constants/apiPaths';
import type { FuelAlert, FuelAlertStatus, FuelRecord } from '../types';
export const fuelApi = {
  list: () => request<FuelRecord[]>(apiPaths.fuel),
  listAlerts: (status?: FuelAlertStatus) => request<FuelAlert[]>(status ? `${apiPaths.fuelAlerts}?status=${status}` : apiPaths.fuelAlerts),
  closeAlert: (id: number, reason: string) => request<FuelAlert>(`${apiPaths.fuelAlerts}${id}/close/`, { method: 'POST', body: JSON.stringify({ reason }) }),
};
