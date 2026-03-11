import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button, Stack, Text, Title, Code, Container } from "@mantine/core";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LynxNote crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container size="sm" py={80}>
          <Stack align="center" gap="lg">
            <Title order={2}>Something went wrong</Title>
            <Text c="dimmed" ta="center">
              LynxNote encountered an unexpected error. Your data is safe on disk.
            </Text>
            {this.state.error && (
              <Code block style={{ maxWidth: "100%", overflow: "auto" }}>
                {this.state.error.message}
              </Code>
            )}
            <Button onClick={() => window.location.reload()}>
              Reload App
            </Button>
          </Stack>
        </Container>
      );
    }

    return this.props.children;
  }
}
