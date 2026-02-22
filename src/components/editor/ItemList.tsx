import {
  Card,
  Text,
  Badge,
  Group,
  Stack,
  ActionIcon,
  Code,
} from "@mantine/core";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import type { Item } from "../../types";

interface ItemListProps {
  items: Item[];
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
}

export function ItemList({ items, onEdit, onDelete }: ItemListProps) {
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
        <Card key={item.id} shadow="xs" padding="sm" withBorder>
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
                onClick={() => onEdit(item)}
                aria-label="Edit"
              >
                <IconEdit size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => onDelete(item.id)}
                aria-label="Delete"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
