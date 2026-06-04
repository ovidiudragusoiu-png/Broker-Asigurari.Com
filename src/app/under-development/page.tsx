import { redirect } from "next/navigation";

/** Legacy preview URL — permanent redirect to homepage. */
export default function UnderDevelopmentRedirect() {
  redirect("/");
}
