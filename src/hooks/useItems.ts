import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  getAllTags,
  getAllFolders,
} from "../lib/tauri-commands";
import type { CreateItemInput, UpdateItemInput } from "../types";

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: listItems,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: getAllTags,
  });
}

export function useFolders() {
  return useQuery({
    queryKey: ["folders"],
    queryFn: getAllFolders,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateItemInput) => createItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateItemInput) => updateItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });
}
