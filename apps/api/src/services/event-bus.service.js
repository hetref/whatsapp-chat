import { EventEmitter } from 'node:events';

class ChatEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(200);
    }

    /**
     * Broadcast a message status update to subscribers
     * @param {Object} event
     * @param {string} event.userId
     * @param {string} [event.contactId]
     * @param {string} event.messageId
     * @param {'PENDING'|'SENT'|'DELIVERED'|'READ'|'FAILED'} event.status
     * @param {string} [event.timestamp]
     * @param {string} [event.deliveredAt]
     * @param {string} [event.readAt]
     * @param {string} [event.errorMessage]
     * @param {string} [event.recipientId]
     */
    publishStatusUpdate(event) {
        const payload = {
            type: 'status_update',
            messageId: event.messageId,
            status: event.status.toLowerCase(),
            statusUpper: event.status,
            deliveredAt: event.deliveredAt || null,
            readAt: event.readAt || null,
            errorMessage: event.errorMessage || null,
            timestamp: event.timestamp || new Date().toISOString(),
            contactId: event.contactId || null,
            recipientId: event.recipientId || null,
        };

        // Emit for specific user
        if (event.userId) {
            this.emit(`user:${event.userId}`, payload);
        }

        // Emit for specific contact/conversation if known
        if (event.contactId) {
            this.emit(`conversation:${event.contactId}`, payload);
        }

        // Global emit for listeners
        this.emit('status_update', { ...payload, userId: event.userId });
    }

    /**
     * Broadcast a newly received or created message
     * @param {Object} event
     * @param {string} event.userId
     * @param {string} [event.contactId]
     * @param {Object} event.message
     */
    publishNewMessage(event) {
        const payload = {
            type: 'new_message',
            message: event.message,
            contactId: event.contactId || event.message?.contactId,
        };

        if (event.userId) {
            this.emit(`user:${event.userId}`, payload);
        }

        if (event.contactId) {
            this.emit(`conversation:${event.contactId}`, payload);
        }

        this.emit('new_message', { ...payload, userId: event.userId });
    }
}

export const chatEventBus = new ChatEventBus();
