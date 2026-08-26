test('without an API key the client is a no-op', () => {
  jest.isolateModules(() => {
    const { analytics } = require('@/analytics/posthog');
    expect(analytics.enabled).toBe(false);
    expect(() => analytics.capture('x')).not.toThrow();
  });
});
