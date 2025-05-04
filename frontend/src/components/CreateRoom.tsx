import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateRoom() {
  const [roomID, setRoomID] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const getRoomID = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:8000/create");
      setRoomID(response.data.room_id);
      setLoading(false);
      setTimeout(() => {
        navigate(`/room/${response.data.room_id}`);
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">Video Chat App</h1>
        <p className="text-center text-gray-600">Create a new room to start your video call</p>
        
        <button
          onClick={getRoomID}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Room...
            </div>
          ) : (
            "Create New Room"
          )}
        </button>

        {roomID && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-2">Room ID:</p>
            <div className="flex items-center justify-between bg-white p-3 rounded-md border border-gray-200">
              <code className="text-blue-600 font-mono">{roomID}</code>
              <button
                onClick={() => navigator.clipboard.writeText(roomID)}
                className="text-blue-600 hover:text-blue-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">Redirecting to room in 3 seconds...</p>
          </div>
        )}
      </div>
    </div>
  );
}
