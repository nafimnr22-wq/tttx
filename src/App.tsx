import { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { MeetingRoom } from './pages/MeetingRoom';
import { UsersPage } from './pages/UsersPage';
import { FileServerPage } from './pages/FileServerPage';
import { SharedWithMePage } from './pages/SharedWithMePage';
import { MessagesPage } from './pages/MessagesPage';
import { Phone, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const AUTH_STORAGE_KEY = 'lan-collab-auth';

export interface Account {
    id: string;
    username: string;
    fullName: string;
}

interface IncomingCall {
    id: string;
    fromAccountId: string;
    fromName: string;
    roomId: string;
    createdAt: number;
}

interface Notification {
    id: string;
    type: 'message' | 'call' | 'global';
    from: string;
    message: string;
    timestamp: number;
    read: boolean;
}

type Page = 'login' | 'signup' | 'home' | 'meeting' | 'users' | 'fileserver' | 'sharedwithme' | 'messages';

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('login');
    const [account, setAccount] = useState<Account | null>(null);
    const [roomId, setRoomId] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<Account | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [callRingtone] = useState(() => {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVazo7q5aFgxMouLzwHEgBSl+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0pBSh2yO/ekTsJE1y06+ujVxYNSaTi8r90IAUscsjw24k4BxlrvezmolARDUqk4fK8aR0GNIvU8tGAKwceb8Hv45xMEA5Up+ftrVoXDEmi4/LAciAFK4HO8tiJOQcZaLvt6KFREQxLpePyvmwdBjaP1fPRgSsHHm/B7+OcTBEOVKjn7axaGAxKo+Pyw3IgBSyCzvLYiTgHGWi77eijUhENS6Xj8r5sHAY3kNbz0X8rBx5vwe/jnEwQDlSo5+2sWhcMSqPj8sNyHwUsgc7y2Ik4Bxlou+3oo1IRDUul4/K+bBwGN5DW89F/KwceacHu45xMEA5Sp+ftrFoYDEmk4/LDcx8FLYPPe/nGOw=');
        audio.loop = true;
        audio.volume = 0.5;
        return audio;
    });

    // ✅ FIXED: Clear processed call IDs when leaving meeting or changing pages
    useEffect(() => {
        if (currentPage !== 'meeting') {
            // Don't track processed calls when not in a meeting
        }
    }, [currentPage]);

    useEffect(() => {
        const loadAuth = async () => {
            try {
                const saved = localStorage.getItem(AUTH_STORAGE_KEY);
                if (saved) {
                    const acc: Account = JSON.parse(saved);
                    setAccount(acc);
                    setCurrentPage('home');
                    console.log('✅ Auto-login successful');
                }
            } catch (error) {
                console.error('Error loading auth:', error);
                localStorage.removeItem(AUTH_STORAGE_KEY);
            } finally {
                setIsLoading(false);
            }
        };

        loadAuth();
    }, []);

    useEffect(() => {
        if (!account) return;

        const loadNotifications = async () => {
            try {
                const response = await fetch(`${API_URL}/api/notifications?accountId=${account.id}&unreadOnly=false`);
                if (response.ok) {
                    const data = await response.json();
                    setNotifications(data);
                }
            } catch (error) {
                console.error('Failed to load notifications:', error);
            }
        };

        loadNotifications();
        const interval = setInterval(loadNotifications, 3000);

        return () => clearInterval(interval);
    }, [account]);

    // ✅ FIXED: Better call polling - check frequently and show ALL ringing calls
    useEffect(() => {
        if (!account) return;

        const checkCalls = async () => {
            try {
                const response = await fetch(`${API_URL}/api/calls?toAccountId=${account.id}`);
                if (response.ok) {
                    const calls = await response.json();
                    const ringingCalls = calls.filter((call: any) => call.status === 'ringing');

                    // Show the most recent ringing call
                    if (ringingCalls.length > 0 && currentPage !== 'meeting') {
                        const latestCall = ringingCalls[0];

                        // ✅ Always show if there's a ringing call and we're not already showing one
                        if (!incomingCall || incomingCall.id !== latestCall.id) {
                            console.log('📞 NEW INCOMING CALL:', latestCall);

                            const newCall = {
                                id: latestCall.id,
                                fromAccountId: latestCall.fromAccountId,
                                fromName: latestCall.fromName,
                                roomId: latestCall.roomId,
                                createdAt: latestCall.createdAt,
                            };

                            setIncomingCall(newCall);

                            // Play ringtone
                            callRingtone.play().catch(err => console.error('Failed to play ringtone:', err));

                            // Show browser notification
                            if (Notification.permission === 'granted') {
                                new Notification('📞 Incoming Call', {
                                    body: `${latestCall.fromName} is calling you...`,
                                    icon: '/vite.svg',
                                    tag: 'incoming-call',
                                    requireInteraction: true,
                                });
                            }
                        }
                    } else if (ringingCalls.length === 0 && incomingCall) {
                        // Call was answered or rejected
                        callRingtone.pause();
                        callRingtone.currentTime = 0;
                        setIncomingCall(null);
                    }
                }
            } catch (error) {
                console.error('Failed to check calls:', error);
            }
        };

        checkCalls();
        const interval = setInterval(checkCalls, 1000); // Check every 1 second

        return () => {
            clearInterval(interval);
            callRingtone.pause();
            callRingtone.currentTime = 0;
        };
    }, [account, currentPage, incomingCall, callRingtone]);

    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }
    }, []);

    const handleLogin = async (username: string, password: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            setAccount(data.account);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.account));
            setCurrentPage('home');
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
        }
    };

    const handleSignup = async (username: string, password: string, fullName: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, fullName }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Signup failed');
            }

            const data = await response.json();
            setAccount(data.account);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.account));
            setCurrentPage('home');
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Signup failed' };
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setAccount(null);
        setCurrentPage('login');
    };

    const handleJoinMeeting = (room: string) => {
        setRoomId(room);
        setCurrentPage('meeting');
    };

    const handleCallUser = async (targetAccountId: string, targetName: string) => {
        const callRoomId = `call-${account?.id}-${targetAccountId}-${Date.now()}`;

        console.log('📞 Initiating call to:', targetName);

        const response = await fetch(`${API_URL}/api/calls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromAccountId: account?.id,
                toAccountId: targetAccountId,
                fromName: account?.fullName,
                toName: targetName,
                roomId: callRoomId,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Call initiated:', data);
            if (data.call) {
                localStorage.setItem('activeCallId', data.call.id);
            }
        } else {
            console.error('❌ Failed to initiate call');
        }

        handleJoinMeeting(callRoomId);
    };

    const handleMessageUser = (user: Account) => {
        setSelectedUser(user);
        setCurrentPage('messages');
    };

    const handleAcceptCall = async () => {
        if (incomingCall) {
            callRingtone.pause();
            callRingtone.currentTime = 0;

            await fetch(`${API_URL}/api/calls/${incomingCall.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'accepted' }),
            });

            localStorage.setItem('activeCallId', incomingCall.id);
            handleJoinMeeting(incomingCall.roomId);
            setIncomingCall(null);
        }
    };

    const handleRejectCall = async () => {
        if (incomingCall) {
            callRingtone.pause();
            callRingtone.currentTime = 0;

            await fetch(`${API_URL}/api/calls/${incomingCall.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' }),
            });
            setIncomingCall(null);
        }
    };

    const addNotification = async (notification: Omit<Notification, 'id' | 'read'>) => {
        if (!account) return;

        if (notification.type === 'global') {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toAccountId: account.id,
                    type: notification.type,
                    from: notification.from,
                    message: notification.message,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(prev => [data.notification, ...prev]);

                if (Notification.permission === 'granted') {
                    new Notification(notification.type === 'message' ? '💬 New Message' : '🔔 Notification', {
                        body: `${notification.from}: ${notification.message}`,
                        icon: '/vite.svg',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to save notification:', error);
        }
    };

    const clearNotification = async (id: string) => {
        if (!account) return;

        try {
            await fetch(`${API_URL}/api/notifications/${id}?accountId=${account.id}`, {
                method: 'DELETE',
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const markNotificationAsRead = async (id: string) => {
        if (!account) return;

        try {
            await fetch(`${API_URL}/api/notifications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: account.id, read: true }),
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const clearAllNotifications = async () => {
        if (!account) return;

        try {
            const deletePromises = notifications.map(n =>
                fetch(`${API_URL}/api/notifications/${n.id}?accountId=${account.id}`, {
                    method: 'DELETE',
                })
            );
            await Promise.all(deletePromises);
            setNotifications([]);
        } catch (error) {
            console.error('Failed to clear all notifications:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (currentPage === 'login') {
        return (
            <LoginPage
                onLogin={handleLogin}
                onSwitchToSignup={() => setCurrentPage('signup')}
            />
        );
    }

    if (currentPage === 'signup') {
        return (
            <SignupPage
                onSignup={handleSignup}
                onSwitchToLogin={() => setCurrentPage('login')}
            />
        );
    }

    if (currentPage === 'meeting' && account) {
        return (
            <MeetingRoom
                account={account}
                roomId={roomId}
                onLeave={() => setCurrentPage('home')}
            />
        );
    }

    if (currentPage === 'users' && account) {
        return (
            <UsersPage
                account={account}
                onBack={() => setCurrentPage('home')}
                onCallUser={handleCallUser}
                onMessageUser={handleMessageUser}
            />
        );
    }

    if (currentPage === 'fileserver' && account) {
        return (
            <FileServerPage
                account={account}
                onBack={() => setCurrentPage('home')}
            />
        );
    }

    if (currentPage === 'sharedwithme' && account) {
        return (
            <SharedWithMePage
                account={account}
                onBack={() => setCurrentPage('home')}
            />
        );
    }

    if (currentPage === 'messages' && account && selectedUser) {
        return (
            <MessagesPage
                account={account}
                targetUser={selectedUser}
                onBack={() => setCurrentPage('users')}
                onNewMessage={(from, message) => {
                    addNotification({
                        type: 'message',
                        from: from,
                        message: message,
                        timestamp: Date.now()
                    });
                }}
            />
        );
    }

    if (account) {
        return (
            <>
                <HomePage
                    account={account}
                    onLogout={handleLogout}
                    onJoinMeeting={handleJoinMeeting}
                    onViewUsers={() => setCurrentPage('users')}
                    onViewFileServer={() => setCurrentPage('fileserver')}
                    onViewSharedWithMe={() => setCurrentPage('sharedwithme')}
                    notifications={notifications}
                    onClearNotification={clearNotification}
                    onMarkAsRead={markNotificationAsRead}
                    onClearAll={clearAllNotifications}
                    onAddNotification={addNotification}
                />

                {incomingCall && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    <Phone className="w-10 h-10 text-green-600 animate-bounce" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    📞 Incoming Call
                                </h2>
                                <p className="text-lg text-gray-600">
                                    {incomingCall.fromName} is calling you...
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleAcceptCall}
                                    className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
                                >
                                    <Phone className="w-5 h-5" />
                                    Accept
                                </button>
                                <button
                                    onClick={handleRejectCall}
                                    className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
                                >
                                    <X className="w-5 h-5" />
                                    Decline
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return null;
}

export default App;