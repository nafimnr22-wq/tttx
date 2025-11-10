export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'peer-discovery' | 'peer-info';
    from: string;
    fromName: string;
    to?: string;
    data?: unknown;
    roomId?: string;
}

export class LocalSignalingServer {
    private onSignal?: (message: SignalingMessage) => void;
    private peerId: string;
    private peerName: string;
    private roomId?: string;
    private isClosed = false;
    private pollInterval: NodeJS.Timeout | null = null;
    private lastMessageId = -1;
    private apiUrl: string;

    constructor(peerId: string, peerName: string, roomId?: string) {
        this.peerId = peerId;
        this.peerName = peerName;
        this.roomId = roomId;
        this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        console.log('Signaling initialized for', peerName, 'in room:', roomId || 'global');
        this.startPolling();
    }

    private startPolling() {
        // Poll more frequently for better real-time experience
        this.pollInterval = setInterval(() => {
            this.pollMessages();
        }, 300);
    }

    private async pollMessages() {
        if (this.isClosed) return;
        try {
            let url = `${this.apiUrl}/api/signaling?lastId=${this.lastMessageId}&peerId=${this.peerId}`;
            if (this.roomId) {
                url += `&roomId=${this.roomId}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const messages: any[] = await response.json();

                if (messages.length > 0) {
                    console.log(`Received ${messages.length} signaling messages for room: ${this.roomId || 'global'}`);
                }

                messages.forEach((msg: any) => {
                    if (msg.id !== undefined) {
                        this.lastMessageId = Math.max(this.lastMessageId, msg.id);
                    }

                    if (this.roomId && msg.roomId !== this.roomId) {
                        return;
                    }

                    if (msg.from === this.peerId) {
                        return;
                    }

                    this.onSignal?.(msg);
                });
            }
        } catch (error) {
            console.error('Failed to poll messages:', error);
        }
    }

    setOnSignal(callback: (message: SignalingMessage) => void) {
        this.onSignal = callback;
    }

    send(message: Omit<SignalingMessage, 'from' | 'fromName'>) {
        if (this.isClosed) return;

        const fullMessage = {
            ...message,
            from: this.peerId,
            fromName: this.peerName,
            roomId: this.roomId,
        };

        console.log('Sending signal:', fullMessage.type, 'to:', fullMessage.to || 'broadcast', 'room:', this.roomId || 'global');

        fetch(`${this.apiUrl}/api/signaling`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullMessage),
        }).catch(err => console.error('Failed to send signal:', err));
    }

    broadcast(type: SignalingMessage['type'], data?: unknown) {
        this.send({ type, data });
    }

    close() {
        console.log('Closing signaling server for room:', this.roomId || 'global');
        this.isClosed = true;
        if (this.pollInterval) clearInterval(this.pollInterval);
    }
}