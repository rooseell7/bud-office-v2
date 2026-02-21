// Frontend/src/shared/router/patchHistoryEvents.ts
export function patchHistoryEventsOnce() {
  // захист від повторного патчу
  const w = window as any;
  if (w.__BUD_HISTORY_PATCHED__) return;
  w.__BUD_HISTORY_PATCHED__ = true;

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  function dispatchLocationChange(type: 'pushstate' | 'replacestate', state: any) {
    // кастомні події (для дебага, якщо потрібно)
    window.dispatchEvent(new Event(type));
    // головне: popstate, щоб BrowserRouter/Router підхопив зміну
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  }

  type HistoryStateArgs = [state: any, title: string, url?: string | URL | null];

  window.history.pushState = function (...args: any[]) {
    const ret = originalPushState(...(args as HistoryStateArgs));
    const state = args?.[0];
    dispatchLocationChange('pushstate', state);
    return ret;
  } as any;

  window.history.replaceState = function (...args: any[]) {
    const ret = originalReplaceState(...(args as HistoryStateArgs));
    const state = args?.[0];
    dispatchLocationChange('replacestate', state);
    return ret;
  } as any;
}
