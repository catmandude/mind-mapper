import {
  Modal,
  Text,
  ScrollArea,
  Accordion,
  ThemeIcon,
  Group,
  Badge,
  List,
  Code,
  Kbd,
  Stack,
} from "@mantine/core";
import {
  IconRocket,
  IconPlus,
  IconSearch,
  IconLayoutSidebar,
  IconGraph,
  IconWand,
  IconFile,
  IconKeyboard,
} from "@tabler/icons-react";

interface DocumentationModalProps {
  opened: boolean;
  onClose: () => void;
}

export function DocumentationModal({ opened, onClose }: DocumentationModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700} size="lg">LynxNote Documentation</Text>}
      size="xl"
      centered
    >
      <ScrollArea h="70vh">
        <Accordion variant="separated" multiple defaultValue={["getting-started"]}>
          <Accordion.Item value="getting-started">
            <Accordion.Control
              icon={
                <ThemeIcon size="lg" radius="md" color="violet" variant="light">
                  <IconRocket size={20} />
                </ThemeIcon>
              }
            >
              Getting Started
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">
                  LynxNote is a local-first developer knowledge base. All your data is stored as
                  plain Markdown files on disk — no cloud, no vendor lock-in.
                </Text>
                <Text size="sm" fw={600}>Item Types</Text>
                <Group gap="xs">
                  <Badge color="blue" variant="light">Note</Badge>
                  <Badge color="green" variant="light">Shell</Badge>
                  <Badge color="orange" variant="light">Snippet</Badge>
                  <Badge color="red" variant="light">Config</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Each type has a distinct color in the graph view and can be filtered in the sidebar.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="creating-items">
            <Accordion.Control
              icon={
                <ThemeIcon size="lg" radius="md" color="cyan" variant="light">
                  <IconPlus size={20} />
                </ThemeIcon>
              }
            >
              Creating Items
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm" fw={600}>Item Form Fields</Text>
                <List size="sm" spacing="xs">
                  <List.Item><Text span fw={600}>Title</Text> — a short, descriptive name for the item</List.Item>
                  <List.Item><Text span fw={600}>Type</Text> — note, shell, snippet, or config</List.Item>
                  <List.Item><Text span fw={600}>Description</Text> — brief summary of what the item is for</List.Item>
                  <List.Item><Text span fw={600}>Content</Text> — the full content (code, commands, notes)</List.Item>
                  <List.Item><Text span fw={600}>Tags</Text> — comma-separated labels for organization</List.Item>
                  <List.Item><Text span fw={600}>Folder</Text> — virtual folder path for grouping items</List.Item>
                </List>
                <Text size="sm" fw={600}>Quick Add</Text>
                <Text size="sm" c="dimmed">
                  Use the Quick Add button for rapid item creation with just a title, type, and content.
                  Items are saved immediately with minimal friction.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="search">
            <Accordion.Control
              icon={
                <ThemeIcon size="lg" radius="md" color="cyan" variant="light">
                  <IconSearch size={20} />
                </ThemeIcon>
              }
            >
              Search
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm" fw={600}>Filter Bar</Text>
                <Text size="sm" c="dimmed">
                  The filter input in the header searches across titles, descriptions, content, and tags
                  in real time.
                </Text>
                <Text size="sm" fw={600}>Global Search Overlay</Text>
                <Text size="sm">
                  Press <Kbd>⌘</Kbd> + <Kbd>⇧</Kbd> + <Kbd>Space</Kbd> from anywhere on your Mac
                  to open the global search overlay. It uses full-text search with BM25 ranking
                  for instant results.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="sidebar">
            <Accordion.Control
              icon={
                <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
                  <IconLayoutSidebar size={20} />
                </ThemeIcon>
              }
            >
              Sidebar & Filtering
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">
                  The sidebar provides three ways to filter your items:
                </Text>
                <List size="sm" spacing="xs">
                  <List.Item><Text span fw={600}>By Type</Text> — click a type to show only items of that kind</List.Item>
                  <List.Item><Text span fw={600}>By Folder</Text> — browse virtual folders to find grouped items</List.Item>
                  <List.Item><Text span fw={600}>By Tag</Text> — select a tag to filter items sharing that label</List.Item>
                </List>
                <Text size="sm" c="dimmed">
                  Active filters appear as badges above the item list. Click the X on a badge or
                  "Clear all" to remove filters.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="graph-view">
            <Accordion.Control
              icon={
                <ThemeIcon size="lg" radius="md" color="violet" variant="light">
                  <IconGraph size={20} />
                </ThemeIcon>
              }
            >
              Graph View
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">
                  Toggle between list and graph view using the icons in the header.
                </Text>
                <List size="sm" spacing="xs">
                  <List.Item><Text span fw={600}>Node color</Text> — each item type has a distinct color</List.Item>
                  <List.Item><Text span fw={600}>Node size</Text> — larger nodes have more tags/connections</List.Item>
                  <List.Item><Text span fw={600}>Edges</Text> — lines connect items that share tags or have keyword overlap</List.Item>
                  <List.Item><Text span fw={600}>Click</Text> — click any node to open the item viewer</List.Item>
                </List>
                <Text size="sm" c="dimmed">
                  The graph uses WebGL rendering for smooth performance even with hundreds of items.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="ai-categorization">
            <Accordion.Control
              icon={
                <ThemeIcon size="lg" radius="md" color="grape" variant="light">
                  <IconWand size={20} />
                </ThemeIcon>
              }
            >
              AI Categorization
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm" fw={600}>Setup</Text>
                <List size="sm" spacing="xs" type="ordered">
                  <List.Item>Open Settings (gear icon in the header)</List.Item>
                  <List.Item>Select an AI provider (OpenAI, Claude, or Ollama)</List.Item>
                  <List.Item>Enter your API key or endpoint URL</List.Item>
                  <List.Item>Choose a model and save</List.Item>
                </List>
                <Text size="sm" fw={600}>Recategorize</Text>
                <Text size="sm" c="dimmed">
                  Click the "Recategorize" button in the header to run AI categorization across
                  your items. The AI will suggest folders and tags based on item content.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="file-storage">
            <Accordion.Control
              icon={
                <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                  <IconFile size={20} />
                </ThemeIcon>
              }
            >
              File Storage
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <Text size="sm">
                  Items are stored as Markdown files in:
                </Text>
                <Code block>~/Documents/LynxNote/</Code>
                <Text size="sm">
                  Each file uses YAML frontmatter for metadata:
                </Text>
                <Code block>{`---
title: My Note
type: note
tags: [docker, deployment]
folder: /devops
---

Your content here...`}</Code>
                <Text size="sm" c="dimmed">
                  A file watcher monitors this directory for external changes. Edits made outside
                  LynxNote (e.g., in VS Code) are automatically picked up and synced to the search index.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="keyboard-shortcuts">
            <Accordion.Control
              icon={
                <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                  <IconKeyboard size={20} />
                </ThemeIcon>
              }
            >
              Keyboard Shortcuts
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                <List size="sm" spacing="xs" listStyleType="none">
                  <List.Item><Kbd>⌘</Kbd> + <Kbd>⇧</Kbd> + <Kbd>Space</Kbd> — Global search overlay</List.Item>
                  <List.Item><Kbd>⌘</Kbd> + <Kbd>C</Kbd> — Copy selected text</List.Item>
                  <List.Item><Kbd>⌘</Kbd> + <Kbd>V</Kbd> — Paste from clipboard</List.Item>
                  <List.Item><Kbd>⌘</Kbd> + <Kbd>A</Kbd> — Select all</List.Item>
                  <List.Item><Kbd>⌘</Kbd> + <Kbd>Z</Kbd> — Undo</List.Item>
                  <List.Item><Kbd>⌘</Kbd> + <Kbd>⇧</Kbd> + <Kbd>Z</Kbd> — Redo</List.Item>
                  <List.Item><Kbd>Escape</Kbd> — Close modals and overlays</List.Item>
                </List>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </ScrollArea>
    </Modal>
  );
}
