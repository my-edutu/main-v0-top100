# Project Guide for Qwen Code

## Project Overview
This is a Next.js application located at: C:\Users\USER\Desktop\top100\v0_Top100Afl - Copy

## Technology Stack
- Framework: Next.js (using App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Package Manager: npm/yarn (based on package.json)

## Project Structure
```
├── .gitignore
├── components.json
├── middleware.ts
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── -p/ (possibly output or temp directory)
├── .git/
├── .next/ (Next.js build directory)
├── app/ (Next.js app directory)
├── components/ (React components)
├── content/ (Project content files)
├── hooks/ (Custom React hooks)
├── lib/ (Utility functions and libraries)
├── node_modules/
├── prisma/ (Prisma ORM configuration)
├── public/ (Static assets)
├── scripts/ (Build scripts)
```

## Key Configuration Files
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `middleware.ts` - Next.js middleware
- `components.json` - Component library configuration (likely for shadcn/ui)

## Development Notes
- The project uses Prisma ORM, indicating database functionality
- Tailwind CSS is configured for styling
- The project appears to be a web application with content management capabilities

## Common Commands
- `npm run dev` - Start development server
- `npm run build` - Build the application
- `npm run start` - Start production server

## Context for Future Interactions
This is a Next.js 14+ application using the App Router. When making changes:
1. Respect the existing component structure in the components/ directory
2. Follow TypeScript best practices as defined in tsconfig.json
3. Use Tailwind CSS classes consistently with existing styling
4. Consider Prisma schema when making database-related changes
5. Follow Next.js conventions for routing and data fetching