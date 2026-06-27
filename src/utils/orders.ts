import type { OrderStatus } from '../types';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
];

export function normalizeOrderStatus(status: unknown): OrderStatus {
  switch (status) {
    case 'new':
      return 'pending';
    case 'delivering':
      return 'ready';
    case 'accepted':
    case 'preparing':
    case 'ready':
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
    case 'delivered':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'cancelled':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
  }
}
