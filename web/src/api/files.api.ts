import { api } from './client'

export interface FileItem {
  id: string
  name: string
  mimeType: string
  size: number
  folderId: string | null
  createdAt: string
  updatedAt: string
  downloadUrl?: string
  thumbnailUrl?: string
  versions?: number
}

export interface FolderItem {
  id: string
  name: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  fileCount?: number
}

export interface ListResponse {
  folders: FolderItem[]
  files: FileItem[]
  total: number
}

export const filesApi = {
  list: (folderId?: string) =>
    api.get<ListResponse>('/files', { params: folderId ? { folderId } : {} }),

  upload: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post<FileItem>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total)
          onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }),

  delete: (id: string) => api.delete(`/files/${id}`),

  rename: (id: string, name: string) =>
    api.patch<FileItem>(`/files/${id}`, { name }),

  move: (id: string, folderId: string | null) =>
    api.patch<FileItem>(`/files/${id}/move`, { folderId }),

  download: (id: string) =>
    api.get(`/files/${id}/download`, { responseType: 'blob' }),
}

export const foldersApi = {
  create: (name: string, parentId?: string) =>
    api.post<FolderItem>('/folders', { name, parentId }),

  rename: (id: string, name: string) =>
    api.patch<FolderItem>(`/folders/${id}`, { name }),

  delete: (id: string) => api.delete(`/folders/${id}`),
}

export const searchApi = {
  search: (q: string) =>
    api.get<{ files: FileItem[] }>('/search', { params: { q } }),
}

export const sharesApi = {
  create: (fileId: string, expiresIn?: number) =>
    api.post<{ url: string; token: string }>('/shares', { fileId, expiresIn }),

  list: () => api.get('/shares'),

  revoke: (id: string) => api.delete(`/shares/${id}`),
}
