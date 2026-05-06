import jwt from "jsonwebtoken";

const expiresIn = "7d";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email
    },
    getJwtSecret(),
    { expiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
}
