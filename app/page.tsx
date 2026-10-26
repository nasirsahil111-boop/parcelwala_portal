import { redirect } from "next/navigation";

/**
 * The portal has no public landing page — it is a tool for partners who already
 * have an account. The signed-in shell decides where an arrival belongs, so
 * there is one guard rather than two that can disagree.
 */
export default function Root() {
  redirect("/portal");
}
