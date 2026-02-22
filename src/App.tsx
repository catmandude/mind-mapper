import { useState, useMemo } from "react";
import {
  AppShell,
  Title,
  Button,
  Group,
  Modal,
  TextInput,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { Sidebar } from "./components/sidebar/Sidebar";
import { ItemList } from "./components/editor/ItemList";
import { ItemForm } from "./components/editor/ItemForm";
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

  const [opened, { open, close }] = useDisclosure(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
            <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
              New Item
            </Button>
          </Group>
        </Group>

        <ScrollArea>
          <ItemList
            items={filteredItems}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </ScrollArea>
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
    </AppShell>
  );
}
