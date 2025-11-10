import { Mic, MicOff, Video as VideoIcon, VideoOff, MessageSquare, FolderOpen } from 'lucide-react';

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  activeTab: 'chat' | 'files';
  onTabChange: (tab: 'chat' | 'files') => void;
}

export function Controls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  activeTab,
  onTabChange,
}: ControlsProps) {
  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={onToggleAudio}
            className={`p-4 rounded-full transition-colors ${
              isAudioEnabled
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full transition-colors ${
              isVideoEnabled
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => onTabChange('chat')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => onTabChange('files')}
            className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
              activeTab === 'files'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Files
          </button>
        </div>
      </div>
    </div>
  );
}
