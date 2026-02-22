import { useState } from "react";
import { Textarea, Button, Stack } from "@mantine/core";
import { useCreateItem } from "../../hooks/useItems";
import { notifications } from "@mantine/notifications";
import { findDuplicates } from "../../lib/find-duplicates";
import { DuplicateWarning } from "./DuplicateWarning";
import type { Item } from "../../types";

interface QuickAddProps {
  onSuccess: () => void;
}

export function QuickAdd({ onSuccess }: QuickAddProps) {
  const [content, setContent] = useState("");
  const [duplicates, setDuplicates] = useState<Item[]>([]);
  const [checking, setChecking] = useState(false);
  const createMutation = useCreateItem();

  const doCreate = async () => {
    try {
      await createMutation.mutateAsync({ content: content.trim() });
      notifications.show({ message: "Item created — AI enrichment in progress" });
      onSuccess();
    } catch (e) {
      notifications.show({ message: `Failed to save: ${e}`, color: "red" });
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    setChecking(true);
    try {
      const matches = await findDuplicates(content.trim());
      if (matches.length > 0) {
        setDuplicates(matches);
      } else {
        await doCreate();
      }
    } catch (e) {
      console.warn("[DuplicateCheck] failed, proceeding:", e);
      await doCreate();
    } finally {
      setChecking(false);
    }
  };

  const handleProceed = async () => {
    setDuplicates([]);
    await doCreate();
  };

  const handleCancelDuplicates = () => {
    setDuplicates([]);
  };

  return (
    <Stack>
      <Textarea
        placeholder="Paste a command, snippet, config, or note..."
        autosize
        minRows={6}
        maxRows={20}
        value={content}
        onChange={(e) => setContent(e.currentTarget.value)}
        autoFocus
      />
      {duplicates.length > 0 && (
        <DuplicateWarning
          duplicates={duplicates}
          onProceed={handleProceed}
          onCancel={handleCancelDuplicates}
        />
      )}
      <Button
        onClick={handleSave}
        loading={createMutation.isPending || checking}
        disabled={!content.trim()}
      >
        Save
      </Button>
    </Stack>
  );
}
