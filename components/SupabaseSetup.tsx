import React from 'react';

export const SupabaseSetup: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Supabase Setup Required
        </h2>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Your application is missing the Supabase connection details.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">1. Get your Project URL</h3>
              <p className="mt-1 text-sm text-gray-500">
                Go to your Supabase Dashboard, select your project, and go to <strong>Settings &gt; API</strong>.
                Copy the <strong>Project URL</strong>.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">2. Get your Anon Key</h3>
              <p className="mt-1 text-sm text-gray-500">
                In the same section, copy the <strong>anon public</strong> key.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">3. Set Environment Variables</h3>
              <p className="mt-1 text-sm text-gray-500">
                In the AI Studio interface, add the following variables:
              </p>
              <div className="mt-2 bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                VITE_SUPABASE_URL=https://your-project.supabase.co<br/>
                VITE_SUPABASE_ANON_KEY=your-anon-key
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                After setting these variables, the app will automatically reload.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
