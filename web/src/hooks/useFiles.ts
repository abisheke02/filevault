import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { filesApi, foldersApi, type FileItem, type FolderItem } from '../api/files.api'
import toast from 'react-hot-toast'

export function useFiles(folderId?: string) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['files', folderId],
    queryFn: () => filesApi.list(folderId).then((r) => r.data),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ formData, onProgress }: { formData: FormData; onProgress?: (p: number) => void }) =>
      filesApi.upload(formData, onProgress).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      toast.success('Upload complete')
    },
    onError: () => toast.error('Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      toast.success('File deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      filesApi.rename(id, name).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      toast.success('Renamed')
    },
    onError: () => toast.error('Rename failed'),
  })

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      foldersApi.create(name, parentId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      toast.success('Folder created')
    },
    onError: () => toast.error('Failed to create folder'),
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => foldersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] })
      toast.success('Folder deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  return {
    files:    data?.files    ?? [] as FileItem[],
    folders:  data?.folders  ?? [] as FolderItem[],
    total:    data?.total    ?? 0,
    isLoading,
    upload:       uploadMutation.mutateAsync,
    remove:       deleteMutation.mutate,
    rename:       renameMutation.mutate,
    createFolder: createFolderMutation.mutate,
    removeFolder: deleteFolderMutation.mutate,
  }
}
