import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'changeme',
    }),
  ],
  providers: [EventsGateway, EventsService],
  exports: [EventsService],
})
export class EventsModule {}
