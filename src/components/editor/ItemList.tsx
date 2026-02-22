import { useState } from "react";
import {
  Card,
  Text,
  Badge,
  Group,
  Stack,
  ActionIcon,
  Code,
  Modal,
  Button,
} from "@mantine/core";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import type { Item } from "../../types";

interface ItemListProps {
  items: Item[];
  onView: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
}

export function ItemList({ items, onView, onEdit, onDelete }: ItemListProps) {
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  if (items.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No items yet. Create your first snippet!
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {items.map((item) => (
        <Card key={item.id} shadow="xs" padding="sm" withBorder onClick={() => onView(item)} style={{ cursor: "pointer" }}>
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs">
                <Text fw={600} truncate>
                  {item.title}
                </Text>
                <Badge size="xs" variant="light">
                  {item.type}
                </Badge>
                {item.language && (
                  <Badge size="xs" variant="outline">
                    {item.language}
                  </Badge>
                )}
              </Group>
              {item.description && (
                <Text size="sm" c="dimmed" truncate>
                  {item.description}
                </Text>
              )}
              {item.content && (
                <Code block style={{ maxHeight: 80, overflow: "hidden" }}>
                  {item.content.slice(0, 200)}
                </Code>
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
            </Stack>
            <Group gap={4}>
              <ActionIcon
                variant="subtle"
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                aria-label="Edit"
              >
                <IconEdit size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                aria-label="Delete"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Card>
      ))}
      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete item"
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete <Text span fw={600}>"{deleteTarget?.title}"</Text>? This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
