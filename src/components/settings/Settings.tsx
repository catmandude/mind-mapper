import { useState, useEffect } from "react";
import {
  Stack,
  Select,
  TextInput,
  PasswordInput,
  Button,
  Badge,
  Group,
  Text,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { open } from "@tauri-apps/plugin-dialog";
import {
  getAiSettings,
  setAiSettings,
  getDataDir,
  setDataDir,
} from "../../lib/tauri-commands";
import { AI_PROVIDERS } from "../../types";
import type { AiSettings as AiSettingsType } from "../../types";

function DataDirSettings() {
  const [currentDir, setCurrentDir] = useState("");
  const [newDir, setNewDir] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDataDir().then((dir) => {
      setCurrentDir(dir);
      setNewDir(dir);
    });
  }, []);

  const handleBrowse = async () => {
    const selected = await open({ directory: true });
    if (selected) {
      setNewDir(selected);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDataDir(newDir);
      setCurrentDir(newDir);
      notifications.show({
        message: "Data directory updated. Restart to apply.",
      });
    } catch (e) {
      notifications.show({
        message: `Failed to set data directory: ${e}`,
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack>
      <Text fw={500}>Data Directory</Text>
      <Group align="end">
        <TextInput
          label="Path"
          value={newDir}
          onChange={(e) => setNewDir(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button variant="light" onClick={handleBrowse}>
          Browse
        </Button>
      </Group>
      <Button
        onClick={handleSave}
        loading={saving}
        disabled={newDir === currentDir}
      >
        Save Data Directory
      </Button>
    </Stack>
  );
}

export function Settings() {
  const [settings, setSettings] = useState<AiSettingsType | null>(null);
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAiSettings().then((s) => {
      setSettings(s);
      if (s.provider) setProvider(s.provider);
      if (s.model) setModel(s.model);
      if (s.base_url) setBaseUrl(s.base_url);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await setAiSettings({
        provider,
        model,
        api_key: apiKey || undefined,
        base_url: baseUrl || undefined,
      });
      setSettings(result);
      setApiKey("");
      notifications.show({ message: "AI settings saved" });
    } catch (e) {
      notifications.show({
        message: `Failed to save AI settings: ${e}`,
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const defaultModel = () => {
    switch (provider) {
      case "openai":
        return "gpt-4o-mini";
      case "claude":
        return "claude-sonnet-4-20250514";
      case "ollama":
        return "llama3.2";
      default:
        return "";
    }
  };

  return (
    <Stack>
      <DataDirSettings />

      <Divider my="sm" />

      <Group>
        <Text fw={500}>AI Auto-Categorization</Text>
        {settings?.is_configured ? (
          <Badge color="green">Active</Badge>
        ) : (
          <Badge color="gray">Not Configured</Badge>
        )}
      </Group>

      <Select
        label="Provider"
        data={AI_PROVIDERS}
        value={provider}
        onChange={(v) => {
          if (v) {
            setProvider(v);
            if (!model) setModel("");
          }
        }}
      />

      <TextInput
        label="Model"
        placeholder={defaultModel()}
        value={model}
        onChange={(e) => setModel(e.currentTarget.value)}
      />

      {provider !== "ollama" && (
        <PasswordInput
          label="API Key"
          placeholder={settings?.has_api_key ? "••••••••  (saved)" : "Enter API key"}
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
        />
      )}

      <TextInput
        label="Base URL"
        placeholder={
          provider === "ollama"
            ? "http://localhost:11434"
            : provider === "claude"
              ? "https://api.anthropic.com"
              : "https://api.openai.com"
        }
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.currentTarget.value)}
      />

      <Button onClick={handleSave} loading={saving}>
        Save Settings
      </Button>
    </Stack>
  );
}
