import { useState, useRef, useEffect } from 'react';
import { Message } from '../utils/webrtc';
import { Send } from 'lucide-react';

interface ChatProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  localPeerId: string;
}

export function Chat({ messages, onSendMessage, localPeerId }: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No messages yet. Start chatting!
          </div>
        ) : (
          messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.peerId === localPeerId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {!isOwn && (
          <div className="text-xs text-gray-600 mb-1 px-1">
            {message.peerName}
          </div>
        )}
        <div
          className={`px-4 py-2 rounded-lg ${
            isOwn
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-900 rounded-bl-none'
          }`}
        >
          <p className="break-words">{message.content}</p>
          <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
}
