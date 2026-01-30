import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  /**
   * В БД колонка має бути user_id (snake_case).
   * nullable залишаємо, як ти і планував.
   */
 @Column({ type: 'int', name: 'user_id', nullable: true })
userId: number | null;

@ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
@JoinColumn({ name: 'user_id' })
user: User | null;


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
