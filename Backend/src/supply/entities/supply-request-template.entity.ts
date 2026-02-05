import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplyRequestTemplateItem } from './supply-request-template-item.entity';

@Entity('supply_request_templates')
@Index(['projectId'])
@Index(['isActive'])
export class SupplyRequestTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', nullable: true })
  projectId: number | null;

  @Column({ type: 'int' })
  createdById: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => SupplyRequestTemplateItem, (item) => item.template)
  items: SupplyRequestTemplateItem[];
}
