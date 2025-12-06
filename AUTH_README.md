# Workflow360 Authentication System

Complete authentication system implementation using Supabase Auth with full TypeScript support.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Setup](#setup)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Protected Routes](#protected-routes)
- [Customization](#customization)

## Features

✅ **Complete Auth Flow**
- User signup with email/password
- User login with email/password
- Password reset via email
- Email verification
- Session management
- Automatic token refresh
- Secure logout

✅ **Security**
- Row Level Security (RLS) policies
- Middleware-based route protection
- Secure HTTP-only cookies
- CSRF protection
- Automatic session refresh before expiry

✅ **Developer Experience**
- Full TypeScript support
- React Context for global auth state
- Custom `useAuth` hook
- Utility functions for all auth operations
- Server-side and client-side auth support

✅ **User Experience**
- Loading states
- Error handling
- Redirect after login
- Remember redirect URL
- Profile management

## Architecture

### File Structure

```
workflow360/
├── lib/
│   └── auth.ts                    # Auth utility functions
├── app/
│   ├── layout.tsx                 # Root layout with AuthProvider
│   ├── providers/
│   │   └── AuthProvider.tsx       # Auth context and provider
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   ├── signup/
│   │   │   └── page.tsx          # Signup page
│   │   ├── reset-password/
│   │   │   └── page.tsx          # Password reset page
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   └── dashboard/
│       └── page.tsx              # Protected dashboard page
├── hooks/
│   ├── useAuth.ts                # Auth hook export
│   └── index.ts                  # Hooks index
└── middleware.ts                 # Route protection middleware
```

### Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      app/layout.tsx                          │
│                    (Root Layout)                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            AuthProvider (Context)                      │  │
│  │  - Manages auth state                                  │  │
│  │  - Listens to auth changes                            │  │
│  │  - Auto-refreshes tokens                              │  │
│  │  - Provides useAuth hook                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ↓                                   │
│              ┌──────────────────────┐                        │
│              │   Page Components    │                        │
│              └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
              ┌──────────────────────┐
              │   middleware.ts       │
              │  - Protects routes    │
              │  - Checks session     │
              │  - Redirects          │
              └──────────────────────┘
```

## Setup

### 1. Supabase Configuration

Ensure your `.env.local` file has the required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Email Settings (Supabase Dashboard)

1. Go to **Authentication** → **Email Templates**
2. Configure email templates for:
   - Confirm signup
   - Reset password
   - Change email

3. Go to **Authentication** → **URL Configuration**
4. Set redirect URLs:
   - Site URL: `http://localhost:3000`
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/reset-password`

### 3. Database Setup

The authentication system integrates with your database schema. Ensure you've run the migration:

```sql
-- The users table should already be created from the main migration
-- It extends Supabase auth.users with profile information
```

## Usage

### Basic Authentication

#### Sign Up

```typescript
import { signUp } from "@/lib/auth";

const { data, error } = await signUp({
  email: "user@example.com",
  password: "securepassword123",
  fullName: "John Doe",
});

if (error) {
  console.error(error.message);
} else {
  console.log("User created:", data);
}
```

#### Sign In

```typescript
import { signIn } from "@/lib/auth";

const { data, error } = await signIn({
  email: "user@example.com",
  password: "securepassword123",
});

if (error) {
  console.error(error.message);
} else {
  console.log("User signed in:", data);
}
```

#### Sign Out

```typescript
import { signOut } from "@/lib/auth";

const { error } = await signOut();

if (error) {
  console.error(error.message);
} else {
  console.log("User signed out");
}
```

#### Password Reset

```typescript
import { resetPassword, updatePassword } from "@/lib/auth";

// Request password reset
const { error } = await resetPassword("user@example.com");

// Later, update password (after clicking email link)
const { data, error } = await updatePassword("newpassword123");
```

### Using the Auth Hook

The `useAuth` hook provides easy access to auth state throughout your app:

```typescript
"use client";

import { useAuth } from "@/hooks/useAuth";

function MyComponent() {
  const { user, userProfile, loading, signOut, refreshUser } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <h1>Welcome, {userProfile?.full_name || user.email}!</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Auth Hook API

```typescript
interface AuthContextType {
  user: User | null;                // Supabase auth user
  userProfile: UserProfile | null;  // User profile from database
  loading: boolean;                 // Loading state
  signOut: () => Promise<void>;     // Sign out function
  refreshUser: () => Promise<void>; // Refresh user data
}
```

## API Reference

### Auth Utility Functions

All functions are available from `@/lib/auth`:

#### `signUp(credentials: SignUpCredentials)`
Create a new user account.

**Parameters:**
```typescript
{
  email: string;
  password: string;
  fullName?: string;
}
```

**Returns:** `AuthResponse<User>`

#### `signIn(credentials: SignInCredentials)`
Sign in an existing user.

**Parameters:**
```typescript
{
  email: string;
  password: string;
}
```

**Returns:** `AuthResponse<User>`

#### `signOut()`
Sign out the current user.

**Returns:** `AuthResponse<void>`

#### `resetPassword(email: string)`
Send password reset email.

**Returns:** `AuthResponse<void>`

#### `updatePassword(newPassword: string)`
Update user password (requires active session).

**Returns:** `AuthResponse<User>`

#### `getCurrentUser()`
Get the currently authenticated user.

**Returns:** `AuthResponse<User>`

#### `getSession()`
Get the current session.

**Returns:** `Promise<{ data: Session | null; error?: AuthError }>`

#### `refreshSession()`
Manually refresh the session.

**Returns:** `Promise<{ data: Session | null; error?: AuthError }>`

#### `getUserProfile(userId: string)`
Get user profile from database.

**Returns:** `Promise<{ data: UserProfile; error?: AuthError }>`

#### `updateUserProfile(userId: string, updates: object)`
Update user profile.

**Parameters:**
```typescript
{
  full_name?: string;
  avatar_url?: string;
}
```

**Returns:** `Promise<{ data: UserProfile; error?: AuthError }>`

#### `updateEmail(newEmail: string)`
Update user email (requires confirmation).

**Returns:** `AuthResponse<User>`

#### `isAuthenticated()`
Check if user is authenticated.

**Returns:** `Promise<boolean>`

#### `onAuthStateChange(callback)`
Subscribe to auth state changes.

**Returns:** `{ data: { subscription: Subscription } }`

## Protected Routes

### Middleware Configuration

The middleware automatically protects routes. Configure in [middleware.ts](middleware.ts):

```typescript
// Public routes (no auth required)
const publicRoutes = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/reset-password",
  "/auth/callback",
];

// Auth routes (redirect to dashboard if logged in)
const authRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/reset-password",
];
```

### Behavior

| User State | Accessing | Result |
|-----------|-----------|--------|
| Not logged in | Public route | ✅ Allow access |
| Not logged in | Protected route | ↪️ Redirect to `/auth/login?redirect=/original-path` |
| Logged in | Public route | ✅ Allow access |
| Logged in | Auth page | ↪️ Redirect to `/dashboard` |
| Logged in | Protected route | ✅ Allow access |

### Manual Route Protection

For additional protection, use the `useAuth` hook in components:

```typescript
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return null;

  return <div>Protected Content</div>;
}
```

## Session Management

### Automatic Token Refresh

The `AuthProvider` automatically refreshes tokens 5 minutes before expiry:

```typescript
// Auto-refresh is handled automatically in AuthProvider
// No manual intervention needed
```

### Manual Session Refresh

```typescript
import { refreshSession } from "@/lib/auth";

const { data: session, error } = await refreshSession();
```

### Session Events

Listen to auth events:

```typescript
import { onAuthStateChange } from "@/lib/auth";

const { data: { subscription } } = onAuthStateChange((event, session) => {
  console.log("Auth event:", event);
  // Events: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED
});

// Cleanup
subscription.unsubscribe();
```

## Customization

### Custom Redirect After Login

```typescript
// In login page
const searchParams = useSearchParams();
const redirectTo = searchParams.get("redirect") || "/dashboard";

// After successful login
router.push(redirectTo);
```

### Custom Email Templates

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Customize the templates with your branding
3. Use variables: `{{ .ConfirmationURL }}`, `{{ .Email }}`, etc.

### Add OAuth Providers

```typescript
import { signInWithOAuth } from "@/lib/auth";

// Sign in with Google
const { data, error } = await signInWithOAuth("google");

// Sign in with GitHub
const { data, error } = await signInWithOAuth("github");
```

**Enable OAuth in Supabase:**
1. Go to Authentication → Providers
2. Enable desired provider (Google, GitHub, etc.)
3. Add OAuth credentials from provider

### Custom Auth UI

All auth pages are fully customizable. Edit:
- [app/auth/login/page.tsx](app/auth/login/page.tsx)
- [app/auth/signup/page.tsx](app/auth/signup/page.tsx)
- [app/auth/reset-password/page.tsx](app/auth/reset-password/page.tsx)

### Styling

Auth pages use Tailwind CSS. Customize colors and styles by editing the page components.

## Error Handling

All auth functions return consistent error format:

```typescript
interface AuthError {
  message: string;
  code?: string;
}

interface AuthResponse<T> {
  data?: T;
  error?: AuthError;
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `invalid_credentials` | Wrong email/password |
| `email_exists` | Email already registered |
| `weak_password` | Password doesn't meet requirements |
| `rate_limit` | Too many requests |
| `user_not_found` | User doesn't exist |

### Example Error Handling

```typescript
const { data, error } = await signIn({ email, password });

if (error) {
  switch (error.code) {
    case "invalid_credentials":
      setError("Invalid email or password");
      break;
    case "rate_limit":
      setError("Too many attempts. Please try again later");
      break;
    default:
      setError(error.message);
  }
  return;
}

// Success
console.log("Logged in:", data);
```

## Security Best Practices

1. **Never store passwords** - Let Supabase handle password hashing
2. **Use HTTPS** in production
3. **Enable email verification** in Supabase settings
4. **Set strong password requirements** (min 8 characters)
5. **Implement rate limiting** - Supabase has built-in protection
6. **Use Row Level Security** - Database policies are already configured
7. **Rotate secrets regularly** - API keys, JWT secrets
8. **Monitor auth events** - Use Supabase dashboard logs

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` exists and has correct values
- Restart dev server after changing env variables

### User can't sign up
- Check Supabase dashboard → Authentication → Settings
- Ensure "Enable email confirmations" is configured
- Check email provider settings

### Redirect not working after login
- Check middleware configuration
- Verify protected routes in `middleware.ts`
- Clear browser cookies and try again

### Session expires immediately
- Check Supabase JWT expiry settings
- Verify token refresh is working in AuthProvider

### User profile not created
- Check database migration was run
- Verify RLS policies allow insert
- Check browser console for errors

## Testing

### Manual Testing Checklist

- [ ] Sign up with new email
- [ ] Verify email confirmation sent
- [ ] Sign in with correct credentials
- [ ] Sign in with wrong credentials (should fail)
- [ ] Access protected route when logged out (should redirect)
- [ ] Access auth pages when logged in (should redirect to dashboard)
- [ ] Request password reset
- [ ] Update password via reset link
- [ ] Sign out
- [ ] Session persists after page refresh
- [ ] Token auto-refreshes before expiry

## Next Steps

Now that authentication is set up, you can:

1. ✅ Build organization management features
2. ✅ Create project and task UI
3. ✅ Add real-time subscriptions
4. ✅ Implement notifications
5. ✅ Add profile settings page

## Support

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
- [Workflow360 Main README](README.md)
- [Database Schema Documentation](supabase/README.md)
