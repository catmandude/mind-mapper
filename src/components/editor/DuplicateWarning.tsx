import { Alert, Button, Group, Stack, Text, Badge } from "@mantine/core";
import type { Item } from "../../types";

interface DuplicateWarningProps {
  duplicates: Item[];
  onProceed: () => void;
  onCancel: () => void;
}

export function DuplicateWarning({
  duplicates,
  onProceed,
  onCancel,
}: DuplicateWarningProps) {
  return (
    <Alert color="yellow" title="Similar items found" variant="light">
      <Stack gap="xs">
        <Text size="sm">
          The following existing items look similar to what you're adding:
        </Text>
        {duplicates.slice(0, 5).map((item) => (
          <Group key={item.id} gap="xs" wrap="nowrap" align="flex-start">
            <Badge size="xs" variant="light" style={{ flexShrink: 0 }}>
              {item.type}
            </Badge>
            <div style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                {item.title}
              </Text>
              {item.content && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {item.content.slice(0, 150)}
                </Text>
              )}
            </div>
          </Group>
        ))}
        <Group justify="flex-end" mt="xs">
          <Button size="xs" variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="xs" color="yellow" onClick={onProceed}>
            Add Anyway
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
}
