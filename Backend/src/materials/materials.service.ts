import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Material } from './entities/material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialsQueryDto } from './dto/materials-query.dto';
import { MaterialCategory } from './entities/material-category.entity';
import { Unit } from './entities/unit.entity';

@Injectable()
export class MaterialsService {
  /**
   * Backward-compat: у старих БД може не бути колонок consumptionPerM2/consumptionPerLm.
   * Ми:
   *  - для GET /materials віддаємо список навіть без цих колонок (підставляємо 0),
   *  - для CREATE/UPDATE норм — кидаємо зрозумілий 400 з інструкцією виконати SQL.
   */
  private static consumptionColsCache: { ok: boolean; checkedAt: number } | null = null;
  private static weightColCache: { ok: boolean; checkedAt: number } | null = null;

  constructor(
    @InjectRepository(Material)
    private readonly repo: Repository<Material>,

    @InjectRepository(MaterialCategory)
    private readonly categoryRepo: Repository<MaterialCategory>,

    @InjectRepository(Unit)
    private readonly unitRepo: Repository<Unit>,
  ) {}

  private async hasConsumptionColumns(): Promise<boolean> {
    const now = Date.now();
    const cache = MaterialsService.consumptionColsCache;
    if (cache && now - cache.checkedAt < 30_000) return cache.ok;

    try {
      const rows: Array<{ column_name: string }> = await this.repo.manager.query(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'materials'
            AND column_name IN ('consumptionPerM2', 'consumptionPerLm')`,
      );
      const names = new Set(rows.map((r) => r.column_name));
      const ok = names.has('consumptionPerM2') && names.has('consumptionPerLm');
      MaterialsService.consumptionColsCache = { ok, checkedAt: now };
      return ok;
    } catch {
      // Якщо немає доступу до information_schema — не ламаємо GET.
      MaterialsService.consumptionColsCache = { ok: false, checkedAt: now };
      return false;
    }
  }

  private async hasWeightColumn(): Promise<boolean> {
    const now = Date.now();
    const cache = MaterialsService.weightColCache;
    if (cache && now - cache.checkedAt < 30_000) return cache.ok;

    try {
      const rows: Array<{ column_name: string }> = await this.repo.manager.query(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'materials'
            AND column_name = 'weightKg'`,
      );
      const ok = rows.some((r) => r.column_name === 'weightKg');
      MaterialsService.weightColCache = { ok, checkedAt: now };
      return ok;
    } catch {
      MaterialsService.weightColCache = { ok: false, checkedAt: now };
      return false;
    }
  }

  private async ensureConsumptionColumnsOrThrow() {
    const ok = await this.hasConsumptionColumns();
    if (!ok) {
      throw new BadRequestException(
        'У БД відсутні колонки норм витрат матеріалів. Виконай SQL з папки sql (ALTER TABLE materials ADD COLUMN consumptionPerM2/consumptionPerLm) і перезапусти бекенд.',
      );
    }
  }

  private async ensureWeightColumnOrThrow() {
    const ok = await this.hasWeightColumn();
    if (!ok) {
      throw new BadRequestException(
        'У БД відсутня колонка ваги матеріалу (weightKg). Виконай SQL з папки sql (ALTER TABLE materials ADD COLUMN weightKg) і перезапусти бекенд.',
      );
    }
  }

  async create(dto: CreateMaterialDto & { categoryId?: number; unitId?: number }) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Некоректна назва');

    const exists = await this.repo.findOne({ where: { name } });
    if (exists) throw new BadRequestException('Матеріал вже існує');

    // Якщо користувач хоче зберігати норми — переконайся, що БД готова.
    if (dto.consumptionPerM2 !== undefined || dto.consumptionPerLm !== undefined) {
      await this.ensureConsumptionColumnsOrThrow();
    }

    if (dto.weightKg !== undefined) {
      await this.ensureWeightColumnOrThrow();
    }

    const entity = this.repo.create({
      name,
      unit: dto.unit?.trim() ?? null,
      sku: dto.sku?.trim() ?? null,
      basePrice: String(dto.basePrice ?? 0),
      consumptionPerM2: String(dto.consumptionPerM2 ?? 0),
      consumptionPerLm: String(dto.consumptionPerLm ?? 0),
      weightKg: dto.weightKg === undefined ? null : String(dto.weightKg),
      isActive: true,
      categoryId: dto.categoryId ?? null,
      unitId: dto.unitId ?? null,
    });

