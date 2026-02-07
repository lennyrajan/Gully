/**
 * Notifications Utility
 * Firebase Cloud Messaging and local notification handling
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

let messaging = null;

/**
 * Initialize Firebase Cloud Messaging
 * Must be called after Firebase has been initialized
 */
export async function initializeMessaging() {
    if (typeof window === 'undefined') return null;

    try {
        const { getApp } = await import('firebase/app');
        const app = getApp();
        messaging = getMessaging(app);
        return messaging;
    } catch (error) {
        console.error('Error initializing FCM:', error);
        return null;
    }
}

/**
 * Request notification permission and get FCM token
 * @param {string} userId - Current user's ID
 * @returns {Promise<string|null>} - FCM token or null
 */
export async function requestNotificationPermission(userId) {
    if (typeof window === 'undefined') return null;

    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Get FCM token
        if (!messaging) {
            await initializeMessaging();
        }

        if (!messaging) {
            console.log('FCM not available, using local notifications only');
            return null;
        }

        // You'll need to add your VAPID key from Firebase console
        const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ''
        });

        if (token && userId) {
            // Save token to user's profile for sending targeted notifications
            await saveTokenToUser(userId, token);
        }

        return token;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
}

/**
 * Save FCM token to user's Firestore document
 * @param {string} userId - User's ID
 * @param {string} token - FCM token
 */
async function saveTokenToUser(userId, token) {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            fcmTokens: arrayUnion(token),
            notificationsEnabled: true
        });
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
}

/**
 * Listen for foreground messages
 * @param {function} callback - Handler for received messages
 */
export function onForegroundMessage(callback) {
    if (!messaging) return null;

    return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);

        // Show local notification for foreground messages
        if (payload.notification) {
            showLocalNotification(
                payload.notification.title,
                payload.notification.body,
                payload.data
            );
        }
    });
}

/**
 * Show a local notification (fallback or for foreground)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
export function showLocalNotification(title, body, data = {}) {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return;
    }

    if (Notification.permission !== 'granted') {
        console.log('Notification permission not granted');
        return;
    }

    const notification = new Notification(title, {
        body,
        icon: '/next.svg',
        badge: '/next.svg',
        tag: data.tag || 'gully-notification',
        data,
        requireInteraction: data.requireInteraction || false
    });

    notification.onclick = () => {
        window.focus();
        if (data.url) {
            window.location.href = data.url;
        }
        notification.close();
    };

    return notification;
}

/**
 * Subscribe user to a topic (e.g., team channel)
 * Note: Topic subscription requires server-side implementation
 * This function prepares the data; actual subscription happens server-side
 * @param {string} userId - User's ID
 * @param {string} topic - Topic name (e.g., 'team_xyz')
 */
export async function subscribeToTopic(userId, topic) {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            subscribedTopics: arrayUnion(topic)
        });
        console.log(`User subscribed to topic: ${topic}`);
    } catch (error) {
        console.error('Error subscribing to topic:', error);
    }
}

/**
 * Check if notifications are enabled
 * @returns {boolean}
 */
export function areNotificationsEnabled() {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
}

/**
 * Get notification permission status
 * @returns {string} - 'granted', 'denied', 'default', or 'unsupported'
 */
export function getNotificationPermissionStatus() {
    if (typeof window === 'undefined') return 'unsupported';
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

// Notification templates
export const NOTIFICATION_TYPES = {
    MATCH_REMINDER: 'match_reminder',
    SCORE_UPDATE: 'score_update',
    TEAM_ANNOUNCEMENT: 'team_announcement',
    AVAILABILITY_REQUEST: 'availability_request',
    FINE_ISSUED: 'fine_issued'
};

/**
 * Create notification payload for common scenarios
 * @param {string} type - Notification type from NOTIFICATION_TYPES
 * @param {object} data - Data for the notification
 * @returns {object} - Notification payload
 */
export function createNotificationPayload(type, data) {
    switch (type) {
        case NOTIFICATION_TYPES.MATCH_REMINDER:
            return {
                title: `Match Tomorrow! 🏏`,
                body: `vs ${data.opponent} at ${data.venue}, ${data.time}`,
                data: {
                    type,
                    matchId: data.matchId,
                    url: `/availability`
                }
            };

        case NOTIFICATION_TYPES.SCORE_UPDATE:
            return {
                title: `Live Score Update`,
                body: `${data.team}: ${data.score}/${data.wickets} (${data.overs} ov)`,
                data: {
                    type,
                    matchId: data.matchId,
                    url: `/live/${data.matchId}`
                }
            };

        case NOTIFICATION_TYPES.TEAM_ANNOUNCEMENT:
            return {
                title: `📢 Team Update`,
                body: data.message,
                data: {
                    type,
                    teamId: data.teamId,
                    url: `/teams/manage`
                }
            };

        case NOTIFICATION_TYPES.AVAILABILITY_REQUEST:
            return {
                title: `Availability Request`,
                body: `Mark your availability for ${data.opponent} on ${data.date}`,
                data: {
                    type,
                    gameId: data.gameId,
                    url: `/availability`
                }
            };

        case NOTIFICATION_TYPES.FINE_ISSUED:
            return {
                title: `Fine Issued 💰`,
                body: `${data.reason} - $${data.amount}`,
                data: {
                    type,
                    fineId: data.fineId,
                    url: `/fees`
                }
            };

        default:
            return {
                title: data.title || 'Gully Cricket',
                body: data.body || '',
                data
            };
    }
}
