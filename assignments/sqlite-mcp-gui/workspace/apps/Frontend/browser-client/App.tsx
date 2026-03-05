import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Environment } from "../../../../../@ebowwa/codespaces-types/compile";
import { EnvironmentList } from "./components/environments/EnvironmentList";
import { ResourceChart } from "./components/chart/ResourceChart";
import { SettingsPanel } from "./components/shared/SettingsPanel";
import { ActivityLog } from "./components/activitylog/ActivityLog";
import { CostEstimate } from "./components/shared/CostEstimate";
import { QuickStats } from "./components/shared/QuickStats";
import { NotificationToast } from "./components/shared/NotificationToast";
import { CreateEnvironmentForm } from "./components/environments/CreateEnvironmentForm";
import { ToolsSection } from "./components/shared/ToolsSection";
import { FileBrowser } from "./components/filebrowser/FileBrowser";
import { PreviewLayer } from "./components/shared/PreviewLayer";
import { TerminalSheet } from "./components/terminal/TerminalSheet";
import { EnvironmentListSkeleton } from "./components/shared/Loading";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAppState } from "./hooks/useAppState";
import { useActivities } from "./hooks/useActivities";
import { useEnvironmentsApi } from "./hooks/useEnvironmentsApi";
import { useFileBrowser } from "./hooks/useFileBrowser";
import { useServerTypes, useLocations, isServerTypeAvailableInLocation } from "./hooks/useHetznerData";

