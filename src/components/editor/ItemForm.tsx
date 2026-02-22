import { useState } from "react";
import {
  TextInput,
  Select,
  TagsInput,
  Textarea,
  Button,
  Group,
  Stack,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { Item, CreateItemInput, ItemType } from "../../types";
import { ITEM_TYPES, LANGUAGES } from "../../types";
import { findDuplicates } from "../../lib/find-duplicates";
import { DuplicateWarning } from "./DuplicateWarning";

interface ItemFormProps {
  item?: Item | null;
  onSubmit: (values: CreateItemInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ItemForm({ item, onSubmit, onCancel, loading }: ItemFormProps) {
  const [duplicates, setDuplicates] = useState<Item[]>([]);
  const [pendingValues, setPendingValues] = useState<CreateItemInput | null>(null);
  const [checking, setChecking] = useState(false);

  const form = useForm({
    initialValues: {
      title: item?.title || "",
      type: (item?.type || "note") as ItemType,
      language: item?.language || "",
      tags: item?.tags || [],
      folder: item?.folder || "/",
      description: item?.description || "",
      content: item?.content || "",
    },
    validate: {
      title: (v) => (v.trim().length === 0 ? "Title is required" : null),
    },
  });

  const handleSubmit = async (values: CreateItemInput) => {
    const text = `${values.title || ""} ${values.content || ""}`;

    setChecking(true);
    try {
      const matches = await findDuplicates(text, item?.id);
      if (matches.length > 0) {
        setPendingValues(values);
        setDuplicates(matches);
      } else {
        onSubmit(values);
      }
    } catch (e) {
      console.warn("[DuplicateCheck] failed, proceeding:", e);
      onSubmit(values);
    } finally {
      setChecking(false);
    }
  };

  const handleProceed = () => {
    if (pendingValues) {
      onSubmit(pendingValues);
    }
    setDuplicates([]);
    setPendingValues(null);
  };

  const handleCancelDuplicates = () => {
    setDuplicates([]);
    setPendingValues(null);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="sm">
        <TextInput
          label="Title"
          placeholder="e.g., Restart Docker on staging"
          required
          {...form.getInputProps("title")}
        />
        <Group grow>
          <Select
            label="Type"
            data={ITEM_TYPES}
            {...form.getInputProps("type")}
          />
          <Select
            label="Language"
            data={LANGUAGES}
            clearable
            searchable
            {...form.getInputProps("language")}
          />
        </Group>
        <TagsInput
          label="Tags"
          placeholder="Press Enter to add"
          {...form.getInputProps("tags")}
        />
        <TextInput
          label="Folder"
          placeholder="/"
          {...form.getInputProps("folder")}
        />
        <TextInput
          label="Description"
          placeholder="Brief description..."
          {...form.getInputProps("description")}
        />
        <Textarea
          label="Content"
          placeholder="Your snippet, command, or note..."
          minRows={8}
          autosize
          maxRows={20}
          styles={{ input: { fontFamily: "monospace" } }}
          {...form.getInputProps("content")}
        />
        {duplicates.length > 0 && (
          <DuplicateWarning
            duplicates={duplicates}
            onProceed={handleProceed}
            onCancel={handleCancelDuplicates}
          />
        )}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading || checking}>
            {item ? "Update" : "Create"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
