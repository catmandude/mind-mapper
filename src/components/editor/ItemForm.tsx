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

interface ItemFormProps {
  item?: Item | null;
  onSubmit: (values: CreateItemInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ItemForm({ item, onSubmit, onCancel, loading }: ItemFormProps) {
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

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
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
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {item ? "Update" : "Create"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
