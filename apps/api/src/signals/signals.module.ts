import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { SignalsController } from './signals.controller.js';
import { SignalsService } from './signals.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [SignalsController],
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
