import { useState, useRef } from "react";
import { Environment } from "../../../../../../@ebowwa/codespaces-types/compile";

export interface FileListItem {
  name: string;
  path: string;
  size: string;
  modified: string;
  type: "file" | "directory";
}

export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
  duration?: number;
}

export function useAppState() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [selectedServerType, setSelectedServerType] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedSSHKeys, setSelectedSSHKeys] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Optional metadata for new environments
  const [newEnvDescription, setNewEnvDescription] = useState("");
  const [newEnvProject, setNewEnvProject] = useState("");
  const [newEnvOwner, setNewEnvOwner] = useState("");
  const [newEnvPurpose, setNewEnvPurpose] = useState("");
  const [newEnvType, setNewEnvType] = useState<
    "development" | "staging" | "production" | "testing"
  >("development");
  const [showMetadataOptions, setShowMetadataOptions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fileTransferEnvId, setFileTransferEnvId] = useState<string | null>(
    null,
  );
  const [fileTransferLoading, setFileTransferLoading] = useState(false);
  const [fileTransferResult, setFileTransferResult] = useState<string | null>(
    null,
  );
  const [fileList, setFileList] = useState<FileListItem[]>([]);
  const [currentPath, setCurrentPath] = useState(".");
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [previewContent, setPreviewContent] = useState<{
    type: string;
    content?: string;
    error?: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLayerOpen, setPreviewLayerOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalEnvId, setTerminalEnvId] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (
    message: string,
    type: Notification["type"] = "info",
  ) => {
    const notification: Notification = {
      id: Date.now().toString(),
      message,
      type,
      duration: type === "error" ? 5000 : 3000,
    };
    setNotifications((prev) => [...prev, notification]);
  };

  return {
    // State
    environments,
    setEnvironments,
    loading,
    setLoading,
    error,
    setError,
    screenshot,
    setScreenshot,
    screenshotLoading,
    setScreenshotLoading,
    newEnvName,
    setNewEnvName,
    selectedServerType,
    setSelectedServerType,
    selectedRegion,
    setSelectedRegion,
    selectedSSHKeys,
    setSelectedSSHKeys,
    creating,
    setCreating,
    newEnvDescription,
    setNewEnvDescription,
    newEnvProject,
    setNewEnvProject,
    newEnvOwner,
    setNewEnvOwner,
    newEnvPurpose,
    setNewEnvPurpose,
    newEnvType,
    setNewEnvType,
    showMetadataOptions,
    setShowMetadataOptions,
    showSettings,
    setShowSettings,
    notifications,
    setNotifications,
    fileTransferEnvId,
    setFileTransferEnvId,
    fileTransferLoading,
    setFileTransferLoading,
    fileTransferResult,
    setFileTransferResult,
    fileList,
    setFileList,
    currentPath,
    setCurrentPath,
    showFileBrowser,
    setShowFileBrowser,
    selectedFile,
    setSelectedFile,
    previewContent,
    setPreviewContent,
    previewLoading,
    setPreviewLoading,
    previewLayerOpen,
    setPreviewLayerOpen,
    terminalOpen,
    setTerminalOpen,
    terminalEnvId,
    setTerminalEnvId,
    createInputRef,
    showNotification,
  };
}
