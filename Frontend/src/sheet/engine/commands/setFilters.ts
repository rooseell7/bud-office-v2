/**
 * Filter state commands. Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import type { FilterSpec } from '../types';

export function createSetFiltersEnabledCommand(enabled: boolean): SheetCommand {
  return {
    do(state: SheetState): SheetState {
      return { ...state, filtersEnabled: enabled };
    },
    undo(state: SheetState): SheetState {
      return { ...state, filtersEnabled: !enabled };
    },
  };
}

export function createSetColumnFilterCommand(
  colId: string,
  spec: FilterSpec | null,
): SheetCommand {
  let prevSpec: FilterSpec | undefined;
  return {
    do(state: SheetState): SheetState {
      prevSpec = state.filters?.[colId];
      const filters = { ...(state.filters ?? {}) };
      if (spec == null) {
        delete filters[colId];
      } else {
        filters[colId] = spec;
      }
      return { ...state, filters: Object.keys(filters).length ? filters : undefined };
    },
    undo(state: SheetState): SheetState {
      const filters = { ...(state.filters ?? {}) };
      if (prevSpec == null) {
        delete filters[colId];
      } else {
        filters[colId] = prevSpec;
      }
      return { ...state, filters: Object.keys(filters).length ? filters : undefined };
    },
  };
}

export function createClearAllFiltersCommand(): SheetCommand {
  let prevFilters: Record<string, FilterSpec> | undefined;
  let prevEnabled: boolean;
  return {
    do(state: SheetState): SheetState {
      prevFilters = state.filters ? { ...state.filters } : undefined;
      prevEnabled = state.filtersEnabled ?? false;
      return { ...state, filters: undefined, filtersEnabled: false };
    },
    undo(state: SheetState): SheetState {
      return {
        ...state,
        filters: prevFilters,
        filtersEnabled: prevEnabled,
      };
    },
  };
}
