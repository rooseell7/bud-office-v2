import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Client } from '../clients/client.entity';

// ВАЖЛИВО: enums мають бути EXPORTED, щоб DTO могли їх імпортувати
export enum ObjectType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  COMMERCIAL = 'commercial',
  OTHER = 'other',
}

export enum ObjectStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  DONE = 'done',
}

@Entity('objects')
@Index(['userId', 'createdAt'])
@Index(['clientId'])
export class ProjectObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string | null;

  @Column({ type: 'enum', enum: ObjectType, default: ObjectType.OTHER })
  type: ObjectType;

  @Column({ type: 'enum', enum: ObjectStatus, default: ObjectStatus.PLANNED })
  status: ObjectStatus;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  client: Client;

  @Column()
  clientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
