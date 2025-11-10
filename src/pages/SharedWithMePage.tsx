import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { Account } from '../App';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface SharedWithMePageProps {
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
}

export function SharedWithMePage({ account, onBack }: SharedWithMePageProps) {
    const [files, setFiles] = useState<FileMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            const response = await fetch(`${API_URL}/api/files?type=shared-with-me&userId=${account.id}`);
            if (response.ok) {
                const data = await response.json();
                setFiles(data);
            }
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setIsLoading(false);
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
                        <div className="p-2 bg-orange-600 rounded-lg">
                            <Share2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Shared with Me</h1>
                            <p className="text-sm text-gray-500">{files.length} files shared with you</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-8">
                {isLoading ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading files...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <Share2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No files shared with you yet</h3>
                        <p className="text-gray-600">Files that others share with you will appear here</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        File Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Shared By
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
                                            <div className="text-sm font-medium text-gray-900">{file.originalName}</div>
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
                                                className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}