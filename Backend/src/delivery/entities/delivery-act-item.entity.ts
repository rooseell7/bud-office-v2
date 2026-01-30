import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { DeliveryAct } from './delivery-act.entity';

@Entity('delivery_act_items')
@Index(['actId'])
export class DeliveryActItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  actId: number;

  @ManyToOne(() => DeliveryAct, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actId' })
  act: DeliveryAct;

  @Column({ type: 'varchar', length: 250 })
  name: string;

  // IMPORTANT: numeric/decimal -> string
  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0 })
  qty: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  amount: string;
}
