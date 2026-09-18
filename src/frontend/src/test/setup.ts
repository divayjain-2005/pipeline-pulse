/**
 * Global test setup.
 *
 * Registers jest-dom matchers and stubs the browser APIs jsdom does not
 * implement but the app touches on mount (matchMedia for the theme hook,
 * ResizeObserver for recharts' ResponsiveContainer).
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// The generated components expose stable `data-ocid` hooks; use them as the
// test-id attribute rather than inventing selectors.
configure({ testIdAttribute: "data-ocid" });

afterEach(() => {
  cleanup();
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!globalThis.ResizeObserver) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

// Radix UI's Select and other pointer-driven primitives call these methods on
// the event target. jsdom implements neither, so opening a Select throws
// "target.hasPointerCapture is not a function" and the menu never renders.
// Stubbing them is the standard jsdom shim for Radix; it changes no app code.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
