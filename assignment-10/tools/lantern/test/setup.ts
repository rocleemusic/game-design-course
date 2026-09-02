// jsdom shims React Flow needs.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyMock {
  m22 = 1;
  constructor(_transform?: string) {}
}

// Skip in node-environment suites (e.g. bridge.test.ts) — no DOM there.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "ResizeObserver", { value: ResizeObserverMock });
  Object.defineProperty(window, "DOMMatrixReadOnly", { value: DOMMatrixReadOnlyMock });

  if (!window.HTMLElement.prototype.getBoundingClientRect.toString().includes("width")) {
    // leave jsdom's default; React Flow tolerates zero rects for smoke tests
  }
}
