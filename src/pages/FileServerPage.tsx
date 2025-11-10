import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, Download, Trash2, FolderOpen, Folder, ChevronRight } from 'lucide-react';
import { Account } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FileServerPageProps {
    account: Account;
    onBack: () => void;
}

interface FileMeta {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    uploaderId: string;
    uploaderName: string;
    uploadedAt: number;
    path: string;
    isPublic: boolean;
    roomId?: string;
}

interface MeetingFolder {
    roomId: string;
    files: FileMeta[];
    totalSize: number;
}

export function FileServerPage({ account, onBack }: FileServerPageProps) {
    const [files, setFiles] = useState<FileMeta[]>([]);
    const [meetingFolders, setMeetingFolders] = useState<MeetingFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            const response = await fetch(`${API_URL}/api/files?type=public`);
            if (response.ok) {
                const data = await response.json();

                const regularFiles = data.filter((f: FileMeta) => !f.roomId);
                const meetingFiles = data.filter((f: FileMeta) => f.roomId);

                const folders: { [key: string]: MeetingFolder } = {};
                meetingFiles.forEach((file: FileMeta) => {
                    if (!folders[file.roomId!]) {
                        folders[file.roomId!] = {
                            roomId: file.roomId!,
                            files: [],
                            totalSize: 0
                        };
                    }
                    folders[file.roomId!].files.push(file);
                    folders[file.roomId!].totalSize += file.size;
                });

                setFiles(regularFiles);
                setMeetingFolders(Object.values(folders));
            }
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('uploaderId', account.id);
            formData.append('uploaderName', account.fullName);
            formData.append('isPublic', 'true');

            const response = await fetch(`${API_URL}/api/files/upload?shared=true`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                await loadFiles();
                alert('File uploaded successfully!');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm('Delete this file?')) return;

        try {
            const response = await fetch(`${API_URL}/api/files/${fileId}?userId=${account.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await loadFiles();
            } else {
                alert('Failed to delete file');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (timestamp: number): string => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="p-2 bg-purple-600 rounded-lg">
                            <FolderOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">File Server</h1>
                            <p className="text-sm text-gray-500">{files.length + meetingFolders.reduce((sum, f) => sum + f.files.length, 0)} shared files</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Public File</h2>
                    <p className="text-gray-600 mb-4">Files uploaded here are visible to all users</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Upload className="w-5 h-5" />
                        {uploading ? 'Uploading...' : 'Upload File'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleUpload}
                        className="hidden"
                        disabled={uploading}
                    />
                </div>

                {isLoading ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading files...</p>
                    </div>
                ) : files.length === 0 && meetingFolders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No files yet</h3>
                        <p className="text-gray-600">Upload files to share them with everyone</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {meetingFolders.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Folder className="w-5 h-5 text-blue-600" />
                                    <h2 className="text-lg font-semibold text-gray-900">Meeting Rooms</h2>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {meetingFolders.map(folder => (
                                        <button
                                            key={folder.roomId}
                                            onClick={() => setSelectedFolder(folder.roomId)}
                                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="p-2 bg-blue-100 rounded">
                                                    <Folder className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <h3 className="font-semibold text-gray-900 truncate mb-1">{folder.roomId}</h3>
                                            <p className="text-sm text-gray-600">{folder.files.length} files ({formatFileSize(folder.totalSize)})</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedFolder && (
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Files in {selectedFolder}</h2>
                                    <button
                                        onClick={() => setSelectedFolder(null)}
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {meetingFolders.find(f => f.roomId === selectedFolder)?.files.map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{file.originalName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {formatFileSize(file.size)} • {file.uploaderName} • {formatDate(file.uploadedAt)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <a
                                                    href={`${API_URL}${file.path}`}
                                                    download
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                {file.uploaderId === account.id && (
                                                    <button
                                                        onClick={() => handleDelete(file.id)}
                                                        className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {files.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Public Files</h2>
                                <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    File Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Uploaded By
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Size
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                            {files.map(file => (
                                                <tr key={file.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="text-sm font-medium text-gray-900">{file.originalName}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{file.uploaderName}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500">{formatDate(file.uploadedAt)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <a
                                                            href={`${API_URL}${file.path}`}
                                                            download
                                                            className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center gap-1"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </a>
                                                        {file.uploaderId === account.id && (
                                                            <button
                                                                onClick={() => handleDelete(file.id)}
                                                                className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}