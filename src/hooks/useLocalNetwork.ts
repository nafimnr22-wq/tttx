import { useEffect, useState, useCallback, useRef } from 'react';
import { WebRTCManager, Peer, Message, FileTransfer } from '../utils/webrtc';
import { LocalSignalingServer, SignalingMessage } from '../utils/signaling';

export function useLocalNetwork(userName: string, roomId?: string) {
    console.log('🚀 useLocalNetwork called with userName:', userName || '(empty)', 'roomId:', roomId);

    const webrtcRef = useRef<WebRTCManager | null>(null);
    const signalingRef = useRef<LocalSignalingServer | null>(null);
    const initializingRef = useRef(false);
    const currentRoomRef = useRef<string | undefined>(roomId);

    if ((!webrtcRef.current || currentRoomRef.current !== roomId) && userName) {
        if (webrtcRef.current && currentRoomRef.current !== roomId) {
            console.log('Room changed, cleaning up old connection');
            webrtcRef.current.cleanup();
            signalingRef.current?.close();
        }
        webrtcRef.current = new WebRTCManager(userName || 'Guest');
        console.log('Created WebRTCManager with peer ID:', webrtcRef.current.getLocalPeerId());
        currentRoomRef.current = roomId;
    }

    if ((!signalingRef.current || currentRoomRef.current !== roomId) && userName && webrtcRef.current) {
        if (signalingRef.current && currentRoomRef.current !== roomId) {
            signalingRef.current.close();
        }
        signalingRef.current = new LocalSignalingServer(
            webrtcRef.current.getLocalPeerId(),
            userName || 'Guest',
            roomId
        );
        console.log('Created LocalSignalingServer for room:', roomId || 'global');
        currentRoomRef.current = roomId;
    }

    const [peers, setPeers] = useState<Peer[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    useEffect(() => {
        if (!userName || !webrtcRef.current || !signalingRef.current) {
            console.log('⏳ Waiting for username...');
            return;
        }

        if (initializingRef.current) {
            console.log('⏳ Already initializing...');
            return;
        }

        initializingRef.current = true;
        let isActive = true;
        const webrtc = webrtcRef.current;
        const signaling = signalingRef.current;
        const peersRef = new Map<string, Peer>();
        const pendingConnections = new Set<string>();

        webrtc.setOnPeerUpdate((updatedPeers) => {
            if (!isActive) return;
            console.log('👥 Peer update:', updatedPeers.length, 'peers');
            setPeers([...updatedPeers]);
            updatedPeers.forEach(p => peersRef.set(p.id, p));
        });

        webrtc.setOnMessage((message) => {
            if (!isActive) return;
            console.log('💬 New message from:', message.peerName);
            setMessages(prev => [...prev, message]);
        });

        webrtc.setOnFileTransfer((transfer) => {
            if (!isActive) return;
            console.log('📁 New file transfer:', transfer.name);
            setFileTransfers(prev => [...prev, transfer]);
        });

        signaling.setOnSignal(async (message: SignalingMessage) => {
            if (!isActive) return;

            console.log('📨 Received signal:', message.type, 'from:', message.fromName, 'peerId:', message.from);

            if (message.type === 'peer-discovery') {
                const existingPeer = peersRef.get(message.from);

                // Don't connect to ourselves
                if (message.from === webrtc.getLocalPeerId()) {
                    return;
                }

                const shouldInitiate = !existingPeer &&
                    !pendingConnections.has(message.from) &&
                    webrtc.getLocalPeerId() > message.from;

                if (shouldInitiate) {
                    console.log('🤝 New peer discovered, initiating connection:', message.fromName);
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
                } else if (!existingPeer) {
                    console.log('⏳ Waiting for offer from:', message.fromName);
                }
            } else if (message.type === 'offer') {
                console.log('📥 Received offer from:', message.fromName);

                try {
                    let peerConnection = peersRef.get(message.from)?.connection;

                    if (!peerConnection) {
                        console.log('🆕 Creating new peer connection for:', message.fromName);
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
                            console.log('✅ Connection established with:', message.fromName);
                        } else {
                            console.warn('⚠️ Invalid state for answer:', peer.connection.signalingState);
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
                        console.log('✅ Added ICE candidate from:', message.fromName);
                    } catch (error) {
                        console.error('❌ Error adding ICE candidate:', error);
                    }
                }
            }
        });

        const discoveryInterval = setInterval(() => {
            if (isActive) {
                signaling.broadcast('peer-discovery');
                console.log('Broadcasting discovery for room:', roomId || 'global');
            }
        }, 1500);

        if (isActive) {
            signaling.broadcast('peer-discovery');
            console.log('Initial discovery broadcast for room:', roomId || 'global');
            setTimeout(() => {
                if (isActive) {
                    signaling.broadcast('peer-discovery');
                    console.log('Second discovery broadcast for room:', roomId || 'global');
                }
            }, 500);
        }

        return () => {
            console.log('🧹 Cleaning up...');
            isActive = false;
            initializingRef.current = false;
            clearInterval(discoveryInterval);
        };
    }, [userName, roomId]);

    const startVideo = useCallback(async () => {
        if (!webrtcRef.current) return;

        try {
            const stream = await webrtcRef.current.initLocalStream(true, true);
            setLocalStream(stream);
            console.log('🎥 Video started');
        } catch (error) {
            console.error('❌ Failed to start video:', error);

            try {
                console.log('🎤 Trying audio-only...');
                const stream = await webrtcRef.current.initLocalStream(false, true);
                setLocalStream(stream);
                setIsVideoEnabled(false);
                console.log('✅ Audio-only mode active');
            } catch (audioError) {
                console.error('❌ Failed to start audio:', audioError);
                console.log('⚠️ Continuing without media devices');
            }
        }
    }, []);

    const sendMessage = useCallback((content: string) => {
        console.log('💬 Sending message:', content);
        webrtcRef.current?.sendMessage(content);
    }, []);

    const sendFile = useCallback((file: File) => {
        console.log('📁 Sending file:', file.name);
        webrtcRef.current?.sendFile(file);
    }, []);

    const toggleAudio = useCallback(() => {
        if (!webrtcRef.current) return;
        const newState = !isAudioEnabled;
        webrtcRef.current.toggleAudio(newState);
        setIsAudioEnabled(newState);
        console.log('🎤 Audio:', newState ? 'ON' : 'OFF');
    }, [isAudioEnabled]);

    const toggleVideo = useCallback(() => {
        if (!webrtcRef.current) return;
        const newState = !isVideoEnabled;
        webrtcRef.current.toggleVideo(newState);
        setIsVideoEnabled(newState);
        console.log('🎥 Video:', newState ? 'ON' : 'OFF');
    }, [isVideoEnabled]);

    const cleanup = useCallback(() => {
        console.log('🧹 Cleanup called');
        webrtcRef.current?.cleanup();
        signalingRef.current?.close();

        const activeCallId = localStorage.getItem('activeCallId');
        if (activeCallId) {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            fetch(`${API_URL}/api/calls/${activeCallId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'ended' }),
            }).catch(err => console.error('❌ Failed to end call:', err));
            localStorage.removeItem('activeCallId');
        }
    }, []);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

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
        localPeerId: webrtcRef.current?.getLocalPeerId() || '',
        localPeerName: webrtcRef.current?.getLocalPeerName() || '',
    };
}