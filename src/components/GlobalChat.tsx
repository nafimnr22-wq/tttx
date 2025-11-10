import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Account } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface GlobalMessage {
    id: string;
    fromId: string;
    fromName: string;
    content: string;
    timestamp: number;
}

interface GlobalChatProps {
    account: Account;
}

export function GlobalChat({ account }: GlobalChatProps) {
    const [messages, setMessages] = useState<GlobalMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async () => {
        try {
            const response = await fetch(`${API_URL}/api/global-chat`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Failed to load global chat:', error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        const messageContent = newMessage.trim();
        setNewMessage('');

        try {
            const response = await fetch(`${API_URL}/api/global-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromId: account.id,
                    fromName: account.fullName,
                    content: messageContent,
                }),
            });

            if (response.ok) {
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

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Global Chatroom</h2>
                <p className="text-blue-100 text-sm">Chat with everyone</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Be the first to say something!
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.fromId === account.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs ${msg.fromId === account.id ? 'order-2' : 'order-1'}`}>
                                {msg.fromId !== account.id && (
                                    <div className="text-xs text-gray-600 mb-1 px-2">
                                        {msg.fromName}
                                    </div>
                                )}
                                <div className={`px-4 py-2 rounded-lg ${
                                    msg.fromId === account.id
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                                }`}>
                                    <p className="break-words text-sm">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${msg.fromId === account.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 p-3">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={sending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}