import { useState, useMemo, useEffect } from "react";
import {
  AppShell,
  Title,
  Button,
  Group,
  Modal,
  TextInput,
  ScrollArea,
  ActionIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { IconPlus, IconSearch, IconSettings, IconBolt, IconList, IconGraph } from "@tabler/icons-react";
import { Sidebar } from "./components/sidebar/Sidebar";
import { ItemList } from "./components/editor/ItemList";
import { ItemForm } from "./components/editor/ItemForm";
import { ItemViewer } from "./components/editor/ItemViewer";
import { Settings } from "./components/settings/Settings";
import { GraphView } from "./components/graph/GraphView";
import { QuickAdd } from "./components/editor/QuickAdd";
import {
  useItems,
  useCreateItem,
  useUpdateItem,
  useDeleteItem,
} from "./hooks/useItems";
import type { Item, CreateItemInput, UpdateItemInput } from "./types";

export default function App() {
  const { data: items = [] } = useItems();
  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();

  const queryClient = useQueryClient();
  const [opened, { open, close }] = useDisclosure(false);
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const [quickAddOpened, { open: openQuickAdd, close: closeQuickAdd }] =
    useDisclosure(false);
  const [viewerOpened, { open: openViewer, close: closeViewer }] =
    useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");

  // Listen for AI enrichment events to refresh item lists
  useEffect(() => {
    const unlisten = listen("items-changed", () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [queryClient]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let filtered = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedFolder) {
      filtered = filtered.filter((item) => item.folder === selectedFolder);
    }
    if (selectedTag) {
      filtered = filtered.filter((item) => item.tags.includes(selectedTag));
    }
    if (selectedType) {
      filtered = filtered.filter((item) => item.type === selectedType);
    }
    return filtered;
  }, [items, searchQuery, selectedFolder, selectedTag, selectedType]);

  const handleCreate = () => {
    setEditingItem(null);
    open();
  };

  const handleView = (item: Item) => {
    setViewingItem(item);
    openViewer();
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    open();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      notifications.show({ message: "Item deleted", color: "red" });
    } catch (e) {
      notifications.show({
        message: `Failed to delete: ${e}`,
        color: "red",
      });
    }
  };

  const handleSubmit = async (values: CreateItemInput) => {
    try {
      if (editingItem) {
        const input: UpdateItemInput = { id: editingItem.id, ...values };
        await updateMutation.mutateAsync(input);
        notifications.show({ message: "Item updated" });
      } else {
        await createMutation.mutateAsync(values);
        notifications.show({ message: "Item created" });
      }
      close();
    } catch (e) {
      notifications.show({
        message: `Failed to save: ${e}`,
        color: "red",
      });
    }
  };

  return (
    <AppShell navbar={{ width: 240, breakpoint: "sm" }} padding="md">
      <AppShell.Navbar>
        <Sidebar
          selectedFolder={selectedFolder}
          selectedTag={selectedTag}
          selectedType={selectedType}
          onSelectFolder={setSelectedFolder}
          onSelectTag={setSelectedTag}
          onSelectType={setSelectedType}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Group justify="space-between" mb="md">
          <Title order={3}>MindMapper</Title>
          <Group>
            <TextInput
              placeholder="Filter..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ width: 250 }}
            />
            <ActionIcon.Group>
              <ActionIcon
                variant={viewMode === "list" ? "filled" : "default"}
                onClick={() => setViewMode("list")}
                size="lg"
              >
                <IconList size={18} />
              </ActionIcon>
              <ActionIcon
                variant={viewMode === "graph" ? "filled" : "default"}
                onClick={() => setViewMode("graph")}
                size="lg"
              >
                <IconGraph size={18} />
              </ActionIcon>
            </ActionIcon.Group>
            <Button leftSection={<IconBolt size={16} />} variant="light" onClick={openQuickAdd}>
              Quick Add
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
              New Item
            </Button>
            <ActionIcon variant="subtle" onClick={openSettings} size="lg">
              <IconSettings size={20} />
            </ActionIcon>
          </Group>
        </Group>

        {viewMode === "list" ? (
          <ScrollArea>
            <ItemList
              items={filteredItems}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </ScrollArea>
        ) : (
          <GraphView
            items={filteredItems}
            onClickNode={handleView}
            height="calc(100vh - 120px)"
          />
        )}
      </AppShell.Main>

      <Modal
        opened={opened}
        onClose={close}
        title={editingItem ? "Edit Item" : "New Item"}
        size="lg"
      >
        <ItemForm
          item={editingItem}
          onSubmit={handleSubmit}
          onCancel={close}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <Modal opened={settingsOpened} onClose={closeSettings} title="Settings" size="md">
        <Settings />
      </Modal>
      <Modal opened={quickAddOpened} onClose={closeQuickAdd} title="Quick Add" size="md">
        <QuickAdd onSuccess={closeQuickAdd} />
      </Modal>
      <Modal opened={viewerOpened} onClose={closeViewer} title={viewingItem?.title ?? "View Item"} size="lg">
        <ItemViewer item={viewingItem} onClose={closeViewer} />
      </Modal>
    </AppShell>
  );
}
