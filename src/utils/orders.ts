import type { OrderStatus } from '../types';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
  'cancelled',
];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'on_the_way',
];

export const ORDER_PROGRESS_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
];

export function normalizeOrderStatus(status: unknown): OrderStatus {
  switch (status) {
    case 'new':
      return 'pending';
    case 'delivering':
      return 'on_the_way';
    case 'accepted':
    case 'preparing':
    case 'ready':
    case 'on_the_way':
    case 'delivered':
    case 'cancelled':
    case 'pending':
      return status;
    default:
      return 'pending';
  }
}

export function getNextOrderStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case 'pending':
      return 'accepted';
    case 'accepted':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'on_the_way';
    case 'on_the_way':
      return 'delivered';
    default:
      return null;
  }
}

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready';
    case 'on_the_way':
      return 'On the way';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function getOrderStatusClass(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'accepted':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'preparing':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'ready':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'on_the_way':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'delivered':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'cancelled':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
}

export function getEstimatedDeliveryWindow(status: OrderStatus): {
  min: number | null;
  max: number | null;
  label: string;
} {
  switch (status) {
    case 'pending':
      return { min: 35, max: 45, label: '35-45 min' };
    case 'accepted':
      return { min: 30, max: 40, label: '30-40 min' };
    case 'preparing':
      return { min: 20, max: 30, label: '20-30 min' };
    case 'ready':
      return { min: 10, max: 20, label: '10-20 min' };
    case 'on_the_way':
      return { min: 5, max: 15, label: '5-15 min' };
    case 'delivered':
      return { min: null, max: null, label: 'Completed' };
    case 'cancelled':
      return { min: null, max: null, label: 'Cancelled' };
  }
}

export function buildEstimatedDeliveryFields(status: OrderStatus, fromDate = new Date()) {
  const estimate = getEstimatedDeliveryWindow(status);
  const estimatedArrivalTime = estimate.max === null
    ? null
    : new Date(fromDate.getTime() + estimate.max * 60 * 1000).toISOString();

  return {
    estimatedMinutesMin: estimate.min,
    estimatedMinutesMax: estimate.max,
    estimatedArrivalTime,
  };
}
