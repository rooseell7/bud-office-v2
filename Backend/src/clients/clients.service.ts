import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  private toUserId(userId: number | string): number {
    const n = Number(userId);
    // якщо раптом прилетить щось некоректне — краще 0 (нічого не знайде), ніж падати
    return Number.isFinite(n) ? n : 0;
  }

  async create(userId: number | string, dto: CreateClientDto): Promise<Client> {
    const userIdNum = this.toUserId(userId);

    const client = this.clientRepo.create({
      ...dto,
      userId: userIdNum,
    });

    return this.clientRepo.save(client);
  }

  /**
   * Важливо:
   * У БД може не бути колонки "note" (історично/міграції не прогнані).
   * Якщо entity містить поле note, TypeORM за замовчуванням включає його в SELECT і падає.
   * Тому тут використовуємо select, щоб НЕ читати "note" та не ловити 500.
   */
  async findAll(userId: number | string, search?: string): Promise<Client[]> {
    const userIdNum = this.toUserId(userId);

    if (search) {
      const qb = this.clientRepo
        .createQueryBuilder('c')
        .where('c.userId = :userId', { userId: userIdNum })
        .andWhere('(c.name ILIKE :q OR c.phone ILIKE :q OR c.email ILIKE :q)', { q: `%${search}%` })
        .orderBy('c.createdAt', 'DESC')
        .select(['c.id', 'c.name', 'c.phone', 'c.email', 'c.userId', 'c.createdAt', 'c.updatedAt']);
      return qb.getMany();
    }

    return this.clientRepo.find({
      where: { userId: userIdNum },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'name',
        'phone',
        'email',
        'userId',
        'createdAt',
        'updatedAt',
      ] as (keyof Client)[],
    });
  }

  async findOne(id: string, userId: number | string): Promise<Client> {
    const userIdNum = this.toUserId(userId);

    // Тут теж краще захистити від відсутньої колонки note
    const client = await this.clientRepo.findOne({
      where: { id, userId: userIdNum },
      select: [
        'id',
        'name',
        'phone',
        'email',
        'userId',
        'createdAt',
        'updatedAt',
      ] as (keyof Client)[],
    });

    if (!client) {
      throw new NotFoundException('Клієнта не знайдено');
    }

    return client;
  }

  async update(
    id: string,
    userId: number | string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    const userIdNum = this.toUserId(userId);

    // знайдемо клієнта (без note)
    const client = await this.findOne(id, userIdNum);

    Object.assign(client, dto);

    // якщо dto містить note, а колонки в БД немає — save впаде.
    // Тому без міграції краще, щоб UpdateClientDto НЕ містив note,
    // або щоб фронт його не відправляв. Ми це вирівняємо в міграціях.
    return this.clientRepo.save(client);
  }

  async remove(id: string, userId: number | string): Promise<void> {
    const userIdNum = this.toUserId(userId);

    const client = await this.findOne(id, userIdNum);
    await this.clientRepo.remove(client);
  }
}
