# GameVerse - Family Gaming Platform

A complete, full-stack gaming platform for family and friends with real-time chat, leaderboards, blog system, and admin panel.

## Features

### User Features
- **Authentication**: Secure login/register with Supabase Auth
- **Dashboard**: Personalized stats and activity tracking
- **Game Library**: Browse and filter 8+ games by category and difficulty
- **Leaderboard**: Competitive rankings with medals and achievements
- **Real-time Chat**: Text and voice chat with multiple channels
- **Profile**: View stats, achievements, and friend lists
- **Blog**: Read published articles and game guides
- **Events**: View upcoming gaming tournaments and events
- **Dark/Light Mode**: Toggle between themes

### Admin Features
- **Admin Dashboard**: Overview of platform statistics
- **Blog Management**: Create, edit, and publish blog posts
- **Game Management**: Add and configure games
- **User Management**: View and manage user roles
- **Content Moderation**: Approve and manage user content

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Real-time**: Supabase Realtime
- **Voice Chat**: WebRTC
- **Deployment**: Vercel

## Database Schema

The application uses the following tables:
- `profiles` - User profiles with role-based access
- `games` - Game catalog with metadata
- `leaderboard` - Player scores and rankings
- `blog_posts` - Blog content with draft/published states
- `chat_channels` - Chat room configuration
- `chat_messages` - Message history

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account
- Vercel account (for deployment)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (already configured in Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Run database migrations:
   - Execute SQL scripts in `/scripts` folder in order (001, 002, 003, 004)
   - These create tables, RLS policies, triggers, and chat system

5. Run development server:
   ```bash
   npm run dev
   ```

### Deployment

The app is configured for one-click deployment on Vercel:

1. Click "Publish" in v0 or push to GitHub
2. Connect to Vercel
3. Environment variables are auto-configured
4. Deploy!

## Usage

### Creating Admin Users

After registration, update a user's role to 'admin' in the `profiles` table:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Adding Games

Admins can add games through the admin panel or directly in the database:

```sql
INSERT INTO games (title, description, category, difficulty, min_players, max_players, is_multiplayer)
VALUES ('Poker', 'Classic card game', 'card', 'medium', 2, 8, true);
```

### Publishing Blog Posts

1. Login as admin
2. Navigate to Admin Panel > Blog Posts
3. Click "Create New Post"
4. Write content in Markdown
5. Save as draft or publish immediately

## Security

- Row Level Security (RLS) enabled on all tables
- Admin routes protected with role checks
- Auth middleware validates sessions
- API routes verify user permissions
- Chat messages scoped to authenticated users

## Performance

- Server-side rendering for SEO
- Optimistic UI updates
- Real-time subscriptions for chat
- Lazy loading for images
- API route caching

## Support

For issues or questions:
- Check the Admin Dashboard for system status
- Review Supabase logs for errors
- Contact the development team

## License

Private family/friends project - All rights reserved
