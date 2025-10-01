import NextAuth from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'

// For development, we're not using a database adapter
// In production, you would connect to a database
export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID || 'test_client_id',
      clientSecret: process.env.GITHUB_SECRET || 'test_client_secret',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Add your own logic here to validate credentials
        // For now, we'll allow any credentials for development
        if (credentials?.email) {
          // In production, you would verify the credentials against a database
          return {
            id: '1',
            email: credentials.email,
            name: 'Admin User'
          }
        }
        return null
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      // Add user id to session
      if (session.user) {
        session.user.id = user?.id || '1' // Default to a test ID
      }
      return session
    },
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id
      }
      return token
    }
  },
  secret: process.env.NEXTAUTH_SECRET || 'test_secret',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }