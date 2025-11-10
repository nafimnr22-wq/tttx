import { Peer } from '../utils/webrtc';
import { Users, Monitor } from 'lucide-react';

interface PeerListProps {
  peers: Peer[];
  localPeerName: string;
}

export function PeerList({ peers, localPeerName }: PeerListProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Connected Devices</h3>
        <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {peers.length + 1}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{localPeerName}</p>
            <p className="text-xs text-green-700">You (This Device)</p>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>

        {peers.map(peer => (
          <div
            key={peer.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {peer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{peer.name}</p>
              <p className="text-xs text-gray-500">
                {peer.connection?.connectionState === 'connected' ? 'Connected' : 'Connecting...'}
              </p>
            </div>
            <div className={`w-2 h-2 rounded-full ${
              peer.connection?.connectionState === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
          </div>
        ))}

        {peers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No other devices connected</p>
            <p className="text-xs mt-1">Open this app on another device on the same network</p>
          </div>
        )}
      </div>
    </div>
  );
}
