import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { landingFor } from "@/lib/routes";
import { LoginScreen } from "@/views/LoginScreen";

/** Portada: con sesión va a la página de su rol; sin sesión, inicio de sesión. */
export default async function Home() {
  const session = await auth();
  if (session?.user?.role) redirect(landingFor(session.user.role));
  return <LoginScreen />;
}
