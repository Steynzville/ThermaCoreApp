import documentList from "../constants/documents";
import { useAuth } from "../context/AuthContext";
import { useSidebarMargin } from "../hooks/useSidebarMargin";

const DocumentsPage = () => {
  const sidebarMargin = useSidebarMargin();
  const { userRole } = useAuth();

  // Filter documents based on user role
  const filteredDocuments = documentList.filter((document) =>
    document.allowedRoles.includes(userRole),
  );

  return (
    <div
      className={`transition-all duration-300 bg-blue-50 dark:bg-gray-900 ${sidebarMargin}`}
    >
      <div className="p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Documents & Resources
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Access important documents, manuals, and resources
          </p>
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {filteredDocuments.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Available Documents
              </h3>
              <ul className="space-y-3">
                {filteredDocuments.map((document) => (
                  <li
                    key={document.id}
                    className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0"
                  >
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg transition-colors duration-200"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <svg
                            className="h-5 w-5 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                            {document.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {document.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <svg
                            className="h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Documents Available
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No documents are available for your current role.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
