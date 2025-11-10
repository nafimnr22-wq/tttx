import { useRef, useState, useEffect } from 'react';
import { FileTransfer as FileTransferType } from '../utils/webrtc';
import { Upload, File, Download } from 'lucide-react';

interface FileTransferProps {
    fileTransfers: FileTransferType[];
    onFileSelect: (file: File) => void;
    roomId?: string;
    uploaderId?: string;
    uploaderName?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface UploadedFile {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    uploaderId: string;
    uploaderName: string;
    uploadedAt: number;
    path: string;
    roomId?: string;
}

export function FileTransfer({ fileTransfers, onFileSelect, roomId, uploaderId, uploaderName }: FileTransferProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    // ✅ Load shared files for this meeting room
    useEffect(() => {
        if (!roomId) return;

        const loadFiles = async () => {
            try {
                const response = await fetch(`${API_URL}/api/files?type=public`);
                if (response.ok) {
                    const allFiles = await response.json();
                    // Filter files that belong to this meeting room
                    const roomFiles = allFiles.filter((f: UploadedFile) => f.roomId === roomId);
                    setUploadedFiles(roomFiles);
                }
            } catch (err) {
                console.error('Failed to load files:', err);
            }
        };

        loadFiles();
        // Poll for new files every 3 seconds
        const interval = setInterval(loadFiles, 3000);
        return () => clearInterval(interval);
    }, [roomId]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setError(null);
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                if (uploaderId) formData.append('uploaderId', uploaderId);
                if (uploaderName) formData.append('uploaderName', uploaderName);
                if (roomId) formData.append('roomId', roomId);
                formData.append('isPublic', 'true');

                const url = roomId
                    ? `${API_URL}/api/files/upload?meeting=true`
                    : `${API_URL}/api/files/upload`;

                const response = await fetch(url, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const result = await response.json();
                console.log('File uploaded:', result);
                onFileSelect(file);

                // Reload files immediately
                const filesResponse = await fetch(`${API_URL}/api/files?type=public`);
                if (filesResponse.ok) {
                    const allFiles = await filesResponse.json();
                    const roomFiles = allFiles.filter((f: UploadedFile) => f.roomId === roomId);
                    setUploadedFiles(roomFiles);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Upload failed');
                console.error('Upload error:', err);
            } finally {
                setUploading(false);
                e.target.value = '';
            }
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatTime = (timestamp: number): string => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold mb-3">File Sharing</h3>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Upload className="w-5 h-5" />
                    {uploading ? 'Uploading...' : 'Share File'}
                </button>
                {error && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploading}
                />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {/* ✅ Show uploaded files first */}
                {uploadedFiles.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Shared Files in Meeting</h4>
                        <div className="space-y-2">
                            {uploadedFiles.map(file => (
                                <div key={file.id} className="bg-green-50 rounded-lg p-3 border border-green-200">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-100 rounded">
                                            <Download className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate text-sm">{file.originalName}</p>
                                            <p className="text-xs text-gray-500">
                                                By: {file.uploaderName}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatFileSize(file.size)} • {formatTime(file.uploadedAt)}
                                            </p>
                                        </div>
                                        <a
                                            href={`${API_URL}${file.path}`}
                                            download
                                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                        >
                                            Download
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* WebRTC file transfers */}
                {fileTransfers.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">P2P File Transfers</h4>
                        <div className="space-y-2">
                            {fileTransfers.map(transfer => (
                                <FileTransferItem
                                    key={transfer.id}
                                    transfer={transfer}
                                    formatFileSize={formatFileSize}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {uploadedFiles.length === 0 && fileTransfers.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <File className="w-16 h-16 mb-2" />
                        <p>No files shared yet</p>
                        <p className="text-xs mt-1">Upload files to share with others</p>
                    </div>
                )}
            </div>
        </div>
    );
}

interface FileTransferItemProps {
    transfer: FileTransferType;
    formatFileSize: (bytes: number) => string;
}

function FileTransferItem({ transfer, formatFileSize }: FileTransferItemProps) {
    return (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded">
                    <Download className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{transfer.name}</p>
                    <p className="text-xs text-gray-500">
                        From: {transfer.peerName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {formatFileSize(transfer.size)}
                    </p>
                    {transfer.progress > 0 && (
                        <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                                    style={{ width: `${transfer.progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{transfer.progress}%</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}