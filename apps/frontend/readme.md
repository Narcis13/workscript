# Workscript Frontend

Modern SPA for workflow builder and execution UI.

## Stack

- **Vite 7** - Lightning-fast dev server and build tool
- **React 19** - Latest React with concurrent features
- **Tailwind CSS v4** - Utility-first styling
- **TypeScript** - Type-safe development

## Development

```bash
bun run dev      # Start dev server (http://localhost:5173)
bun run build    # Build for production
bun run preview  # Preview production build
```

## Project Structure

```
/apps/frontend/src/
├── components/     # React components
│   └── ui/        # shadcn/ui components
├── lib/           # Utilities
└── App.tsx        # Main app component
```

## Adding Components

```typescript
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function MyComponent() {
  return <Button>Click me</Button>;
}
```

## Environment Variables

Create `/apps/frontend/.env`:

```env
VITE_API_URL=http://localhost:3013
```

## Building for Production

```bash
bun run build
# Output: /apps/frontend/dist
```
