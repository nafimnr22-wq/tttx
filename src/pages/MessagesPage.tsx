import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Account } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface MessagesPageProps {
    account: Account;
    targetUser: Account;
    onBack: () => void;
    onNewMessage?: (from: string, message: string) => void;
}

interface Message {
    id: string;
    fromId: string;
    toId: string;
    fromName: string;
    toName: string;
    content: string;
    timestamp: number;
}

export function MessagesPage({ account, targetUser, onBack, onNewMessage }: MessagesPageProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMessageCountRef = useRef(0);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 1000);
        return () => clearInterval(interval);
    }, [account.id, targetUser.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async () => {
        try {
            const response = await fetch(`${API_URL}/api/messages?userId=${account.id}&otherUserId=${targetUser.id}`);
            if (response.ok) {
                const data = await response.json();

                if (data.length > lastMessageCountRef.current) {
                    const newMessages = data.slice(lastMessageCountRef.current);
                    newMessages.forEach((msg: Message) => {
                        if (msg.fromId === targetUser.id && onNewMessage) {
                            onNewMessage(targetUser.fullName, msg.content);
                        }
                    });
                }

                lastMessageCountRef.current = data.length;
                setMessages(data);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;

        setSending(true);
        const messageContent = newMessage.trim();
        setNewMessage('');

        try {
            const response = await fetch(`${API_URL}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromId: account.id,
                    toId: targetUser.id,
                    fromName: account.fullName,
                    toName: targetUser.fullName,
                    content: messageContent,
                }),
            });

            if (response.ok) {
                await fetch(`${API_URL}/api/notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        toAccountId: targetUser.id,
                        type: 'message',
                        from: account.fullName,
                        message: messageContent,
                    }),
                }).catch(err => console.error('Failed to send notification:', err));

                await loadMessages();
            } else {
                setNewMessage(messageContent);
                alert('Failed to send message');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setNewMessage(messageContent);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-lg font-bold text-white">
                                {targetUser.fullName.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">{targetUser.fullName}</h1>
                            <p className="text-xs text-gray-500">@{targetUser.username}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            No messages yet. Start the conversation!
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.fromId === account.id ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    msg.fromId === account.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-900 shadow'
                                }`}>
                                    <p className="break-words">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${msg.fromId === account.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-white border-t border-gray-200 p-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={sending}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sending}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}