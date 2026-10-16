"use client";

import React, { useState, useEffect } from "react";
import { ProvidersSettingsModal } from "./providers-settings-panel";
import { McpConnectorsModal } from "./mcp-connectors-panel";

export interface UnifiedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "providers" | "connectors";
  onSelectProvider?: (providerId: string, model?: string) => void;
  onConnectorsChanged?: () => void;
}

export function UnifiedSettingsModal({
  isOpen,
  onClose,
  initialTab = "providers",
  onSelectProvider,
  onConnectorsChanged,
}: UnifiedSettingsModalProps) {
  const [currentTab, setCurrentTab] = useState<"providers" | "connectors">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setCurrentTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  if (currentTab === "connectors") {
    return (
      <McpConnectorsModal
        isOpen={isOpen}
        onClose={onClose}
        onConnectorsChanged={onConnectorsChanged}
        onSwitchToProviders={() => setCurrentTab("providers")}
      />
    );
  }

  return (
    <ProvidersSettingsModal
      isOpen={isOpen}
      onClose={onClose}
      onSelectProvider={onSelectProvider}
      onSwitchToConnectors={() => setCurrentTab("connectors")}
    />
  );
}