function App() {
  // Custom hooks
  const state = useAppState();
  const { activities, addActivity } = useActivities();
  const api = useEnvironmentsApi({
    setEnvironments: state.setEnvironments,
    setLoading: state.setLoading,
    addActivity,
    showNotification: state.showNotification,
    setError: state.setError,
  });
  const fileBrowser = useFileBrowser({
    environments: state.environments,
    fileTransferEnvId: state.fileTransferEnvId,
    setFileTransferEnvId: state.setFileTransferEnvId,
    setFileTransferLoading: state.setFileTransferLoading,
    setFileTransferResult: state.setFileTransferResult,
    fileList: state.fileList,
    setFileList: state.setFileList,
    setCurrentPath: state.setCurrentPath,
    currentPath: state.currentPath,
    setShowFileBrowser: state.setShowFileBrowser,
    setSelectedFile: state.setSelectedFile,
    selectedFile: state.selectedFile,
    setPreviewContent: state.setPreviewContent,
    setPreviewLoading: state.setPreviewLoading,
    setPreviewLayerOpen: state.setPreviewLayerOpen,
    showNotification: state.showNotification,
  });

  const { serverTypes } = useServerTypes();
  const { locations } = useLocations();
  // Load environments on mount
  useEffect(() => {
    api.loadEnvironments();
  }, []);

  // Auto-refresh environment list every 30 seconds
  // loadEnvironments() also refreshes resources for running envs
  useEffect(() => {
    const interval = setInterval(() => {
      api.loadEnvironments({ silent: true });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    "cmd+n": () => {
      state.createInputRef.current?.focus();
    },
    c: () => {
      // Create environment if input is focused
      if (
        document.activeElement === state.createInputRef.current &&
        state.newEnvName.trim()
      ) {
        handleCreateEnvironment();
      }
    },
    r: () => {
      // Refresh environments (only when not typing)
      if (document.activeElement?.tagName !== "INPUT") {
        api.loadEnvironments();
      }
    },
    f: () => {
      // Focus search when not typing
      const searchInput = document.querySelector(
        'input[placeholder*="Search"]',
      ) as HTMLInputElement;
      searchInput?.focus();
    },
    arrowup: () => {
      // Navigate up in file list (when browser is open)
      if (state.showFileBrowser && state.fileList.length > 0) {
        const selectedIndex = state.selectedFile
          ? state.fileList.findIndex((f) => f.name === state.selectedFile?.name)
          : 0;
        const prevIndex =
          selectedIndex > 0 ? selectedIndex - 1 : state.fileList.length - 1;
        const targetFile = state.fileList[prevIndex];
        if (targetFile) {
          targetFile.type === "directory"
            ? fileBrowser.handleNavigateDirectory(targetFile.path)
            : fileBrowser.handleSelectFile(targetFile);
        }
      }
    },
    arrowdown: () => {
      // Navigate down in file list (when browser is open)
      if (state.showFileBrowser && state.fileList.length > 0) {
        const selectedIndex = state.selectedFile
          ? state.fileList.findIndex((f) => f.name === state.selectedFile?.name)
          : -1;
        const nextIndex =
          selectedIndex < state.fileList.length - 1 ? selectedIndex + 1 : 0;
        const targetFile = state.fileList[nextIndex];
        if (targetFile) {
          targetFile.type === "directory"
            ? fileBrowser.handleNavigateDirectory(targetFile.path)
            : fileBrowser.handleSelectFile(targetFile);
        }
      }
    },
    enter: () => {
      // Open selected file/directory or refresh list (when browser is open)
      if (state.showFileBrowser) {
        if (state.selectedFile) {
          const fileWithType = state.fileList.find(
            (f) => f.name === state.selectedFile?.name,
          );
          if (fileWithType?.type === "directory") {
            fileBrowser.handleNavigateDirectory(state.selectedFile.path);
          } else {
            fileBrowser.handleConfirmDownload();
          }
        } else {
          state.fileTransferEnvId &&
            fileBrowser.handleLoadFiles(state.fileTransferEnvId);
        }
      }
    },
    delete: () => {
      // Go to parent directory (when browser is open)
      if (state.showFileBrowser && state.currentPath !== ".") {
        fileBrowser.handleNavigateDirectory(
          state.currentPath.split("/").filter(Boolean).slice(0, -1).join("/") ||
            ".",
        );
      }
    },
    escape: () => {
      // Close file browser or settings (has priority)
      if (state.showFileBrowser) {
        fileBrowser.handleCloseFileBrowser();
      } else {
        state.setShowSettings(false);
        state.setNewEnvName("");
        state.setError(null);
      }
    },
  });

  const handleCreateEnvironment = () => {
    // Backend now handles location/server type compatibility - no need to validate here

    api.handleCreateEnvironment({
      newEnvName: state.newEnvName,
      selectedServerType: state.selectedServerType,
      selectedRegion: state.selectedRegion,
      selectedSSHKeys: state.selectedSSHKeys,
      newEnvDescription: state.newEnvDescription,
      newEnvProject: state.newEnvProject,
      newEnvOwner: state.newEnvOwner,
      newEnvPurpose: state.newEnvPurpose,
      newEnvType: state.newEnvType,
      setCreating: state.setCreating,
      setNewEnvName: state.setNewEnvName,
      setNewEnvDescription: state.setNewEnvDescription,
      setNewEnvProject: state.setNewEnvProject,
      setNewEnvOwner: state.setNewEnvOwner,
      setNewEnvPurpose: state.setNewEnvPurpose,
      setNewEnvType: state.setNewEnvType,
    });
  };

  const handleScreenshot = () => {
    api.handleScreenshot(state.setScreenshotLoading, state.setScreenshot);
  };

  const handleOpenTerminal = (id: string) => {
    const env = state.environments.find((e) => e.id === id);
    if (env && env.ipv4) {
      state.setTerminalEnvId(id);
      state.setTerminalOpen(true);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Cheapspaces</h1>
        <div className="header-right">
          <div className="header-shortcuts">
            <kbd>R</kbd> <kbd>F</kbd> <kbd>⌘N</kbd>
          </div>
          <button
            className="settings-btn"
            onClick={() => state.setShowSettings(true)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6"></path>
              <path d="m5.6 5.6 4.2 4.2m4.2 4.2 4.2 4.2"></path>
              <path d="M1 12h6m6 0h6"></path>
              <path d="m5.6 18.4 4.2-4.2m4.2-4.2 4.2-4.2"></path>
            </svg>
          </button>
        </div>
      </header>

      {state.showSettings && (
        <SettingsPanel onClose={() => state.setShowSettings(false)} />
      )}

      <NotificationToast
        notifications={state.notifications}
        onRemove={(id) =>
          state.setNotifications((prev) => prev.filter((n) => n.id !== id))
        }
      />

      {/* Left Sidebar - Stats */}
      <aside className="sidebar-left">
        <QuickStats environments={state.environments} />
        <CostEstimate environments={state.environments} />
      </aside>

      {/* Main Content */}
      <main>
        {/* Create Environment Form */}
        <CreateEnvironmentForm
          newEnvName={state.newEnvName}
          setNewEnvName={state.setNewEnvName}
          selectedServerType={state.selectedServerType}
          setSelectedServerType={state.setSelectedServerType}
          selectedRegion={state.selectedRegion}
          setSelectedRegion={state.setSelectedRegion}
          selectedSSHKeys={state.selectedSSHKeys}
          setSelectedSSHKeys={state.setSelectedSSHKeys}
          creating={state.creating}
          onCreate={handleCreateEnvironment}
          newEnvDescription={state.newEnvDescription}
          setNewEnvDescription={state.setNewEnvDescription}
          newEnvProject={state.newEnvProject}
          setNewEnvProject={state.setNewEnvProject}
          newEnvOwner={state.newEnvOwner}
          setNewEnvOwner={state.setNewEnvOwner}
          newEnvPurpose={state.newEnvPurpose}
          setNewEnvPurpose={state.setNewEnvPurpose}
          newEnvType={state.newEnvType}
          setNewEnvType={state.setNewEnvType}
          showMetadataOptions={state.showMetadataOptions}
          setShowMetadataOptions={state.setShowMetadataOptions}
          createInputRef={state.createInputRef}
        />

        {/* Environment List */}
        {state.loading ? (
          <EnvironmentListSkeleton />
        ) : (
          <EnvironmentList
            environments={state.environments}
            onDelete={(id) =>
              api.handleDeleteEnvironment(state.environments, id)
            }
            onStart={(id) => api.handleStartEnvironment(state.environments, id)}
            onStop={(id) => api.handleStopEnvironment(state.environments, id)}
            onConnect={handleOpenTerminal}
            onClone={(id) =>
              api.handleCloneEnvironment(
                state.environments,
                id,
                state.setCreating,
              )
            }
            onUpdateTags={api.handleUpdateTags}
            onRefreshResources={api.loadResources}
          />
        )}

        {/* File Browser */}
        <FileBrowser
          show={state.showFileBrowser}
          environments={state.environments}
          fileTransferEnvId={state.fileTransferEnvId}
          fileTransferLoading={state.fileTransferLoading}
          fileList={state.fileList}
          currentPath={state.currentPath}
          selectedFile={state.selectedFile}
          previewContent={state.previewContent}
          previewLoading={state.previewLoading}
          onClose={fileBrowser.handleCloseFileBrowser}
          onNavigateDirectory={fileBrowser.handleNavigateDirectory}
          onSelectFile={fileBrowser.handleSelectFile}
          onConfirmDownload={fileBrowser.handleConfirmDownload}
          onLoadPreview={fileBrowser.handleLoadPreview}
          onClearPreview={() => state.setPreviewContent(null)}
          onLoadFiles={fileBrowser.handleLoadFiles}
          formatFileSize={fileBrowser.formatFileSize}
        />
      </main>

      {/* Right Sidebar - Activity & Tools */}
      <aside className="sidebar-right">
        <ActivityLog activities={activities} />
        <ToolsSection
          environments={state.environments}
          screenshot={state.screenshot}
          screenshotLoading={state.screenshotLoading}
          onScreenshot={handleScreenshot}
          fileTransferEnvId={state.fileTransferEnvId}
          setFileTransferEnvId={state.setFileTransferEnvId}
          fileTransferLoading={state.fileTransferLoading}
          fileTransferResult={state.fileTransferResult}
          onFileUpload={fileBrowser.handleFileUpload}
          onFileDownload={fileBrowser.handleFileDownload}
        />
      </aside>

      {/* Preview Layer Sheet */}
      <PreviewLayer
        show={state.previewLayerOpen}
        selectedFile={state.selectedFile}
        previewContent={state.previewContent}
        onClose={fileBrowser.handleClosePreviewLayer}
      />

      {/* Terminal Sheet */}
      {state.terminalEnvId &&
        (() => {
          const env = state.environments.find(
            (e) => e.id === state.terminalEnvId,
          );
          return env && env.ipv4 ? (
            <TerminalSheet
              environment={env}
              isOpen={state.terminalOpen}
              onClose={() => {
                state.setTerminalOpen(false);
                state.setTerminalEnvId(null);
              }}
            />
          ) : null;
        })()}
    </div>
  );
}

// Mount the app to the DOM
// Preserve root across HMR for React Fast Refresh
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = (import.meta.hot.data.root ??= createRoot(rootElement));
  root.render(<App />);
}

// Expose ResourceChart, React, and createRoot for testing
if (typeof window !== "undefined") {
  (window as any).ResourceChart = ResourceChart;
  (window as any).React = React;
  (window as any).createRoot = createRoot;
}

// Enable hot module replacement for this module
if (import.meta.hot) {
  import.meta.hot.accept();
}

export default App;
