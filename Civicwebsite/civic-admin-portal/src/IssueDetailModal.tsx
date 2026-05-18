import React from 'react';

interface IssueDetailModalProps {
  issue: any;
  isDarkMode: boolean;
  onClose: () => void;
  onAssignTask: (issue: any) => void;
  onCloseIssue?: (issue: any) => void;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({ 
  issue, 
  isDarkMode, 
  onClose, 
  onAssignTask,
  onCloseIssue 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Issue Details
          </h3>
          <button
            onClick={onClose}
            className={`text-2xl ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{issue.title}</h4>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {issue.category} • {new Date(issue._creationTime).toLocaleString()}
            </p>
          </div>
          
          <div>
            <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Description:</h5>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{issue.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Status:</h5>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                issue.closed ? 'bg-gray-100 text-gray-800' :
                issue.status === 'pending' ? 'bg-red-100 text-red-800' :
                issue.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {issue.closed ? 'CLOSED' : issue.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>
            <div>
              <h5 className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Priority:</h5>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{issue.priority || 'Medium'}</p>
            </div>
          </div>
          
          <div>
            <h5 className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Location:</h5>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {issue.latitude?.toFixed(6)}, {issue.longitude?.toFixed(6)}
            </p>
            <button 
              onClick={() => window.open(`https://maps.google.com/?q=${issue.latitude},${issue.longitude}`, '_blank')}
              className="mt-2 text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              📍 View on Google Maps
            </button>
          </div>
          
          {issue.fileId && (
            <div>
              <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Photo:</h5>
              <div className="border rounded-lg p-4">
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Image Available</p>
                <button 
                  onClick={() => {
                    // Simple direct file access - works with Convex storage
                    const fileUrl = `https://quick-anaconda-973.convex.site/getImage?id=${issue.fileId}`;
                    window.open(fileUrl, '_blank');
                  }}
                  className="mt-2 text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  📷 View & Download Image
                </button>
              </div>
            </div>
          )}
          
          {issue.audioFileId && (
            <div>
              <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Audio:</h5>
              <div className="border rounded-lg p-4">
                <button 
                  onClick={() => {
                    // Simple direct file access - works with Convex storage
                    const fileUrl = `https://quick-anaconda-973.convex.site/getImage?id=${issue.audioFileId}`;
                    window.open(fileUrl, '_blank');
                  }}
                  className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  🎵 Play & Download Audio
                </button>
              </div>
            </div>
          )}
          
          {issue.source && (
            <div>
              <h5 className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Source:</h5>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{issue.source}</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 pt-4 border-t flex justify-between">
          <button
            onClick={onClose}
            className={`px-4 py-2 border rounded-md ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Close
          </button>
          <div className="flex gap-3">
            {issue.status === 'resolved' && onCloseIssue && (
              <button
                onClick={() => onCloseIssue(issue)}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                🔒 Close Issue
              </button>
            )}
            <button
              onClick={() => onAssignTask(issue)}
              className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
            >
              📱 Assign Task to Department
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};