import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
export function AccountControl() {
  return (
    <form action={logout} className="account-control">
      <button type="submit" aria-label="Log out" title="Log out">
        <Image src="/design/user.svg" width={24} height={24} alt="" />
        <span>Log out</span>
      </button>
      <Link href="/privacy" className="account-privacy">
        Privacy
      </Link>
    </form>
  );
}
