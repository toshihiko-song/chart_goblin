import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import {
  TIMEFRAMES,
  type ScanRunSummary,
  type Timeframe,
} from '@chart-goblin/shared';
import { TimeframeQueryDto } from '../common/dto/timeframe-query.dto.js';
import {
  SignalsService,
  type ScanRunRecord,
} from '../signals/signals.service.js';
import { ScannerService } from './scanner.service.js';

interface ScannerStatus {
  timeframe: Timeframe;
  running: boolean;
  lastRun: ScanRunRecord | null;
}

@Controller('scanner')
export class ScannerController {
  constructor(
    private readonly scanner: ScannerService,
    private readonly signals: SignalsService,
  ) {}

  @Get('status')
  async status(): Promise<ScannerStatus[]> {
    const runs = await this.signals.getScanRuns();
    return TIMEFRAMES.map((timeframe) => ({
      timeframe,
      running: this.scanner.isRunning(timeframe),
      lastRun: runs[timeframe] ?? null,
    }));
  }

  /** Runs a scan now and waits for it to finish. */
  @Post('run')
  @HttpCode(200)
  run(@Query() { tf }: TimeframeQueryDto): Promise<ScanRunSummary> {
    return this.scanner.run(tf);
  }

  /** Scans all enabled timeframes now and waits for them to finish. */
  @Post('run-all')
  @HttpCode(200)
  runAll(): Promise<ScanRunSummary[]> {
    return this.scanner.runAll();
  }
}
