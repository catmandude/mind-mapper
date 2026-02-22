import {
  Stack,
  Text,
  NavLink,
  Badge,
  Group,
  ScrollArea,
  Divider,
} from "@mantine/core";
import {
  IconFolder,
  IconFileText,
  IconTerminal,
  IconCode,
  IconSettings,
} from "@tabler/icons-react";
import { useTags, useFolders } from "../../hooks/useItems";

interface SidebarProps {
  selectedFolder: string | null;
  selectedTag: string | null;
  selectedType: string | null;
  onSelectFolder: (folder: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onSelectType: (type: string | null) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  note: <IconFileText size={16} />,
  shell: <IconTerminal size={16} />,
  snippet: <IconCode size={16} />,
  config: <IconSettings size={16} />,
};

export function Sidebar({
  selectedFolder,
  selectedTag,
  selectedType,
  onSelectFolder,
  onSelectTag,
  onSelectType,
}: SidebarProps) {
  const { data: tags = [] } = useTags();
  const { data: folders = [] } = useFolders();

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="sm">
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          Types
        </Text>
        <NavLink
          label="All"
          active={selectedType === null}
          onClick={() => onSelectType(null)}
        />
        {["note", "shell", "snippet", "config"].map((type) => (
          <NavLink
            key={type}
            label={type.charAt(0).toUpperCase() + type.slice(1)}
            leftSection={TYPE_ICONS[type]}
            active={selectedType === type}
            onClick={() => onSelectType(selectedType === type ? null : type)}
          />
        ))}

        <Divider my="xs" />

        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          Folders
        </Text>
        <NavLink
          label="All"
          active={selectedFolder === null}
          onClick={() => onSelectFolder(null)}
        />
        {folders.map((folder) => (
          <NavLink
            key={folder}
            label={folder}
            leftSection={<IconFolder size={16} />}
            active={selectedFolder === folder}
            onClick={() =>
              onSelectFolder(selectedFolder === folder ? null : folder)
            }
          />
        ))}

        <Divider my="xs" />

        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          Tags
        </Text>
        <Group gap="xs">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? "filled" : "light"}
              style={{ cursor: "pointer" }}
              onClick={() =>
                onSelectTag(selectedTag === tag ? null : tag)
              }
            >
              {tag}
            </Badge>
          ))}
          {tags.length === 0 && (
            <Text size="xs" c="dimmed">
              No tags yet
            </Text>
          )}
        </Group>
      </Stack>
    </ScrollArea>
  );
}
