import { useState } from 'react';
import { Wifi, LogIn } from 'lucide-react';

interface LoginPageProps {
    onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    onSwitchToSignup: () => void;
}

export function LoginPage({ onLogin, onSwitchToSignup }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await onLogin(username, password);

        if (!result.success) {
            setError(result.error || 'Login failed');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="flex items-center justify-center mb-6">
                    <div className="p-3 bg-blue-600 rounded-full">
                        <Wifi className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
                    Welcome Back
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    Sign in to your LAN collaboration account
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <LogIn className="w-5 h-5" />
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <button
                            onClick={onSwitchToSignup}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Sign up
                        </button>
                    </p>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                        ⚠️ Note: This is a local network system. No internet connection required.
                    </p>
                </div>
            </div>
        </div>
    );
}