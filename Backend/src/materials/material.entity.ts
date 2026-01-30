import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Stock } from '../stock/stock.entity';
import { Operation } from '../operations/operation.entity';

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  unit: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Stock, (s) => s.material)
  stocks: Stock[];

  @OneToMany(() => Operation, (o) => o.material)
  operations: Operation[];
}
