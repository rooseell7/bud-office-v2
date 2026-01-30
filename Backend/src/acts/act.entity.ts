import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('acts')
export class Act {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  projectId!: number;

  @Column({ type: 'int' })
  foremanId!: number;

  @Column({ type: 'date' })
  actDate!: string;

  // Масив позицій робіт/матеріалів у форматі JSON
  @Column({ type: 'jsonb', default: () => "'[]'" })
  items!: any[];

  // draft / submitted / approved / exported
  @Column({ default: 'draft' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
