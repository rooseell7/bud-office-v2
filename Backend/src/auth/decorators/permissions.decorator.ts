import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../permissions/permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Використання:
 *  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
 *  @Permissions('supply:write')
 */
export const Permissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);