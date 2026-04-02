import { useState } from "react";
import { Upload, Plus, CheckCircle, XCircle } from "lucide-react";

// Mock data to start with
const mockCandidates = [
  { sapId: "50012345", name: "John Doe", hasArrived: false, appliedTeams: ["Formula SAE", "Baja SAE"] },
  { sapId: "50012346", name: "Jane Smith", hasArrived: true, appliedTeams: ["Aero Design"] },
];

export function AdminDashboard() {
  const [candidates, setCandidates] = useState(mockCandidates);

  const toggleArrival = (sapId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.sapId === sapId ? { ...c, hasArrived: !c.hasArrived } : c))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registration Desk (Admin)</h1>
          <p className="text-sm text-gray-500">Manage walk-ins and track arrivals.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 bg-white border border-gray-300 px-4 py-2 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            <span>Upload CSV</span>
          </button>
          <button className="flex items-center space-x-2 bg-blue-600 px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            <span>Add Walk-in</span>
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SAP ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Teams</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {candidates.map((candidate) => (
              <tr key={candidate.sapId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.sapId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{candidate.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{candidate.appliedTeams.join(", ")}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      candidate.hasArrived ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {candidate.hasArrived ? "Arrived" : "Not Arrived"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => toggleArrival(candidate.sapId)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {candidate.hasArrived ? "Mark Absent" : "Mark Arrived"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
