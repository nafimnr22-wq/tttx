import { useState, useEffect, useRef } from 'react';
import { Wifi, ArrowLeft, Phone, Search, MessageSquare, Send } from 'lucide-react';
import { Account } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface UsersPageProps {
    account: Account;
    onBack: () => void;
    onCallUser: (accountId: string, fullName: string) => void;
    onMessageUser: (user: Account) => void;
}

export function UsersPage({ account, onBack, onCallUser, onMessageUser }: UsersPageProps) {
    const [users, setUsers] = useState<Account[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sendingFileToUser, setSendingFileToUser] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadUsers();
        const interval = setInterval(loadUsers, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/accounts`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.filter((u: Account) => u.id !== account.id));
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendFile = async (user: Account) => {
        setSendingFileToUser(user.id);
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !sendingFileToUser) return;

        const user = users.find(u => u.id === sendingFileToUser);
        if (!user) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('uploaderId', account.id);
            formData.append('uploaderName', account.fullName);
            formData.append('sharedWith', JSON.stringify([sendingFileToUser]));
            formData.append('isPublic', 'false');

            const response = await fetch(`${API_URL}/api/files/upload`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                alert(`File sent to ${user.fullName}!`);
            } else {
                alert('Failed to send file');
            }
        } catch (error) {
            console.error('Error sending file:', error);
            alert('Failed to send file');
        } finally {
            setSendingFileToUser(null);
            e.target.value = '';
        }
    };

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Wifi className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">All Users</h1>
                            <p className="text-sm text-gray-500">{users.length} users available</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {searchQuery ? 'No users found' : 'No other users yet'}
                        </h3>
                        <p className="text-gray-600">
                            {searchQuery ? 'Try a different search term' : 'Other users will appear here when they sign up'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredUsers.map(user => (
                            <div
                                key={user.id}
                                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                                        <span className="text-2xl font-bold text-white">
                                            {user.fullName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {user.fullName}
                                        </h3>
                                        <p className="text-sm text-gray-500">@{user.username}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onCallUser(user.id, user.fullName)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                                        title="Call"
                                    >
                                        <Phone className="w-4 h-4" />
                                        Call
                                    </button>
                                    <button
                                        onClick={() => onMessageUser(user)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                                        title="Message"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Message
                                    </button>
                                    <button
                                        onClick={() => handleSendFile(user)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                                        title="Send File"
                                    >
                                        <Send className="w-4 h-4" />
                                        Send File
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelected}
                className="hidden"
            />
        </div>
    );
}