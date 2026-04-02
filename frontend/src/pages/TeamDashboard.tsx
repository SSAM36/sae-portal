import { useParams } from "react-router-dom";
import { Play, Pause, CheckSquare } from "lucide-react";

// Mock data simulating candidates applied to the currently viewed team
const mockTeamCandidates = [
  { sapId: "50012345", name: "John Doe", hasArrived: true, currentTeamId: null, status: "NOT_STARTED" },
  { sapId: "50012346", name: "Jane Smith", hasArrived: true, currentTeamId: "some-other-team", status: "NOT_STARTED" }, // Interviewing elsewhere
  { sapId: "50012347", name: "Alice Johnson", hasArrived: true, currentTeamId: "this-team", status: "IN_PROGRESS" },
];

export function TeamDashboard() {
  const { teamId } = useParams<{ teamId: string }>();
  const normalizedTeamName = teamId?.replace("-", " ").toUpperCase() || "UNKNOWN TEAM";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{normalizedTeamName} Dashboard</h1>
        <p className="text-sm text-gray-500">Manage interviews for your applicants. Real-time updates prevent parallel interviews.</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SAP ID / Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arrival</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Global Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockTeamCandidates.map((candidate) => {
              const isInterviewingElsewhere = candidate.currentTeamId && candidate.currentTeamId !== "this-team";
              const isInterviewingHere = candidate.currentTeamId === "this-team";

              return (
                <tr key={candidate.sapId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{candidate.sapId}</div>
                    <div className="text-sm text-gray-500">{candidate.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${candidate.hasArrived ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {candidate.hasArrived ? "Present" : "Not Arrived"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isInterviewingElsewhere ? (
                      <span className="text-amber-600 font-medium">Busy (Another Team)</span>
                    ) : isInterviewingHere ? (
                      <span className="text-blue-600 font-medium">Interviewing Here</span>
                    ) : (
                      <span className="text-gray-500">Available</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {candidate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {/* Action buttons are disabled if the candidate hasn't arrived or is being interviewed by someone else */}
                    <button
                      className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white ${
                        !candidate.hasArrived || isInterviewingElsewhere ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                      }`}
                      disabled={!candidate.hasArrived || isInterviewingElsewhere}
                    >
                      <Play className="h-3 w-3 mr-1" /> Start
                    </button>
                    <button
                      className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white ${
                        !isInterviewingHere ? "bg-gray-300 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600"
                      }`}
                      disabled={!isInterviewingHere}
                    >
                      <Pause className="h-3 w-3 mr-1" /> Hold
                    </button>
                    <button
                      className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white ${
                        !isInterviewingHere ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      disabled={!isInterviewingHere}
                    >
                      <CheckSquare className="h-3 w-3 mr-1" /> Complete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
