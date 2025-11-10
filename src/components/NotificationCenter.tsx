import { useState, useEffect } from 'react';
import { Bell, X, Trash2 } from 'lucide-react';

interface Notification {
    id: string;
    type: 'message' | 'call' | 'global';
    from: string;
    message: string;
    timestamp: number;
    read: boolean;
}

interface NotificationCenterProps {
    notifications: Notification[];
    onClear: (id: string) => void;
    onMarkAsRead: (id: string) => void;
    onClearAll: () => void;
}

export function NotificationCenter({ notifications, onClear, onMarkAsRead, onClearAll }: NotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white rounded-t-lg">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Notifications</h3>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onClearAll();
                                        }}
                                        className="text-xs px-2 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors flex items-center gap-1"
                                        title="Clear all notifications"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Clear All
                                    </button>
                                )}
                            </div>
                        </div>

                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50' : ''}`}
                                        onClick={() => !notif.read && onMarkAsRead(notif.id)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-semibold text-blue-600 uppercase">
                                                        {notif.type}
                                                    </span>
                                                    {!notif.read && (
                                                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                                    )}
                                                </div>
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {notif.from}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onClear(notif.id);
                                                }}
                                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
