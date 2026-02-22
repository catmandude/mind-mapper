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
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { getAiSettings, setAiSettings } from "../../lib/tauri-commands";
import { AI_PROVIDERS } from "../../types";
import type { AiSettings as AiSettingsType } from "../../types";

export function AISettings() {
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
