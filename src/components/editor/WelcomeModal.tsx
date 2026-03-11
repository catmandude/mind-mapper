import {
  Modal,
  Text,
  Title,
  SimpleGrid,
  Card,
  Button,
  Stack,
  ThemeIcon,
} from "@mantine/core";
import {
  IconSearch,
  IconFileText,
  IconGraph,
  IconWand,
} from "@tabler/icons-react";
import { setSetting } from "../../lib/tauri-commands";

interface WelcomeModalProps {
  opened: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: IconSearch,
    color: "cyan",
    title: "Global Search",
    description: "Cmd+Shift+Space instant full-text search across all your notes.",
  },
  {
    icon: IconFileText,
    color: "indigo",
    title: "Markdown Files",
    description: "Plain files on disk, no vendor lock-in. Your data stays yours.",
  },
  {
    icon: IconGraph,
    color: "violet",
    title: "Graph View",
    description: "Visualize connections between your notes with an interactive graph.",
  },
  {
    icon: IconWand,
    color: "grape",
    title: "AI Categorization",
    description: "Auto-tag with OpenAI, Claude, or Ollama.",
  },
];

export function WelcomeModal({ opened, onClose }: WelcomeModalProps) {
  const handleClose = async () => {
    await setSetting("welcome_shown", "true");
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Title order={3}>Welcome to LynxNote</Title>}
      size="lg"
      centered
    >
      <Stack gap="lg">
        <Text c="dimmed">
          A fast, local-first knowledge base for developers.
        </Text>

        <SimpleGrid cols={2}>
          {features.map((feature) => (
            <Card key={feature.title} padding="md" radius="md" withBorder>
              <Stack gap="xs">
                <ThemeIcon size="lg" radius="md" color={feature.color} variant="light">
                  <feature.icon size={20} />
                </ThemeIcon>
                <Text fw={600} size="sm">
                  {feature.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {feature.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>

        <Button fullWidth onClick={handleClose}>
          Get Started
        </Button>
      </Stack>
    </Modal>
  );
}
