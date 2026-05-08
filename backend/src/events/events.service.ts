import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

export type FileEvent = {
  type: 'file:created' | 'file:updated' | 'file:deleted' | 'file:restored';
  payload: { id: string; name?: string; folderId?: string | null };
};

export type FolderEvent = {
  type: 'folder:created' | 'folder:updated' | 'folder:deleted';
  payload: { id: string; name?: string; parentId?: string | null };
};

export type StorageEvent = {
  type: 'storage:updated';
  payload: { storageUsedBytes: number };
};

@Injectable()
export class EventsService {
  constructor(private readonly gateway: EventsGateway) {}

  emitFile(userId: string, event: FileEvent) {
    this.gateway.emitToUser(userId, event.type, event.payload);
  }

  emitFolder(userId: string, event: FolderEvent) {
    this.gateway.emitToUser(userId, event.type, event.payload);
  }

  emitStorage(userId: string, event: StorageEvent) {
    this.gateway.emitToUser(userId, event.type, event.payload);
  }
}
