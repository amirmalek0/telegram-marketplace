import type { DeliveryType } from './types'

export const deliveryLabels: Record<DeliveryType, string> = {
  file: 'فایل',
  message: 'پیام',
  inventory: 'کد آماده',
  bundle: 'بسته',
  api: 'تحویل API',
}

export const deliveryGradients: Record<DeliveryType, string> = {
  file: 'gradient-blue',
  message: 'gradient-purple',
  inventory: 'gradient-orange',
  bundle: 'gradient-green',
  api: 'gradient-pink',
}
