import { loginAsStudent, loginAsAdmin } from '../actions';

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
                <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    OxNet Trading
                </h1>

                <div className="space-y-4">
                    <form action={loginAsStudent}>
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <span>Login as Student</span>
                        </button>
                    </form>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-sm">Or</span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>

                    <form action={loginAsAdmin}>
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <span>Login as Admin</span>
                        </button>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Select a role to continue to the dashboard.
                </p>
            </div>
        </div>
    );
}
