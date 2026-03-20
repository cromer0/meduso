describe("Example unit test", () => {
  it("should pass a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle string operations", () => {
    const storeName = "Meduso Store";
    expect(storeName.toLowerCase()).toContain("meduso");
  });
});
