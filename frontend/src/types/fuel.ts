import { FuelAlertStatus, PaymentMethod } from './enums';
export type FuelRecord = { id: number; vehicleId: number; date: string; liters: number; unitPrice: number; totalAmount: number; mileage: number; station: string; paymentMethod: PaymentMethod };
export type FuelAlert = { id: number; alertNo: string; vehicleId: number; plateNo: string; prevRecord: FuelRecord; currRecord: FuelRecord; segmentConsumption: number; baselineConsumption: number; increasePct: number; status: FuelAlertStatus; reason: string; closedBy: string; createdAt: string; closedAt: string | null };
