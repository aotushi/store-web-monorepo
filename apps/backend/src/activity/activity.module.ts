import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from '../product/product.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityTasks } from './activity.tasks';
import { Activity } from './entities/activity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Activity]), ProductModule],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityTasks],
})
export class ActivityModule {}
