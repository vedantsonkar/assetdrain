// Regression fixture: every reference form that has broken assetdrain before.
// The reason each file exists is documented in tests/findUsages.test.ts —
// keep this header free of asset filenames so it can't mark files "used".

const cdnUrl = "https://cdn.example.com/images/used-hero.png";
const relativeIcon = "./assets/used-icon.svg";

// public/dead-logo.png is only mentioned in this comment — kept on purpose.

export function heroSrc() {
  return cdnUrl;
}

export function iconSrc() {
  return relativeIcon;
}
