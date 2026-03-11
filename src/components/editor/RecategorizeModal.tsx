import { useState, useEffect } from "react";
import { Button, Checkbox, NumberInput, Progress, Stack, Text } from "@mantine/core";
import { listen } from "@tauri-apps/api/event";
import { recategorizeAll } from "../../lib/tauri-commands";
import type { RecategorizeProgress } from "../../types";

interface RecategorizeModalProps {
  itemCount: number;
  uncategorizedCount: number;
  aiConfigured: boolean;
}

export function RecategorizeModal({
  itemCount,
  uncategorizedCount,
  aiConfigured,
}: RecategorizeModalProps) {
  const [includeManual, setIncludeManual] = useState(false);
  const [maxFolders, setMaxFolders] = useState<number>(10);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<RecategorizeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const affectedCount = includeManual ? itemCount : uncategorizedCount;

  useEffect(() => {
    const unlisten = listen<RecategorizeProgress>(
      "recategorize-progress",
      (event) => {
        setProgress(event.payload);
        if (event.payload.phase === "done") {
          setRunning(false);
        }
        if (event.payload.phase === "error") {
          setRunning(false);
          setError(event.payload.message);
        }
      }
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleStart = async () => {
    setRunning(true);
    setError(null);
    setProgress(null);
    try {
      await recategorizeAll(includeManual, maxFolders);
    } catch (e) {
      setError(String(e));
      setRunning(false);
    }
  };

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const isDone = progress?.phase === "done";

  return (
    <Stack gap="md">
      <Text size="sm">
        This will use AI to reassign folders, tags, type, and description for
        your items. A two-pass approach first generates a coherent folder
        taxonomy, then categorizes each item against it.
      </Text>

      <Text size="sm" fw={500}>
        {affectedCount} item{affectedCount !== 1 ? "s" : ""} will be
        recategorized.
      </Text>

      <Checkbox
        label="Include manually categorized items"
        description="When unchecked, only items in the root folder will be recategorized"
        checked={includeManual}
        onChange={(e) => setIncludeManual(e.currentTarget.checked)}
        disabled={running}
      />

      <NumberInput
        label="Max folders"
        description="Limits how many folders the AI taxonomy will create"
        value={maxFolders}
        onChange={(val) => setMaxFolders(typeof val === "number" ? Math.floor(val) : 10)}
        min={3}
        max={30}
        allowDecimal={false}
        disabled={running}
      />

      {!aiConfigured && (
        <Text size="sm" c="red">
          AI provider is not configured. Please configure it in Settings first.
        </Text>
      )}

      {error && (
        <Text size="sm" c="red">
          {error}
        </Text>
      )}

      {running && progress && (
        <Stack gap="xs">
          <Progress
            value={
              progress.phase === "taxonomy"
                ? progress.current * 50
                : 50 + progressPercent * 0.5
            }
            animated={!isDone}
          />
          <Text size="xs" c="dimmed">
            {progress.message}
          </Text>
        </Stack>
      )}

      {isDone && (
        <Text size="sm" c="green">
          {progress.message}
        </Text>
      )}

      <Button
        onClick={handleStart}
        disabled={!aiConfigured || running || affectedCount === 0}
        loading={running}
      >
        {running ? "Recategorizing..." : "Start Recategorization"}
      </Button>
    </Stack>
  );
}
