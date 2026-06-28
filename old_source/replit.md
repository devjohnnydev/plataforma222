# PlayGame (Jogo) - Educational Gamification Platform

## Overview
PlayGame is a gamified educational platform built with React (Vite) frontend and Express.js backend, using Prisma ORM with PostgreSQL. It supports teachers managing classes, activities, missions, grades, and student enrollments with a game-like XP/ranking system. The interface is in Portuguese (Brazilian).

## Project Architecture
- **Frontend**: React 19 with Vite 7, Framer Motion, Lucide React icons
- **Backend**: Express 5 (ESM modules) on port 3001
- **Database**: PostgreSQL via Prisma ORM
- **Schema**: server/prisma/schema.prisma
- **Vite Config**: vite.config.js (port 5000, proxies /api to backend on 3001)

## Key Files
- `server/index.js` - Express API server with all routes
- `server/prisma/schema.prisma` - Database schema (User, Class, Enrollment, Activity, Mission, Grade, Message)
- `vite.config.js` - Vite dev server config
- `package.json` - Root dependencies (frontend + shared)
- `server/package.json` - Server dependencies

## Running
- Workflow: `PORT=3001 node server/index.js & npm run dev`
- Frontend: Vite on port 5000
- Backend: Express on port 3001
- Vite proxies `/api` requests to backend

## Roles
- **ADMIN**: Super admin (johnny.oliveira@sp.senai.br)
- **TEACHER**: Manages classes, activities, grades, missions
- **STUDENT**: Joins classes via code, views grades/missions/ranking

## Recent Changes
- 2026-02-16: Initial import to Replit environment, installed dependencies, set up PostgreSQL database, pushed Prisma schema
