export enum FuelAlertStatus { Open = 'Open', Closed = 'Closed' }

export type FuelAlert = {
  id: number;
  vehicleId: number;
  previousRefuelId: number;
  currentRefuelId: number;
  previousRefuel: Record<string, unknown>;
  currentRefuel: Record<string, unknown>;
  measuredConsumption: number;
  baselineConsumption: number;
  increasePercent: number;
  status: FuelAlertStatus;
  reason: string;
  inspector: string;
  createdAt: string | null;
  closedAt: string | null;
};
