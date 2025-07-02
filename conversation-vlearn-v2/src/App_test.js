import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-blue-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          TailwindCSS Test!
        </h1>
        <p className="text-gray-700 mb-4">
          You should see a blue background with this white card.
        </p>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Test Button
        </button>
      </div>
    </div>
  );
}

export default App;