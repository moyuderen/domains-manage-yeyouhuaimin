import type { NotificationDelivery, NotificationEndpoint } from '@/types/notification'

export type ChannelSender = (input: {
  delivery: NotificationDelivery
  endpoint: NotificationEndpoint
}) => Promise<{ success: true; providerMessageId?: string } | { success: false; errorMessage: string }>
