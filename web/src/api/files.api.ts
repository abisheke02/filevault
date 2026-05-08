import { api } from './client'

export interface FileItem {
  id: string
  name: string
  mimeType: string
  size: number
  folderId: string | null
  isStarred: boolean
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

  listTrashed: () =>
    api.get<FileItem[]>('/files/trash'),

  upload: (formData: FormData, folderId?: string, onProgress?: (pct: number) => void) =>
    api.post<FileItem>('/files/upload', formData, {
      params: folderId ? { folderId } : {},
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total)
          onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }),

  trash:  (id: string) => api.delete(`/files/${id}`),
  restore: (id: string) => api.post(`/files/${id}/restore`),
  hardDelete: (id: string) => api.delete(`/files/${id}/permanent`),

  rename: (id: string, name: string) =>
    api.patch<FileItem>(`/files/${id}/rename`, { name }),

  move: (id: string, folderId: string | null) =>
    api.patch<FileItem>(`/files/${id}/move`, { folderId }),

  download: (id: string) =>
    api.get(`/files/${id}/download`, { responseType: 'blob' }),

  getVersions: (id: string) =>
    api.get<{ id: string; versionNumber: number; sizeBytes: number; createdAt: string }[]>(`/files/${id}/versions`),

  star: (id: string) => api.patch<FileItem>(`/files/${id}/star`),

  listStarred: () => api.get<ListResponse>('/files/starred'),
}

export const foldersApi = {
  create: (name: string, parentId?: string) =>
    api.post<FolderItem>('/folders', { name, parentId }),

  list: (parentId?: string) =>
    api.get<FolderItem[]>('/folders', { params: parentId ? { parentId } : {} }),

  rename: (id: string, name: string) =>
    api.patch<FolderItem>(`/folders/${id}`, { name }),

  delete: (id: string) => api.delete(`/folders/${id}`),
}

export const searchApi = {
  search: (q: string) =>
    api.get<{ files: FileItem[] }>('/files/search', { params: { q } }),
}

export interface CreateShareOpts {
  fileId: string
  permission?: 'view' | 'download'
  password?: string
  expiresAt?: string
  maxDownloads?: number
}

export const sharesApi = {
  create: (opts: CreateShareOpts) =>
    api.post<{ id: string; token: string; permission: string; expiresAt: string | null }>('/shares', opts),

  info: (token: string, password?: string) =>
    api.get<{ id: string; permission: string; passwordRequired: boolean; expiresAt: string | null; file: { name: string; mimeType: string; sizeBytes: number } | null }>(
      `/shares/${token}/info`, { params: password ? { password } : {} }
    ),

  list: () => api.get('/shares/my'),

  revoke: (id: string) => api.delete(`/shares/${id}`),
}

export const usersApi = {
  updateProfile: (name: string) => api.patch('/users/me', { name }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  setup2fa: () =>
    api.post<{ qrDataUrl: string; secret: string }>('/auth/2fa/setup'),
  enable2fa: (token: string) =>
    api.post('/auth/2fa/enable', { token }),
  disable2fa: (token: string) =>
    api.delete('/auth/2fa/disable', { data: { token } }),
}
