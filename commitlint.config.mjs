// Conventional Commits drive the automatic semver bump on merge to main:
// fix: -> patch, feat: -> minor, feat!: or "BREAKING CHANGE:" -> major.
export default {
  extends: ['@commitlint/config-conventional'],
};
