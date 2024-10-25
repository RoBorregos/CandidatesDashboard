import { getServerSession } from "next-auth";

export default async function AccountPage() {
  const session = await getServerSession();

  if (!session) {
    return (
      <div>
        <h1>Log in</h1>
        <p>You need to log in to access this page.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Account</h1>
      <p>You are logged in as {session.user.email}.</p>
    </div>
  );
}
