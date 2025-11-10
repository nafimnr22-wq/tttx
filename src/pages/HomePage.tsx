import { useState } from 'react';
import { Wifi, LogOut, Video, Users, ArrowRight, FolderOpen, Share2 } from 'lucide-react';
import { Account } from '../App';
import { GlobalChat } from '../components/GlobalChat';
import { NotificationCenter } from '../components/NotificationCenter';

interface Notification {
    id: string;
    type: 'message' | 'call' | 'global';
    from: string;
    message: string;
    timestamp: number;
    read: boolean;
}

interface HomePageProps {
    account: Account;
    onLogout: () => void;
    onJoinMeeting: (roomId: string) => void;
    onViewUsers: () => void;
    onViewFileServer: () => void;
    onViewSharedWithMe: () => void;
    notifications: Notification[];
    onClearNotification: (id: string) => void;
    onMarkAsRead: (id: string) => void;
    onClearAll: () => void;
    onAddNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
}

export function HomePage({ account, onLogout, onJoinMeeting, onViewUsers, onViewFileServer, onViewSharedWithMe, notifications, onClearNotification, onMarkAsRead, onClearAll, onAddNotification }: HomePageProps) {
    const [roomId, setRoomId] = useState('');

    const handleQuickMeeting = () => {
        const quickRoomId = `room-${Date.now()}`;
        onJoinMeeting(quickRoomId);
    };

    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId.trim()) {
            onJoinMeeting(roomId.trim());
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Wifi className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">LAN Collaboration</h1>
                            <p className="text-sm text-gray-500">Welcome, {account.fullName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationCenter
                            notifications={notifications}
                            onClear={onClearNotification}
                            onMarkAsRead={onMarkAsRead}
                            onClearAll={onClearAll}
                        />
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-8">
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                    <Video className="w-6 h-6 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Meeting</h2>
                                <p className="text-gray-600 mb-6">
                                    Create an instant meeting room and invite others
                                </p>
                                <button
                                    onClick={handleQuickMeeting}
                                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    Start Now
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <Users className="w-6 h-6 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">View Users</h2>
                                <p className="text-gray-600 mb-6">
                                    See all users and call them directly
                                </p>
                                <button
                                    onClick={onViewUsers}
                                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    Browse Users
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                                    <FolderOpen className="w-6 h-6 text-purple-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">File Server</h2>
                                <p className="text-gray-600 mb-6">
                                    Upload and share files with everyone
                                </p>
                                <button
                                    onClick={onViewFileServer}
                                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    Open Server
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                                    <Share2 className="w-6 h-6 text-orange-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Shared with Me</h2>
                                <p className="text-gray-600 mb-6">
                                    View files others have shared with you
                                </p>
                                <button
                                    onClick={onViewSharedWithMe}
                                    className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    View Files
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Join a Meeting</h2>
                            <p className="text-gray-600 mb-6">
                                Enter a room ID to join an existing meeting
                            </p>
                            <form onSubmit={handleJoinRoom} className="flex gap-3">
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    placeholder="Enter room ID"
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!roomId.trim()}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Join
                                </button>
                            </form>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-6 shadow">
                                <div className="text-3xl mb-2">🎥</div>
                                <h3 className="font-semibold text-gray-900 mb-1">Video Chat</h3>
                                <p className="text-sm text-gray-600">High-quality video calls</p>
                            </div>
                            <div className="bg-white rounded-lg p-6 shadow">
                                <div className="text-3xl mb-2">💬</div>
                                <h3 className="font-semibold text-gray-900 mb-1">Messaging</h3>
                                <p className="text-sm text-gray-600">Real-time chat</p>
                            </div>
                            <div className="bg-white rounded-lg p-6 shadow">
                                <div className="text-3xl mb-2">📁</div>
                                <h3 className="font-semibold text-gray-900 mb-1">File Sharing</h3>
                                <p className="text-sm text-gray-600">Share files instantly</p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 h-fit sticky top-8">
                        <GlobalChat account={account} />
                    </div>
                </div>
            </main>
        </div>
    );
}
