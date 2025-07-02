import React from 'react';

function TailwindTest() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Hello TailwindCSS v4!
        </h1>
        <p className="text-gray-600">
          If you can see the styling, TailwindCSS is working!
        </p>
        <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Click me!
        </button>
      </div>
    </div>
  );
}

export default TailwindTest;