    return this.repo.save(entity);
  }

  async findAll(query: MaterialsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.category', 'cat')
      .leftJoinAndSelect('m.unitRef', 'unitRef');

    // Backward-compat: якщо колонок норм немає — обмежуємо SELECT базовими полями,
    // щоб не ловити 500 (column does not exist).
    const hasConsumption = await this.hasConsumptionColumns();
    const hasWeight = await this.hasWeightColumn();

    if (!hasConsumption || !hasWeight) {
      qb.select([
        'm.id',
        'm.name',
        'm.unit',
        'm.sku',
        'm.basePrice',
        ...(hasWeight ? ['m.weightKg'] : []),
        'm.isActive',
        'm.categoryId',
        'm.unitId',
        'm.createdAt',
        'm.updatedAt',
      ]);
      qb.addSelect('cat');
      qb.addSelect('unitRef');
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      qb.andWhere(
        new Brackets((b) => {
          b.where('m.name ILIKE :q', { q: `%${q}%` }).orWhere('m.sku ILIKE :q', { q: `%${q}%` });
        }),
      );
    }

    if (query.categoryId) {
      qb.andWhere('m.categoryId = :categoryId', { categoryId: query.categoryId });
    }
    if (query.unitId) {
      qb.andWhere('m.unitId = :unitId', { unitId: query.unitId });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('m.isActive = :isActive', { isActive: query.isActive });
    }

    const sortBy = query.sortBy ?? 'name';
    const sortDir = query.sortDir ?? 'ASC';

    qb.orderBy(`m.${sortBy}`, sortDir as any).addOrderBy('m.id', 'DESC');

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Якщо колонок немає — підставляємо нулі, щоб фронт не падав.
    if (!hasConsumption) {
      for (const m of items as any[]) {
        if (m.consumptionPerM2 === undefined) m.consumptionPerM2 = '0';
        if (m.consumptionPerLm === undefined) m.consumptionPerLm = '0';
      }
    }

    if (!hasWeight) {
      for (const m of items as any[]) {
        if (m.weightKg === undefined) m.weightKg = null;
      }
    }

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const hasConsumption = await this.hasConsumptionColumns();
    const hasWeight = await this.hasWeightColumn();

    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.category', 'cat')
      .leftJoinAndSelect('m.unitRef', 'unitRef')
      .where('m.id = :id', { id });

    if (!hasConsumption || !hasWeight) {
      qb.select([
        'm.id',
        'm.name',
        'm.unit',
        'm.sku',
        'm.basePrice',
        ...(hasWeight ? ['m.weightKg'] : []),
        'm.isActive',
        'm.categoryId',
        'm.unitId',
        'm.createdAt',
        'm.updatedAt',
      ]);
      qb.addSelect('cat');
      qb.addSelect('unitRef');
    }

    const material = await qb.getOne();
    if (!material) throw new NotFoundException('Матеріал не знайдено');

    if (!hasConsumption) {
      (material as any).consumptionPerM2 = (material as any).consumptionPerM2 ?? '0';
      (material as any).consumptionPerLm = (material as any).consumptionPerLm ?? '0';
    }

    if (!hasWeight) {
      (material as any).weightKg = (material as any).weightKg ?? null;
    }

    return material;
  }

  async update(
    id: number,
    dto: UpdateMaterialDto & { categoryId?: number | null; unitId?: number | null },
  ) {
    const material = await this.findOne(id);

    if (dto.consumptionPerM2 !== undefined || dto.consumptionPerLm !== undefined) {
      await this.ensureConsumptionColumnsOrThrow();
    }

    if (dto.weightKg !== undefined) {
      await this.ensureWeightColumnOrThrow();
    }

    if (dto.name && dto.name.trim() !== material.name) {
      const name = dto.name.trim();
      const exists = await this.repo.findOne({ where: { name } });
      if (exists) throw new BadRequestException('Матеріал з такою назвою вже існує');
      material.name = name;
    }

    if (dto.unit !== undefined) material.unit = dto.unit?.trim() ?? null;
    if (dto.sku !== undefined) material.sku = dto.sku?.trim() ?? null;
    if (dto.basePrice !== undefined) material.basePrice = String(dto.basePrice);
    if (dto.consumptionPerM2 !== undefined) material.consumptionPerM2 = String(dto.consumptionPerM2);
    if (dto.consumptionPerLm !== undefined) material.consumptionPerLm = String(dto.consumptionPerLm);
    if (dto.weightKg !== undefined) material.weightKg = dto.weightKg == null ? null : String(dto.weightKg);
    if (dto.isActive !== undefined) material.isActive = dto.isActive;

    if (dto.categoryId !== undefined) material.categoryId = dto.categoryId;
    if (dto.unitId !== undefined) material.unitId = dto.unitId;

    return this.repo.save(material);
  }

  async remove(id: number) {
    const material = await this.findOne(id);
    material.isActive = false;
    return this.repo.save(material);
  }

  /**
   * Для Excel-імпорту: створює категорію, якщо її ще нема.
   * Повертає id або null.
   */
  async getOrCreateCategory(name?: string): Promise<number | null> {
    if (!name) return null;

    const clean = name.trim();
    if (!clean) return null;

    let cat = await this.categoryRepo.findOne({ where: { name: clean } });
    if (!cat) {
      cat = this.categoryRepo.create({ name: clean, isActive: true });
      cat = await this.categoryRepo.save(cat);
    }
    return cat.id;
  }

  /**
   * Для Excel-імпорту: створює одиницю, якщо її ще нема.
   * Повертає id або null.
   */
  async getOrCreateUnit(code?: string): Promise<number | null> {
    if (!code) return null;

    const clean = code.trim();
    if (!clean) return null;

    let unit = await this.unitRepo.findOne({ where: { code: clean } });
    if (!unit) {
      unit = this.unitRepo.create({ code: clean, name: null, isActive: true });
      unit = await this.unitRepo.save(unit);
    }
    return unit.id;
  }
  async archive(id: number) {
  return this.repo.update(id, { isActive: false });
}
}
