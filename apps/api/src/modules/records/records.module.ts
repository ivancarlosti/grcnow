import { Module } from '@nestjs/common';
import { createCrudController } from '../../common/crud/crud.controller';
import { ALL_MODULES } from './defs';
import { PolicyExtrasController, RiskMatrixController } from './extras.controller';

/**
 * Registers one REST controller per module definition. This single module gives
 * the API CRUD + search + CSV + metadata for every GRC record type.
 */
@Module({
  controllers: [
    ...ALL_MODULES.map((def) => createCrudController(def)),
    PolicyExtrasController,
    RiskMatrixController,
  ],
})
export class RecordsModule {}
