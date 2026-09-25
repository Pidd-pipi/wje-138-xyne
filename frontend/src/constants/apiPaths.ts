export const apiPaths = {
  vehicles: '/api/vehicles/',
  drivers: '/api/drivers/',
  dispatch: '/api/dispatch-orders/',
  maintenance: '/api/maintenance-records/',
  fuel: '/api/fuel-records/',
  fuelAlerts: '/api/fuel-alerts/',
  fuelAlertClose: (id: number) => `/api/fuel-alerts/${id}/close/`
} as const;
