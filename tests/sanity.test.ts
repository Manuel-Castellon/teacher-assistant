// Sanity check that Jest + ts-jest ESM is wired up.
// Real test coverage lives next to the modules under src/.

describe('jest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
