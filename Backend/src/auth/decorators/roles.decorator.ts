import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Використання:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin', 'supply_head')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
