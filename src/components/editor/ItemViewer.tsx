import { useState, useEffect } from "react";
import {
  Text,
  Badge,
  Group,
  Stack,
  Textarea,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { IconCopy } from "@tabler/icons-react";
import type { Item } from "../../types";

interface ItemViewerProps {
  item: Item | null;
  onClose: () => void;
}

const straightenQuotes = (text: string) =>
  text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

export function ItemViewer({ item, onClose }: ItemViewerProps) {
  const [workingContent, setWorkingContent] = useState("");

  useEffect(() => {
    if (item) {
      setWorkingContent(straightenQuotes(item.content));
    }
  }, [item]);

  if (!item) return null;

  const handleChange = (value: string) => {
    setWorkingContent(straightenQuotes(value));
  };

  const handleCopy = async () => {
    try {
      await writeText(workingContent);
      notifications.show({ message: "Copied to clipboard" });
    } catch (e) {
      notifications.show({
        message: `Failed to copy: ${e}`,
        color: "red",
      });
    }
  };

  return (
    <Stack gap="sm">
      <Group gap="xs">
        <Text fw={700} size="lg">
          {item.title}
        </Text>
        <Badge size="sm" variant="light">
          {item.type}
        </Badge>
        {item.language && (
          <Badge size="sm" variant="outline">
            {item.language}
          </Badge>
        )}
      </Group>

      {item.description && (
        <Text size="sm" c="dimmed">
          {item.description}
        </Text>
      )}

      {item.tags.length > 0 && (
        <Group gap={4}>
          {item.tags.map((tag) => (
            <Badge key={tag} size="xs" variant="dot">
              {tag}
            </Badge>
          ))}
        </Group>
      )}

      <Textarea
        value={workingContent}
        onChange={(e) => handleChange(e.currentTarget.value)}
        autosize
        minRows={4}
        maxRows={20}
        styles={{ input: { fontFamily: "monospace" } }}
      />

      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Close
        </Button>
        <Button leftSection={<IconCopy size={16} />} onClick={handleCopy}>
          Copy
        </Button>
      </Group>
    </Stack>
  );
}
