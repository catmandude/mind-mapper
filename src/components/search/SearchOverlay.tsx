import { useState, useEffect, useCallback, useRef } from "react";
import {
  TextInput,
  Paper,
  ScrollArea,
  Text,
  Group,
  Badge,
  Code,
  Stack,
  Kbd,
  Box,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useSearch } from "../../hooks/useSearch";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
// types imported from hooks

export function SearchOverlayApp() {
  const { results, query, search, loading } = useSearch();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when window gets focus
  useEffect(() => {
    const unlisten = listen("search-focus", () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            await writeText(results[selectedIndex].content);
            await getCurrentWindow().hide();
          }
          break;
        case "Escape":
          e.preventDefault();
          await getCurrentWindow().hide();
          break;
      }
    },
    [results, selectedIndex]
  );

  const selectedItem = results[selectedIndex] || null;

  return (
    <Paper
      shadow="xl"
      radius="md"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--mantine-color-body)",
      }}
    >
      <Box p="sm" pb={0}>
        <TextInput
          ref={inputRef}
          placeholder="Search snippets... (Enter to copy, Esc to close)"
          leftSection={<IconSearch size={18} />}
          rightSection={loading ? <Text size="xs">...</Text> : null}
          value={query}
          onChange={(e) => search(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          size="md"
        />
      </Box>
      <Group
        grow
        align="stretch"
        gap={0}
        style={{ flex: 1, overflow: "hidden" }}
        p="sm"
      >
        {/* Results list */}
        <ScrollArea style={{ flex: "0 0 45%" }} h="100%">
          <Stack gap={2}>
            {results.map((item, index) => (
              <Paper
                key={item.id}
                p="xs"
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    index === selectedIndex
                      ? "var(--mantine-color-blue-light)"
                      : undefined,
                  borderRadius: "var(--mantine-radius-sm)",
                }}
                onClick={() => setSelectedIndex(index)}
              >
                <Text size="sm" fw={500} truncate>
                  {item.title}
                </Text>
                <Group gap={4} mt={2}>
                  <Badge size="xs" variant="light">
                    {item.type}
                  </Badge>
                  {item.language && (
                    <Badge size="xs" variant="outline">
                      {item.language}
                    </Badge>
                  )}
                </Group>
              </Paper>
            ))}
            {results.length === 0 && query && (
              <Text size="sm" c="dimmed" ta="center" py="md">
                No results found
              </Text>
            )}
            {results.length === 0 && !query && (
              <Text size="sm" c="dimmed" ta="center" py="md">
                Type to search your snippets
              </Text>
            )}
          </Stack>
        </ScrollArea>

        {/* Preview pane */}
        <Box style={{ flex: "0 0 55%", borderLeft: "1px solid var(--mantine-color-default-border)" }} pl="sm">
          {selectedItem ? (
            <Stack gap="xs" h="100%">
              <Text fw={600}>{selectedItem.title}</Text>
              {selectedItem.description && (
                <Text size="sm" c="dimmed">
                  {selectedItem.description}
                </Text>
              )}
              <ScrollArea style={{ flex: 1 }}>
                <Code block>{selectedItem.content}</Code>
              </ScrollArea>
              <Group gap="xs" justify="center">
                <Kbd>Enter</Kbd>
                <Text size="xs" c="dimmed">
                  copy
                </Text>
                <Kbd>Esc</Kbd>
                <Text size="xs" c="dimmed">
                  close
                </Text>
              </Group>
            </Stack>
          ) : null}
        </Box>
      </Group>
    </Paper>
  );
}
