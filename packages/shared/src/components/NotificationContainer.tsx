"use client";

import type React from "react";
import { useEffect, useState } from "react";
import TransactionNotification, {
	type TransactionNotificationProps,
} from "./TransactionNotification";

export interface Notification extends TransactionNotificationProps {
	id: string;
}

interface NotificationContainerProps {
	position?:
		| "top-right"
		| "top-left"
		| "bottom-right"
		| "bottom-left"
		| "top-center"
		| "bottom-center";
}

// Create a global notification system
let notificationQueue: Notification[] = [];
let notificationListeners: ((notifications: Notification[]) => void)[] = [];

export const addNotification = (
	notification: Omit<TransactionNotificationProps, "onDismiss">,
) => {
	const id = Math.random().toString(36).substring(2, 11);
	const newNotification: Notification = {
		...notification,
		id,
	};

	notificationQueue = [...notificationQueue, newNotification];
	notificationListeners.forEach((listener) => listener(notificationQueue));

	return id;
};

export const removeNotification = (id: string) => {
	notificationQueue = notificationQueue.filter(
		(notification) => notification.id !== id,
	);
	notificationListeners.forEach((listener) => listener(notificationQueue));
};

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
	position = "top-right",
}) => {
	const [notifications, setNotifications] = useState<Notification[]>([]);

	useEffect(() => {
		const handleNotificationsChange = (
			updatedNotifications: Notification[],
		) => {
			setNotifications([...updatedNotifications]);
		};

		notificationListeners.push(handleNotificationsChange);
		setNotifications([...notificationQueue]);

		return () => {
			notificationListeners = notificationListeners.filter(
				(listener) => listener !== handleNotificationsChange,
			);
		};
	}, []);

	const handleDismiss = (id: string) => {
		removeNotification(id);
	};

	const getPositionStyle = () => {
		switch (position) {
			case "top-right":
				return { top: "20px", right: "20px" };
			case "top-left":
				return { top: "20px", left: "20px" };
			case "bottom-right":
				return { bottom: "20px", right: "20px" };
			case "bottom-left":
				return { bottom: "20px", left: "20px" };
			case "top-center":
				return { top: "20px", left: "50%", transform: "translateX(-50%)" };
			case "bottom-center":
				return { bottom: "20px", left: "50%", transform: "translateX(-50%)" };
			default:
				return { top: "20px", right: "20px" };
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				zIndex: 9999,
				width: "350px",
				maxWidth: "90%",
				...getPositionStyle(),
			}}
		>
			{notifications.map((notification) => (
				<TransactionNotification
					key={notification.id}
					{...notification}
					onDismiss={() => handleDismiss(notification.id)}
				/>
			))}
		</div>
	);
};

export default NotificationContainer;
