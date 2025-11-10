import { useEffect, useState, useCallback, useRef } from 'react';
import { WebRTCManager, Peer, Message, FileTransfer } from '../utils/webrtc';
import { LocalSignalingServer, SignalingMessage } from '../utils/signaling';

export function useLocalNetwork(userName: string, roomId?: string) {
    const webrtcRef = useRef<WebRTCManager | null>(null);
    const signalingRef = useRef<LocalSignalingServer | null>(null);
    const initializingRef = useRef(false);
    const [localPeerId, setLocalPeerId] = useState('');
    const [localPeerName, setLocalPeerName] = useState('');

    const [peers, setPeers] = useState<Peer[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    useEffect(() => {
        if (!userName) {
            return;
        }

        if (initializingRef.current) {
            return;
        }

        initializingRef.current = true;
        let isActive = true;

        const webrtc = new WebRTCManager(userName);
        webrtcRef.current = webrtc;
        setLocalPeerId(webrtc.getLocalPeerId());
        setLocalPeerName(webrtc.getLocalPeerName());

        const signaling = new LocalSignalingServer(
            webrtc.getLocalPeerId(),
            userName,
            roomId
        );
        signalingRef.current = signaling;

        const peersRef = new Map<string, Peer>();
        const pendingConnections = new Set<string>();

        webrtc.setOnPeerUpdate((updatedPeers) => {
            if (!isActive) return;
            setPeers([...updatedPeers]);
            updatedPeers.forEach(p => peersRef.set(p.id, p));
        });

        webrtc.setOnMessage((message) => {
            if (!isActive) return;
            setMessages(prev => [...prev, message]);
        });

        webrtc.setOnFileTransfer((transfer) => {
            if (!isActive) return;
            setFileTransfers(prev => [...prev, transfer]);
        });

        signaling.setOnSignal(async (message: SignalingMessage) => {
            if (!isActive) return;

            if (message.type === 'peer-discovery') {
                const existingPeer = peersRef.get(message.from);

                if (message.from === webrtc.getLocalPeerId()) {
                    return;
                }

                const shouldInitiate = !existingPeer &&
                    !pendingConnections.has(message.from) &&
                    webrtc.getLocalPeerId() > message.from;

                if (shouldInitiate) {
                    console.log('🤝 Initiating connection to:', message.fromName);
                    pendingConnections.add(message.from);

                    try {
                        const peerConnection = await webrtc.createPeerConnection(message.from, message.fromName);

                        peerConnection.onicecandidate = (event) => {
                            if (event.candidate && isActive) {
                                signaling.send({
                                    type: 'ice-candidate',
                                    to: message.from,
                                    data: event.candidate,
                                });
                            }
                        };

                        const offer = await peerConnection.createOffer();
                        await peerConnection.setLocalDescription(offer);

                        signaling.send({
                            type: 'offer',
                            to: message.from,
                            data: offer,
                        });

                        console.log('✅ Sent offer to:', message.fromName);
                    } catch (error) {
                        console.error('❌ Error creating offer:', error);
                        pendingConnections.delete(message.from);
                    }
                }
            } else if (message.type === 'offer') {
                console.log('📥 Received offer from:', message.fromName);

                try {
                    let peerConnection = peersRef.get(message.from)?.connection;

                    if (!peerConnection) {
                        peerConnection = await webrtc.createPeerConnection(message.from, message.fromName);

                        peerConnection.onicecandidate = (event) => {
                            if (event.candidate && isActive) {
                                signaling.send({
                                    type: 'ice-candidate',
                                    to: message.from,
                                    data: event.candidate,
                                });
                            }
                        };
                    }

                    await peerConnection.setRemoteDescription(
                        new RTCSessionDescription(message.data as RTCSessionDescriptionInit)
                    );

                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);

                    signaling.send({
                        type: 'answer',
                        to: message.from,
                        data: answer,
                    });

                    console.log('✅ Sent answer to:', message.fromName);
                } catch (error) {
                    console.error('❌ Error handling offer:', error);
                }
            } else if (message.type === 'answer') {
                console.log('📥 Received answer from:', message.fromName);

                const peer = peersRef.get(message.from);
                if (peer?.connection) {
                    try {
                        if (peer.connection.signalingState === 'have-local-offer') {
                            await peer.connection.setRemoteDescription(
                                new RTCSessionDescription(message.data as RTCSessionDescriptionInit)
                            );
                            pendingConnections.delete(message.from);
                            console.log('✅ Connected to:', message.fromName);
                        }
                    } catch (error) {
                        console.error('❌ Error setting remote description:', error);
                    }
                }
            } else if (message.type === 'ice-candidate') {
                const peer = peersRef.get(message.from);
                if (peer?.connection) {
                    try {
                        await peer.connection.addIceCandidate(
                            new RTCIceCandidate(message.data as RTCIceCandidateInit)
                        );
                    } catch (error) {
                        console.error('❌ Error adding ICE candidate:', error);
                    }
                }
            }
        });

        const discoveryInterval = setInterval(() => {
            if (isActive) {
                signaling.broadcast('peer-discovery');
            }
        }, 2000);

        signaling.broadcast('peer-discovery');
        setTimeout(() => {
            if (isActive) {
                signaling.broadcast('peer-discovery');
            }
        }, 500);

        return () => {
            isActive = false;
            initializingRef.current = false;
            clearInterval(discoveryInterval);
            webrtc.cleanup();
            signaling.close();
        };
    }, [userName, roomId]);

    const startVideo = useCallback(async () => {
        if (!webrtcRef.current) return;

        try {
            const stream = await webrtcRef.current.initLocalStream(true, true);
            setLocalStream(stream);
        } catch (error) {
            console.error('Failed to start video:', error);
            try {
                const stream = await webrtcRef.current.initLocalStream(false, true);
                setLocalStream(stream);
                setIsVideoEnabled(false);
            } catch (audioError) {
                console.error('Failed to start audio:', audioError);
            }
        }
    }, []);

    const sendMessage = useCallback((content: string) => {
        webrtcRef.current?.sendMessage(content);
    }, []);

    const sendFile = useCallback((file: File) => {
        webrtcRef.current?.sendFile(file);
    }, []);

    const toggleAudio = useCallback(() => {
        if (!webrtcRef.current) return;
        const newState = !isAudioEnabled;
        webrtcRef.current.toggleAudio(newState);
        setIsAudioEnabled(newState);
    }, [isAudioEnabled]);

    const toggleVideo = useCallback(() => {
        if (!webrtcRef.current) return;
        const newState = !isVideoEnabled;
        webrtcRef.current.toggleVideo(newState);
        setIsVideoEnabled(newState);
    }, [isVideoEnabled]);

    const cleanup = useCallback(() => {
        webrtcRef.current?.cleanup();
        signalingRef.current?.close();

        const activeCallId = localStorage.getItem('activeCallId');
        if (activeCallId) {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            fetch(`${API_URL}/api/calls/${activeCallId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ended' }),
            }).catch(err => console.error('Failed to end call:', err));
            localStorage.removeItem('activeCallId');
        }
    }, []);

    return {
        peers,
        messages,
        fileTransfers,
        localStream,
        isAudioEnabled,
        isVideoEnabled,
        startVideo,
        sendMessage,
        sendFile,
        toggleAudio,
        toggleVideo,
        cleanup,
        localPeerId,
        localPeerName,
    };
}
