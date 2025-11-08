# @workscript/config

Shared configuration files for the Workscript monorepo.

## Usage

### TypeScript

Extend the base TypeScript configuration in your `tsconfig.json`:

```json
{
  "extends": "@workscript/config/typescript",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### ESLint

Extend the base ESLint configuration in your `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['@workscript/config/eslint'],
  // Your custom rules
};
```

### Tailwind CSS

Extend the base Tailwind configuration in your `tailwind.config.js`:

```javascript
module.exports = {
  presets: [require('@workscript/config/tailwind')],
  content: ['./src/**/*.{ts,tsx}'],
};
```
