// Not actually a schema, just the type.

interface UserProfile {
  [key: string]: unknown;
  _id: string;
  username: string;
}

export type { UserProfile };
