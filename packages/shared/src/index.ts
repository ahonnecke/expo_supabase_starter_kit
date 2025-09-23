// packages/shared/src/index.ts

export type { Notification } from "./components/NotificationContainer";
export {
	addNotification,
	default as NotificationContainer,
	removeNotification,
} from "./components/NotificationContainer";
export type { TransactionNotificationProps } from "./components/TransactionNotification";

// Components
export { default as TransactionNotification } from "./components/TransactionNotification";
export * from "./supabase";
export * from "./types";
export * from "./utils/telemetry";
