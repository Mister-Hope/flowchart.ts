export default {
  cooldown: (pkg) => {
    if (
      ["@mr-hope/", "@oxfmt/", "@oxlint/", "@oxlint-tsgolint/", "@vitest/"].some((prefix) =>
        pkg.startsWith(prefix),
      ) ||
      ["oxc-config-hope", "oxfmt", "oxlint", "oxlint-tsgolint", "tsdown", "vitest"].includes(pkg)
    )
      return 0;

    return 1;
  },
};
