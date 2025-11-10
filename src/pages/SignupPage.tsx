import { useState } from 'react';
import { Wifi, UserPlus } from 'lucide-react';

interface SignupPageProps {
    onSignup: (username: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
    onSwitchToLogin: () => void;
}

export function SignupPage({ onSignup, onSwitchToLogin }: SignupPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await onSignup(username, password, fullName);

        if (!result.success) {
            setError(result.error || 'Signup failed');
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
                    Create Account
                </h1>
                <p className="text-center text-gray-600 mb-8">
                    Join your local collaboration network
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
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
                            placeholder="Create a password"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            minLength={4}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UserPlus className="w-5 h-5" />
                        {isLoading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Sign in
                        </button>
                    </p>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                        💡 Your account is stored locally on this network
                    </p>
                </div>
            </div>
        </div>
    );
}