import { useState, useEffect } from "react";
import {
  Text,
  Badge,
  Group,
  Stack,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { IconCopy } from "@tabler/icons-react";
import { CodeViewer } from "./CodeViewer";
import type { Item } from "../../types";
import { absoluteDateTime, relativeTime } from "../../lib/format-date";

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

      <Group gap="md">
        <Text size="xs" c="dimmed" title={absoluteDateTime(item.created)}>
          Created {relativeTime(item.created)}
        </Text>
        <Text size="xs" c="dimmed" title={absoluteDateTime(item.modified)}>
          Modified {relativeTime(item.modified)}
        </Text>
      </Group>

      <CodeViewer
        value={workingContent}
        language={item.language}
        editable
        onChange={handleChange}
        maxHeight="500px"
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
