import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface GrcEvent {
  type: string; // e.g. risk.created
  module: string;
  tenantId: string | null;
  actorId?: string;
  actorEmail?: string;
  entityId: string;
  record?: any;
  previous?: any;
  meta?: Record<string, any>;
}

@Injectable()
export class EventsService {
  private readonly subject = new Subject<GrcEvent>();

  emit(event: GrcEvent) {
    this.subject.next(event);
  }

  subscribe(handler: (event: GrcEvent) => void) {
    return this.subject.subscribe({ next: handler });
  }
}
