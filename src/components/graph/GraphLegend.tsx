import { Paper, Group, ColorSwatch, Text, Stack } from "@mantine/core";
import { TYPE_COLORS } from "../../lib/graph-builder";

const LEGEND_ITEMS = [
  { type: "note", label: "Note" },
  { type: "shell", label: "Shell" },
  { type: "snippet", label: "Snippet" },
  { type: "config", label: "Config" },
];

export function GraphLegend() {
  return (
    <Paper
      shadow="sm"
      p="xs"
      radius="md"
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 10,
        background: "rgba(255,255,255,0.92)",
      }}
    >
      <Stack gap={4}>
        {LEGEND_ITEMS.map(({ type, label }) => (
          <Group key={type} gap="xs">
            <ColorSwatch color={TYPE_COLORS[type]} size={14} />
            <Text size="xs">{label}</Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
