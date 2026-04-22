import { redirect } from 'next/navigation';

export default function PosLoginRedirect() {
  redirect('/login');
}
