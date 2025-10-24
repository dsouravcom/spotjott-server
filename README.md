# SpotJott API

Express TypeScript API server with Prisma ORM for PostgreSQL.

## Features

-   ✅ Express.js with TypeScript
-   ✅ Prisma ORM for PostgreSQL
-   ✅ RESTful API structure
-   ✅ Security middleware (Helmet, CORS)
-   ✅ Request logging (Morgan)
-   ✅ Environment configuration

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   PostgreSQL database

### Installation

1. Install dependencies:

```bash
npm install
```

2. Configure your database:

    - Copy `.env.example` to `.env`
    - Update `DATABASE_URL` with your PostgreSQL connection string

3. Generate Prisma Client:

```bash
npm run prisma:generate
```

4. Run database migrations:

```bash
npm run prisma:migrate
```

### Development

Start the development server:

```bash
npm run dev
```

The server will run on `http://localhost:3000`

### Production

Build and start:

```bash
npm run build
npm start
```

## API Endpoints

### Users

-   `GET /api/users` - Get all users
-   `GET /api/users/:id` - Get user by ID
-   `POST /api/users` - Create new user
-   `PUT /api/users/:id` - Update user
-   `DELETE /api/users/:id` - Delete user

### Posts

-   `GET /api/posts` - Get all posts
-   `GET /api/posts/:id` - Get post by ID
-   `POST /api/posts` - Create new post
-   `PUT /api/posts/:id` - Update post
-   `DELETE /api/posts/:id` - Delete post

## Scripts

-   `npm run dev` - Start development server with auto-reload
-   `npm run build` - Build for production
-   `npm start` - Start production server
-   `npm run prisma:generate` - Generate Prisma Client
-   `npm run prisma:migrate` - Run database migrations
-   `npm run prisma:studio` - Open Prisma Studio

## Project Structure

```
.
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── lib/
│   │   └── prisma.ts      # Prisma client instance
│   ├── routes/
│   │   ├── user.routes.ts # User endpoints
│   │   └── post.routes.ts # Post endpoints
│   └── index.ts           # Main application
├── .env                   # Environment variables
├── .env.example          # Environment template
├── tsconfig.json         # TypeScript config
└── package.json          # Dependencies
```

## License

ISC
